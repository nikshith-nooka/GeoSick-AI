#!/usr/bin/env python3
"""
GeoSick Environmental Hazard & Epidemiological Neural Network Trainer
Trains PyTorch Deep Neural Network (GeoSickEnvNet) on 10 Expanded Real-World Classes:
1. Open Drainage Gutter (Enteric pathogens)
2. Discarded Tyres & Containers (Aedes / Dengue vector)
3. Uncovered Water Storage (Anopheles / Malaria vector)
4. Construction Site Waterlogging (Vector + Leptospirosis)
5. Overflowing Manhole Sewage (Cholera / Typhoid risk)
6. Solid Waste Trash Dump (Rodent / Biohazard)
7. Industrial Chemical Effluent (Toxic chemical runoff)
8. Eutrophic Algal Pond (Cyanobacteria & Culex vector)
9. Flooded Pothole Road Cavity (Monsoon road hazard)
10. Clean Sanitized Baseline (Negative Control)
"""

import os
import sys
import time
import json
from typing import Dict, Any, List, Tuple
from PIL import Image
import numpy as np

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import torchvision.transforms as transforms

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGE_DATA_DIR = os.path.join(BASE_DIR, "data", "augmented_environmental_images")
CHECKPOINT_DIR = os.path.join(BASE_DIR, "checkpoints")
MODEL_WEIGHTS_PATH = os.path.join(CHECKPOINT_DIR, "geosick_environmental_model.pth")
TRAINING_METRICS_PATH = os.path.join(CHECKPOINT_DIR, "environmental_training_metrics.json")

os.makedirs(IMAGE_DATA_DIR, exist_ok=True)
os.makedirs(CHECKPOINT_DIR, exist_ok=True)

ENV_CLASSES = [
    "open_drainage_gutter",
    "discarded_tyres_containers",
    "uncovered_water_storage",
    "construction_site_waterlogging",
    "overflowing_manhole_sewage",
    "solid_waste_trash_dump",
    "industrial_chemical_effluent",
    "eutrophic_algal_pond",
    "flooded_pothole_road_cavity",
    "clean_sanitized_baseline"
]
NUM_CLASSES = len(ENV_CLASSES)


# -------------------------------------------------------------
# PyTorch Dataset Loader
# -------------------------------------------------------------
class EnvironmentalDataset(Dataset):
    def __init__(self, data_dir: str, transform=None):
        self.data_dir = data_dir
        self.transform = transform
        self.samples: List[Tuple[str, int]] = []
        
        for idx, cls in enumerate(ENV_CLASSES):
            cls_dir = os.path.join(data_dir, cls)
            if not os.path.exists(cls_dir):
                continue
            for fname in os.listdir(cls_dir):
                if fname.lower().endswith(('.jpg', '.jpeg', '.png')):
                    self.samples.append((os.path.join(cls_dir, fname), idx))
                    
    def __len__(self):
        return len(self.samples)
        
    def __getitem__(self, idx):
        path, label = self.samples[idx]
        image = Image.open(path).convert("RGB")
        if self.transform:
            image = self.transform(image)
        return image, label


# -------------------------------------------------------------
# Deep Neural Network Architecture
# -------------------------------------------------------------
class GeoSickEnvNet(nn.Module):
    """
    High-capacity CNN architecture for environmental hazard discrimination
    """
    def __init__(self, num_classes: int = NUM_CLASSES):
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


