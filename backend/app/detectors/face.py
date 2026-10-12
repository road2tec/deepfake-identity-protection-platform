"""Face detection (YuNet) and face embeddings (SFace) using OpenCV's DNN models."""
import threading

import cv2
import numpy as np

from ..config import settings

# Cosine similarity above which two SFace embeddings are treated as the same person
# (value recommended by the OpenCV SFace authors).
MATCH_THRESHOLD = 0.363

_lock = threading.Lock()
_detector = None
_recognizer = None


def _models():
    global _detector, _recognizer
    with _lock:
        if _detector is None:
            _detector = cv2.FaceDetectorYN.create(settings.face_detector_path, "", (320, 320), 0.8, 0.3, 5000)
            _recognizer = cv2.FaceRecognizerSF.create(settings.face_recognizer_path, "")
    return _detector, _recognizer


def pil_to_bgr(image):
    return cv2.cvtColor(np.asarray(image.convert("RGB")), cv2.COLOR_RGB2BGR)


def detect_faces(bgr):
    """Return YuNet face rows (x, y, w, h, 5 landmarks, score), largest face first."""
    detector, _ = _models()
    h, w = bgr.shape[:2]
    # YuNet works best on moderate resolutions; scale large images down for detection.
    scale = min(1.0, 1280 / max(h, w))
    small = cv2.resize(bgr, (int(w * scale), int(h * scale))) if scale < 1.0 else bgr
    with _lock:
        detector.setInputSize((small.shape[1], small.shape[0]))
        _, faces = detector.detect(small)
    if faces is None:
        return []
    faces = faces.copy()
    faces[:, :14] /= scale
    return sorted(faces, key=lambda f: f[2] * f[3], reverse=True)


def crop_face(bgr, face, margin=0.35):
    """Square crop around a detected face with some context, as the deepfake model expects."""
    x, y, w, h = face[:4]
    cx, cy = x + w / 2, y + h / 2
    side = max(w, h) * (1 + margin * 2)
    x0, y0 = int(max(0, cx - side / 2)), int(max(0, cy - side / 2))
    x1, y1 = int(min(bgr.shape[1], cx + side / 2)), int(min(bgr.shape[0], cy + side / 2))
    return bgr[y0:y1, x0:x1]


def embedding(bgr, face):
    _, recognizer = _models()
    with _lock:
        aligned = recognizer.alignCrop(bgr, face)
        feat = recognizer.feature(aligned)
    feat = feat.flatten().astype(np.float32)
    return feat / (np.linalg.norm(feat) + 1e-9)


def similarity(a, b):
    a = np.asarray(a, dtype=np.float32)
    b = np.asarray(b, dtype=np.float32)
    return float(np.dot(a, b) / ((np.linalg.norm(a) * np.linalg.norm(b)) + 1e-9))
