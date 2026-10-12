from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException

from ..db import get_db
from ..security import get_current_user

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


def alert_view(doc):
    return {
        "id": str(doc["_id"]),
        "scan_id": str(doc["scan_id"]),
        "severity": doc["severity"],
        "title": doc["title"],
        "message": doc["message"],
        "read": doc["read"],
        "created_at": doc["created_at"].isoformat(),
    }


@router.get("")
def list_alerts(user=Depends(get_current_user)):
    docs = get_db().alerts.find({"user_id": user["_id"]}).sort("created_at", -1).limit(100)
    return {"items": [alert_view(d) for d in docs]}


@router.post("/{alert_id}/read")
def mark_read(alert_id: str, user=Depends(get_current_user)):
    try:
        oid = ObjectId(alert_id)
    except InvalidId:
        raise HTTPException(404, "Alert not found.")
    res = get_db().alerts.update_one({"_id": oid, "user_id": user["_id"]}, {"$set": {"read": True}})
    if res.matched_count == 0:
        raise HTTPException(404, "Alert not found.")
    return {"read": True}


@router.post("/read-all")
def mark_all_read(user=Depends(get_current_user)):
    get_db().alerts.update_many({"user_id": user["_id"], "read": False}, {"$set": {"read": True}})
    return {"read": True}
