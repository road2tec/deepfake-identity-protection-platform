import datetime as dt
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field, field_validator
from pymongo.errors import DuplicateKeyError

from ..db import get_db
from ..security import create_token, get_current_user, hash_password, public_user, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


def check_password(v):
    if not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
        raise ValueError("Password must contain at least one letter and one number")
    return v


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)

    @field_validator("name")
    @classmethod
    def clean_name(cls, v):
        v = " ".join(v.split())
        if len(v) < 2:
            raise ValueError("Name must be at least 2 characters")
        return v

    @field_validator("password")
    @classmethod
    def strong_password(cls, v):
        return check_password(v)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class ProfileIn(BaseModel):
    name: str = Field(min_length=2, max_length=60)


class PasswordIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=72)
    new_password: str = Field(min_length=8, max_length=72)

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, v):
        return check_password(v)


@router.post("/register", status_code=201)
def register(body: RegisterIn):
    users = get_db().users
    email = body.email.lower()
    if users.find_one({"email": email}):
        raise HTTPException(409, "An account with this email already exists.")
    doc = {
        "name": body.name,
        "email": email,
        "password_hash": hash_password(body.password),
        "role": "user",
        "active": True,
        "created_at": dt.datetime.now(dt.timezone.utc),
        "last_login": dt.datetime.now(dt.timezone.utc),
        "identity": None,
    }
    try:
        doc["_id"] = users.insert_one(doc).inserted_id
    except DuplicateKeyError:
        raise HTTPException(409, "An account with this email already exists.")
    return {"token": create_token(str(doc["_id"])), "user": public_user(doc)}


@router.post("/login")
def login(body: LoginIn):
    user = get_db().users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Incorrect email or password.")
    if not user.get("active", True):
        raise HTTPException(403, "This account has been disabled. Contact the administrator.")
    get_db().users.update_one({"_id": user["_id"]}, {"$set": {"last_login": dt.datetime.now(dt.timezone.utc)}})
    return {"token": create_token(str(user["_id"])), "user": public_user(user)}


@router.get("/me")
def me(user=Depends(get_current_user)):
    return public_user(user)


@router.patch("/me")
def update_me(body: ProfileIn, user=Depends(get_current_user)):
    name = " ".join(body.name.split())
    get_db().users.update_one({"_id": user["_id"]}, {"$set": {"name": name}})
    user["name"] = name
    return public_user(user)


@router.post("/change-password")
def change_password(body: PasswordIn, user=Depends(get_current_user)):
    if not verify_password(body.current_password, user["password_hash"]):
        raise HTTPException(400, "Current password is incorrect.")
    get_db().users.update_one({"_id": user["_id"]}, {"$set": {"password_hash": hash_password(body.new_password)}})
    return {"changed": True}
