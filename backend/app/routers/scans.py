import datetime as dt
import os

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from PIL import Image

from ..db import get_db
from ..detectors import face as face_utils
from ..detectors.image_detector import detector
from ..security import get_current_user
from ..uploads import save_upload, thumbnail_b64

router = APIRouter(prefix="/api/scans", tags=["scans"])


def scan_view(doc, full=True):
    out = {
        "id": str(doc["_id"]),
        "media_type": doc["media_type"],
        "filename": doc["filename"],
        "label": doc["label"],
        "confidence": doc["confidence"],
        "fake_probability": doc["fake_probability"],
        "risk_level": doc["risk_level"],
        "identity_match": doc.get("identity_match"),
        "created_at": doc["created_at"].isoformat(),
        "thumbnail": doc.get("thumbnail"),
    }
    if full:
        out.update({
            "size_bytes": doc["size_bytes"],
            "sha256": doc["sha256"],
            "width": doc.get("width"),
            "height": doc.get("height"),
            "faces_detected": doc.get("faces_detected"),
            "signals": doc.get("signals", []),
            "processing_ms": doc.get("processing_ms"),
        })
    return out


def check_identity(user, result):
    """Compare every face in the scanned image with the user's enrolled reference face."""
    identity = user.get("identity")
    if not identity:
        return None
    if not result["_faces"]:
        return {"checked": True, "matched": False, "similarity": 0.0}
    best = 0.0
    for face in result["_faces"][:8]:
        emb = face_utils.embedding(result["_bgr"], face)
        best = max(best, face_utils.similarity(identity["embedding"], emb))
    return {"checked": True, "matched": best >= face_utils.MATCH_THRESHOLD, "similarity": round(best, 3)}


@router.post("/image", status_code=201)
def scan_image(file: UploadFile = File(...), user=Depends(get_current_user)):
    path, size, sha = save_upload(file)
    started = dt.datetime.now()
    try:
        try:
            result = detector.analyze(path)
        except FileNotFoundError as exc:
            raise HTTPException(503, str(exc))
        identity = check_identity(user, result)
        with Image.open(path) as im:
            thumb = thumbnail_b64(im)
    finally:
        os.remove(path)

    signals = result["signals"]
    if identity:
        if identity["matched"]:
            signals.append({"check": "Identity check", "status": "fail" if result["label"] == "FAKE" else "info",
                            "detail": f"Your protected face appears in this image (similarity {identity['similarity']:.2f})"})
        else:
            signals.append({"check": "Identity check", "status": "pass",
                            "detail": "Your protected face was not found in this image"})

    doc = {
        "user_id": user["_id"],
        "media_type": "image",
        "filename": (file.filename or "upload")[:200],
        "size_bytes": size,
        "sha256": sha,
        "label": result["label"],
        "confidence": result["confidence"],
        "fake_probability": result["fake_probability"],
        "risk_level": result["risk_level"],
        "faces_detected": result["faces_detected"],
        "width": result["width"],
        "height": result["height"],
        "signals": signals,
        "identity_match": identity,
        "thumbnail": thumb,
        "processing_ms": int((dt.datetime.now() - started).total_seconds() * 1000),
        "created_at": dt.datetime.now(dt.timezone.utc),
    }
    db = get_db()
    doc["_id"] = db.scans.insert_one(doc).inserted_id

    if identity and identity["matched"] and result["label"] == "FAKE":
        db.alerts.insert_one({
            "user_id": user["_id"],
            "scan_id": doc["_id"],
            "severity": "high",
            "title": "Your face was found in a manipulated image",
            "message": f"'{doc['filename']}' matched your protected identity and was classified as "
                       f"synthetic with {result['fake_probability'] * 100:.1f}% probability.",
            "read": False,
            "created_at": doc["created_at"],
        })
    return scan_view(doc)


@router.post("/audio")
@router.post("/video")
def not_ready(user=Depends(get_current_user)):
    raise HTTPException(501, "Audio and video analysis are planned for the next release.")


@router.get("")
def list_scans(limit: int = Query(20, ge=1, le=100), skip: int = Query(0, ge=0),
               label: str | None = Query(None, pattern="^(REAL|FAKE)$"), user=Depends(get_current_user)):
    query = {"user_id": user["_id"]}
    if label:
        query["label"] = label
    col = get_db().scans
    docs = col.find(query, {"signals": 0}).sort("created_at", -1).skip(skip).limit(limit)
    return {"total": col.count_documents(query), "items": [scan_view(d, full=False) for d in docs]}


@router.get("/stats")
def stats(user=Depends(get_current_user)):
    col = get_db().scans
    uid = user["_id"]
    total = col.count_documents({"user_id": uid})
    fake = col.count_documents({"user_id": uid, "label": "FAKE"})
    matched = col.count_documents({"user_id": uid, "identity_match.matched": True})
    unread = get_db().alerts.count_documents({"user_id": uid, "read": False})
    return {"total": total, "fake": fake, "real": total - fake, "identity_matches": matched, "unread_alerts": unread}


def _get_owned(scan_id, user):
    try:
        doc = get_db().scans.find_one({"_id": ObjectId(scan_id), "user_id": user["_id"]})
    except InvalidId:
        doc = None
    if not doc:
        raise HTTPException(404, "Scan not found.")
    return doc


@router.get("/{scan_id}")
def get_scan(scan_id: str, user=Depends(get_current_user)):
    return scan_view(_get_owned(scan_id, user))


@router.delete("/{scan_id}")
def delete_scan(scan_id: str, user=Depends(get_current_user)):
    doc = _get_owned(scan_id, user)
    get_db().scans.delete_one({"_id": doc["_id"]})
    get_db().alerts.delete_many({"scan_id": doc["_id"]})
    return {"deleted": True}
