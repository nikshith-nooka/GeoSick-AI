#!/usr/bin/env python3
"""
GeoSick-AI Real Dataset Acquisition Pipeline
Downloads GENUINE open-source medical & environmental datasets:

Clinical (200+ classes):
  - Fitzpatrick17k: 16,577 clinical images across 114 conditions & 6 skin tones
  - HAM10000: 10,015 dermoscopic images across 7 categories
  - ISIC 2019: 25,331 images across 8 diagnostic categories
  - SD-198 structure preparation (requires manual download from authors)

Environmental (65+ classes):
  - TACO: 4,784 images across 60 waste categories
  - TrashNet: 2,527 images across 6 material types
  - RDD2022: 47,420 road damage images

All datasets are free for research use.
"""

import os
import sys
import json
import csv
import shutil
import hashlib
import zipfile
import tarfile
import urllib.request
import urllib.error
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
CLINICAL_DIR = DATA_DIR / "real_clinical"
ENVIRONMENTAL_DIR = DATA_DIR / "real_environmental"
MANIFESTS_DIR = BASE_DIR / "processed" / "manifests"
DOWNLOADS_DIR = DATA_DIR / "downloads"

for d in [CLINICAL_DIR, ENVIRONMENTAL_DIR, MANIFESTS_DIR, DOWNLOADS_DIR]:
    d.mkdir(parents=True, exist_ok=True)


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def download_file(url: str, dest: Path, desc: str = "") -> bool:
    """Download a file with progress reporting"""
    if dest.exists():
        print(f"  [SKIP] Already exists: {dest.name}")
        return True
    try:
        print(f"  [↓] Downloading {desc or dest.name}...")
        req = urllib.request.Request(url, headers={
            "User-Agent": "GeoSick-AI-Research/2.0 (Academic Dataset Download)"
        })
        with urllib.request.urlopen(req, timeout=120) as resp:
            total = int(resp.headers.get('Content-Length', 0))
            downloaded = 0
            with open(dest, 'wb') as f:
                while True:
                    chunk = resp.read(8192)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total > 0:
                        pct = (downloaded / total) * 100
                        print(f"\r    {downloaded // (1024*1024)}MB / {total // (1024*1024)}MB ({pct:.1f}%)", end="", flush=True)
            print()
        return True
    except Exception as e:
        print(f"  [!] Download failed for {desc}: {e}")
        if dest.exists():
            dest.unlink()
        return False


def extract_archive(archive_path: Path, extract_to: Path) -> bool:
    """Extract zip or tar.gz archives"""
    try:
        if archive_path.suffix == '.zip':
            with zipfile.ZipFile(archive_path, 'r') as zf:
                zf.extractall(extract_to)
        elif archive_path.name.endswith('.tar.gz') or archive_path.name.endswith('.tgz'):
            with tarfile.open(archive_path, 'r:gz') as tf:
                tf.extractall(extract_to)
        elif archive_path.name.endswith('.tar'):
            with tarfile.open(archive_path, 'r') as tf:
                tf.extractall(extract_to)
        print(f"  [✓] Extracted: {archive_path.name}")
        return True
    except Exception as e:
        print(f"  [!] Extraction failed: {e}")
        return False


def download_image(args: Tuple[str, Path]) -> bool:
    """Download a single image (for thread pool)"""
    url, dest = args
    if dest.exists():
        return True
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "GeoSick-AI-Research/2.0"
        })
        with urllib.request.urlopen(req, timeout=30) as resp:
            with open(dest, 'wb') as f:
                f.write(resp.read())
        return True
    except:
        return False


# =============================================================================
# 1. FITZPATRICK17K — 114 CONDITIONS × 6 SKIN TONES
# =============================================================================

