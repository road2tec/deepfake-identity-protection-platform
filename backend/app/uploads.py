"""Helpers for receiving uploaded images safely."""
import base64
import hashlib
import io
import os
import tempfile

from fastapi import HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from .config import settings

IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/bmp"}


def save_upload(file: UploadFile, allowed=IMAGE_TYPES):
    """Write the upload to a temp file. Returns (path, size_bytes, sha256)."""
    if file.content_type not in allowed:
        raise HTTPException(415, "Unsupported file type. Upload a JPG, PNG, WEBP or BMP image.")
    limit = settings.max_upload_mb * 1024 * 1024
    digest = hashlib.sha256()
    size = 0
    suffix = os.path.splitext(file.filename or "")[1][:8]
    fd, path = tempfile.mkstemp(prefix="scan_", suffix=suffix)
    try:
        with os.fdopen(fd, "wb") as out:
            while chunk := file.file.read(1024 * 1024):
                size += len(chunk)
                if size > limit:
                    raise HTTPException(413, f"File is larger than {settings.max_upload_mb} MB.")
                digest.update(chunk)
                out.write(chunk)
        try:
            with Image.open(path) as im:
                im.verify()
        except (UnidentifiedImageError, OSError, SyntaxError):
            raise HTTPException(400, "The file could not be read as an image.")
    except Exception:
        os.remove(path)
        raise
    return path, size, digest.hexdigest()


def thumbnail_b64(image, size=320):
    im = image.convert("RGB")
    im.thumbnail((size, size))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=80)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("ascii")
