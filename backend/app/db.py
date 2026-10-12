import datetime as dt

from pymongo import ASCENDING, DESCENDING, MongoClient

from .config import settings

_client = None


def get_db():
    global _client
    if _client is None:
        _client = MongoClient(settings.mongodb_url, serverSelectionTimeoutMS=5000, tz_aware=True)
    return _client[settings.db_name]


def init_indexes():
    db = get_db()
    db.users.create_index([("email", ASCENDING)], unique=True)
    db.scans.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    db.alerts.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    db.scans.create_index([("created_at", DESCENDING)])


def ensure_admin():
    """Create the admin account from .env on first start, or promote it if it already exists."""
    from .security import hash_password

    users = get_db().users
    users.update_many({"role": {"$exists": False}}, {"$set": {"role": "user", "active": True}})
    existing = users.find_one({"email": settings.admin_email})
    if existing:
        if existing.get("role") != "admin" or not existing.get("active", True):
            users.update_one({"_id": existing["_id"]}, {"$set": {"role": "admin", "active": True}})
        return
    users.insert_one({
        "name": settings.admin_name,
        "email": settings.admin_email,
        "password_hash": hash_password(settings.admin_password),
        "role": "admin",
        "active": True,
        "created_at": dt.datetime.now(dt.timezone.utc),
        "identity": None,
    })
    print(f"Admin account created: {settings.admin_email}")


def close_db():
    global _client
    if _client is not None:
        _client.close()
        _client = None
