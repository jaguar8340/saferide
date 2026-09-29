"""Terms & Conditions (AGB) — admin-editable, send to student, confirm.

Data model:
  business_settings.terms_de   (Markdown, admin-editable)
  business_settings.terms_en   (optional English translation)
  business_settings.terms_updated_at

  # Split per-recipient tokens: student vs. Erziehungsberechtigte
  students.agb_student_token / _expires / agb_student_sent_at / _confirmed_at / _confirmed_version
  students.agb_guardian_token / _expires / agb_guardian_sent_at / _confirmed_at / _confirmed_version

  # Legacy fields (still populated for backwards compat with old UI badges):
  students.agb_sent_at, agb_confirmed_at, agb_confirmed_version, agb_sent_by
"""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from core.db import db
from core.email import send_email
from core.security import get_current_admin, get_current_student
from routers.business_settings import get_or_create_settings
from routers.invoice_email import _build_smtp_config, _open_smtp  # noqa: F401 – kept for legacy imports
from routers.portal_auth import _portal_public_url


router = APIRouter(prefix="/terms", tags=["terms"])
admin_router = APIRouter(prefix="/terms", tags=["terms-admin"])


TargetType = Literal["student", "guardian"]


class TermsPatch(BaseModel):
    terms_de: str | None = None
    terms_en: str | None = None


class SendResponse(BaseModel):
    email: str
    target: TargetType = "student"
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
#  Admin: send terms to student OR guardian for confirmation
# ---------------------------------------------------------------------------
@admin_router.post("/send/{student_id}", response_model=SendResponse)
async def send_terms(
    student_id: str,
    target: TargetType = Query("student", description="Empfänger: 'student' oder 'guardian'"),
    admin=Depends(get_current_admin),
):
    student = await db.students.find_one({"id": student_id})
    if not student:
        raise HTTPException(404, "Schüler nicht gefunden")

    if target == "guardian":
        email = (student.get("guardian_email") or "").strip()
        recipient_name = (student.get("guardian_name") or "").strip()
        if not email:
            raise HTTPException(400, "Keine E-Mail-Adresse für Erziehungsberechtigte hinterlegt")
    else:
        email = (student.get("email") or "").strip()
        recipient_name = (student.get("first_name") or "").strip()
        if not email:
            raise HTTPException(400, "Schüler hat keine E-Mail-Adresse")

    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(days=30)
    now = datetime.now(timezone.utc).isoformat()

    if target == "guardian":
        set_fields = {
            "agb_guardian_token": token,
            "agb_guardian_token_expires": expires.isoformat(),
            "agb_guardian_sent_at": now,
            "agb_guardian_sent_by": admin.get("email", ""),
        }
    else:
        set_fields = {
            "agb_student_token": token,
            "agb_student_token_expires": expires.isoformat(),
            "agb_student_sent_at": now,
            "agb_student_sent_by": admin.get("email", ""),
            # Legacy mirror
            "agb_sent_at": now,
            "agb_sent_by": admin.get("email", ""),
            "agb_confirmation_token": token,
            "agb_confirmation_expires": expires.isoformat(),
        }
    await db.students.update_one({"id": student_id}, {"$set": set_fields})
    confirm_url = f"{_portal_public_url()}/agb/{token}"

    # Try to send via configured transport (Resend if key set, otherwise SMTP);
    # fall back to returning the raw URL.
    settings = await get_or_create_settings()
    cfg = _build_smtp_config(settings, override=None)
    cfg["resend_api_key"] = settings.get("resend_api_key") or ""
    cfg["resend_from_email"] = settings.get("resend_from_email") or ""
    sent, detail = False, "Weder SMTP noch Resend eingerichtet"
    if cfg.get("host") or cfg["resend_api_key"]:
        business = settings.get("business_name") or "Fahrschule Safe Ride"
        from_email = (
            settings.get("smtp_from_email")
            or settings.get("smtp_username")
            or "no-reply@saferide.ch"
        )
        from_name = settings.get("smtp_from_name") or business

        if target == "guardian":
            subject = f"AGB {business} – bitte für {student.get('first_name', '')} {student.get('last_name', '')} bestätigen"
            greeting = f"Guten Tag {recipient_name or 'liebe Eltern'}"
            intro = (
                f"anbei die Allgemeinen Geschäftsbedingungen der {business} für die "
                f"Fahrausbildung von {student.get('first_name', '')} {student.get('last_name', '')}. "
                f"Bitte lesen Sie diese kurz durch und bestätigen Sie mit einem Klick auf "
                f"den Link unten."
            )
        else:
            subject = f"AGB {business} – bitte kurz bestätigen"
            greeting = f"Hallo {recipient_name}"
            intro = (
                f"anbei die Allgemeinen Geschäftsbedingungen der {business}. Bitte lies "
                f"sie kurz durch und bestätige sie mit einem Klick auf den Link unten oder "
                f'antworte einfach auf diese E-Mail mit "einverstanden".'
            )
        body = f"""{greeting},

{intro}

Bestätigen:
    {confirm_url}

Vielen Dank und bis bald auf der Strasse!
{business}
""".strip()
        try:
            send_email(
                cfg,
                to=email,
                subject=subject,
                body_text=body,
                from_email=from_email,
                from_name=from_name,
            )
            sent, detail = True, ""
        except HTTPException as e:
            detail = str(e.detail)
        except Exception as e:      # noqa: BLE001
            detail = str(e)

    return SendResponse(email=email, target=target, confirm_url=confirm_url,
                        sent=sent, detail=detail)


