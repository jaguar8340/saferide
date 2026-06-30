"""Authentication routes (login + me)."""
from fastapi import APIRouter, Depends, HTTPException

from core.db import db
from core.security import create_access_token, get_current_admin, verify_password
from models.schemas import LoginRequest

router = APIRouter(tags=["auth"])


@router.post("/auth/login")
async def login(payload: LoginRequest):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Ungültige Anmeldedaten")
    token = create_access_token(user["id"], email)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user["id"], "email": user["email"], "name": user.get("name"), "role": user.get("role")},
    }


@router.get("/auth/me")
async def auth_me(admin=Depends(get_current_admin)):
    return admin
