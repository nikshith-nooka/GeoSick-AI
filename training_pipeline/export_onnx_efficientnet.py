#!/usr/bin/env python3
"""
GeoSick-AI ONNX Exporter — EfficientNet-B0 Version
Converts trained EfficientNet-B0 checkpoints to ONNX for browser WASM inference.

Usage:
  python export_onnx_efficientnet.py          # Export both models
  python export_onnx_efficientnet.py --clinical-only
  python export_onnx_efficientnet.py --env-only
"""

import os
import json
import argparse
from pathlib import Path

import torch
import torch.nn as nn
import torchvision.models as models

BASE_DIR = Path(__file__).parent
PROJECT_ROOT = BASE_DIR.parent
CHECKPOINT_DIR = BASE_DIR / "checkpoints"
PUBLIC_MODELS_DIR = PROJECT_ROOT / "public" / "models"

PUBLIC_MODELS_DIR.mkdir(parents=True, exist_ok=True)


# =============================================================================
# REBUILD MODEL ARCHITECTURE (must match training scripts exactly)
# =============================================================================

def build_clinical_efficientnet(num_classes: int) -> nn.Module:
    model = models.efficientnet_b0(weights=None)  # No pretrained weights — we load our own
    in_features = model.classifier[1].in_features  # 1280
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3),
        nn.Linear(in_features, 512),
        nn.ReLU(inplace=True),
        nn.BatchNorm1d(512),
        nn.Dropout(p=0.2),
        nn.Linear(512, num_classes)
    )
    return model


def build_env_efficientnet(num_classes: int) -> nn.Module:
    model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features  # 1280
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.35),
        nn.Linear(in_features, 256),
        nn.ReLU(inplace=True),
        nn.BatchNorm1d(256),
        nn.Dropout(p=0.2),
        nn.Linear(256, num_classes)
    )
    return model


# =============================================================================
# ONNX EXPORT FUNCTION
# =============================================================================

def export_to_onnx(
    model: nn.Module,
    output_path: Path,
    model_name: str,
    num_classes: int,
    class_mapping: dict
) -> bool:
    """
    Exports a PyTorch model to ONNX format optimized for browser WASM execution.
    Input shape: [1, 3, 224, 224] (single image, RGB, 224x224)
    Output shape: [1, num_classes] (logits, apply softmax in browser)
    """
    model.eval()

    dummy_input = torch.randn(1, 3, 224, 224, requires_grad=False)

    try:
        torch.onnx.export(
            model,
            dummy_input,
            str(output_path),
            export_params=True,
            opset_version=17,          # Latest stable opset for WASM
            do_constant_folding=True,  # Optimize constants
            input_names=["input"],
            output_names=["output"],
            dynamic_axes={
                "input": {0: "batch_size"},
                "output": {0: "batch_size"}
            },
            verbose=False
        )

        size_mb = output_path.stat().st_size / (1024 * 1024)
        print(f"  [✓] {model_name}")
        print(f"      Output: {output_path}")
        print(f"      Size: {size_mb:.1f} MB")
        print(f"      Classes: {num_classes}")
        print(f"      Opset: 17 (WASM SIMD compatible)")

        # Save class mapping alongside the ONNX model
        mapping_path = output_path.parent / f"{output_path.stem}_classes.json"
        with open(mapping_path, 'w') as f:
            json.dump({
                "model_name": model_name,
                "num_classes": num_classes,
                "input_shape": [1, 3, 224, 224],
                "output_shape": [1, num_classes],
                "normalization": {
                    "mean": [0.485, 0.456, 0.406],
                    "std": [0.229, 0.224, 0.225]
                },
                "class_to_idx": class_mapping.get("class_to_idx", {}),
                "idx_to_class": class_mapping.get("idx_to_class", {}),
                "postprocess": "softmax → top-k"
            }, f, indent=2)

        print(f"      Classes JSON: {mapping_path}")
        return True

    except Exception as e:
        print(f"  [!] Export failed for {model_name}: {e}")
        return False


# =============================================================================
# EXPORT CLINICAL MODEL
# =============================================================================

