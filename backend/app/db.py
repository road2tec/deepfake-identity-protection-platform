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


def close_db():
    global _client
    if _client is not None:
        _client.close()
        _client = None
