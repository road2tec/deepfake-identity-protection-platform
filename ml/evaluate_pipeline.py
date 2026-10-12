"""Evaluate the full backend pipeline (face detection -> crop -> classifier) on held-out images.

Uses the second test shard (test-00001), which train_cnn.py never touches.
Usage:  python ml/evaluate_pipeline.py --n 1000
"""
import argparse
import io
import json
import os
import sys
import tempfile

import pandas as pd
from huggingface_hub import hf_hub_download
from PIL import Image
from sklearn.metrics import accuracy_score, confusion_matrix

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "backend"))
from app.detectors.image_detector import detector  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=1000)
    args = ap.parse_args()

    shard = hf_hub_download("TheKernel01/140k-Real-and-Fake-Faces", "data/test-00001-of-00002.parquet",
                            repo_type="dataset", local_dir=os.path.join(ROOT, "ml", "data"))
    df = pd.read_parquet(shard)
    df = pd.concat([df[df.label == c].sample(args.n // 2, random_state=7) for c in (0, 1)])

    preds, labels = [], []
    tmp = tempfile.mkdtemp()
    for i, (_, row) in enumerate(df.iterrows()):
        path = os.path.join(tmp, f"{i}.jpg")
        Image.open(io.BytesIO(row["image"]["bytes"])).convert("RGB").save(path, quality=95)
        res = detector.analyze(path)
        os.remove(path)
        preds.append(1 if res["label"] == "FAKE" else 0)
        labels.append(int(row["label"]))
        print(f"  {i + 1}/{len(df)}", end="\r", flush=True)

    acc = accuracy_score(labels, preds)
    cm = confusion_matrix(labels, preds)
    print(f"\nEnd-to-end pipeline accuracy: {acc:.4f} on {len(df)} images")
    print("Confusion matrix [[TN FP] [FN TP]]:\n", cm)

    path = os.path.join(ROOT, "models", "image_detector", "metrics.json")
    metrics = json.load(open(path)) if os.path.exists(path) else {}
    metrics["pipeline_accuracy"] = round(float(acc), 4)
    metrics["pipeline_images"] = len(df)
    metrics["pipeline_confusion_matrix"] = cm.tolist()
    json.dump(metrics, open(path, "w"), indent=2)


if __name__ == "__main__":
    main()