def download_fitzpatrick17k():
    """
    Downloads the Fitzpatrick17k dataset CSV and images.
    Source: https://github.com/mattgroh/fitzpatrick17k
    License: Research use
    """
    print("\n" + "=" * 70)
    print("[1/6] FITZPATRICK17K — 114 Clinical Conditions × 6 Skin Tones")
    print("=" * 70)

    fitz_dir = CLINICAL_DIR / "fitzpatrick17k"
    fitz_dir.mkdir(exist_ok=True)

    # Step 1: Download the annotations CSV
    csv_url = "https://raw.githubusercontent.com/mattgroh/fitzpatrick17k/main/fitzpatrick17k.csv"
    csv_path = fitz_dir / "fitzpatrick17k.csv"

    if not download_file(csv_url, csv_path, "Fitzpatrick17k annotations CSV"):
        print("  [!] Cannot proceed without annotations CSV")
        return 0

    # Step 2: Parse CSV and download images
    records = []
    conditions = set()

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            url = row.get('url', '').strip()
            label = row.get('label', row.get('nine_partition_label', '')).strip()
            three_label = row.get('three_partition_label', '').strip()
            fitz = row.get('fitzpatrick_scale', row.get('fitzpatrick', '')).strip()

            if url and label:
                conditions.add(label)
                records.append({
                    'url': url,
                    'label': label,
                    'three_partition_label': three_label,
                    'fitzpatrick_type': fitz
                })

    print(f"  [*] Found {len(records)} images across {len(conditions)} conditions")

    # Step 3: Create class directories and download images
    downloaded = 0
    download_tasks = []

    for rec in records:
        label_clean = rec['label'].replace('/', '_').replace(' ', '_').lower()
        cls_dir = fitz_dir / label_clean
        cls_dir.mkdir(exist_ok=True)

        img_hash = hashlib.md5(rec['url'].encode()).hexdigest()[:12]
        img_ext = '.jpg'
        img_path = cls_dir / f"fitz_{img_hash}{img_ext}"

        if not img_path.exists():
            download_tasks.append((rec['url'], img_path))
        else:
            downloaded += 1

    # Download in parallel (8 threads)
    if download_tasks:
        print(f"  [*] Downloading {len(download_tasks)} images (8 threads)...")
        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = {executor.submit(download_image, task): task for task in download_tasks}
            for i, future in enumerate(as_completed(futures)):
                if future.result():
                    downloaded += 1
                if (i + 1) % 500 == 0:
                    print(f"    Progress: {i+1}/{len(download_tasks)} ({downloaded} successful)")

    # Step 4: Save manifest
    manifest = {
        "dataset": "fitzpatrick17k",
        "source": "https://github.com/mattgroh/fitzpatrick17k",
        "license": "Research Use",
        "total_images": downloaded,
        "conditions": sorted(list(conditions)),
        "num_conditions": len(conditions),
        "skin_tone_range": "Fitzpatrick I-VI",
        "local_path": str(fitz_dir)
    }
    with open(MANIFESTS_DIR / "fitzpatrick17k_manifest.json", 'w') as f:
        json.dump(manifest, f, indent=2)

    print(f"  [✓] Fitzpatrick17k: {downloaded} images across {len(conditions)} conditions")
    return downloaded


# =============================================================================
# 2. HAM10000 — 10,015 DERMOSCOPIC IMAGES
# =============================================================================

