"""Administrator endpoints: platform statistics, user management and all scans."""
import datetime as dt
import re

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from ..db import get_db
from ..detectors.image_detector import detector
from ..security import require_admin
from .scans import scan_view

router = APIRouter(prefix="/api/admin", tags=["admin"])

DAYS = 14


def _oid(value, what):
    try:
        return ObjectId(value)
    except InvalidId:
        raise HTTPException(404, f"{what} not found.")


def _per_day(col, since, query=None):
    """Count documents per UTC day since `since`, including empty days."""
    counts = {}
    for doc in col.find({**(query or {}), "created_at": {"$gte": since}}, {"created_at": 1}):
        key = doc["created_at"].date().isoformat()
        counts[key] = counts.get(key, 0) + 1
    start = since.date()
    return [{"date": (start + dt.timedelta(days=i)).isoformat(),
             "count": counts.get((start + dt.timedelta(days=i)).isoformat(), 0)} for i in range(DAYS)]


@router.get("/overview")
def overview(_=Depends(require_admin)):
    db = get_db()
    now = dt.datetime.now(dt.timezone.utc)
    since = (now - dt.timedelta(days=DAYS - 1)).replace(hour=0, minute=0, second=0, microsecond=0)

    total_scans = db.scans.count_documents({})
    fake_scans = db.scans.count_documents({"label": "FAKE"})
    avg = list(db.scans.aggregate([{"$group": {"_id": None, "ms": {"$avg": "$processing_ms"},
                                               "conf": {"$avg": "$confidence"}}}]))
    risk = {r["_id"]: r["n"] for r in db.scans.aggregate([{"$group": {"_id": "$risk_level", "n": {"$sum": 1}}}])}

    scans_per_day = _per_day(db.scans, since)
    fake_per_day = {d["date"]: d["count"] for d in _per_day(db.scans, since, {"label": "FAKE"})}
    for d in scans_per_day:
        d["fake"] = fake_per_day[d["date"]]

    names = {u["_id"]: u for u in db.users.find({}, {"name": 1, "email": 1})}
    recent = []
    for doc in db.scans.find({}, {"signals": 0}).sort("created_at", -1).limit(8):
        item = scan_view(doc, full=False)
        owner = names.get(doc["user_id"], {})
        item["user"] = {"name": owner.get("name", "Deleted user"), "email": owner.get("email", "")}
        recent.append(item)

    return {
        "users": {
            "total": db.users.count_documents({}),
            "active": db.users.count_documents({"active": {"$ne": False}}),
            "admins": db.users.count_documents({"role": "admin"}),
            "identities_enrolled": db.users.count_documents({"identity": {"$ne": None}}),
            "new_last_7_days": db.users.count_documents({"created_at": {"$gte": now - dt.timedelta(days=7)}}),
        },
        "scans": {
            "total": total_scans,
            "fake": fake_scans,
            "real": total_scans - fake_scans,
            "identity_matches": db.scans.count_documents({"identity_match.matched": True}),
            "avg_processing_ms": round(avg[0]["ms"] or 0) if avg else 0,
            "avg_confidence": round(avg[0]["conf"] or 0, 4) if avg else 0,
            "risk_levels": {k: risk.get(k, 0) for k in ("none", "low", "medium", "high")},
            "per_day": scans_per_day,
        },
        "alerts": {
            "total": db.alerts.count_documents({}),
            "unread": db.alerts.count_documents({"read": False}),
        },
        "signups_per_day": _per_day(db.users, since),
        "recent_scans": recent,
        "system": {
            "database": True,
            "image_model_loaded": detector.loaded,
            "image_model_metrics": detector.metrics,
            "modules": {"image": "available", "identity": "available", "audio": "planned", "video": "planned"},
        },
    }


@router.post("/model/reload")
def reload_model(_=Depends(require_admin)):
    try:
        detector.reload()
    except FileNotFoundError as exc:
        raise HTTPException(503, str(exc))
    return {"image_model_loaded": detector.loaded, "image_model_metrics": detector.metrics}


