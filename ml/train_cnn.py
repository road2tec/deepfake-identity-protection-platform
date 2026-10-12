"""Fine-tune EfficientNet-B0 to separate real faces from GAN-generated faces.

Data: "140k Real and Fake Faces" (FFHQ real photos vs. StyleGAN fakes), Hugging Face mirror
TheKernel01/140k-Real-and-Fake-Faces. Download the shards first with ml/download_data.py.

Train / validation images are drawn from the train shard (disjoint), the final test set from the
separate test shard, so the reported accuracy is on images the model never saw.

Usage:  python ml/train_cnn.py --train 12000 --val 2000 --test 4000 --epochs 3
"""
import argparse
import io
import json
import os
import random
import time

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from PIL import Image
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, roc_auc_score
from torch.utils.data import DataLoader, Dataset
from torchvision import models, transforms

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "ml", "data", "data")
OUT_DIR = os.path.join(ROOT, "models", "image_detector")
IMG_SIZE = 224
MEAN, STD = [0.485, 0.456, 0.406], [0.229, 0.224, 0.225]

torch.set_num_threads(os.cpu_count() or 4)


def balanced(df, n, seed):
    per = n // 2
    parts = [df[df["label"] == c].sample(per, random_state=seed) for c in (0, 1)]
    return pd.concat(parts).sample(frac=1.0, random_state=seed)


class RandomJpeg:
    """Re-encode with a random JPEG quality so the model does not rely on pristine pixels."""

    def __init__(self, p=0.3, quality=(60, 95)):
        self.p, self.quality = p, quality

    def __call__(self, img):
        if random.random() > self.p:
            return img
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=random.randint(*self.quality))
        buf.seek(0)
        return Image.open(buf).convert("RGB")


TRAIN_TF = transforms.Compose([
    RandomJpeg(),
    transforms.RandomResizedCrop(IMG_SIZE, scale=(0.75, 1.0), ratio=(0.9, 1.1)),
    transforms.RandomHorizontalFlip(),
    transforms.ColorJitter(0.1, 0.1, 0.1),
    transforms.ToTensor(),
    transforms.Normalize(MEAN, STD),
])
EVAL_TF = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(MEAN, STD),
])


class FaceDataset(Dataset):
    def __init__(self, df, tf):
        self.blobs = [row["bytes"] for row in df["image"]]
        self.labels = df["label"].to_numpy()
        self.tf = tf

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, i):
        img = Image.open(io.BytesIO(self.blobs[i])).convert("RGB")
        return self.tf(img), int(self.labels[i])


def build_model(pretrained=True):
    weights = models.EfficientNet_B0_Weights.IMAGENET1K_V1 if pretrained else None
    model = models.efficientnet_b0(weights=weights)
    model.classifier = nn.Sequential(nn.Dropout(0.3), nn.Linear(1280, 2))
    return model


@torch.inference_mode()
def predict(model, loader):
    model.eval()
    probs, ys = [], []
    for x, y in loader:
        probs.append(torch.softmax(model(x), 1)[:, 1].numpy())
        ys.append(y.numpy())
    return np.concatenate(probs), np.concatenate(ys)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--train", type=int, default=12000)
    ap.add_argument("--val", type=int, default=2000)
    ap.add_argument("--test", type=int, default=4000)
    ap.add_argument("--epochs", type=int, default=3)
    ap.add_argument("--batch", type=int, default=32)
    ap.add_argument("--lr", type=float, default=4e-4)
    args = ap.parse_args()

    random.seed(0)
    torch.manual_seed(0)
    t0 = time.time()

    train_df = pd.read_parquet(os.path.join(DATA_DIR, "train-00000-of-00006.parquet"))
    tr = balanced(train_df, args.train, seed=1)
    va = balanced(train_df.drop(tr.index), args.val, seed=2)
    del train_df
    te = balanced(pd.read_parquet(os.path.join(DATA_DIR, "test-00000-of-00002.parquet")), args.test, seed=3)
    print(f"train={len(tr)} val={len(va)} test={len(te)}")

    train_dl = DataLoader(FaceDataset(tr, TRAIN_TF), batch_size=args.batch, shuffle=True)
    val_dl = DataLoader(FaceDataset(va, EVAL_TF), batch_size=64)
    test_dl = DataLoader(FaceDataset(te, EVAL_TF), batch_size=64)

    model = build_model()
    opt = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    steps = args.epochs * len(train_dl)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=args.lr, total_steps=steps, pct_start=0.1)
    loss_fn = nn.CrossEntropyLoss(label_smoothing=0.05)
    os.makedirs(OUT_DIR, exist_ok=True)
    ckpt = os.path.join(OUT_DIR, "efficientnet_b0_faces.pt")

    best = -1.0
    for epoch in range(1, args.epochs + 1):
        model.train()
        running, seen = 0.0, 0
        for step, (x, y) in enumerate(train_dl, 1):
            opt.zero_grad()
            loss = loss_fn(model(x), y)
            loss.backward()
            opt.step()
            sched.step()
            running += loss.item() * len(y)
            seen += len(y)
            if step % 20 == 0:
                print(f"epoch {epoch} step {step}/{len(train_dl)} loss {running / seen:.4f} "
                      f"[{(time.time() - t0) / 60:.1f} min]", flush=True)
        vp, vy = predict(model, val_dl)
        vacc = accuracy_score(vy, vp >= 0.5)
        print(f"== epoch {epoch}: val accuracy {vacc:.4f}", flush=True)
        if vacc > best:
            best = vacc
            torch.save(model.state_dict(), ckpt)

    model.load_state_dict(torch.load(ckpt))
    tp, ty = predict(model, test_dl)
    pred = (tp >= 0.5).astype(int)
    acc = accuracy_score(ty, pred)
    cm = confusion_matrix(ty, pred)
    print(f"\nTEST accuracy {acc:.4f}  ROC-AUC {roc_auc_score(ty, tp):.4f}")
    print(classification_report(ty, pred, target_names=["real", "fake"], digits=4))
    print("Confusion matrix [[TN FP] [FN TP]]:\n", cm)

    metrics = {
        "model": "EfficientNet-B0 (ImageNet init, fully fine-tuned)",
        "dataset": "140k Real and Fake Faces - FFHQ real vs StyleGAN fake",
        "input_size": IMG_SIZE,
        "train_images": len(tr), "val_images": len(va), "test_images": len(te),
        "epochs": args.epochs,
        "best_val_accuracy": round(float(best), 4),
        "test_accuracy": round(float(acc), 4),
        "test_roc_auc": round(float(roc_auc_score(ty, tp)), 4),
        "confusion_matrix": cm.tolist(),
        "training_minutes": round((time.time() - t0) / 60, 1),
    }
    with open(os.path.join(OUT_DIR, "metrics.json"), "w") as fh:
        json.dump(metrics, fh, indent=2)
    print("Saved", ckpt)


if __name__ == "__main__":
    main()
