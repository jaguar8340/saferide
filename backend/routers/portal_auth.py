"""Student portal authentication.

Flow:
    admin creates a student  →  POST /api/portal/students/{id}/invite
        → generates uuid setup-token (7 days), stores on student doc,
          sends invitation email with link to /portal/setup?token=…

    student clicks link  →  GET  /api/portal/setup/validate?token=…
        → returns basic student info if token is still valid

    student submits password  →  POST /api/portal/setup
        → verifies token, hashes password, clears token, logs in

    subsequent logins  →  POST /api/portal/login
        → email + password → JWT with role="student"

    session check  →  GET  /api/portal/me
"""
from __future__ import annotations

import os
import secrets
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field

from core.db import db
from core.email import send_email
from core.security import (
    create_access_token,
    get_current_admin,
    get_current_student,
    hash_password,
    verify_password,
)
from routers.business_settings import get_or_create_settings
from routers.invoice_email import _build_smtp_config, _open_smtp  # noqa: F401 – kept for legacy imports


router = APIRouter(prefix="/portal", tags=["portal-auth"])
admin_router = APIRouter(prefix="/portal", tags=["portal-admin"])


# ---------------------------------------------------------------------------
#  Schemas
# ---------------------------------------------------------------------------
class PortalLoginRequest(BaseModel):
    email: EmailStr
    password: str


class SetupSubmit(BaseModel):
    token: str
    password: str = Field(min_length=8, max_length=128)


class InviteResponse(BaseModel):
    email: str
    setup_url: str
    sent: bool
    detail: str = ""


# ---------------------------------------------------------------------------
#  Helpers
# ---------------------------------------------------------------------------
def _portal_public_url() -> str:
    """Base URL the setup e-mail links to. Falls back to the API host."""
    return (
        os.environ.get("PUBLIC_SITE_URL")
        or os.environ.get("REACT_APP_BACKEND_URL")
        or ""
    ).rstrip("/")


def _sanitised_student(student: dict) -> dict:
    """Strip internal auth fields before returning to caller."""
    for k in ("password_hash", "setup_token", "setup_token_expires"):
        student.pop(k, None)
    return student


async def _send_setup_email(student: dict, setup_url: str) -> tuple[bool, str]:
    """Best-effort — never raises. Returns (sent, error_detail)."""
    if not student.get("email"):
        return False, "Schüler hat keine E-Mail-Adresse"
    settings = await get_or_create_settings()
    cfg = _build_smtp_config(settings, override=None)
    # Populate resend fields for the shared send_email (build_smtp_config in
    # invoice_email.py predates that support).
    cfg["resend_api_key"] = settings.get("resend_api_key") or ""
    cfg["resend_from_email"] = settings.get("resend_from_email") or ""
    if not cfg.get("host") and not cfg["resend_api_key"]:
        return False, "Weder SMTP noch Resend eingerichtet (Mail → E-Mail Einstellungen)"

    business_name = settings.get("business_name") or "Fahrschule Safe Ride"
    from_email = (
        settings.get("smtp_from_email")
        or settings.get("smtp_username")
        or "no-reply@saferide.ch"
    )
    from_name = settings.get("smtp_from_name") or business_name
    first = student.get("first_name") or ""
    subject = f"Dein persönlicher Schülerbereich bei {business_name}"
    body = f"""Hallo {first},

wir haben deinen persönlichen Schülerbereich bei {business_name} freigeschaltet.
Dort siehst du jederzeit deine Fahrstunden, offene Rechnungen, den nächsten Termin
und deinen Ausbildungsfortschritt.

Bitte lege dein Passwort über den folgenden Link fest (gültig 7 Tage):

    {setup_url}

Bis bald auf der Strasse!
{business_name}
""".strip()

    try:
        send_email(
            cfg,
            to=student["email"],
            subject=subject,
            body_text=body,
            from_email=from_email,
            from_name=from_name,
        )
        return True, ""
    except HTTPException as e:
        return False, str(e.detail)
    except Exception as e:      # noqa: BLE001
        return False, str(e)


