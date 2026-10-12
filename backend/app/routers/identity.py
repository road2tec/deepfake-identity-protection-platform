"""Protected identity: the user enrols a reference photo of their own face. Every image scan is
then checked against it, so the user is alerted when their face appears in manipulated media."""
import datetime as dt
import os

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from PIL import Image

from ..db import get_db
from ..detectors import face as face_utils
from ..security import get_current_user
from ..uploads import save_upload, thumbnail_b64

router = APIRouter(prefix="/api/identity", tags=["identity"])


def identity_view(identity):
    if not identity:
        return {"enrolled": False}
    return {
        "enrolled": True,
        "photo": identity["photo"],
        "enrolled_at": identity["enrolled_at"].isoformat(),
        "face_score": identity.get("face_score"),
    }


@router.get("")
def get_identity(user=Depends(get_current_user)):
    return identity_view(user.get("identity"))


@router.post("")
def enrol(file: UploadFile = File(...), user=Depends(get_current_user)):
    path, _, _ = save_upload(file)
    try:
        image = Image.open(path).convert("RGB")
        bgr = face_utils.pil_to_bgr(image)
        faces = face_utils.detect_faces(bgr)
        if not faces:
            raise HTTPException(422, "No face was found. Use a clear, front-facing photo of yourself.")
        if len(faces) > 1:
            raise HTTPException(422, "More than one face was found. Use a photo with only you in it.")
        face = faces[0]
        if min(face[2], face[3]) < 60:
            raise HTTPException(422, "The face is too small. Use a closer photo.")
        emb = face_utils.embedding(bgr, face)
        crop = face_utils.crop_face(bgr, face, margin=0.25)
        identity = {
            "embedding": emb.tolist(),
            "photo": thumbnail_b64(Image.fromarray(crop[:, :, ::-1]), size=240),
            "face_score": round(float(face[-1]), 3),
            "enrolled_at": dt.datetime.now(dt.timezone.utc),
        }
    finally:
        os.remove(path)
    get_db().users.update_one({"_id": user["_id"]}, {"$set": {"identity": identity}})
    return identity_view(identity)


@router.delete("")
def remove(user=Depends(get_current_user)):
    get_db().users.update_one({"_id": user["_id"]}, {"$set": {"identity": None}})
    return {"enrolled": False}
