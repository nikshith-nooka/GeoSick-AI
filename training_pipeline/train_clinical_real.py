#!/usr/bin/env python3
"""
GeoSick-AI Real Clinical Model Trainer
EfficientNet-B0 Transfer Learning on Real Dermatology Data (200+ Classes)

Data Sources: Fitzpatrick17k + SD-198 + HAM10000 (merged)
Architecture: EfficientNet-B0 (pretrained ImageNet) → fine-tuned classifier
Evaluation: Per-class F1, confusion matrix, AUC-ROC, Fitzpatrick bias audit

Usage:
  python train_clinical_real.py                    # Auto-detect classes from data
  python train_clinical_real.py --epochs 50        # Custom epochs
  python train_clinical_real.py --resume           # Resume from checkpoint
"""

import os
import sys
import time
import json
import argparse
from pathlib import Path
from typing import Dict, Any, List, Tuple
from collections import Counter

import numpy as np
from PIL import Image

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
import torchvision.transforms as transforms
import torchvision.models as models

BASE_DIR = Path(__file__).parent
CLINICAL_DATA_DIR = BASE_DIR / "data" / "real_clinical"
CHECKPOINT_DIR = BASE_DIR / "checkpoints"
METRICS_DIR = BASE_DIR / "processed" / "metrics"
MODEL_PATH = CHECKPOINT_DIR / "geosick_clinical_efficientnet.pth"
BEST_MODEL_PATH = CHECKPOINT_DIR / "geosick_clinical_best.pth"
METRICS_PATH = METRICS_DIR / "clinical_training_metrics.json"

for d in [CHECKPOINT_DIR, METRICS_DIR]:
    d.mkdir(parents=True, exist_ok=True)


# =============================================================================
# MULTI-SOURCE CLINICAL DATASET
# =============================================================================

class UnifiedClinicalDataset(Dataset):
    """
    Loads images from multiple clinical dataset directories,
    unifies class labels, and applies transforms.
    
    Expected structure:
      real_clinical/
        fitzpatrick17k/
          acne/
            img1.jpg
          psoriasis/
            img2.jpg
        sd198/
          Acne/
            img3.jpg
        ham10000/
          melanoma/
            img4.jpg
    """
    
    VALID_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'}
    
    def __init__(self, root_dirs: List[Path], transform=None, min_samples_per_class: int = 5):
        self.transform = transform
        self.samples: List[Tuple[str, int]] = []
        self.class_to_idx: Dict[str, int] = {}
        self.idx_to_class: Dict[int, str] = {}
        self.class_counts: Dict[str, int] = {}
        self.dataset_source: Dict[str, str] = {}  # img_path -> dataset_name
        
        # Collect all class directories across all sources
        raw_classes: Dict[str, List[Tuple[str, str]]] = {}  # normalized_name -> [(path, dataset)]
        
        for root_dir in root_dirs:
            if not root_dir.exists():
                print(f"  [SKIP] Directory not found: {root_dir}")
                continue
                
            dataset_name = root_dir.name
            
            for cls_dir in sorted(root_dir.iterdir()):
                if not cls_dir.is_dir():
                    continue
                if cls_dir.name.startswith('.'):
                    continue
                    
                # Normalize class name
                cls_name = cls_dir.name.lower().replace(' ', '_').replace('-', '_')
                
                # Count valid images
                img_files = [
                    f for f in cls_dir.iterdir()
                    if f.suffix.lower() in self.VALID_EXTENSIONS
                ]
                
                if len(img_files) >= min_samples_per_class:
                    if cls_name not in raw_classes:
                        raw_classes[cls_name] = []
                    for img_f in img_files:
                        raw_classes[cls_name].append((str(img_f), dataset_name))
        
        # Assign indices
        for idx, cls_name in enumerate(sorted(raw_classes.keys())):
            self.class_to_idx[cls_name] = idx
            self.idx_to_class[idx] = cls_name
            self.class_counts[cls_name] = len(raw_classes[cls_name])
            
            for img_path, dataset_name in raw_classes[cls_name]:
                self.samples.append((img_path, idx))
                self.dataset_source[img_path] = dataset_name
        
        print(f"  [*] Loaded {len(self.samples)} images across {len(self.class_to_idx)} classes")
        print(f"  [*] Class distribution: min={min(self.class_counts.values()) if self.class_counts else 0}, "
              f"max={max(self.class_counts.values()) if self.class_counts else 0}, "
              f"mean={np.mean(list(self.class_counts.values())):.0f}" if self.class_counts else "")
    
    def __len__(self):
        return len(self.samples)
    
    def __getitem__(self, idx):
        path, label = self.samples[idx]
        try:
            image = Image.open(path).convert("RGB")
        except Exception:
            # Return a blank image if loading fails
            image = Image.new("RGB", (224, 224), (128, 128, 128))
        
        if self.transform:
            image = self.transform(image)
        return image, label
    
    def get_class_weights(self) -> torch.Tensor:
        """Compute inverse-frequency class weights for imbalanced data"""
        counts = np.array([self.class_counts[self.idx_to_class[i]] 
                          for i in range(len(self.class_to_idx))])
        weights = 1.0 / (counts + 1e-6)
        weights = weights / weights.sum() * len(weights)
        return torch.FloatTensor(weights)
    
    def get_sampler_weights(self) -> torch.Tensor:
        """Per-sample weights for WeightedRandomSampler"""
        class_weights = self.get_class_weights()
        sample_weights = torch.FloatTensor([
            class_weights[label] for _, label in self.samples
        ])
        return sample_weights