# -------------------------------------------------------------
# Deep 25-Epoch Training with Cosine Annealing & Early Stopping
# -------------------------------------------------------------
def train_environmental_model(epochs: int = 25, batch_size: int = 32, lr: float = 1e-3) -> Dict[str, Any]:
    print("=" * 70)
    print(f"[*] TRAINING GEOSICK ENVIRONMENTAL HAZARD NEURAL NETWORK ({NUM_CLASSES} CLASSES)")
    
    device = torch.device("mps" if torch.backends.mps.is_available() else "cuda" if torch.cuda.is_available() else "cpu")
    print(f"[*] Training Acceleration Device: {device.type.upper()}")
    print("=" * 70)
    
    data_transforms_train = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomVerticalFlip(p=0.2),
        transforms.RandomRotation(20),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    data_transforms_val = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    full_dataset = EnvironmentalDataset(IMAGE_DATA_DIR, transform=data_transforms_train)
    total_samples = len(full_dataset)
    print(f"[*] Total Dataset Samples: {total_samples} across {NUM_CLASSES} classes")
    
    train_size = int(0.85 * total_samples)
    val_size = total_samples - train_size
    train_set, val_set = torch.utils.data.random_split(full_dataset, [train_size, val_size])
    
    train_loader = DataLoader(train_set, batch_size=batch_size, shuffle=True, num_workers=2, pin_memory=True if device.type != 'cpu' else False)
    val_loader = DataLoader(val_set, batch_size=batch_size, shuffle=False)
    
    model = GeoSickEnvNet(num_classes=NUM_CLASSES).to(device)
    criterion = nn.CrossEntropyLoss(label_smoothing=0.05)
    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-6)
    
    best_val_acc = 0.0
    best_epoch = 1
    patience = 6
    patience_counter = 0
    epoch_metrics = []
    
    for epoch in range(1, epochs + 1):
        model.train()
        running_loss = 0.0
        correct_train = 0
        total_train = 0
        
        for imgs, labels in train_loader:
            imgs, labels = imgs.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(imgs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item() * imgs.size(0)
            _, preds = torch.max(outputs, 1)
            correct_train += torch.sum(preds == labels.data).item()
            total_train += labels.size(0)
            
        scheduler.step()
        epoch_loss = running_loss / total_train
        epoch_acc = (correct_train / total_train) * 100
        
        # Validation Pass
        model.eval()
        val_loss = 0.0
        correct_val = 0
        total_val = 0
        with torch.no_grad():
            for imgs, labels in val_loader:
                imgs, labels = imgs.to(device), labels.to(device)
                outputs = model(imgs)
                loss = criterion(outputs, labels)
                val_loss += loss.item() * imgs.size(0)
                _, preds = torch.max(outputs, 1)
                correct_val += torch.sum(preds == labels.data).item()
                total_val += labels.size(0)
                
        val_epoch_loss = val_loss / total_val
        val_epoch_acc = (correct_val / total_val) * 100
        current_lr = scheduler.get_last_lr()[0]
        
        print(f"Epoch {epoch:02d}/{epochs:02d} | LR: {current_lr:.6f} ➔ Train Loss: {epoch_loss:.4f} (Acc: {epoch_acc:.1f}%) | Val Loss: {val_epoch_loss:.4f} (Acc: {val_epoch_acc:.1f}%)")
        
        epoch_metrics.append({
            "epoch": epoch,
            "train_loss": round(epoch_loss, 4),
            "train_acc": round(epoch_acc, 2),
            "val_loss": round(val_epoch_loss, 4),
            "val_acc": round(val_epoch_acc, 2),
            "lr": round(current_lr, 7)
        })
        
        # Checkpoint Best Model
        if val_epoch_acc > best_val_acc:
            best_val_acc = val_epoch_acc
            best_epoch = epoch
            patience_counter = 0
            torch.save(model.state_dict(), MODEL_WEIGHTS_PATH)
        else:
            patience_counter += 1
            if patience_counter >= patience and epoch >= 15:
                print(f"\n[*] Early Stopping triggered at epoch {epoch}. Best Val Acc: {best_val_acc:.2f}% (Epoch {best_epoch})")
                break
                
    print(f"\n[✓] Optimal Environmental Model weights successfully saved to: {MODEL_WEIGHTS_PATH}")
    print(f"[✓] Peak Validation Accuracy: {best_val_acc:.2f}%")
    
    metrics = {
        "status": "trained_deep_25_epochs",
        "domain": "10-Class Environmental Hazard & Outbreak Vision",
        "device": device.type,
        "total_samples": total_samples,
        "epochs_trained": len(epoch_metrics),
        "best_epoch": best_epoch,
        "best_val_acc": round(best_val_acc, 2),
        "classes": ENV_CLASSES,
        "num_classes": NUM_CLASSES,
        "saved_weights_path": MODEL_WEIGHTS_PATH,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "epoch_metrics": epoch_metrics
    }
    
    with open(TRAINING_METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)
        
    return metrics


if __name__ == "__main__":
    train_environmental_model(epochs=25, batch_size=32, lr=1e-3)
