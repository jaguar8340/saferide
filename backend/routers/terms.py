"""Terms & Conditions (AGB) — admin-editable, send to student, confirm.

Data model:
  business_settings.terms_de   (Markdown, admin-editable)
  business_settings.terms_en   (optional English translation)
  business_settings.terms_updated_at

  students.agb_confirmation_token       – random uuid, set on send
  students.agb_confirmation_expires     – 30d after send
  students.agb_sent_at
  students.agb_confirmed_at
  students.agb_confirmed_version        – terms_updated_at at confirm-time
"""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.db import db
from core.security import get_current_admin, get_current_student
from routers.business_settings import get_or_create_settings
from routers.invoice_email import _build_smtp_config, _open_smtp
from routers.portal_auth import _portal_public_url


router = APIRouter(prefix="/terms", tags=["terms"])
admin_router = APIRouter(prefix="/terms", tags=["terms-admin"])


class TermsPatch(BaseModel):
    terms_de: str | None = None
    terms_en: str | None = None


class SendResponse(BaseModel):
    email: str
    confirm_url: str
    sent: bool
    detail: str = ""


class ConfirmRequest(BaseModel):
    token: str


# ---------------------------------------------------------------------------
#  Public read
# ---------------------------------------------------------------------------
@router.get("")
async def get_terms():
    settings = await get_or_create_settings()
    return {
        "terms_de": settings.get("terms_de") or "",
        "terms_en": settings.get("terms_en") or "",
        "terms_updated_at": settings.get("terms_updated_at") or "",
    }


# ---------------------------------------------------------------------------
#  Admin edit
# ---------------------------------------------------------------------------
@admin_router.patch("")
async def update_terms(payload: TermsPatch, admin=Depends(get_current_admin)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "Nichts zu aktualisieren")
    updates["terms_updated_at"] = datetime.now(timezone.utc).isoformat()
    updates["updated_by"] = admin.get("email", "")
    await get_or_create_settings()
    await db.business_settings.update_one(
        {"id": "default"}, {"$set": updates}, upsert=True
    )
    doc = await db.business_settings.find_one({"id": "default"}, {"_id": 0})
    return {
        "terms_de": doc.get("terms_de", ""),
        "terms_en": doc.get("terms_en", ""),
        "terms_updated_at": doc.get("terms_updated_at", ""),
    }


# ---------------------------------------------------------------------------
#  Admin: send terms to student for confirmation
# ---------------------------------------------------------------------------
@admin_router.post("/send/{student_id}", response_model=SendResponse)
async def send_terms(student_id: str, admin=Depends(get_current_admin)):
    student = await db.students.find_one({"id": student_id})
    if not student:
        raise HTTPException(404, "Schüler nicht gefunden")
    if not (student.get("email") or "").strip():
        raise HTTPException(400, "Schüler hat keine E-Mail-Adresse")

    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(days=30)
    now = datetime.now(timezone.utc).isoformat()
    await db.students.update_one(
        {"id": student_id},
        {"$set": {
            "agb_confirmation_token": token,
            "agb_confirmation_expires": expires.isoformat(),
            "agb_sent_at": now,
            "agb_sent_by": admin.get("email", ""),
        }},
    )
    confirm_url = f"{_portal_public_url()}/agb/{token}"

    # Try to send via SMTP; fall back to returning the raw URL.
    settings = await get_or_create_settings()
    cfg = _build_smtp_config(settings, override=None)
    sent, detail = False, "SMTP nicht konfiguriert"
    if cfg.get("host"):
        business = settings.get("business_name") or "Fahrschule Safe Ride"
        first = student.get("first_name") or ""
        msg = EmailMessage()
        msg["From"] = cfg.get("from_email") or cfg.get("user") or "no-reply@saferide.ch"
        msg["To"] = student["email"]
        msg["Subject"] = f"AGB {business} – bitte kurz bestätigen"
        msg.set_content(f"""Hallo {first},

anbei die Allgemeinen Geschäftsbedingungen der {business}. Bitte lies sie
kurz durch und bestätige sie mit einem Klick auf den Link unten oder
antworte einfach auf diese E-Mail mit "einverstanden".

Bestätigen:
    {confirm_url}

Die AGB findest du auch jederzeit unter deinem Schülerbereich.

Vielen Dank und bis bald auf der Strasse!
{business}
""".strip())
        try:
            with _open_smtp(cfg) as server:
                server.send_message(msg)
            sent, detail = True, ""
        except Exception as e:      # noqa: BLE001
            detail = str(e)

    return SendResponse(email=student["email"], confirm_url=confirm_url,
                        sent=sent, detail=detail)


# ---------------------------------------------------------------------------
#  Public: token-based confirmation (from e-mail link)
# ---------------------------------------------------------------------------
@router.get("/confirm/validate")
async def validate_agb_token(token: str):
    student = await db.students.find_one({"agb_confirmation_token": token})
    if not student:
        raise HTTPException(404, "Link ungültig oder bereits verwendet")
    exp = student.get("agb_confirmation_expires") or ""
    try:
        if datetime.fromisoformat(exp) < datetime.now(timezone.utc):
            raise HTTPException(400, "Link abgelaufen")
    except (ValueError, TypeError):
        raise HTTPException(400, "Link abgelaufen")
    settings = await get_or_create_settings()
    return {
        "student_first_name": student.get("first_name", ""),
        "student_last_name": student.get("last_name", ""),
        "terms_de": settings.get("terms_de") or "",
        "terms_updated_at": settings.get("terms_updated_at") or "",
        "already_confirmed": bool(student.get("agb_confirmed_at")),
    }


@router.post("/confirm")
async def confirm_agb(payload: ConfirmRequest):
    student = await db.students.find_one({"agb_confirmation_token": payload.token})
    if not student:
        raise HTTPException(404, "Link ungültig oder bereits verwendet")
    settings = await get_or_create_settings()
    now = datetime.now(timezone.utc).isoformat()
    await db.students.update_one(
        {"id": student["id"]},
        {
            "$set": {
                "agb_confirmed_at": now,
                "agb_confirmed_version": settings.get("terms_updated_at") or "",
            },
            "$unset": {"agb_confirmation_token": ""},
        },
    )
    return {"ok": True, "confirmed_at": now}


# ---------------------------------------------------------------------------
#  Student portal: confirm in-app (uses portal JWT, no token needed)
# ---------------------------------------------------------------------------
@router.post("/portal/confirm")
async def portal_confirm_agb(student=Depends(get_current_student)):
    settings = await get_or_create_settings()
    now = datetime.now(timezone.utc).isoformat()
    await db.students.update_one(
        {"id": student["id"]},
        {
            "$set": {
                "agb_confirmed_at": now,
                "agb_confirmed_version": settings.get("terms_updated_at") or "",
            },
            "$unset": {"agb_confirmation_token": ""},
        },
    )
    return {"ok": True, "confirmed_at": now}
