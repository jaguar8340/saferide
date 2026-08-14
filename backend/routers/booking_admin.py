"""Admin management for booking requests + blocked calendar dates.

Splits admin actions cleanly from the public booking submission flow:

    GET    /api/booking/requests                   → list pending / actioned
    POST   /api/booking/requests/{id}/approve      → confirm + send confirmation mail
    POST   /api/booking/requests/{id}/reschedule   → move slot + send rescheduled mail
    POST   /api/booking/requests/{id}/decline      → cancel + send cancellation mail

    GET    /api/booking/blocked-dates              → list Feiertage / Ferien
    POST   /api/booking/blocked-dates              → add
    PATCH  /api/booking/blocked-dates/{id}         → rename / change date
    DELETE /api/booking/blocked-dates/{id}         → remove

Emails go through the existing BusinessSettings SMTP config; templates are
the 4 configured `booking_email_templates` (kinds: requested, confirmed,
rescheduled, cancelled). Placeholders in the template body are replaced
per-request.

Failing to send an email is logged but does NOT roll back the booking
status change — Nadine can retry via a separate button if needed.
"""
from __future__ import annotations

import re
import uuid
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from core.db import db
from core.email import build_smtp_config, render_template, send_email
from core.security import get_current_admin
from routers.business_settings import get_or_create_settings


router = APIRouter(prefix="/booking", tags=["booking-admin"])
log = logging.getLogger("booking_admin")


# ---------------------------------------------------------------------------
#  Booking requests
# ---------------------------------------------------------------------------
@router.get("/requests")
async def list_requests(status: Optional[str] = None, admin=Depends(get_current_admin)):
    """List public booking requests. Filter by `status` if given."""
    q: dict = {"source": "public"}
    if status:
        q["status"] = status
    docs = await db.bookings.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


def _format_dmy(iso_date: str) -> str:
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", iso_date or "")
    if not m:
        return iso_date or ""
    return f"{m.group(3)}.{m.group(2)}.{m.group(1)}"


async def _build_ctx(booking: dict) -> dict:
    """Build the placeholder context for an e-mail template."""
    settings = await get_or_create_settings()
    date_iso = (booking.get("start_datetime") or "")[:10]
    time_iso = (booking.get("start_datetime") or "")[11:16]
    return {
        "name": booking.get("first_name") or booking.get("customer_name", ""),
        "first_name": booking.get("first_name", ""),
        "last_name": booking.get("last_name", ""),
        "datum": _format_dmy(date_iso),
        "uhrzeit": time_iso,
        "dauer": str(booking.get("duration_min") or ""),
        "abholort": booking.get("pickup_location", ""),
        "fahrzeug": booking.get("vehicle_name", ""),
        "fahrlehrerin": settings.get("business_name", "Fahrschule Safe Ride"),
        "business_name": settings.get("business_name", ""),
    }


async def _dispatch_email(booking: dict, kind: str, admin_email: str) -> Optional[str]:
    """Send the template `kind` to the booking's customer.

    Returns None on success, error string on failure. Never raises — caller
    decides how to surface delivery issues.
    """
    to_email = (booking.get("email") or "").strip()
    if not to_email:
        return "Empfänger-E-Mail fehlt"

    tpl = await db.booking_email_templates.find_one({"kind": kind}, {"_id": 0})
    if not tpl:
        return f"Vorlage `{kind}` nicht gefunden"

    settings = await get_or_create_settings()
    cfg = build_smtp_config(settings)
    if not cfg["host"]:
        return "SMTP nicht konfiguriert (Fahrschul-Daten → E-Mail-Versand)"

    from_email = settings.get("smtp_from_email") or settings.get("smtp_username") or ""
    from_name = settings.get("smtp_from_name") or settings.get("business_name") or ""
    if not from_email:
        return "Absender-E-Mail nicht gesetzt"

    ctx = await _build_ctx(booking)
    subject = render_template(tpl.get("subject", ""), ctx) or "Fahrschule Safe Ride"
    body_html = render_template(tpl.get("body_html", ""), ctx)
    body_text = render_template(tpl.get("body_text", ""), ctx)

    try:
        send_email(
            cfg,
            to=to_email,
            subject=subject,
            body_text=body_text,
            body_html=body_html,
            from_email=from_email,
            from_name=from_name,
        )
    except HTTPException as e:
        log.warning("dispatch_email %s -> %s failed: %s", kind, to_email, e.detail)
        return str(e.detail)
    except Exception as e:  # pragma: no cover
        log.exception("dispatch_email %s crashed", kind)
        return f"Unerwarteter Fehler: {e}"
    return None


class RescheduleRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    date: str = Field(min_length=10, max_length=10)
    time: str = Field(min_length=4, max_length=5)


class DeclineRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    reason: str = Field(default="", max_length=500)


async def _load_booking(booking_id: str) -> dict:
    b = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not b:
        raise HTTPException(status_code=404, detail="Buchungsanfrage nicht gefunden")
    return b


