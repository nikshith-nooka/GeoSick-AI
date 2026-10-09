#!/usr/bin/env python3
"""
GeoSick-AI Real Environmental Model Trainer
EfficientNet-B0 Transfer Learning on Real Urban Hazard Data (65+ Classes)

Data Sources: TACO (60 waste) + TrashNet (6 material) + RDD2022 (road damage) + FloodNet
Architecture: EfficientNet-B0 (pretrained ImageNet) → fine-tuned classifier
Classes: 65+ environmental hazard categories across 6 domain groups

Usage:
  python train_env_real.py                  # Train with auto-detected classes
  python train_env_real.py --epochs 40      # Custom epochs
  python train_env_real.py --resume         # Resume from checkpoint
"""

import os
import sys
import time
import json
import argparse
from pathlib import Path
from typing import Dict, Any, List, Tuple

import numpy as np
from PIL import Image

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
import torchvision.transforms as transforms
import torchvision.models as models

BASE_DIR = Path(__file__).parent
ENV_DATA_DIR = BASE_DIR / "data" / "real_environmental"
CHECKPOINT_DIR = BASE_DIR / "checkpoints"
METRICS_DIR = BASE_DIR / "processed" / "metrics"
BEST_MODEL_PATH = CHECKPOINT_DIR / "geosick_env_best.pth"
METRICS_PATH = METRICS_DIR / "env_training_metrics.json"