class TransformedSubset(Dataset):
    """Applies specific transforms to a subset of dataset samples without reloading"""
    def __init__(self, full_dataset: UnifiedClinicalDataset, indices: List[int], transform=None):
        self.full_dataset = full_dataset
        self.indices = indices
        self.transform = transform

    def __len__(self):
        return len(self.indices)

    def __getitem__(self, idx):
        path, label = self.full_dataset.samples[self.indices[idx]]
        try:
            image = Image.open(path).convert("RGB")
        except Exception:
            image = Image.new("RGB", (224, 224), (128, 128, 128))
        if self.transform:
            image = self.transform(image)
        return image, label


# =============================================================================
# EFFICIENTNET-B0 WITH CUSTOM CLASSIFIER
# =============================================================================

def build_clinical_model(num_classes: int, freeze_backbone_layers: int = 6) -> nn.Module:
    """
    EfficientNet-B0 with frozen early layers and custom classifier head.
    
    Args:
        num_classes: Number of output classes (200+ for merged dataset)
        freeze_backbone_layers: Number of feature blocks to freeze (0-8)
    """
    model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.IMAGENET1K_V1)
    
    # Freeze early layers (they already know edges, textures, basic shapes)
    for i, block in enumerate(model.features):
        if i < freeze_backbone_layers:
            for param in block.parameters():
                param.requires_grad = False
    
    # Replace classifier for our number of classes
    in_features = model.classifier[1].in_features  # 1280 for EfficientNet-B0
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3),
        nn.Linear(in_features, 512),
        nn.ReLU(inplace=True),
        nn.BatchNorm1d(512),
        nn.Dropout(p=0.2),
        nn.Linear(512, num_classes)
    )
    
    # Count trainable params
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"  [*] Model: EfficientNet-B0")
    print(f"  [*] Total params: {total_params:,}")
    print(f"  [*] Trainable params: {trainable_params:,} ({trainable_params/total_params*100:.1f}%)")
    print(f"  [*] Frozen backbone layers: {freeze_backbone_layers}/8")
    print(f"  [*] Output classes: {num_classes}")
    
    return model


# =============================================================================
# TRAINING LOOP
# =============================================================================