def admin_user_view(user, stats):
    s = stats.get(user["_id"], {})
    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "role": user.get("role", "user"),
        "active": user.get("active", True),
        "identity_enrolled": bool(user.get("identity")),
        "created_at": user["created_at"].isoformat(),
        "last_login": user["last_login"].isoformat() if user.get("last_login") else None,
        "scan_count": s.get("total", 0),
        "fake_count": s.get("fake", 0),
    }


@router.get("/users")
def list_users(q: str = Query("", max_length=100), role: str | None = Query(None, pattern="^(user|admin)$"),
               skip: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100), _=Depends(require_admin)):
    db = get_db()
    query = {}
    if q.strip():
        pattern = re.compile(re.escape(q.strip()), re.IGNORECASE)
        query["$or"] = [{"name": pattern}, {"email": pattern}]
    if role:
        query["role"] = role
    users = list(db.users.find(query, {"password_hash": 0, "identity.embedding": 0})
                 .sort("created_at", -1).skip(skip).limit(limit))
    ids = [u["_id"] for u in users]
    stats = {r["_id"]: r for r in db.scans.aggregate([
        {"$match": {"user_id": {"$in": ids}}},
        {"$group": {"_id": "$user_id", "total": {"$sum": 1},
                    "fake": {"$sum": {"$cond": [{"$eq": ["$label", "FAKE"]}, 1, 0]}}}},
    ])}
    return {"total": db.users.count_documents(query), "items": [admin_user_view(u, stats) for u in users]}


class UserUpdate(BaseModel):
    role: str | None = None
    active: bool | None = None


@router.patch("/users/{user_id}")
def update_user(user_id: str, body: UserUpdate, admin=Depends(require_admin)):
    oid = _oid(user_id, "User")
    if oid == admin["_id"]:
        raise HTTPException(400, "You cannot change your own role or status.")
    changes = {}
    if body.role is not None:
        if body.role not in ("user", "admin"):
            raise HTTPException(422, "Role must be 'user' or 'admin'.")
        changes["role"] = body.role
    if body.active is not None:
        changes["active"] = body.active
    if not changes:
        raise HTTPException(422, "Nothing to update.")
    db = get_db()
    if db.users.update_one({"_id": oid}, {"$set": changes}).matched_count == 0:
        raise HTTPException(404, "User not found.")
    return admin_user_view(db.users.find_one({"_id": oid}), {})


@router.delete("/users/{user_id}")
def delete_user(user_id: str, admin=Depends(require_admin)):
    oid = _oid(user_id, "User")
    if oid == admin["_id"]:
        raise HTTPException(400, "You cannot delete your own account.")
    db = get_db()
    if db.users.delete_one({"_id": oid}).deleted_count == 0:
        raise HTTPException(404, "User not found.")
    scans = db.scans.delete_many({"user_id": oid}).deleted_count
    db.alerts.delete_many({"user_id": oid})
    return {"deleted": True, "scans_deleted": scans}


@router.get("/scans")
def list_all_scans(label: str | None = Query(None, pattern="^(REAL|FAKE)$"), skip: int = Query(0, ge=0),
                   limit: int = Query(20, ge=1, le=100), _=Depends(require_admin)):
    db = get_db()
    query = {"label": label} if label else {}
    docs = list(db.scans.find(query, {"signals": 0}).sort("created_at", -1).skip(skip).limit(limit))
    owners = {u["_id"]: u for u in db.users.find({"_id": {"$in": list({d["user_id"] for d in docs})}},
                                                  {"name": 1, "email": 1})}
    items = []
    for doc in docs:
        item = scan_view(doc, full=False)
        owner = owners.get(doc["user_id"], {})
        item["user"] = {"name": owner.get("name", "Deleted user"), "email": owner.get("email", "")}
        items.append(item)
    return {"total": db.scans.count_documents(query), "items": items}


@router.delete("/scans/{scan_id}")
def delete_any_scan(scan_id: str, _=Depends(require_admin)):
    oid = _oid(scan_id, "Scan")
    db = get_db()
    if db.scans.delete_one({"_id": oid}).deleted_count == 0:
        raise HTTPException(404, "Scan not found.")
    db.alerts.delete_many({"scan_id": oid})
    return {"deleted": True}