@router.post("/requests/{booking_id}/approve")
async def approve_request(booking_id: str, admin=Depends(get_current_admin)):
    b = await _load_booking(booking_id)
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "confirmed",
            "confirmed_at": datetime.now(timezone.utc).isoformat(),
            "confirmed_by": admin.get("email", ""),
        }},
    )
    err = await _dispatch_email(b, "confirmed", admin.get("email", ""))
    doc = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    return {"ok": True, "email_error": err, "booking": doc}


@router.post("/requests/{booking_id}/reschedule")
async def reschedule_request(
    booking_id: str, payload: RescheduleRequest, admin=Depends(get_current_admin)
):
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", payload.date):
        raise HTTPException(status_code=400, detail="Ungültiges Datum")
    if not re.match(r"^\d{1,2}:\d{2}$", payload.time):
        raise HTTPException(status_code=400, detail="Ungültige Uhrzeit")
    b = await _load_booking(booking_id)

    time_norm = payload.time
    if len(time_norm.split(":")[0]) == 1:
        time_norm = "0" + time_norm
    new_start = f"{payload.date}T{time_norm}:00"
    duration = int(b.get("duration_min") or 60)
    new_end = (datetime.fromisoformat(new_start) + timedelta(minutes=duration)).isoformat()

    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "start_datetime": new_start,
            "end_datetime": new_end,
            "preferred_date": payload.date,
            "preferred_time": time_norm,
            "status": "confirmed",
            "rescheduled_at": datetime.now(timezone.utc).isoformat(),
            "rescheduled_by": admin.get("email", ""),
        }},
    )
    updated = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    err = await _dispatch_email(updated, "rescheduled", admin.get("email", ""))
    return {"ok": True, "email_error": err, "booking": updated}


@router.post("/requests/{booking_id}/decline")
async def decline_request(
    booking_id: str, payload: DeclineRequest, admin=Depends(get_current_admin)
):
    b = await _load_booking(booking_id)
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "cancelled",
            "cancelled_at": datetime.now(timezone.utc).isoformat(),
            "cancelled_by": admin.get("email", ""),
            "admin_note": payload.reason,
        }},
    )
    ctx_booking = {**b, "admin_note": payload.reason}
    err = await _dispatch_email(ctx_booking, "cancelled", admin.get("email", ""))
    doc = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    return {"ok": True, "email_error": err, "booking": doc}


# ---------------------------------------------------------------------------
#  Blocked dates (Feiertage / Ferien)
# ---------------------------------------------------------------------------
class BlockedDateCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    date: str = Field(min_length=10, max_length=10)     # YYYY-MM-DD
    label: str = Field(default="", max_length=120)


class BlockedDatePatch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    date: Optional[str] = Field(default=None, min_length=10, max_length=10)
    label: Optional[str] = Field(default=None, max_length=120)


def _valid_date(iso: str) -> bool:
    try:
        datetime.strptime(iso, "%Y-%m-%d")
        return True
    except Exception:
        return False


@router.get("/blocked-dates")
async def list_blocked_dates(admin=Depends(get_current_admin)):
    docs = await db.calendar_blocked_dates.find({}, {"_id": 0}).sort("date", 1).to_list(500)
    return docs


@router.post("/blocked-dates")
async def create_blocked_date(payload: BlockedDateCreate, admin=Depends(get_current_admin)):
    if not _valid_date(payload.date):
        raise HTTPException(status_code=400, detail="Ungültiges Datum")
    # Dedupe – one entry per date (rename via PATCH if you want a different label)
    existing = await db.calendar_blocked_dates.find_one({"date": payload.date}, {"_id": 0})
    if existing:
        if payload.label and payload.label != existing.get("label"):
            await db.calendar_blocked_dates.update_one(
                {"id": existing["id"]}, {"$set": {"label": payload.label}}
            )
            existing["label"] = payload.label
        return existing
    doc = {"id": str(uuid.uuid4()), "date": payload.date, "label": payload.label}
    await db.calendar_blocked_dates.insert_one(doc)
    return {"id": doc["id"], "date": doc["date"], "label": doc["label"]}


@router.patch("/blocked-dates/{item_id}")
async def update_blocked_date(
    item_id: str, payload: BlockedDatePatch, admin=Depends(get_current_admin)
):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Keine Änderungen übergeben")
    if "date" in updates and not _valid_date(updates["date"]):
        raise HTTPException(status_code=400, detail="Ungültiges Datum")
    res = await db.calendar_blocked_dates.update_one({"id": item_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden")
    return await db.calendar_blocked_dates.find_one({"id": item_id}, {"_id": 0})


@router.delete("/blocked-dates/{item_id}")
async def delete_blocked_date(item_id: str, admin=Depends(get_current_admin)):
    res = await db.calendar_blocked_dates.delete_one({"id": item_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden")
    return {"ok": True}
