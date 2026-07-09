"""Admin user management (list / create / update / delete).

Only accessible by an authenticated admin. All admins are equal — anyone
who can log into the CMS may create additional users, change passwords
or delete other accounts. Two safeguards:

  * you cannot delete YOUR OWN account
  * you cannot delete the LAST remaining account (would lock everyone out)

Passwords are hashed with the same bcrypt helper used at login. Email is
stored lowercase and is UNIQUE (index seeded at startup).
"""
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from pymongo.errors import DuplicateKeyError

from core.db import db
from core.security import get_current_admin, hash_password

router = APIRouter(prefix="/users", tags=["users"])


# ---------------------------------------------------------------------------
#  Models (kept local — not shared with any other router)
# ---------------------------------------------------------------------------
class UserOut(BaseModel):
    id: str
    email: str
    name: str = ""
    role: str = "admin"
    created_at: str = ""


class UserCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    email: EmailStr
    password: str = Field(min_length=6, max_length=200)
    name: str = Field(default="", max_length=120)
    role: str = Field(default="admin", max_length=20)


class UserPatch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(default=None, min_length=6, max_length=200)
    name: Optional[str] = Field(default=None, max_length=120)
    role: Optional[str] = Field(default=None, max_length=20)


def _to_out(doc: dict) -> dict:
    return {
        "id": doc["id"],
        "email": doc["email"],
        "name": doc.get("name", ""),
        "role": doc.get("role", "admin"),
        "created_at": doc.get("created_at", ""),
    }


# ---------------------------------------------------------------------------
#  Routes
# ---------------------------------------------------------------------------
@router.get("", response_model=List[UserOut])
async def list_users(admin=Depends(get_current_admin)):
    docs = await db.users.find(
        {}, {"_id": 0, "password_hash": 0}
    ).sort("created_at", 1).to_list(1000)
    return [_to_out(d) for d in docs]


@router.post("", response_model=UserOut)
async def create_user(payload: UserCreate, admin=Depends(get_current_admin)):
    email = payload.email.lower()
    doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": payload.name.strip(),
        "role": payload.role.strip() or "admin",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        await db.users.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="E-Mail ist bereits vergeben")
    return _to_out(doc)


@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: str, payload: UserPatch, admin=Depends(get_current_admin)
):
    existing = await db.users.find_one({"id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")

    updates: dict = {}
    if payload.email is not None:
        updates["email"] = payload.email.lower()
    if payload.name is not None:
        updates["name"] = payload.name.strip()
    if payload.role is not None:
        updates["role"] = payload.role.strip() or "admin"
    if payload.password:
        updates["password_hash"] = hash_password(payload.password)

    if not updates:
        raise HTTPException(status_code=400, detail="Keine Änderungen übergeben")

    try:
        await db.users.update_one({"id": user_id}, {"$set": updates})
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="E-Mail ist bereits vergeben")

    doc = await db.users.find_one(
        {"id": user_id}, {"_id": 0, "password_hash": 0}
    )
    return _to_out(doc)


@router.delete("/{user_id}")
async def delete_user(user_id: str, admin=Depends(get_current_admin)):
    if user_id == admin.get("id"):
        raise HTTPException(
            status_code=400,
            detail="Du kannst deinen eigenen Account nicht löschen.",
        )
    existing = await db.users.find_one({"id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    total = await db.users.count_documents({})
    if total <= 1:
        raise HTTPException(
            status_code=400,
            detail="Der letzte Benutzer kann nicht gelöscht werden.",
        )
    await db.users.delete_one({"id": user_id})
    return {"ok": True}
