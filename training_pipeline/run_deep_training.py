#!/usr/bin/env python3
"""
GeoSick-AI Deep Training Orchestrator (Option 2)
Executes extended fine-tuning for both Clinical (200 classes) and Environmental (65 classes)
models using Apple Silicon MPS acceleration, followed by automated ONNX export & benchmark evaluation.

Usage:
  python3 run_deep_training.py [--clinical-epochs 25] [--env-epochs 20] [--batch-size 32]
"""

import sys
import time
import subprocess
import argparse
from pathlib import Path

BASE_DIR = Path(__file__).parent
PYTHON_EXE = sys.executable

def run_step(step_name: str, cmd: list):
    print(f"\n{'='*80}")
    print(f"  STARTING: {step_name}")
    print(f"  COMMAND:  {' '.join(cmd)}")
    print(f"{'='*80}\n", flush=True)

    t0 = time.time()
    process = subprocess.Popen(
        cmd,
        cwd=str(BASE_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    for line in iter(process.stdout.readline, ''):
        print(line, end='', flush=True)

    process.stdout.close()
    ret = process.wait()
    duration = time.time() - t0

    if ret != 0:
        print(f"\n[!] ERROR in {step_name} (Exit code {ret}) after {duration:.1f}s", flush=True)
        sys.exit(ret)
    else:
        print(f"\n[✓] COMPLETED: {step_name} in {duration/60:.2f} minutes\n", flush=True)


def main():
    parser = argparse.ArgumentParser(description="GeoSick-AI Deep Training Loop")
    parser.add_argument('--clinical-epochs', type=int, default=25, help="Epochs for clinical model (default: 25)")
    parser.add_argument('--env-epochs', type=int, default=20, help="Epochs for environmental model (default: 20)")
    parser.add_argument('--batch-size', type=int, default=32, help="Batch size (default: 32)")
    args = parser.parse_args()

    overall_start = time.time()
    print("\n" + "#"*80)
    print("  GEOSICK-AI DEEP MODEL CONVERGENCE & BENCHMARK SUITE")
    print(f"  Target Clinical Epochs:      {args.clinical_epochs}")
    print(f"  Target Environmental Epochs: {args.env_epochs}")
    print(f"  Batch Size:                 {args.batch_size}")
    print("#"*80 + "\n", flush=True)

    # 1. Clinical Model Extended Training
    run_step(
        f"Phase 1: Clinical Model Extended Training (Up to {args.clinical_epochs} Epochs)",
        [
            PYTHON_EXE,
            "train_clinical_real.py",
            "--resume",
            "--epochs", str(args.clinical_epochs),
            "--batch-size", str(args.batch_size),
            "--lr", "1e-4",
            "--unfreeze-at", "10"
        ]
    )

    # 2. Environmental Model Extended Training
    run_step(
        f"Phase 2: Environmental Model Extended Training (Up to {args.env_epochs} Epochs)",
        [
            PYTHON_EXE,
            "train_env_real.py",
            "--resume",
            "--epochs", str(args.env_epochs),
            "--batch-size", str(args.batch_size),
            "--lr", "1e-4",
            "--unfreeze-at", "8"
        ]
    )

    # 3. ONNX Re-export for Browser WASM
    run_step(
        "Phase 3: WebAssembly ONNX Model Re-Export",
        [
            PYTHON_EXE,
            "export_onnx_efficientnet.py"
        ]
    )

    # 4. Academic Evaluation & Benchmark Matrix
    run_step(
        "Phase 4: Academic Evaluation & SOTA Metrics Matrix",
        [
            PYTHON_EXE,
            "evaluate_models.py"
        ]
    )

    total_time = time.time() - overall_start
    print("\n" + "#"*80)
    print(f"  ALL PHASES COMPLETED SUCCESSFULLY IN {total_time/60:.2f} MINUTES")
    print("  ✓ Clinical Model: Checkpoint updated + Top-K evaluated")
    print("  ✓ Environmental Model: Checkpoint updated + Top-K evaluated")
    print("  ✓ Public ONNX Models Re-exported for Browser WebAssembly")
    print("  ✓ Scientific Evaluation Reports Ready for Publication/Competition")
    print("#"*80 + "\n", flush=True)


if __name__ == "__main__":
    main()
