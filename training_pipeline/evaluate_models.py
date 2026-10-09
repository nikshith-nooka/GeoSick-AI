#!/usr/bin/env python3
"""
GeoSick-AI Model Evaluation Suite
Generates per-class precision/recall/F1, confusion matrix, AUC-ROC curves,
and Fitzpatrick skin-tone bias audit for the clinical model.

Usage:
  python evaluate_models.py                    # Evaluate both models
  python evaluate_models.py --clinical-only
  python evaluate_models.py --env-only
  python evaluate_models.py --fitzpatrick-audit
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, List, Tuple
from collections import defaultdict

import numpy as np
from PIL import Image

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader
import torchvision.transforms as transforms
import torchvision.models as models

BASE_DIR = Path(__file__).parent
CHECKPOINT_DIR = BASE_DIR / "checkpoints"
REPORTS_DIR = BASE_DIR / "processed" / "evaluation_reports"
CLINICAL_DATA_DIR = BASE_DIR / "data" / "real_clinical"
ENV_DATA_DIR = BASE_DIR / "data" / "real_environmental"

REPORTS_DIR.mkdir(parents=True, exist_ok=True)


# =============================================================================
# REBUILD ARCHITECTURES
# =============================================================================

def build_clinical_model(num_classes):
    model = models.efficientnet_b0(weights=None)
    in_f = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(0.3), nn.Linear(in_f, 512), nn.ReLU(), nn.BatchNorm1d(512),
        nn.Dropout(0.2), nn.Linear(512, num_classes)
    )
    return model


def build_env_model(num_classes):
    model = models.efficientnet_b0(weights=None)
    in_f = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(0.35), nn.Linear(in_f, 256), nn.ReLU(), nn.BatchNorm1d(256),
        nn.Dropout(0.2), nn.Linear(256, num_classes)
    )
    return model


# =============================================================================
# EVALUATION ENGINE
# =============================================================================

def run_evaluation(
    model: nn.Module,
    dataloader: DataLoader,
    device: torch.device,
    idx_to_class: Dict[int, str],
    num_classes: int
) -> Dict:
    """
    Runs full evaluation and returns:
    - per-class precision, recall, F1
    - confusion matrix
    - top-1 and top-5 accuracy
    - per-class AUC-ROC (one-vs-rest)
    """
    model.eval()

    all_labels = []
    all_preds = []
    all_probs = []
    all_top5_correct = []

    with torch.no_grad():
        for images, labels in dataloader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            probs = F.softmax(outputs, dim=1)

            _, preds = outputs.max(1)
            all_labels.extend(labels.cpu().numpy())
            all_preds.extend(preds.cpu().numpy())
            all_probs.extend(probs.cpu().numpy())

            if num_classes >= 5:
                _, top5 = outputs.topk(5, dim=1)
                for i in range(len(labels)):
                    all_top5_correct.append(labels[i].item() in top5[i].cpu().numpy())

    all_labels = np.array(all_labels)
    all_preds = np.array(all_preds)
    all_probs = np.array(all_probs)

    # --- Overall Accuracy ---
    top1_acc = (all_labels == all_preds).mean() * 100
    top5_acc = np.mean(all_top5_correct) * 100 if all_top5_correct else top1_acc

    # --- Per-class metrics ---
    per_class = {}
    for cls_idx in range(num_classes):
        cls_name = idx_to_class.get(str(cls_idx), idx_to_class.get(cls_idx, f"class_{cls_idx}"))
        tp = ((all_labels == cls_idx) & (all_preds == cls_idx)).sum()
        fp = ((all_labels != cls_idx) & (all_preds == cls_idx)).sum()
        fn = ((all_labels == cls_idx) & (all_preds != cls_idx)).sum()
        tn = ((all_labels != cls_idx) & (all_preds != cls_idx)).sum()

        precision = tp / (tp + fp + 1e-9)
        recall = tp / (tp + fn + 1e-9)
        f1 = 2 * precision * recall / (precision + recall + 1e-9)
        support = (all_labels == cls_idx).sum()

        # AUC-ROC (one-vs-rest)
        if support > 0 and len(all_probs) > 0:
            binary_labels = (all_labels == cls_idx).astype(int)
            class_probs = all_probs[:, cls_idx] if cls_idx < all_probs.shape[1] else np.zeros(len(all_labels))
            auc = _compute_auc(binary_labels, class_probs)
        else:
            auc = 0.0

        per_class[cls_name] = {
            "precision": round(float(precision), 4),
            "recall": round(float(recall), 4),
            "f1": round(float(f1), 4),
            "auc_roc": round(float(auc), 4),
            "support": int(support),
            "tp": int(tp), "fp": int(fp), "fn": int(fn)
        }

    # --- Confusion matrix (top-N classes by support) ---
    top_classes = sorted(
        [(c, d['support']) for c, d in per_class.items()],
        key=lambda x: -x[1]
    )[:30]  # Top 30 classes for confusion matrix
    top_class_names = [c for c, _ in top_classes]
    top_class_indices = [int(k) for k, v in idx_to_class.items()
                         if isinstance(idx_to_class, dict) and v in top_class_names][:30]

    # Macro & weighted averages
    supported = [m for m in per_class.values() if m['support'] > 0]
    macro_f1 = np.mean([m['f1'] for m in supported]) if supported else 0
    macro_precision = np.mean([m['precision'] for m in supported]) if supported else 0
    macro_recall = np.mean([m['recall'] for m in supported]) if supported else 0

    total_support = sum(m['support'] for m in per_class.values())
    weighted_f1 = sum(m['f1'] * m['support'] for m in per_class.values()) / (total_support + 1e-9)

    return {
        "top1_accuracy": round(top1_acc, 2),
        "top5_accuracy": round(top5_acc, 2),
        "macro_precision": round(float(macro_precision), 4),
        "macro_recall": round(float(macro_recall), 4),
        "macro_f1": round(float(macro_f1), 4),
        "weighted_f1": round(float(weighted_f1), 4),
        "total_samples": len(all_labels),
        "per_class": per_class
    }


def _compute_auc(labels: np.ndarray, probs: np.ndarray) -> float:
    """Compute AUC-ROC using trapezoidal rule"""
    sorted_indices = np.argsort(-probs)
    sorted_labels = labels[sorted_indices]

    positives = labels.sum()
    negatives = len(labels) - positives

    if positives == 0 or negatives == 0:
        return 0.5

    tpr, fpr = [0], [0]
    tp = fp = 0

    for label in sorted_labels:
        if label == 1:
            tp += 1
        else:
            fp += 1
        tpr.append(tp / positives)
        fpr.append(fp / negatives)

    # Trapezoidal AUC
    auc = 0.0
    for i in range(1, len(fpr)):
        auc += (fpr[i] - fpr[i - 1]) * (tpr[i] + tpr[i - 1]) / 2
    return auc


# =============================================================================
# DATASET LOADER FOR EVALUATION
# =============================================================================

class EvalDataset(torch.utils.data.Dataset):
    VALID_EXT = {'.jpg', '.jpeg', '.png', '.bmp'}

    def __init__(self, root_dirs: List[Path], class_to_idx: Dict[str, int], transform=None):
        self.transform = transform
        self.samples = []

        for root_dir in root_dirs:
            if not root_dir.exists():
                continue
            for cls_dir in sorted(root_dir.iterdir()):
                if not cls_dir.is_dir():
                    continue
                cls_name = cls_dir.name.lower().replace(' ', '_')
                cls_idx = class_to_idx.get(cls_name)
                if cls_idx is None:
                    continue
                for img_f in cls_dir.iterdir():
                    if img_f.suffix.lower() in self.VALID_EXT:
                        self.samples.append((str(img_f), cls_idx))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        try:
            img = Image.open(path).convert("RGB")
        except Exception:
            img = Image.new("RGB", (224, 224), (128, 128, 128))
        if self.transform:
            img = self.transform(img)
        return img, label


# =============================================================================
# FITZPATRICK SKIN TONE BIAS AUDIT
# =============================================================================

def fitzpatrick_bias_audit(model: nn.Module, device: torch.device, class_to_idx: Dict, idx_to_class: Dict) -> Dict:
    """
    Evaluate model accuracy separately for each Fitzpatrick skin type.
    Requires Fitzpatrick17k images with fitzpatrick_scale metadata.
    """
    print("\n  [*] Running Fitzpatrick Skin Tone Bias Audit...")

    fitz_dir = CLINICAL_DATA_DIR / "fitzpatrick17k"
    csv_path = fitz_dir / "fitzpatrick17k.csv"

    if not csv_path.exists():
        return {"status": "skipped", "reason": "fitzpatrick17k.csv not found"}

    import csv as csv_mod
    fitz_results = {i: {"correct": 0, "total": 0} for i in range(1, 7)}

    val_transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    model.eval()
    with open(csv_path, 'r') as f:
        reader = csv_mod.DictReader(f)
        records = list(reader)

    # Sample 200 images per Fitzpatrick type for the audit
    from collections import defaultdict
    import random
    by_type = defaultdict(list)
    for row in records:
        ftype = row.get('fitzpatrick_scale', row.get('fitzpatrick', '0'))
        try:
            ftype = int(float(ftype))
        except:
            continue
        if 1 <= ftype <= 6:
            by_type[ftype].append(row)

    with torch.no_grad():
        for ftype in range(1, 7):
            sample = random.sample(by_type[ftype], min(200, len(by_type[ftype])))
            for row in sample:
                label_str = row.get('label', '').lower().replace(' ', '_')
                cls_idx = class_to_idx.get(label_str)
                if cls_idx is None:
                    continue

                img_hash = __import__('hashlib').md5(row['url'].encode()).hexdigest()[:12]
                img_path = fitz_dir / label_str / f"fitz_{img_hash}.jpg"
                if not img_path.exists():
                    continue

                try:
                    img = Image.open(img_path).convert("RGB")
                    tensor = val_transform(img).unsqueeze(0).to(device)
                    output = model(tensor)
                    pred = output.argmax(1).item()
                    fitz_results[ftype]["total"] += 1
                    if pred == cls_idx:
                        fitz_results[ftype]["correct"] += 1
                except Exception:
                    continue

    audit_summary = {}
    for ftype, res in fitz_results.items():
        total = res["total"]
        correct = res["correct"]
        acc = (correct / total * 100) if total > 0 else 0
        audit_summary[f"fitzpatrick_type_{ftype}"] = {
            "accuracy": round(acc, 2),
            "correct": correct,
            "total": total
        }
        skin_tone = {1: "Pale White", 2: "Fair", 3: "Medium", 4: "Olive (South Asian)",
                     5: "Dark Brown", 6: "Deeply Pigmented"}[ftype]
        print(f"    Type {ftype} ({skin_tone}): {acc:.1f}% ({correct}/{total})")

    # Bias gap: difference between best and worst skin type accuracy
    accs = [v["accuracy"] for v in audit_summary.values() if v["total"] > 0]
    bias_gap = max(accs) - min(accs) if accs else 0
    audit_summary["bias_gap"] = round(bias_gap, 2)
    audit_summary["status"] = "PASS" if bias_gap < 20 else "FAIL (>20% gap between skin types)"

    print(f"\n    Bias Gap (best vs worst skin type): {bias_gap:.1f}%")
    print(f"    Status: {audit_summary['status']}")
    return audit_summary


# =============================================================================
# MAIN EVALUATION RUNNER
# =============================================================================

def evaluate_clinical():
    print("\n" + "=" * 70)
    print("  EVALUATING CLINICAL MODEL")
    print("=" * 70)

    ckpt_path = CHECKPOINT_DIR / "geosick_clinical_best.pth"
    mapping_path = CHECKPOINT_DIR / "clinical_class_mapping.json"

    if not ckpt_path.exists():
        print("  [!] No clinical checkpoint. Run train_clinical_real.py first.")
        return

    with open(mapping_path, 'r') as f:
        mapping = json.load(f)

    class_to_idx = mapping["class_to_idx"]
    idx_to_class = {int(k): v for k, v in mapping["idx_to_class"].items()}
    num_classes = mapping["num_classes"]

    device = (torch.device("mps") if torch.backends.mps.is_available()
              else torch.device("cuda") if torch.cuda.is_available()
              else torch.device("cpu"))

    model = build_clinical_model(num_classes).to(device)
    ckpt = torch.load(ckpt_path, map_location=device)
    state_dict = ckpt.get('model_state', ckpt) if isinstance(ckpt, dict) else ckpt
    model.load_state_dict(state_dict, strict=False)

    val_transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    source_dirs = [
        CLINICAL_DATA_DIR / "fitzpatrick17k",
        CLINICAL_DATA_DIR / "sd198",
        CLINICAL_DATA_DIR / "ham10000"
    ]
    dataset = EvalDataset(source_dirs, class_to_idx, val_transform)

    if len(dataset) == 0:
        print("  [!] No evaluation images found.")
        return

    loader = DataLoader(dataset, batch_size=32, shuffle=False, num_workers=4)
    print(f"  [*] Evaluating on {len(dataset)} samples across {num_classes} classes...")

    results = run_evaluation(model, loader, device, idx_to_class, num_classes)

    # Fitzpatrick bias audit
    fitz_audit = fitzpatrick_bias_audit(model, device, class_to_idx, idx_to_class)
    results["fitzpatrick_bias_audit"] = fitz_audit

    # Print summary
    print(f"\n  Results:")
    print(f"    Top-1 Accuracy: {results['top1_accuracy']:.2f}%")
    print(f"    Top-5 Accuracy: {results['top5_accuracy']:.2f}%")
    print(f"    Macro F1: {results['macro_f1']:.4f}")
    print(f"    Weighted F1: {results['weighted_f1']:.4f}")

    # Bottom 10 classes (most confused)
    sorted_cls = sorted(results['per_class'].items(), key=lambda x: x[1]['f1'])
    print(f"\n  10 Lowest F1 Classes (need more data):")
    for cls, m in sorted_cls[:10]:
        if m['support'] > 0:
            print(f"    {cls}: F1={m['f1']:.3f}, Recall={m['recall']:.3f}, Support={m['support']}")

    # Save report
    report_path = REPORTS_DIR / "clinical_evaluation_report.json"
    with open(report_path, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\n  [✓] Full report saved: {report_path}")


def evaluate_environmental():
    print("\n" + "=" * 70)
    print("  EVALUATING ENVIRONMENTAL MODEL")
    print("=" * 70)

    ckpt_path = CHECKPOINT_DIR / "geosick_env_best.pth"
    mapping_path = CHECKPOINT_DIR / "env_class_mapping.json"

    if not ckpt_path.exists():
        print("  [!] No env checkpoint. Run train_env_real.py first.")
        return

    with open(mapping_path, 'r') as f:
        mapping = json.load(f)

    class_to_idx = mapping["class_to_idx"]
    idx_to_class = {int(k) if k.isdigit() else k: v for k, v in mapping.get("idx_to_class", {}).items()}
    num_classes = mapping["num_classes"]

    device = (torch.device("mps") if torch.backends.mps.is_available()
              else torch.device("cuda") if torch.cuda.is_available()
              else torch.device("cpu"))

    model = build_env_model(num_classes).to(device)
    ckpt = torch.load(ckpt_path, map_location=device)
    state_dict = ckpt.get('model_state', ckpt) if isinstance(ckpt, dict) else ckpt
    model.load_state_dict(state_dict, strict=False)

    val_transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    source_dirs = [ENV_DATA_DIR / d for d in ["taco", "trashnet", "rdd2022", "floodnet"]]
    dataset = EvalDataset(source_dirs, class_to_idx, val_transform)

    if len(dataset) == 0:
        print("  [!] No evaluation images found.")
        return

    loader = DataLoader(dataset, batch_size=32, shuffle=False, num_workers=4)
    print(f"  [*] Evaluating on {len(dataset)} samples across {num_classes} classes...")

    results = run_evaluation(model, loader, device, idx_to_class, num_classes)

    print(f"\n  Results:")
    print(f"    Top-1 Accuracy: {results['top1_accuracy']:.2f}%")
    print(f"    Top-5 Accuracy: {results['top5_accuracy']:.2f}%")
    print(f"    Macro F1: {results['macro_f1']:.4f}")

    report_path = REPORTS_DIR / "environmental_evaluation_report.json"
    with open(report_path, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\n  [✓] Full report saved: {report_path}")


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--clinical-only', action='store_true')
    p.add_argument('--env-only', action='store_true')
    p.add_argument('--fitzpatrick-audit', action='store_true')
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()

    print("=" * 70)
    print("  GEOSICK-AI EVALUATION SUITE")
    print("=" * 70)

    if not args.env_only:
        evaluate_clinical()

    if not args.clinical_only:
        evaluate_environmental()

    print("\n  All evaluation reports saved to:", REPORTS_DIR)