# ---------------------------------------------------------------------------
#  Public: token-based confirmation (from e-mail link)
# ---------------------------------------------------------------------------
async def _find_token_student(token: str):
    """Return (student, target) for a token, or (None, None)."""
    student = await db.students.find_one({"agb_student_token": token})
    if student:
        return student, "student"
    student = await db.students.find_one({"agb_guardian_token": token})
    if student:
        return student, "guardian"
    # Legacy: token stored under old key
    student = await db.students.find_one({"agb_confirmation_token": token})
    if student:
        return student, "student"
    return None, None


@router.get("/confirm/validate")
async def validate_agb_token(token: str):
    student, target = await _find_token_student(token)
    if not student:
        raise HTTPException(404, "Link ungültig oder bereits verwendet")
    exp_key = "agb_guardian_token_expires" if target == "guardian" else "agb_student_token_expires"
    exp = student.get(exp_key) or student.get("agb_confirmation_expires") or ""
    try:
        if datetime.fromisoformat(exp) < datetime.now(timezone.utc):
            raise HTTPException(400, "Link abgelaufen")
    except (ValueError, TypeError):
        raise HTTPException(400, "Link abgelaufen")
    settings = await get_or_create_settings()
    conf_key = "agb_guardian_confirmed_at" if target == "guardian" else "agb_student_confirmed_at"
    return {
        "student_first_name": student.get("first_name", ""),
        "student_last_name": student.get("last_name", ""),
        "target": target,
        "recipient_label": "Erziehungsberechtigte:r" if target == "guardian" else "Schüler:in",
        "terms_de": settings.get("terms_de") or "",
        "terms_updated_at": settings.get("terms_updated_at") or "",
        "already_confirmed": bool(student.get(conf_key)) or (target == "student" and bool(student.get("agb_confirmed_at"))),
    }


@router.post("/confirm")
async def confirm_agb(payload: ConfirmRequest):
    student, target = await _find_token_student(payload.token)
    if not student:
        raise HTTPException(404, "Link ungültig oder bereits verwendet")
    settings = await get_or_create_settings()
    now = datetime.now(timezone.utc).isoformat()
    version = settings.get("terms_updated_at") or ""

    if target == "guardian":
        set_fields = {
            "agb_guardian_confirmed_at": now,
            "agb_guardian_confirmed_version": version,
        }
        unset_fields = {"agb_guardian_token": ""}
    else:
        set_fields = {
            "agb_student_confirmed_at": now,
            "agb_student_confirmed_version": version,
            # Legacy mirror
            "agb_confirmed_at": now,
            "agb_confirmed_version": version,
        }
        unset_fields = {"agb_student_token": "", "agb_confirmation_token": ""}

    await db.students.update_one(
        {"id": student["id"]},
        {"$set": set_fields, "$unset": unset_fields},
    )
    return {"ok": True, "confirmed_at": now, "target": target}


# ---------------------------------------------------------------------------
#  Student portal: confirm in-app (uses portal JWT, no token needed) — legacy
# ---------------------------------------------------------------------------
@router.post("/portal/confirm")
async def portal_confirm_agb(student=Depends(get_current_student)):
    settings = await get_or_create_settings()
    now = datetime.now(timezone.utc).isoformat()
    version = settings.get("terms_updated_at") or ""
    await db.students.update_one(
        {"id": student["id"]},
        {
            "$set": {
                "agb_student_confirmed_at": now,
                "agb_student_confirmed_version": version,
                "agb_confirmed_at": now,
                "agb_confirmed_version": version,
            },
            "$unset": {"agb_student_token": "", "agb_confirmation_token": ""},
        },
    )
    return {"ok": True, "confirmed_at": now}