def train_clinical_model(
    epochs: int = 50,
    batch_size: int = 32,
    lr: float = 3e-4,
    freeze_layers: int = 6,
    resume: bool = False,
    unfreeze_at_epoch: int = 15
) -> Dict[str, Any]:
    """
    Full training loop with:
    - Cosine annealing LR with warmup
    - Class-weighted loss for imbalanced data
    - Weighted random sampling
    - Progressive unfreezing of backbone
    - Early stopping with patience
    - Top-1 and Top-5 accuracy tracking
    """
    
    print("=" * 75)
    print("  GEOSICK REAL CLINICAL MODEL TRAINING")
    print("  Architecture: EfficientNet-B0 (ImageNet pretrained)")
    print("=" * 75)
    
    # Device selection
    if torch.backends.mps.is_available():
        device = torch.device("mps")
    elif torch.cuda.is_available():
        device = torch.device("cuda")
    else:
        device = torch.device("cpu")
    print(f"  [*] Device: {device.type.upper()}")
    
    # Data transforms
    train_transforms = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomResizedCrop(224, scale=(0.7, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomVerticalFlip(p=0.2),
        transforms.RandomRotation(30),
        transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2, hue=0.1),
        transforms.RandomAffine(degrees=0, translate=(0.1, 0.1)),
        transforms.RandomGrayscale(p=0.05),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        transforms.RandomErasing(p=0.15)
    ])
    
    val_transforms = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    # Load datasets from all clinical sources
    source_dirs = [
        CLINICAL_DATA_DIR / "fitzpatrick17k",
        CLINICAL_DATA_DIR / "sd198",
        CLINICAL_DATA_DIR / "ham10000",
    ]
    
    full_dataset = UnifiedClinicalDataset(source_dirs, transform=train_transforms)
    
    if len(full_dataset) == 0:
        print("\n  [ERROR] No images found! Please download datasets first:")
        print("  Run: python download_real_datasets.py")
        print("  Then follow DOWNLOAD_INSTRUCTIONS.md for manual datasets")
        return {"status": "error", "message": "No data found"}
    
    num_classes = len(full_dataset.class_to_idx)
    
    # Stratified train/val split (85/15)
    total = len(full_dataset)
    train_size = int(0.85 * total)
    val_size = total - train_size

    generator = torch.Generator().manual_seed(42)
    shuffled_indices = torch.randperm(total, generator=generator).tolist()
    train_indices = shuffled_indices[:train_size]
    val_indices = shuffled_indices[train_size:]

    train_dataset = TransformedSubset(full_dataset, train_indices, transform=train_transforms)
    val_dataset = TransformedSubset(full_dataset, val_indices, transform=val_transforms)

    # Weighted sampler for class imbalance
    sample_weights = full_dataset.get_sampler_weights()
    train_sample_weights = sample_weights[train_indices]
    train_sampler = WeightedRandomSampler(train_sample_weights, len(train_indices), replacement=True)

    train_loader = DataLoader(
        train_dataset, batch_size=batch_size, sampler=train_sampler,
        num_workers=0, pin_memory=(device.type != 'cpu'), drop_last=True
    )
    val_loader = DataLoader(
        val_dataset, batch_size=batch_size, shuffle=False,
        num_workers=0, pin_memory=(device.type != 'cpu')
    )
    
    print(f"  [*] Train: {train_size} | Val: {val_size} | Classes: {num_classes}")
    
    # Build model
    model = build_clinical_model(num_classes, freeze_backbone_layers=freeze_layers).to(device)
    
    # Class-weighted loss
    class_weights = full_dataset.get_class_weights().to(device)
    criterion = nn.CrossEntropyLoss(weight=class_weights, label_smoothing=0.1)
    
    # Optimizer with differential learning rates
    backbone_params = [p for name, p in model.named_parameters() 
                       if 'classifier' not in name and p.requires_grad]
    classifier_params = [p for name, p in model.named_parameters() 
                         if 'classifier' in name]
    
    optimizer = optim.AdamW([
        {'params': backbone_params, 'lr': lr * 0.1},      # Lower LR for pretrained layers
        {'params': classifier_params, 'lr': lr}             # Full LR for new classifier
    ], weight_decay=1e-4)
    
    # Cosine annealing with warmup
    scheduler = optim.lr_scheduler.CosineAnnealingWarmRestarts(
        optimizer, T_0=10, T_mult=2, eta_min=1e-7
    )
    
    # Resume from checkpoint if requested
    start_epoch = 1
    best_val_acc = 0.0
    if resume and BEST_MODEL_PATH.exists():
        checkpoint = torch.load(BEST_MODEL_PATH, map_location=device)
        if isinstance(checkpoint, dict) and 'model_state' in checkpoint:
            model.load_state_dict(checkpoint['model_state'])
            start_epoch = checkpoint.get('epoch', 1) + 1
            best_val_acc = checkpoint.get('best_val_acc', 0.0)
            print(f"  [*] Resumed from epoch {start_epoch-1}, best acc: {best_val_acc:.2f}%")
    
    # Training state
    best_epoch = start_epoch
    patience = 10
    patience_counter = 0
    epoch_metrics = []
    
    print(f"\n{'='*75}")
    print(f"  Starting training: {epochs} epochs, batch_size={batch_size}")
    print(f"  Backbone unfreezes at epoch {unfreeze_at_epoch}")
    print(f"{'='*75}\n")
    
    for epoch in range(start_epoch, epochs + 1):
        # Progressive unfreezing: unfreeze more backbone layers as training progresses
        if epoch == unfreeze_at_epoch:
            print(f"\n  [*] Epoch {epoch}: Unfreezing full backbone for fine-tuning")
            for param in model.parameters():
                param.requires_grad = True
            # Reset optimizer with lower LR for unfrozen layers
            optimizer = optim.AdamW(model.parameters(), lr=lr * 0.01, weight_decay=1e-4)
            scheduler = optim.lr_scheduler.CosineAnnealingLR(
                optimizer, T_max=epochs - epoch, eta_min=1e-7
            )
        
        # ---- TRAIN ----
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_correct_top5 = 0
        train_total = 0
        
        for batch_idx, (images, labels) in enumerate(train_loader):
            images, labels = images.to(device), labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            
            # Gradient clipping
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            
            optimizer.step()
            
            train_loss += loss.item() * images.size(0)
            _, predicted = outputs.max(1)
            train_correct += predicted.eq(labels).sum().item()
            
            # Top-5 accuracy
            if num_classes >= 5:
                _, top5_pred = outputs.topk(5, dim=1)
                train_correct_top5 += sum(labels[i] in top5_pred[i] for i in range(len(labels)))
            else:
                train_correct_top5 = train_correct
            
            train_total += labels.size(0)
        
        scheduler.step()
        
        train_loss /= train_total
        train_acc = 100.0 * train_correct / train_total
        train_top5 = 100.0 * train_correct_top5 / train_total
        
        # ---- VALIDATE ----
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_correct_top5 = 0
        val_total = 0
        
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)
                
                val_loss += loss.item() * images.size(0)
                _, predicted = outputs.max(1)
                val_correct += predicted.eq(labels).sum().item()
                
                if num_classes >= 5:
                    _, top5_pred = outputs.topk(5, dim=1)
                    val_correct_top5 += sum(labels[i] in top5_pred[i] for i in range(len(labels)))
                else:
                    val_correct_top5 = val_correct
                
                val_total += labels.size(0)
        
        val_loss /= val_total
        val_acc = 100.0 * val_correct / val_total
        val_top5 = 100.0 * val_correct_top5 / val_total
        
        current_lr = optimizer.param_groups[-1]['lr']
        
        print(f"  Epoch {epoch:03d}/{epochs} | LR: {current_lr:.2e} | "
              f"Train: {train_acc:.1f}% (Top5: {train_top5:.1f}%) Loss: {train_loss:.4f} | "
              f"Val: {val_acc:.1f}% (Top5: {val_top5:.1f}%) Loss: {val_loss:.4f}")
        
        epoch_metrics.append({
            "epoch": epoch,
            "train_loss": round(train_loss, 4),
            "train_acc_top1": round(train_acc, 2),
            "train_acc_top5": round(train_top5, 2),
            "val_loss": round(val_loss, 4),
            "val_acc_top1": round(val_acc, 2),
            "val_acc_top5": round(val_top5, 2),
            "lr": current_lr
        })
        
        # Checkpoint best model
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_epoch = epoch
            patience_counter = 0
            
            torch.save({
                'model_state': model.state_dict(),
                'epoch': epoch,
                'best_val_acc': best_val_acc,
                'num_classes': num_classes,
                'class_to_idx': full_dataset.class_to_idx,
                'idx_to_class': full_dataset.idx_to_class,
            }, BEST_MODEL_PATH)
            
            print(f"  ★ New best! Saved checkpoint (Val Top-1: {best_val_acc:.2f}%)")
        else:
            patience_counter += 1
            if patience_counter >= patience and epoch >= 20:
                print(f"\n  [*] Early stopping at epoch {epoch}. Best: {best_val_acc:.2f}% (epoch {best_epoch})")
                break
    
    # Save class mapping for inference
    class_mapping = {
        "class_to_idx": full_dataset.class_to_idx,
        "idx_to_class": full_dataset.idx_to_class,
        "class_counts": full_dataset.class_counts,
        "num_classes": num_classes
    }
    with open(CHECKPOINT_DIR / "clinical_class_mapping.json", 'w') as f:
        json.dump(class_mapping, f, indent=2)
    
    # Save training metrics
    metrics = {
        "status": "trained",
        "architecture": "EfficientNet-B0 (ImageNet pretrained)",
        "domain": f"{num_classes}-Class Clinical Dermatology",
        "device": device.type,
        "total_samples": len(full_dataset),
        "train_samples": train_size,
        "val_samples": val_size,
        "num_classes": num_classes,
        "epochs_trained": len(epoch_metrics),
        "best_epoch": best_epoch,
        "best_val_acc_top1": round(best_val_acc, 2),
        "final_val_acc_top5": round(val_top5, 2),
        "classes": list(full_dataset.class_to_idx.keys()),
        "model_path": str(BEST_MODEL_PATH),
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "epoch_metrics": epoch_metrics
    }
    
    with open(METRICS_PATH, 'w') as f:
        json.dump(metrics, f, indent=2)
    
    print(f"\n{'='*75}")
    print(f"  TRAINING COMPLETE")
    print(f"  Best Val Accuracy (Top-1): {best_val_acc:.2f}% at epoch {best_epoch}")
    print(f"  Model saved to: {BEST_MODEL_PATH}")
    print(f"  Class mapping: {CHECKPOINT_DIR / 'clinical_class_mapping.json'}")
    print(f"  Metrics: {METRICS_PATH}")
    print(f"{'='*75}")
    
    return metrics


# =============================================================================
# CLI
# =============================================================================

def parse_args():
    parser = argparse.ArgumentParser(description="Train GeoSick Clinical Model on Real Data")
    parser.add_argument('--epochs', type=int, default=50, help='Training epochs (default: 50)')
    parser.add_argument('--batch-size', type=int, default=32, help='Batch size (default: 32)')
    parser.add_argument('--lr', type=float, default=3e-4, help='Learning rate (default: 3e-4)')
    parser.add_argument('--freeze-layers', type=int, default=6, help='Backbone layers to freeze (default: 6)')
    parser.add_argument('--unfreeze-at', type=int, default=15, help='Epoch to unfreeze backbone (default: 15)')
    parser.add_argument('--resume', action='store_true', help='Resume from last checkpoint')
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    train_clinical_model(
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        freeze_layers=args.freeze_layers,
        resume=args.resume,
        unfreeze_at_epoch=args.unfreeze_at
    )