for d in [CHECKPOINT_DIR, METRICS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# =============================================================================
# EXPANDED 65-CLASS ENVIRONMENTAL TAXONOMY
# Maps real dataset labels → GeoSick domain taxonomy
# =============================================================================

ENVIRONMENTAL_TAXONOMY = {
    # WATER & DRAINAGE (12 classes)
    "blocked_drain": ["drain", "blocked_drain", "drainage", "gutter"],
    "open_sewer": ["sewer", "sewage", "wastewater", "effluent"],
    "stagnant_puddle": ["puddle", "stagnant_water", "standing_water", "water_pool"],
    "flooded_road": ["flood", "flooding", "flooded", "inundation"],
    "waterlogged_construction": ["construction_water", "construction_flood", "site_flooding"],
    "overflowing_manhole": ["manhole", "manhole_cover", "overflow"],
    "leaking_pipe": ["pipe_leak", "broken_pipe", "water_leak", "leaking"],
    "eutrophic_pond": ["algae", "algal_bloom", "green_water", "pond"],
    "sewage_overflow": ["sewage_overflow", "sewage_spill"],
    "storm_drain_blockage": ["storm_drain", "blocked_storm"],
    "coastal_flooding": ["coastal_flood", "sea_flood", "tidal"],
    "river_pollution": ["river", "stream_pollution", "water_pollution"],

    # SOLID WASTE (15 classes)
    "plastic_waste": ["plastic", "plastic_bottle", "plastic_bag", "pet_bottle"],
    "glass_waste": ["glass", "glass_bottle", "broken_glass"],
    "metal_waste": ["metal", "tin_can", "aluminium", "scrap_metal"],
    "paper_waste": ["paper", "cardboard", "newspaper", "carton"],
    "organic_decomposing": ["organic", "food_waste", "compost", "rotting"],
    "mixed_garbage_heap": ["trash", "garbage", "waste_heap", "rubbish", "litter"],
    "medical_waste": ["medical_waste", "syringe", "clinical_waste", "hospital_waste"],
    "electronic_waste": ["e_waste", "electronic", "battery", "circuit_board"],
    "tire_dump": ["tyre", "tire", "rubber", "discarded_tyre"],
    "construction_debris": ["construction_waste", "rubble", "brick_waste", "cement_bag"],
    "textile_waste": ["textile", "clothing_waste", "fabric_waste"],
    "hazardous_container": ["chemical_container", "drum", "barrel", "hazardous"],
    "food_waste": ["food", "kitchen_waste", "restaurant_waste"],
    "styrofoam_waste": ["styrofoam", "polystyrene", "thermocol"],
    "battery_waste": ["battery_waste", "used_battery", "acid_battery"],

    # AIR & CHEMICAL (10 classes)
    "smog_haze": ["smog", "haze", "fog", "air_pollution"],
    "industrial_smoke": ["smoke", "chimney", "factory_smoke", "emission"],
    "chemical_spill": ["chemical_spill", "toxic_spill", "chemical_leak"],
    "oil_slick": ["oil_spill", "oil_slick", "petroleum", "fuel_leak"],
    "dust_cloud": ["dust", "dust_storm", "sandstorm"],
    "burning_waste": ["burning", "fire", "waste_fire", "open_burning"],
    "vehicle_exhaust": ["exhaust", "vehicle_emission", "traffic_pollution"],
    "factory_emission": ["factory", "industrial_emission", "plant_emission"],
    "acid_rain_damage": ["acid_rain", "corrosion", "acid_damage"],
    "asbestos_exposure": ["asbestos", "fibrous_material", "hazardous_material"],

    # ROAD INFRASTRUCTURE (11 classes)
    "pothole": ["pothole", "road_hole", "pavement_hole", "crater"],
    "cracked_pavement": ["crack", "cracked_road", "pavement_crack", "longitudinal_crack",
                         "transverse_crack", "alligator_crack"],
    "damaged_curb": ["curb_damage", "kerb_damage", "broken_curb"],
    "broken_sidewalk": ["sidewalk_damage", "pavement_damage", "footpath_damage"],
    "collapsed_wall": ["wall_collapse", "collapsed_structure", "building_damage"],
    "exposed_rebar": ["rebar", "exposed_steel", "reinforcement"],
    "corroded_pipe": ["corroded_pipe", "rusty_pipe", "pipe_corrosion"],
    "road_subsidence": ["subsidence", "sinkhole", "road_depression", "rutting"],
    "bridge_damage": ["bridge_crack", "bridge_damage"],
    "patch_repair": ["patch", "road_patch", "repair"],
    "road_marking_damage": ["faded_marking", "road_marking", "line_damage"],

    # VECTOR HABITATS (8 classes)
    "mosquito_breeding_water": ["water_container", "old_container", "water_storage"],
    "rat_burrow": ["rat", "rodent", "burrow", "rat_hole"],
    "fly_swarm_area": ["fly", "flies", "insect_swarm"],
    "cockroach_habitat": ["cockroach", "dark_damp_area"],
    "bird_nesting_hazard": ["bird_nest", "nesting", "bird_dropping"],
    "stray_animal_zone": ["stray_dog", "stray_cat", "animal_waste"],
    "tick_habitat": ["tall_grass", "vegetation_overgrowth", "tick_zone"],
    "flea_infestation_zone": ["flea", "infested_area"],

    # CLEAN BASELINES (9 classes)
    "clean_road": ["clean_road", "maintained_road", "clear_pavement"],
    "clean_park": ["park", "garden", "green_space", "clean_outdoor"],
    "clean_waterway": ["clean_river", "clean_water", "treated_water"],
    "sanitized_facility": ["sanitized", "clean_facility", "maintained_facility"],
    "maintained_infrastructure": ["maintained", "repaired", "good_condition"],
    "clean_construction_site": ["safe_construction", "clean_site"],
    "clean_drainage": ["clear_drain", "functioning_drain"],
    "clean_residential": ["clean_street", "residential_clean"],
    "clean_commercial": ["clean_market", "clean_commercial"]
}

ALL_ENV_CLASSES = list(ENVIRONMENTAL_TAXONOMY.keys())
NUM_ENV_CLASSES = len(ALL_ENV_CLASSES)
CLASS_TO_IDX = {cls: idx for idx, cls in enumerate(ALL_ENV_CLASSES)}
IDX_TO_CLASS = {idx: cls for cls, idx in CLASS_TO_IDX.items()}


# =============================================================================
# DATASET WITH LABEL MAPPING
# =============================================================================

class UnifiedEnvironmentalDataset(Dataset):
    """
    Loads real environmental images from TACO, TrashNet, RDD2022, FloodNet.
    Maps their original labels to GeoSick's unified 65-class taxonomy.
    """

    VALID_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff'}

    def __init__(self, root_dirs: List[Path], transform=None, min_samples: int = 5):
        self.transform = transform
        self.samples: List[Tuple[str, int]] = []
        self.class_counts: Dict[str, int] = {cls: 0 for cls in ALL_ENV_CLASSES}

        # Build reverse lookup: original label → GeoSick taxonomy class
        label_map: Dict[str, str] = {}
        for geosick_cls, original_labels in ENVIRONMENTAL_TAXONOMY.items():
            for orig in original_labels:
                label_map[orig.lower()] = geosick_cls

        def map_label(raw_label: str) -> str:
            """Maps a raw dataset label to GeoSick class"""
            raw = raw_label.lower().replace(' ', '_').replace('-', '_')
            # Exact match first
            if raw in label_map:
                return label_map[raw]
            # Partial match
            for orig, geosick in label_map.items():
                if orig in raw or raw in orig:
                    return geosick
            # Default to mixed_garbage_heap for unknown waste
            return "mixed_garbage_heap"

        for root_dir in root_dirs:
            if not root_dir.exists():
                print(f"  [SKIP] {root_dir.name} not found")
                continue

            print(f"  [*] Scanning {root_dir.name}...")
            for cls_dir in sorted(root_dir.iterdir()):
                if not cls_dir.is_dir() or cls_dir.name.startswith('.'):
                    continue

                geosick_cls = map_label(cls_dir.name)
                cls_idx = CLASS_TO_IDX[geosick_cls]

                imgs = [f for f in cls_dir.iterdir()
                        if f.suffix.lower() in self.VALID_EXTENSIONS]

                for img_path in imgs:
                    self.samples.append((str(img_path), cls_idx))
                    self.class_counts[geosick_cls] += 1

        # Also scan nested image directories (TACO structure)
        for root_dir in root_dirs:
            images_dir = root_dir / "images"
            if images_dir.exists():
                # Use annotations to map images to classes
                anno_path = root_dir / "annotations.json"
                if anno_path.exists():
                    self._load_taco_annotations(images_dir, anno_path, label_map)

        # Remove classes with fewer than min_samples (can't train on them)
        filtered = [(p, l) for p, l in self.samples
                    if self.class_counts[IDX_TO_CLASS[l]] >= min_samples]
        self.samples = filtered

        active_classes = set(IDX_TO_CLASS[l] for _, l in self.samples)
        print(f"  [*] Total: {len(self.samples)} images, {len(active_classes)} active classes")

    def _load_taco_annotations(self, images_dir: Path, anno_path: Path, label_map: Dict):
        """Load TACO COCO-format annotations"""
        try:
            with open(anno_path, 'r') as f:
                data = json.load(f)

            categories = {c['id']: c['name'] for c in data.get('categories', [])}
            img_to_file = {img['id']: img.get('file_name', '') for img in data.get('images', [])}

            # Get category per image (use first annotation)
            img_cat = {}
            for ann in data.get('annotations', []):
                if ann['image_id'] not in img_cat:
                    img_cat[ann['image_id']] = ann['category_id']

            for img_id, cat_id in img_cat.items():
                fname = img_to_file.get(img_id, '')
                cat_name = categories.get(cat_id, 'trash')
                geosick_cls = label_map.get(cat_name.lower().replace(' ', '_'), 'mixed_garbage_heap')

                img_path = images_dir / fname
                if img_path.exists():
                    self.samples.append((str(img_path), CLASS_TO_IDX[geosick_cls]))
                    self.class_counts[geosick_cls] += 1
        except Exception as e:
            print(f"  [!] Could not load TACO annotations: {e}")

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        try:
            image = Image.open(path).convert("RGB")
        except Exception:
            image = Image.new("RGB", (224, 224), (100, 100, 100))
        if self.transform:
            image = self.transform(image)
        return image, label

    def get_class_weights(self) -> torch.Tensor:
        active_counts = np.array([
            max(self.class_counts[IDX_TO_CLASS[i]], 1)
            for i in range(NUM_ENV_CLASSES)
        ])
        weights = 1.0 / active_counts
        weights /= weights.sum()
        weights *= NUM_ENV_CLASSES
        return torch.FloatTensor(weights)

    def get_sampler_weights(self) -> torch.Tensor:
        class_weights = self.get_class_weights()
        return torch.FloatTensor([class_weights[lbl] for _, lbl in self.samples])


class TransformedEnvSubset(Dataset):
    """Applies specific transforms to a subset of dataset samples without reloading"""
    def __init__(self, full_dataset: UnifiedEnvironmentalDataset, indices: List[int], transform=None):
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
            image = Image.new("RGB", (224, 224), (100, 100, 100))
        if self.transform:
            image = self.transform(image)
        return image, label


# =============================================================================
# EFFICIENTNET-B0 FOR ENVIRONMENTAL
# =============================================================================

def build_env_model(num_classes: int, freeze_layers: int = 5) -> nn.Module:
    model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.IMAGENET1K_V1)

    for i, block in enumerate(model.features):
        if i < freeze_layers:
            for param in block.parameters():
                param.requires_grad = False

    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.35),
        nn.Linear(in_features, 256),
        nn.ReLU(inplace=True),
        nn.BatchNorm1d(256),
        nn.Dropout(p=0.2),
        nn.Linear(256, num_classes)
    )

    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total = sum(p.numel() for p in model.parameters())
    print(f"  [*] EfficientNet-B0: {trainable:,}/{total:,} trainable params")
    print(f"  [*] Output classes: {num_classes}")
    return model