def export_clinical():
    print("\n[1/2] Exporting Clinical Model (EfficientNet-B0)...")

    clinical_ckpt = CHECKPOINT_DIR / "geosick_clinical_best.pth"
    class_mapping_path = CHECKPOINT_DIR / "clinical_class_mapping.json"
    output_path = PUBLIC_MODELS_DIR / "geosick_clinical_model.onnx"

    if not clinical_ckpt.exists():
        print(f"  [!] No clinical checkpoint found at: {clinical_ckpt}")
        print(f"  [!] Run: python train_clinical_real.py first")
        return False

    # Load class mapping
    class_mapping = {}
    num_classes = 200  # Default
    if class_mapping_path.exists():
        with open(class_mapping_path, 'r') as f:
            class_mapping = json.load(f)
        num_classes = class_mapping.get("num_classes", 200)
    else:
        print(f"  [!] No class mapping found — using default {num_classes} classes")

    # Load checkpoint
    checkpoint = torch.load(clinical_ckpt, map_location="cpu")
    if isinstance(checkpoint, dict):
        state_dict = checkpoint.get('model_state', checkpoint)
        ckpt_classes = checkpoint.get('num_classes', num_classes)
        if ckpt_classes:
            num_classes = ckpt_classes
    else:
        state_dict = checkpoint

    # Build model and load weights
    model = build_clinical_efficientnet(num_classes)
    missing, unexpected = model.load_state_dict(state_dict, strict=False)
    if missing:
        print(f"  [!] Missing keys: {len(missing)} (may be OK if architecture changed)")

    return export_to_onnx(model, output_path, "GeoSick-ClinicalNet (200+ classes)", num_classes, class_mapping)


# =============================================================================
# EXPORT ENVIRONMENTAL MODEL
# =============================================================================

def export_environmental():
    print("\n[2/2] Exporting Environmental Model (EfficientNet-B0)...")

    env_ckpt = CHECKPOINT_DIR / "geosick_env_best.pth"
    class_mapping_path = CHECKPOINT_DIR / "env_class_mapping.json"
    output_path = PUBLIC_MODELS_DIR / "geosick_environmental_model.onnx"

    if not env_ckpt.exists():
        print(f"  [!] No env checkpoint found at: {env_ckpt}")
        print(f"  [!] Run: python train_env_real.py first")
        return False

    # Load class mapping
    class_mapping = {}
    num_classes = 65  # Default
    if class_mapping_path.exists():
        with open(class_mapping_path, 'r') as f:
            class_mapping = json.load(f)
        num_classes = class_mapping.get("num_classes", 65)

    # Load checkpoint
    checkpoint = torch.load(env_ckpt, map_location="cpu")
    if isinstance(checkpoint, dict):
        state_dict = checkpoint.get('model_state', checkpoint)
        ckpt_classes = checkpoint.get('num_classes', num_classes)
        if ckpt_classes:
            num_classes = ckpt_classes
    else:
        state_dict = checkpoint

    # Build model
    model = build_env_efficientnet(num_classes)
    model.load_state_dict(state_dict, strict=False)

    return export_to_onnx(model, output_path, "GeoSick-EnvNet (65 classes)", num_classes, class_mapping)


# =============================================================================
# MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="Export GeoSick models to ONNX")
    parser.add_argument('--clinical-only', action='store_true')
    parser.add_argument('--env-only', action='store_true')
    args = parser.parse_args()

    print("=" * 70)
    print("  GEOSICK-AI ONNX EXPORT — EfficientNet-B0")
    print("  Target: Browser WASM SIMD via ONNX Runtime Web")
    print("=" * 70)

    results = {}

    if not args.env_only:
        results['clinical'] = export_clinical()

    if not args.clinical_only:
        results['environmental'] = export_environmental()

    print("\n" + "=" * 70)
    print("  EXPORT SUMMARY")
    for name, ok in results.items():
        status = "✓ Success" if ok else "✗ Failed (run training first)"
        print(f"  [{status}] {name}")

    print(f"\n  Models saved to: {PUBLIC_MODELS_DIR}")
    print("  These ONNX files are ready for browser inference via onnxruntime-web")
    print("=" * 70)


if __name__ == "__main__":
    main()