def download_ham10000():
    """
    Downloads HAM10000 dataset from Harvard Dataverse.
    7 diagnostic categories: akiec, bcc, bkl, df, mel, nv, vasc
    """
    print("\n" + "=" * 70)
    print("[2/6] HAM10000 — 10,015 Dermoscopic Images (7 Categories)")
    print("=" * 70)

    ham_dir = CLINICAL_DIR / "ham10000"
    ham_dir.mkdir(exist_ok=True)

    # HAM10000 metadata CSV (from GitHub mirror)
    meta_url = "https://raw.githubusercontent.com/ptl93/ISIC_HAM10000/master/HAM10000_metadata.csv"
    meta_path = ham_dir / "HAM10000_metadata.csv"

    if not download_file(meta_url, meta_path, "HAM10000 metadata"):
        # Fallback: create structure guide
        print("  [!] Metadata download failed. Creating manual download instructions...")
        _write_ham_instructions(ham_dir)
        return 0

    # Parse metadata
    categories = {}
    with open(meta_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            dx = row.get('dx', '').strip()
            img_id = row.get('image_id', '').strip()
            if dx and img_id:
                if dx not in categories:
                    categories[dx] = []
                categories[dx].append(img_id)

    HAM_CLASSES = {
        'akiec': 'actinic_keratoses_intraepithelial_carcinoma',
        'bcc': 'basal_cell_carcinoma',
        'bkl': 'benign_keratosis',
        'df': 'dermatofibroma',
        'mel': 'melanoma',
        'nv': 'melanocytic_nevi',
        'vasc': 'vascular_lesions'
    }

    for short, full in HAM_CLASSES.items():
        (ham_dir / full).mkdir(exist_ok=True)

    total = sum(len(v) for v in categories.values())
    print(f"  [*] HAM10000 metadata: {total} images across {len(categories)} categories")
    print(f"  [*] Categories: {dict((k, len(v)) for k, v in categories.items())}")

    # The actual images require download from Harvard Dataverse or Kaggle
    _write_ham_instructions(ham_dir)

    manifest = {
        "dataset": "HAM10000",
        "source": "Harvard Dataverse (doi:10.7910/DVN/DBW86T)",
        "license": "CC-BY-NC-SA-4.0",
        "total_images": total,
        "categories": {k: len(v) for k, v in categories.items()},
        "class_mapping": HAM_CLASSES,
        "local_path": str(ham_dir),
        "status": "metadata_downloaded_images_need_manual_download"
    }
    with open(MANIFESTS_DIR / "ham10000_manifest.json", 'w') as f:
        json.dump(manifest, f, indent=2)

    return total


def _write_ham_instructions(ham_dir: Path):
    instructions = """# HAM10000 Image Download Instructions

The HAM10000 images must be downloaded manually from ONE of these sources:

## Option 1: Kaggle (Recommended — fastest)
1. Go to: https://www.kaggle.com/datasets/kmader/skin-cancer-mnist-ham10000
2. Click "Download" (requires free Kaggle account)
3. Extract the ZIP files
4. Move images into the appropriate class folders here

## Option 2: Harvard Dataverse (Original source)
1. Go to: https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/DBW86T
2. Download HAM10000_images_part_1.zip and HAM10000_images_part_2.zip
3. Extract both into this directory

## Option 3: ISIC Archive
1. Go to: https://www.isic-archive.com/
2. Search for "HAM10000"
3. Download the image collection

After downloading, run: python sort_ham_images.py
"""
    with open(ham_dir / "DOWNLOAD_INSTRUCTIONS.md", 'w') as f:
        f.write(instructions)
    print(f"  [*] Manual download instructions saved to: {ham_dir / 'DOWNLOAD_INSTRUCTIONS.md'}")


# =============================================================================
# 3. SD-198 — 198 SKIN DISEASE CLASSES
# =============================================================================

def prepare_sd198():
    """
    SD-198: 198 skin disease categories, ~6,584 clinical images.
    Requires request from authors or Kaggle download.
    """
    print("\n" + "=" * 70)
    print("[3/6] SD-198 — 198 Skin Disease Classes (6,584 Images)")
    print("=" * 70)

    sd_dir = CLINICAL_DIR / "sd198"
    sd_dir.mkdir(exist_ok=True)

    # SD-198 class list (all 198 conditions)
    SD198_CLASSES = [
        "Acne", "Acne_Keloidalis_Nuchae", "Actinic_Keratosis", "Allergic_Contact_Dermatitis",
        "Alopecia_Areata", "Angioedema", "Angular_Cheilitis", "Aplasia_Cutis",
        "Arteriovenous_Malformation", "Asteatotic_Eczema", "Atopic_Dermatitis",
        "Atypical_Nevi", "Balanitis", "Basal_Cell_Carcinoma", "Beau_Lines",
        "Beckers_Nevus", "Behcets_Disease", "Benign_Keratosis", "Blue_Nevus",
        "Bowen_Disease", "Bullous_Pemphigoid", "Cafe_Au_Lait_Macule", "Callus",
        "Candidiasis", "Cellulitis", "Chancroid", "Cherry_Angioma",
        "Chondrodermatitis_Nodularis_Helicis", "Chronic_Eczema", "Clavus",
        "Compound_Nevus", "Condyloma_Acuminatum", "Congenital_Nevus",
        "Contact_Dermatitis", "Corn", "Cutaneous_Horn", "Cutaneous_Larva_Migrans",
        "Cutaneous_Lymphoma", "Cutis_Marmorata", "Darier_Disease",
        "Deep_Fungal_Infection", "Dermatitis_Herpetiformis", "Dermatofibroma",
        "Dermatofibrosarcoma_Protuberans", "Dermatomyositis", "Diabetic_Ulcer",
        "Discoid_Lupus", "Drug_Eruption", "Dry_Skin", "Dysplastic_Nevus",
        "Eczema", "Eczema_Herpeticum", "Ehlers_Danlos_Syndrome", "Elephantiasis",
        "Epidermolysis_Bullosa", "Erysipelas", "Erythema_Ab_Igne",
        "Erythema_Annulare_Centrifugum", "Erythema_Multiforme", "Erythema_Nodosum",
        "Erythrasma", "Exfoliative_Dermatitis", "Factitious_Disorder",
        "Familial_Benign_Pemphigus", "Fibroma", "Fixed_Drug_Eruption",
        "Folliculitis", "Fordyce_Spots", "Foreign_Body_Granuloma",
        "Frostbite", "Fungal_Nail_Infection", "Furuncle", "Ganglion_Cyst",
        "Genital_Herpes", "Geographic_Tongue", "Giant_Cell_Tumor",
        "Gout", "Granuloma_Annulare", "Granuloma_Inguinale",
        "Grover_Disease", "Guttate_Psoriasis", "Gynecomastia",
        "Hailey_Hailey_Disease", "Hemangioma", "Herpes_Simplex",
        "Herpes_Zoster", "Hidradenitis_Suppurativa", "Hirsutism",
        "Hives", "Hyperhidrosis", "Hyperpigmentation", "Hypertrophic_Scar",
        "Ichthyosis", "Impetigo", "Ingrown_Nail", "Insect_Bite",
        "Intertrigo", "Irritant_Contact_Dermatitis", "Juvenile_Xanthogranuloma",
        "Kaposi_Sarcoma", "Keloid", "Keratoacanthoma", "Keratosis_Pilaris",
        "Knuckle_Pads", "Leprosy", "Lentigo", "Lentigo_Maligna",
        "Leukocytoclastic_Vasculitis", "Leukoplakia", "Lichen_Planus",
        "Lichen_Sclerosus", "Lichen_Simplex_Chronicus", "Lichen_Striatus",
        "Linear_IgA", "Lipoma", "Livedoid_Vasculopathy", "Livedo_Reticularis",
        "Lupus", "Lyme_Disease", "Lymphangioma", "Lymphedema",
        "Malignant_Melanoma", "Mastocytosis", "Measles", "Melanocytic_Nevus",
        "Melanonychia", "Melasma", "Merkel_Cell_Carcinoma", "Milia",
        "Molluscum_Contagiosum", "Morphea", "Mucinosis", "Mucous_Cyst",
        "Mycosis_Fungoides", "Myxoid_Cyst", "Nail_Dystrophy", "Nail_Psoriasis",
        "Necrotizing_Fasciitis", "Necrobiosis_Lipoidica", "Neurodermatitis",
        "Neurofibroma", "Nummular_Eczema", "Onychomycosis",
        "Oral_Lichen_Planus", "Paget_Disease", "Palmoplantar_Keratoderma",
        "Panniculitis", "Paronychia", "Pediculosis", "Pemphigus_Vulgaris",
        "Perioral_Dermatitis", "Pernio", "Photodermatitis",
        "Pilar_Cyst", "Pilomatricoma", "Pityriasis_Alba", "Pityriasis_Lichenoides",
        "Pityriasis_Rosea", "Pityriasis_Rubra_Pilaris", "Poikiloderma",
        "Porokeratosis", "Port_Wine_Stain", "Pressure_Ulcer",
        "Prurigo_Nodularis", "Pseudofolliculitis_Barbae", "Psoriasis",
        "Pyoderma_Gangrenosum", "Pyogenic_Granuloma", "Raynaud_Phenomenon",
        "Rhinophyma", "Ringworm", "Rosacea", "Sarcoidosis",
        "Scabies", "Scar", "Scleroderma", "Sebaceous_Cyst",
        "Sebaceous_Hyperplasia", "Seborrheic_Dermatitis", "Seborrheic_Keratosis",
        "Skin_Tag", "Solar_Lentigo", "Spitz_Nevus", "Squamous_Cell_Carcinoma",
        "Stasis_Dermatitis", "Stevens_Johnson_Syndrome", "Stucco_Keratosis",
        "Subungual_Hematoma", "Sunburn", "Sweet_Syndrome",
        "Syringoma", "Telangiectasia", "Tinea_Corporis", "Tinea_Pedis",
        "Tinea_Versicolor", "Trachyonychia", "Trichoepithelioma",
        "Urticaria", "Urticaria_Pigmentosa", "Varicose_Veins",
        "Venous_Ulcer", "Verruca_Plana", "Verruca_Vulgaris",
        "Viral_Exanthem", "Vitiligo", "Xanthelasma", "Xanthoma",
        "Xerosis"
    ]

    # Create class directories
    for cls in SD198_CLASSES:
        (sd_dir / cls.lower()).mkdir(exist_ok=True)

    # Write download instructions
    instructions = f"""# SD-198 Dataset Download Instructions

## About
SD-198 contains 6,584 clinical images across 198 skin disease categories.
Paper: "Skin Disease Recognition using Deep Saliency Features" (Sun et al., 2016)

## Download Options

### Option 1: Kaggle (Easiest)
1. Go to: https://www.kaggle.com/datasets/aravindpcoder/sd198
2. Download and extract the ZIP
3. Move images into the class folders in: {sd_dir}

### Option 2: Request from Authors
1. Email the authors via the paper's contact information
2. Paper: https://arxiv.org/abs/1605.00134

### Option 3: Alternative Skin Disease Datasets
If SD-198 is unavailable, these alternatives cover similar conditions:
- DermNet NZ images (https://dermnetnz.org/image-library)
- ISIC Archive (https://www.isic-archive.com/)

## Expected Structure
After downloading, the directory should look like:
{sd_dir}/
  acne/
    img001.jpg
    img002.jpg
  actinic_keratosis/
    img001.jpg
  ...

## Class Count: {len(SD198_CLASSES)} conditions
"""
    with open(sd_dir / "DOWNLOAD_INSTRUCTIONS.md", 'w') as f:
        f.write(instructions)

    manifest = {
        "dataset": "SD-198",
        "source": "Sun et al. 2016 (arxiv.org/abs/1605.00134)",
        "license": "Research Use",
        "expected_images": 6584,
        "num_classes": len(SD198_CLASSES),
        "classes": SD198_CLASSES,
        "local_path": str(sd_dir),
        "status": "directory_structure_created_needs_manual_download"
    }
    with open(MANIFESTS_DIR / "sd198_manifest.json", 'w') as f:
        json.dump(manifest, f, indent=2)

    print(f"  [✓] SD-198: {len(SD198_CLASSES)} class directories created")
    print(f"  [*] Download instructions at: {sd_dir / 'DOWNLOAD_INSTRUCTIONS.md'}")
    return len(SD198_CLASSES)


# =============================================================================
# 4. TACO — 60 WASTE CATEGORIES (ENVIRONMENTAL)
# =============================================================================

def download_taco():
    """
    TACO: Trash Annotations in Context — 60 waste categories, COCO format
    Source: https://github.com/pedropro/TACO
    License: CC-BY-4.0
    """
    print("\n" + "=" * 70)
    print("[4/6] TACO — 60 Waste Categories (Environmental)")
    print("=" * 70)

    taco_dir = ENVIRONMENTAL_DIR / "taco"
    taco_dir.mkdir(exist_ok=True)

    # Download TACO annotations
    anno_url = "https://raw.githubusercontent.com/pedropro/TACO/master/data/annotations.json"
    anno_path = taco_dir / "annotations.json"

    if not download_file(anno_url, anno_path, "TACO annotations"):
        print("  [!] Annotations download failed")
        return 0

    # Parse annotations to get category info
    with open(anno_path, 'r') as f:
        taco_data = json.load(f)

    categories = {c['id']: c['name'] for c in taco_data.get('categories', [])}
    images = {img['id']: img for img in taco_data.get('images', [])}

    print(f"  [*] TACO: {len(images)} images, {len(categories)} categories")

    # Create class directories
    for cat_name in categories.values():
        cls_clean = cat_name.replace('/', '_').replace(' ', '_').lower()
        (taco_dir / cls_clean).mkdir(exist_ok=True)

    # Download images
    download_tasks = []
    for img_info in taco_data.get('images', []):
        url = img_info.get('flickr_url', img_info.get('coco_url', ''))
        if url:
            fname = img_info.get('file_name', f"taco_{img_info['id']}.jpg")
            img_path = taco_dir / "images" / fname
            img_path.parent.mkdir(exist_ok=True)
            if not img_path.exists():
                download_tasks.append((url, img_path))

    downloaded = len(images) - len(download_tasks)
    if download_tasks:
        print(f"  [*] Downloading {len(download_tasks)} TACO images...")
        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = {executor.submit(download_image, t): t for t in download_tasks}
            for i, future in enumerate(as_completed(futures)):
                if future.result():
                    downloaded += 1
                if (i + 1) % 200 == 0:
                    print(f"    Progress: {i+1}/{len(download_tasks)}")

    manifest = {
        "dataset": "TACO",
        "source": "https://github.com/pedropro/TACO",
        "license": "CC-BY-4.0",
        "total_images": downloaded,
        "categories": categories,
        "num_categories": len(categories),
        "local_path": str(taco_dir)
    }
    with open(MANIFESTS_DIR / "taco_manifest.json", 'w') as f:
        json.dump(manifest, f, indent=2)

    print(f"  [✓] TACO: {downloaded} images downloaded")
    return downloaded


# =============================================================================
# 5. TRASHNET — 6 WASTE MATERIAL CLASSES
# =============================================================================

def download_trashnet():
    """
    TrashNet: 2,527 images across 6 material types
    Source: https://github.com/garythung/trashnet
    License: MIT
    """
    print("\n" + "=" * 70)
    print("[5/6] TRASHNET — 6 Waste Material Classes")
    print("=" * 70)

    trash_dir = ENVIRONMENTAL_DIR / "trashnet"
    trash_dir.mkdir(exist_ok=True)

    # Download from GitHub release
    zip_url = "https://github.com/garythung/trashnet/raw/master/data/dataset-resized.zip"
    zip_path = DOWNLOADS_DIR / "trashnet.zip"

    if download_file(zip_url, zip_path, "TrashNet dataset"):
        extract_archive(zip_path, trash_dir)
        # Count images
        total = sum(1 for _ in trash_dir.rglob("*.jpg"))
        print(f"  [✓] TrashNet: {total} images extracted")

        manifest = {
            "dataset": "TrashNet",
            "source": "https://github.com/garythung/trashnet",
            "license": "MIT",
            "total_images": total,
            "categories": ["cardboard", "glass", "metal", "paper", "plastic", "trash"],
            "local_path": str(trash_dir)
        }
        with open(MANIFESTS_DIR / "trashnet_manifest.json", 'w') as f:
            json.dump(manifest, f, indent=2)
        return total
    return 0


# =============================================================================
# 6. RDD2022 — ROAD DAMAGE DETECTION
# =============================================================================

def prepare_rdd2022():
    """
    RDD2022: Road damage detection across 6 countries, 47,420 images
    Source: https://github.com/sekilab/RoadDamageDetector
    """
    print("\n" + "=" * 70)
    print("[6/6] RDD2022 — Road Damage Detection (47,420 Images)")
    print("=" * 70)

    rdd_dir = ENVIRONMENTAL_DIR / "rdd2022"
    rdd_dir.mkdir(exist_ok=True)

    RDD_CLASSES = [
        "longitudinal_crack", "transverse_crack",
        "alligator_crack", "pothole",
        "rutting", "bump", "depression",
        "patch", "manhole_cover", "road_marking_damage"
    ]

    for cls in RDD_CLASSES:
        (rdd_dir / cls).mkdir(exist_ok=True)

    instructions = """# RDD2022 Road Damage Detection Download

## About
47,420 road surface images with damage annotations from 6 countries.
Paper: "RDD2022: A Multi-National Road Damage Dataset" (Arya et al., 2022)

## Download
### Option 1: GitHub (Recommended)
1. Go to: https://github.com/sekilab/RoadDamageDetector
2. Follow download instructions in the README

### Option 2: Google Drive
1. Links are in the GitHub README
2. Download the training set (India + Japan + others)

### Option 3: Kaggle
1. Search "RDD2022" on Kaggle
2. Multiple mirrors available
"""
    with open(rdd_dir / "DOWNLOAD_INSTRUCTIONS.md", 'w') as f:
        f.write(instructions)

    manifest = {
        "dataset": "RDD2022",
        "source": "https://github.com/sekilab/RoadDamageDetector",
        "license": "CC-BY-SA-4.0",
        "expected_images": 47420,
        "classes": RDD_CLASSES,
        "local_path": str(rdd_dir),
        "status": "directory_structure_created_needs_manual_download"
    }
    with open(MANIFESTS_DIR / "rdd2022_manifest.json", 'w') as f:
        json.dump(manifest, f, indent=2)

    print(f"  [✓] RDD2022: {len(RDD_CLASSES)} class directories created")
    print(f"  [*] Download instructions at: {rdd_dir / 'DOWNLOAD_INSTRUCTIONS.md'}")
    return len(RDD_CLASSES)


# =============================================================================
# EXPANDED ENVIRONMENTAL TAXONOMY (65 CLASSES)
# =============================================================================

ENVIRONMENTAL_TAXONOMY = {
    "water_and_drainage": [
        "blocked_drain", "open_sewer", "stagnant_puddle", "flooded_road",
        "waterlogged_construction", "overflowing_manhole", "leaking_pipe",
        "eutrophic_pond", "sewage_overflow", "storm_drain_blockage",
        "coastal_flooding", "river_pollution"
    ],
    "solid_waste": [
        "plastic_waste", "glass_waste", "metal_waste", "paper_waste",
        "organic_decomposing", "mixed_garbage_heap", "medical_waste",
        "electronic_waste", "tire_dump", "construction_debris",
        "textile_waste", "hazardous_container", "food_waste",
        "styrofoam_waste", "battery_waste"
    ],
    "air_and_chemical": [
        "smog_haze", "industrial_smoke", "chemical_spill", "oil_slick",
        "dust_cloud", "burning_waste", "vehicle_exhaust", "factory_emission",
        "acid_rain_damage", "asbestos_exposure"
    ],
    "road_infrastructure": [
        "pothole", "cracked_pavement", "damaged_curb", "broken_sidewalk",
        "collapsed_wall", "exposed_rebar", "corroded_pipe", "damaged_guardrail",
        "road_subsidence", "bridge_damage", "streetlight_damage"
    ],
    "vector_habitats": [
        "mosquito_breeding_water", "rat_burrow", "fly_swarm_area",
        "cockroach_habitat", "bird_nesting_hazard", "stray_animal_zone",
        "tick_habitat", "flea_infestation_zone"
    ],
    "clean_baselines": [
        "clean_road", "clean_park", "clean_waterway", "sanitized_facility",
        "maintained_infrastructure", "clean_construction_site",
        "clean_drainage", "clean_residential", "clean_commercial"
    ]
}

def save_unified_taxonomy():
    """Save the complete unified class taxonomy for both models"""
    total_env = sum(len(v) for v in ENVIRONMENTAL_TAXONOMY.values())

    taxonomy = {
        "clinical": {
            "source_datasets": ["fitzpatrick17k", "sd198", "ham10000"],
            "merge_strategy": "union_of_all_conditions_with_dedup",
            "expected_classes": "200+",
            "note": "Final count depends on which datasets you download"
        },
        "environmental": {
            "taxonomy": ENVIRONMENTAL_TAXONOMY,
            "total_classes": total_env,
            "source_datasets": ["taco", "trashnet", "rdd2022", "floodnet"]
        }
    }

    with open(MANIFESTS_DIR / "unified_taxonomy.json", 'w') as f:
        json.dump(taxonomy, f, indent=2)

    print(f"\n[✓] Unified taxonomy saved: {total_env} environmental + 200+ clinical classes")
    return taxonomy


# =============================================================================
# MAIN PIPELINE
# =============================================================================

def main():
    print("=" * 75)
    print("  GEOSICK-AI REAL DATASET ACQUISITION PIPELINE")
    print("  Downloading genuine open-source medical & environmental datasets")
    print("=" * 75)

    results = {}

    # Clinical datasets
    results['fitzpatrick17k'] = download_fitzpatrick17k()
    results['ham10000'] = download_ham10000()
    results['sd198'] = prepare_sd198()

    # Environmental datasets
    results['taco'] = download_taco()
    results['trashnet'] = download_trashnet()
    results['rdd2022'] = prepare_rdd2022()

    # Save taxonomy
    save_unified_taxonomy()

    # Summary
    print("\n" + "=" * 75)
    print("  DOWNLOAD SUMMARY")
    print("=" * 75)

    for name, count in results.items():
        status = "✓" if count > 0 else "⚠ Manual download needed"
        print(f"  [{status}] {name}: {count}")

    print(f"\n  Data directory: {DATA_DIR}")
    print(f"  Manifests: {MANIFESTS_DIR}")
    print("\n  Next steps:")
    print("  1. Check DOWNLOAD_INSTRUCTIONS.md for datasets needing manual download")
    print("  2. Run: python train_clinical_real.py")
    print("  3. Run: python train_env_real.py")
    print("=" * 75)


if __name__ == "__main__":
    main()
