"""Auth helpers (password hashing, JWT, current-admin/student dependencies)."""
import os
from datetime import datetime, timezone, timedelta
from typing import Literal, Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from core.db import db

JWT_ALGORITHM = "HS256"
JWT_EXP_HOURS = 24

bearer = HTTPBearer(auto_error=False)

# Role literals used in JWT payloads and on the user/student docs.
Role = Literal["admin", "student"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: Role = "admin") -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS),
        "type": "access",
    }
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)


def _decode_token(request: Request, creds: Optional[HTTPAuthorizationCredentials]) -> dict:
    token = None
    if creds and creds.scheme.lower() == "bearer":
        token = creds.credentials
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_admin(
    request: Request,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> dict:
    payload = _decode_token(request, creds)
    # Legacy tokens without a role field are treated as admin (backwards compat).
    if payload.get("role", "admin") != "admin":
        raise HTTPException(status_code=403, detail="Admin-Rechte erforderlich")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def get_current_student(
    request: Request,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> dict:
    """Dependency for student-only portal endpoints."""
    payload = _decode_token(request, creds)
    if payload.get("role") != "student":
        raise HTTPException(status_code=403, detail="Schüler-Login erforderlich")
    student = await db.students.find_one(
        {"id": payload["sub"]},
        {"_id": 0, "password_hash": 0, "setup_token": 0, "setup_token_expires": 0},
    )
    if not student:
        raise HTTPException(status_code=401, detail="Schüler nicht gefunden")
    return student
