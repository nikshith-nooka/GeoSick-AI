#!/usr/bin/env python3
"""
GeoSick-AI PyTorch to ONNX Web Model Exporter
Converts PyTorch CNN checkpoints (.pth) to ONNX format for 100% in-browser WebAssembly / WebGL execution.
"""

import os
import sys
import torch
import torch.nn as nn

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
CHECKPOINTS_DIR = os.path.join(BASE_DIR, "checkpoints")
PUBLIC_MODELS_DIR = os.path.join(PROJECT_ROOT, "public", "models")

os.makedirs(PUBLIC_MODELS_DIR, exist_ok=True)

# 1. 10-Class GeoSickEnvNet Architecture
class GeoSickEnvNet(nn.Module):
    def __init__(self, num_classes: int = 10):
        super(GeoSickEnvNet, self).__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),
            
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),
            
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),

            nn.Conv2d(128, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            nn.AdaptiveAvgPool2d((1, 1))
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Dropout(0.35),
            nn.Linear(256, 128),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
            nn.Linear(128, num_classes)
        )

    def forward(self, x):
        return self.classifier(self.features(x))

# 2. GeoSickVisionNet Architecture
class GeoSickVisionNet(nn.Module):
    def __init__(self, num_classes: int = 5):
        super(GeoSickVisionNet, self).__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),
            
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),
            
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.AdaptiveAvgPool2d((1, 1))
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Dropout(0.35),
            nn.Linear(128, 64),
            nn.ReLU(inplace=True),
            nn.Linear(64, num_classes)
        )
        
    def forward(self, x):
        return self.classifier(self.features(x))

def export_models():
    print("[*] Starting ONNX Export for GeoSick Neural Vision Suite...")
    dummy_input = torch.randn(1, 3, 224, 224, requires_grad=False)

    # 1. Export 10-Class Environmental Model
    env_weights = os.path.join(CHECKPOINTS_DIR, "geosick_environmental_model.pth")
    env_onnx_out = os.path.join(PUBLIC_MODELS_DIR, "geosick_environmental_model.onnx")

    env_model = GeoSickEnvNet(num_classes=10)
    if os.path.exists(env_weights):
        try:
            state = torch.load(env_weights, map_location="cpu")
            env_model.load_state_dict(state, strict=False)
            print(f"[✓] Loaded 10-Class Environmental weights from: {env_weights}")
        except Exception as e:
            print(f"[!] Warning: Could not load exact weights ({e}), initializing standard architecture.")
    env_model.eval()

    torch.onnx.export(
        env_model,
        dummy_input,
        env_onnx_out,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}}
    )
    print(f"[✓] Exported GeoSick-EnvNet (10 Classes) to: {env_onnx_out}")

    # 2. Export Vision / Dermatological Model
    vision_weights = os.path.join(CHECKPOINTS_DIR, "geosick_vision_model.pth")
    vision_onnx_out = os.path.join(PUBLIC_MODELS_DIR, "geosick_vision_model.onnx")

    vision_model = GeoSickVisionNet(num_classes=5)
    if os.path.exists(vision_weights):
        try:
            state = torch.load(vision_weights, map_location="cpu")
            vision_model.load_state_dict(state, strict=False)
            print(f"[✓] Loaded Vision weights from: {vision_weights}")
        except Exception as e:
            print(f"[!] Warning: Could not load exact weights ({e}), initializing standard architecture.")
    vision_model.eval()

    torch.onnx.export(
        vision_model,
        dummy_input,
        vision_onnx_out,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}}
    )
    print(f"[✓] Exported GeoSick-DermaVector to: {vision_onnx_out}")
    print("[🎉] All ONNX Web models exported successfully for browser execution!")

if __name__ == "__main__":
    export_models()
