"""Image deepfake detector.

Pipeline:
  1. Metadata forensics - generator tags (IPTC "trainedAlgorithmicMedia", Stable Diffusion
     parameters, Midjourney / DALL-E / Firefly / Imagen markers), C2PA manifests, camera EXIF.
  2. Face localisation with YuNet. The classifier was trained on face crops, so when a face is
     present the largest face is analysed; otherwise the whole frame is used.
  3. EfficientNet-B0 fine-tuned on real (FFHQ) vs. generated (StyleGAN) faces - see ml/train_cnn.py.
"""
import json
import os
import threading

import torch
import torch.nn as nn
from PIL import ExifTags, Image
from torchvision import models, transforms

from ..config import settings
from . import face as face_utils

torch.set_num_threads(max(1, (os.cpu_count() or 2) - 1))

AI_MARKERS = {
    b"trainedalgorithmicmedia": "IPTC digital source type says the image was made by a generative model",
    b"midjourney": "Midjourney generator tag",
    b"dall-e": "DALL-E generator tag",
    "dall·e".encode("utf-8"): "DALL-E generator tag",
    b"stable diffusion": "Stable Diffusion generator tag",
    b"stablediffusion": "Stable Diffusion generator tag",
    b"comfyui": "ComfyUI workflow embedded in file",
    b"novelai": "NovelAI generator tag",
    b"adobe firefly": "Adobe Firefly generator tag",
    b"synthid": "Google SynthID marker",
    b"google imagen": "Google Imagen generator tag",
    b"made with google ai": "Google AI generator tag",
    b"chatgpt": "ChatGPT / OpenAI generator tag",
    b"openai": "OpenAI generator tag",
}

IMG_SIZE = 224
PREPROCESS = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])


def build_model():
    model = models.efficientnet_b0(weights=None)
    model.classifier = nn.Sequential(nn.Dropout(0.3), nn.Linear(1280, 2))
    return model


class ImageDetector:
    def __init__(self, model_path=settings.image_model_path, metrics_path=settings.image_metrics_path):
        self.model_path = model_path
        self.metrics_path = metrics_path
        self.model = None
        self.metrics = None
        self._lock = threading.Lock()

    @property
    def loaded(self):
        return self.model is not None

    def load(self):
        with self._lock:
            if self.model is None:
                if not os.path.exists(self.model_path):
                    raise FileNotFoundError(
                        f"Image model not found at {self.model_path}. Run ml/train_cnn.py first.")
                model = build_model()
                model.load_state_dict(torch.load(self.model_path, map_location="cpu"))
                model.eval()
                self.model = model
                if os.path.exists(self.metrics_path):
                    with open(self.metrics_path) as fh:
                        self.metrics = json.load(fh)
        return self

    def reload(self):
        """Pick up a newly trained checkpoint without restarting the server."""
        with self._lock:
            self.model = None
            self.metrics = None
        return self.load()

    @torch.inference_mode()
    def fake_probability(self, image):
        self.load()
        x = PREPROCESS(image.convert("RGB")).unsqueeze(0)
        # Average with the mirrored image (cheap test-time augmentation).
        x = torch.cat([x, torch.flip(x, dims=[3])])
        probs = torch.softmax(self.model(x), dim=1)[:, 1]
        return float(probs.mean())

    # ------------------------------------------------------------------ metadata
    @staticmethod
    def metadata_signals(path, image):
        signals = []
        ai_reason = None

        with open(path, "rb") as fh:
            raw = fh.read()
        lowered = raw[:2_000_000].lower() + raw[-2_000_000:].lower()
        for marker, reason in AI_MARKERS.items():
            if marker in lowered:
                ai_reason = reason
                break
        png_params = str(image.info.get("parameters", "")).lower()
        if ai_reason is None and "steps:" in png_params and "sampler" in png_params:
            ai_reason = "Stable Diffusion generation parameters embedded in PNG"

        if ai_reason:
            signals.append({"check": "Generator metadata", "status": "fail", "detail": ai_reason})
        else:
            signals.append({"check": "Generator metadata", "status": "pass",
                            "detail": "No known AI generator tags found in the file"})

        if b"c2pa" in lowered:
            signals.append({"check": "Content credentials (C2PA)", "status": "info",
                            "detail": "File carries a C2PA / JUMBF provenance manifest"})

        camera = None
        try:
            exif = image.getexif()
            tags = {ExifTags.TAGS.get(k, k): v for k, v in exif.items()}
            make, model = str(tags.get("Make", "")).strip(), str(tags.get("Model", "")).strip()
            if make or model:
                camera = f"{make} {model}".strip()
        except Exception:
            pass
        if camera:
            signals.append({"check": "Camera EXIF", "status": "info", "detail": f"Captured with {camera}"})
        else:
            signals.append({"check": "Camera EXIF", "status": "info",
                            "detail": "No camera information (common for screenshots, social media and generated images)"})
        return ai_reason, signals

    # ------------------------------------------------------------------ main entry
    def analyze(self, path):
        self.load()
        image = Image.open(path)
        image.load()
        width, height = image.size
        rgb = image.convert("RGB")

        ai_reason, signals = self.metadata_signals(path, image)

        bgr = face_utils.pil_to_bgr(rgb)
        faces = face_utils.detect_faces(bgr)
        if faces:
            crop = face_utils.crop_face(bgr, faces[0])
            target = Image.fromarray(crop[:, :, ::-1])
            region = "largest detected face"
        else:
            target = rgb
            region = "full image (no face detected)"

        model_prob = self.fake_probability(target)
        signals.append({
            "check": "Neural classifier",
            "status": "fail" if model_prob >= 0.5 else "pass",
            "detail": f"{model_prob * 100:.1f}% probability of synthesis on the {region}",
        })

        fake_prob = max(model_prob, 0.99) if ai_reason else model_prob
        label = "FAKE" if fake_prob >= 0.5 else "REAL"
        confidence = fake_prob if label == "FAKE" else 1 - fake_prob
        if fake_prob >= 0.8:
            risk = "high"
        elif fake_prob >= 0.5:
            risk = "medium"
        elif fake_prob >= 0.2:
            risk = "low"
        else:
            risk = "none"

        return {
            "label": label,
            "confidence": round(float(confidence), 4),
            "fake_probability": round(float(fake_prob), 4),
            "risk_level": risk,
            "faces_detected": len(faces),
            "width": width,
            "height": height,
            "signals": signals,
            "_bgr": bgr,
            "_faces": faces,
        }


detector = ImageDetector()