# =============================================================================
# TRAINING LOOP
# =============================================================================

def train_env_model(
    epochs: int = 40,
    batch_size: int = 32,
    lr: float = 3e-4,
    freeze_layers: int = 5,
    resume: bool = False,
    unfreeze_at: int = 12
) -> Dict[str, Any]:

    print("=" * 75)
    print("  GEOSICK REAL ENVIRONMENTAL MODEL TRAINING")
    print(f"  Architecture: EfficientNet-B0 | Classes: {NUM_ENV_CLASSES}")
    print("=" * 75)

    device = (torch.device("mps") if torch.backends.mps.is_available()
              else torch.device("cuda") if torch.cuda.is_available()
              else torch.device("cpu"))
    print(f"  [*] Device: {device.type.upper()}")

    # Augmentations tuned for outdoor/urban scene photography
    train_tf = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomResizedCrop(224, scale=(0.65, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(25),
        transforms.ColorJitter(brightness=0.35, contrast=0.35, saturation=0.25, hue=0.1),
        transforms.RandomAffine(degrees=0, translate=(0.1, 0.1), shear=10),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        transforms.RandomErasing(p=0.2)
    ])

    val_tf = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    source_dirs = [
        ENV_DATA_DIR / "trashnet",
        ENV_DATA_DIR / "taco",
        BASE_DIR / "data" / "augmented_environmental_images",
        BASE_DIR / "data" / "environmental_images",
        ENV_DATA_DIR / "rdd2022",
        ENV_DATA_DIR / "floodnet",
    ]

    full_dataset = UnifiedEnvironmentalDataset(source_dirs, transform=train_tf)

    if len(full_dataset) == 0:
        print("\n  [ERROR] No images found! Run: python download_real_datasets.py")
        return {"status": "error", "message": "No data"}

    total = len(full_dataset)
    train_size = int(0.85 * total)
    val_size = total - train_size
    generator = torch.Generator().manual_seed(42)
    shuffled_indices = torch.randperm(total, generator=generator).tolist()
    train_indices = shuffled_indices[:train_size]
    val_indices = shuffled_indices[train_size:]

    train_ds = TransformedEnvSubset(full_dataset, train_indices, transform=train_tf)
    val_ds = TransformedEnvSubset(full_dataset, val_indices, transform=val_tf)

    # Weighted sampler for imbalance
    sample_weights = full_dataset.get_sampler_weights()
    train_sampler = WeightedRandomSampler(
        sample_weights[train_indices], len(train_indices), replacement=True
    )

    train_loader = DataLoader(train_ds, batch_size=batch_size, sampler=train_sampler,
                              num_workers=0, pin_memory=(device.type != 'cpu'), drop_last=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False,
                            num_workers=0, pin_memory=(device.type != 'cpu'))

    model = build_env_model(NUM_ENV_CLASSES, freeze_layers).to(device)

    class_weights = full_dataset.get_class_weights().to(device)
    criterion = nn.CrossEntropyLoss(weight=class_weights, label_smoothing=0.1)

    backbone_params = [p for n, p in model.named_parameters() if 'classifier' not in n and p.requires_grad]
    classifier_params = [p for n, p in model.named_parameters() if 'classifier' in n]

    optimizer = optim.AdamW([
        {'params': backbone_params, 'lr': lr * 0.1},
        {'params': classifier_params, 'lr': lr}
    ], weight_decay=1e-4)

    scheduler = optim.lr_scheduler.CosineAnnealingWarmRestarts(optimizer, T_0=8, T_mult=2, eta_min=1e-7)

    start_epoch = 1
    best_val_acc = 0.0

    if resume and BEST_MODEL_PATH.exists():
        ckpt = torch.load(BEST_MODEL_PATH, map_location=device)
        if isinstance(ckpt, dict) and 'model_state' in ckpt:
            model.load_state_dict(ckpt['model_state'])
            start_epoch = ckpt.get('epoch', 1) + 1
            best_val_acc = ckpt.get('best_val_acc', 0.0)
            print(f"  [*] Resumed from epoch {start_epoch-1}")

    best_epoch = start_epoch
    patience_counter = 0
    patience = 8
    epoch_metrics = []

    print(f"\n  Training: {epochs} epochs | Backbone unfreezes at epoch {unfreeze_at}\n")

    for epoch in range(start_epoch, epochs + 1):

        if epoch == unfreeze_at:
            print(f"\n  [*] Epoch {epoch}: Unfreezing full backbone")
            for param in model.parameters():
                param.requires_grad = True
            optimizer = optim.AdamW(model.parameters(), lr=lr * 0.01, weight_decay=1e-4)
            scheduler = optim.lr_scheduler.CosineAnnealingLR(
                optimizer, T_max=epochs - epoch, eta_min=1e-7
            )

        # --- TRAIN ---
        model.train()
        train_loss, train_correct, train_top5, train_total = 0.0, 0, 0, 0

        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()

            train_loss += loss.item() * images.size(0)
            _, preds = outputs.max(1)
            train_correct += preds.eq(labels).sum().item()
            if NUM_ENV_CLASSES >= 5:
                _, top5 = outputs.topk(5, dim=1)
                train_top5 += sum(labels[i] in top5[i] for i in range(len(labels)))
            train_total += labels.size(0)

        scheduler.step()
        train_loss /= train_total
        train_acc = 100.0 * train_correct / train_total
        train_top5_acc = 100.0 * train_top5 / train_total if NUM_ENV_CLASSES >= 5 else train_acc

        # --- VALIDATE ---
        model.eval()
        val_loss, val_correct, val_top5, val_total = 0.0, 0, 0, 0

        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)
                val_loss += loss.item() * images.size(0)
                _, preds = outputs.max(1)
                val_correct += preds.eq(labels).sum().item()
                if NUM_ENV_CLASSES >= 5:
                    _, top5 = outputs.topk(5, dim=1)
                    val_top5 += sum(labels[i] in top5[i] for i in range(len(labels)))
                val_total += labels.size(0)

        val_loss /= val_total
        val_acc = 100.0 * val_correct / val_total
        val_top5_acc = 100.0 * val_top5 / val_total if NUM_ENV_CLASSES >= 5 else val_acc
        current_lr = optimizer.param_groups[-1]['lr']

        print(f"  Epoch {epoch:03d}/{epochs} | LR:{current_lr:.2e} | "
              f"Train: {train_acc:.1f}% (T5:{train_top5_acc:.1f}%) | "
              f"Val: {val_acc:.1f}% (T5:{val_top5_acc:.1f}%) Loss:{val_loss:.4f}")

        epoch_metrics.append({
            "epoch": epoch, "train_loss": round(train_loss, 4),
            "train_acc_top1": round(train_acc, 2), "train_acc_top5": round(train_top5_acc, 2),
            "val_loss": round(val_loss, 4), "val_acc_top1": round(val_acc, 2),
            "val_acc_top5": round(val_top5_acc, 2), "lr": current_lr
        })

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_epoch = epoch
            patience_counter = 0
            torch.save({
                'model_state': model.state_dict(), 'epoch': epoch,
                'best_val_acc': best_val_acc, 'num_classes': NUM_ENV_CLASSES,
                'class_to_idx': CLASS_TO_IDX, 'idx_to_class': IDX_TO_CLASS,
            }, BEST_MODEL_PATH)
            print(f"  ★ New best: {best_val_acc:.2f}%")
        else:
            patience_counter += 1
            if patience_counter >= patience and epoch >= 15:
                print(f"\n  [*] Early stopping. Best: {best_val_acc:.2f}% (epoch {best_epoch})")
                break

    # Save class mappings
    with open(CHECKPOINT_DIR / "env_class_mapping.json", 'w') as f:
        json.dump({
            "class_to_idx": CLASS_TO_IDX, "idx_to_class": IDX_TO_CLASS,
            "taxonomy": ENVIRONMENTAL_TAXONOMY, "num_classes": NUM_ENV_CLASSES
        }, f, indent=2)

    metrics = {
        "status": "trained", "architecture": "EfficientNet-B0 (ImageNet pretrained)",
        "domain": f"{NUM_ENV_CLASSES}-Class Environmental Hazard",
        "device": device.type, "total_samples": total,
        "num_classes": NUM_ENV_CLASSES, "epochs_trained": len(epoch_metrics),
        "best_epoch": best_epoch, "best_val_acc_top1": round(best_val_acc, 2),
        "classes": ALL_ENV_CLASSES, "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "epoch_metrics": epoch_metrics
    }

    with open(METRICS_PATH, 'w') as f:
        json.dump(metrics, f, indent=2)

    print(f"\n{'='*75}")
    print(f"  DONE | Best Val: {best_val_acc:.2f}% | Model: {BEST_MODEL_PATH}")
    print(f"{'='*75}")
    return metrics


def parse_args():
    p = argparse.ArgumentParser(description="Train GeoSick Environmental Model on Real Data")
    p.add_argument('--epochs', type=int, default=40)
    p.add_argument('--batch-size', type=int, default=32)
    p.add_argument('--lr', type=float, default=3e-4)
    p.add_argument('--freeze-layers', type=int, default=5)
    p.add_argument('--unfreeze-at', type=int, default=12)
    p.add_argument('--resume', action='store_true')
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()
    train_env_model(
        epochs=args.epochs, batch_size=args.batch_size, lr=args.lr,
        freeze_layers=args.freeze_layers, resume=args.resume, unfreeze_at=args.unfreeze_at
    )