# ---------------------------------------------------------------------------
#  Admin-only: invite a student
# ---------------------------------------------------------------------------
@admin_router.post("/students/{student_id}/invite", response_model=InviteResponse)
async def invite_student(student_id: str, admin=Depends(get_current_admin)):
    student = await db.students.find_one({"id": student_id})
    if not student:
        raise HTTPException(404, "Schüler nicht gefunden")
    if not (student.get("email") or "").strip():
        raise HTTPException(400, "Schüler hat keine E-Mail-Adresse")

    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(days=7)
    await db.students.update_one(
        {"id": student_id},
        {"$set": {
            "setup_token": token,
            "setup_token_expires": expires.isoformat(),
            "portal_invited_at": datetime.now(timezone.utc).isoformat(),
            "portal_invited_by": admin.get("email", ""),
        }},
    )
    setup_url = f"{_portal_public_url()}/portal/setup?token={token}"
    sent, detail = await _send_setup_email(student, setup_url)
    return InviteResponse(
        email=student["email"], setup_url=setup_url, sent=sent, detail=detail,
    )


# ---------------------------------------------------------------------------
#  Public: token validation + password setup
# ---------------------------------------------------------------------------
@router.get("/setup/validate")
async def validate_setup_token(token: str):
    student = await db.students.find_one({"setup_token": token})
    if not student:
        raise HTTPException(404, "Link ungültig oder bereits verwendet")
    exp = student.get("setup_token_expires") or ""
    try:
        expires = datetime.fromisoformat(exp)
    except ValueError:
        raise HTTPException(400, "Link abgelaufen")
    if expires < datetime.now(timezone.utc):
        raise HTTPException(400, "Link abgelaufen")
    return {
        "first_name": student.get("first_name", ""),
        "last_name": student.get("last_name", ""),
        "email": student.get("email", ""),
    }


@router.post("/setup")
async def submit_setup(payload: SetupSubmit):
    student = await db.students.find_one({"setup_token": payload.token})
    if not student:
        raise HTTPException(404, "Link ungültig oder bereits verwendet")
    exp = student.get("setup_token_expires") or ""
    try:
        expires = datetime.fromisoformat(exp)
    except ValueError:
        raise HTTPException(400, "Link abgelaufen")
    if expires < datetime.now(timezone.utc):
        raise HTTPException(400, "Link abgelaufen")

    await db.students.update_one(
        {"id": student["id"]},
        {
            "$set": {
                "password_hash": hash_password(payload.password),
                "portal_activated_at": datetime.now(timezone.utc).isoformat(),
            },
            "$unset": {"setup_token": "", "setup_token_expires": ""},
        },
    )
    token = create_access_token(student["id"], student["email"], role="student")
    return {
        "access_token": token,
        "token_type": "bearer",
        "student": {
            "id": student["id"],
            "email": student["email"],
            "first_name": student.get("first_name", ""),
            "last_name": student.get("last_name", ""),
        },
    }


# ---------------------------------------------------------------------------
#  Public: login + me
# ---------------------------------------------------------------------------
@router.post("/login")
async def portal_login(payload: PortalLoginRequest):
    email = payload.email.lower().strip()
    student = await db.students.find_one({"email": {"$regex": f"^{email}$", "$options": "i"}})
    if not student or not verify_password(payload.password, student.get("password_hash", "")):
        raise HTTPException(401, "Ungültige Anmeldedaten")
    token = create_access_token(student["id"], student["email"], role="student")
    return {
        "access_token": token,
        "token_type": "bearer",
        "student": {
            "id": student["id"],
            "email": student["email"],
            "first_name": student.get("first_name", ""),
            "last_name": student.get("last_name", ""),
        },
    }


@router.get("/me")
async def portal_me(student=Depends(get_current_student)):
    return _sanitised_student(student)
