"""Calendar / appointment router.

Adds three admin endpoints on top of the existing bookings collection:

  POST   /api/appointments         admin creates a booked slot on the calendar
  PATCH  /api/appointments/{id}    edit slot / move / add notes
  DELETE /api/appointments/{id}    delete
  GET    /api/appointments         list within a date range (start/end params)

Plus a public iCal feed protected by a random token stored in BusinessSettings:

  GET    /api/calendar/{token}.ics  → subscribe from iPhone / Google

And an aggregation used by the student dashboard cards:

  GET    /api/students/{id}/summary
"""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Response

from core.activity import log_activity
from core.db import db
from core.security import get_current_admin
from models.schemas import AdminAppointmentCreate, AdminAppointmentPatch
from routers.business_settings import get_or_create_settings


# ---------------------------------------------------------------------------
#  ISO helpers
# ---------------------------------------------------------------------------
def _parse_iso(value: str) -> Optional[datetime]:
    if not value:
        return None
    try:
        v = value.replace("Z", "+00:00")
        dt = datetime.fromisoformat(v)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def _compute_end(start_iso: str, duration_min: int) -> str:
    dt = _parse_iso(start_iso)
    if not dt:
        return ""
    return (dt + timedelta(minutes=int(duration_min or 0))).isoformat()


def _serialize(doc: dict) -> dict:
    return {k: v for k, v in doc.items() if k != "_id"}


def _resolve_public_bookings(doc: dict) -> dict:
    """Legacy /bookings rows use preferred_date + preferred_time strings —
    normalise them to start_datetime so the calendar can render them.
    """
    if doc.get("start_datetime"):
        return doc
    date = (doc.get("preferred_date") or "").strip()
    time = (doc.get("preferred_time") or "09:00").strip()
    if not date:
        return doc
    # Accept 2026-05-12 and 12.05.2026 formats
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", date)
    if not m:
        m2 = re.match(r"^(\d{2})\.(\d{2})\.(\d{4})$", date)
        if m2:
            date = f"{m2.group(3)}-{m2.group(2)}-{m2.group(1)}"
        else:
            return doc
    else:
        date = f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    if not re.match(r"^\d{1,2}:\d{2}$", time):
        time = "09:00"
    if len(time.split(":")[0]) == 1:
        time = "0" + time
    doc["start_datetime"] = f"{date}T{time}:00+01:00"
    doc["duration_min"] = int(doc.get("duration_min") or 45)
    return doc


# ---------------------------------------------------------------------------
#  Admin appointments
# ---------------------------------------------------------------------------
router = APIRouter(tags=["calendar"])


@router.get("/appointments")
async def list_appointments(
    start: Optional[str] = Query(default=None, description="ISO date lower bound (inclusive)"),
    end: Optional[str] = Query(default=None, description="ISO date upper bound (exclusive)"),
    admin=Depends(get_current_admin),
):
    """List all bookings within the range. Also returns pending / unconfirmed
    public bookings that have no start_datetime yet (for the sidebar list).
    """
    docs = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    docs = [_resolve_public_bookings(d) for d in docs]

    start_dt = _parse_iso(start) if start else None
    end_dt = _parse_iso(end) if end else None

    within = []
    unscheduled = []
    for d in docs:
        s_iso = d.get("start_datetime")
        if not s_iso:
            unscheduled.append(_serialize(d))
            continue
        s_dt = _parse_iso(s_iso)
        if not s_dt:
            unscheduled.append(_serialize(d))
            continue
        if start_dt and s_dt < start_dt:
            continue
        if end_dt and s_dt >= end_dt:
            continue
        within.append(_serialize(d))
    return {"appointments": within, "unscheduled": unscheduled}


@router.post("/appointments")
async def create_appointment(
    payload: AdminAppointmentCreate, admin=Depends(get_current_admin)
):
    if not _parse_iso(payload.start_datetime):
        raise HTTPException(status_code=400, detail="Ungültiges Start-Datum/Zeit")
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["source"] = "admin"
    doc["status"] = "confirmed"          # admin-created = automatically confirmed
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["end_datetime"] = _compute_end(doc["start_datetime"], doc["duration_min"])
    # Keep legacy fields populated so the existing /bookings list still works
    doc["first_name"] = doc["customer_name"].split(" ", 1)[0] if doc["customer_name"] else ""
    doc["last_name"] = doc["customer_name"].split(" ", 1)[1] if " " in doc["customer_name"] else ""
    doc["preferred_date"] = doc["start_datetime"][:10]
    doc["preferred_time"] = doc["start_datetime"][11:16]
    await db.bookings.insert_one(doc)
    if doc.get("student_id"):
        await log_activity(
            doc["student_id"],
            "appointment.create",
            f"Termin geplant für {doc['preferred_date']} {doc['preferred_time']}",
            actor=admin.get("email"),
            meta={"appointment_id": doc["id"]},
        )
    return _serialize(doc)


@router.patch("/appointments/{appt_id}")
async def update_appointment(
    appt_id: str,
    payload: AdminAppointmentPatch,
    admin=Depends(get_current_admin),
):
    existing = await db.bookings.find_one({"id": appt_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Termin nicht gefunden")

    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    # Reject a malformed start_datetime (POST already does this — mirror it here)
    if "start_datetime" in updates and not _parse_iso(updates["start_datetime"]):
        raise HTTPException(status_code=400, detail="Ungültiges Start-Datum/Zeit")
    # Recompute end_datetime when either start or duration change
    if "start_datetime" in updates or "duration_min" in updates:
        new_start = updates.get("start_datetime") or existing.get("start_datetime", "")
        new_dur = updates.get("duration_min") or existing.get("duration_min") or 60
        updates["end_datetime"] = _compute_end(new_start, new_dur)
        if new_start:
            updates["preferred_date"] = new_start[:10]
            updates["preferred_time"] = new_start[11:16]
    if "customer_name" in updates:
        parts = updates["customer_name"].split(" ", 1)
        updates["first_name"] = parts[0] if parts else ""
        updates["last_name"] = parts[1] if len(parts) > 1 else ""
    if not updates:
        raise HTTPException(status_code=400, detail="Keine Änderungen")
    await db.bookings.update_one({"id": appt_id}, {"$set": updates})
    doc = await db.bookings.find_one({"id": appt_id}, {"_id": 0})
    return _serialize(doc)


@router.delete("/appointments/{appt_id}")
async def delete_appointment(appt_id: str, admin=Depends(get_current_admin)):
    res = await db.bookings.delete_one({"id": appt_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Termin nicht gefunden")
    return {"ok": True}


# ---------------------------------------------------------------------------
#  Public iCal feed (protected by random token in BusinessSettings)
# ---------------------------------------------------------------------------
ical_router = APIRouter(tags=["calendar"])


def _ical_escape(text: str) -> str:
    return (
        (text or "")
        .replace("\\", "\\\\")
        .replace("\n", "\\n")
        .replace(",", "\\,")
        .replace(";", "\\;")
    )


def _to_ics_dt(iso: str) -> str:
    dt = _parse_iso(iso)
    if not dt:
        return ""
    return dt.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


@ical_router.get("/calendar/{token}.ics")
async def ical_feed(token: str):
    settings = await get_or_create_settings()
    stored = settings.get("calendar_token") or ""
    if not stored or not secrets_compare(token, stored):
        raise HTTPException(status_code=404, detail="Feed nicht gefunden")

    docs = await db.bookings.find({}, {"_id": 0}).sort("start_datetime", 1).to_list(1000)
    docs = [_resolve_public_bookings(d) for d in docs if _resolve_public_bookings(d).get("start_datetime")]

    business_name = settings.get("business_name") or "Fahrschule Safe Ride"

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        f"PRODID:-//SafeRide//{_ical_escape(business_name)}//DE",
        f"X-WR-CALNAME:{_ical_escape(business_name)}",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
    ]
    now_utc = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    for d in docs:
        start = _to_ics_dt(d.get("start_datetime", ""))
        end = _to_ics_dt(d.get("end_datetime", "")) or _to_ics_dt(
            _compute_end(d.get("start_datetime", ""), d.get("duration_min") or 45)
        )
        if not start or not end:
            continue
        title = (
            d.get("customer_name")
            or f"{d.get('first_name','')} {d.get('last_name','')}".strip()
            or "Termin"
        )
        pkg = d.get("package_snapshot", {})
        summary_extra = ""
        if pkg.get("title_de"):
            summary_extra = f" · {pkg['title_de']}"
        description_bits = []
        if d.get("phone"):
            description_bits.append(f"Tel: {d['phone']}")
        if d.get("email"):
            description_bits.append(f"E-Mail: {d['email']}")
        if d.get("notes"):
            description_bits.append(d["notes"])
        if d.get("message"):
            description_bits.append(d["message"])
        description = _ical_escape("\n".join(description_bits))
        location = _ical_escape(d.get("pickup_location") or d.get("location_slug") or "")
        lines += [
            "BEGIN:VEVENT",
            f"UID:{d.get('id')}@saferide.ch",
            f"DTSTAMP:{now_utc}",
            f"DTSTART:{start}",
            f"DTEND:{end}",
            f"SUMMARY:{_ical_escape(title)}{_ical_escape(summary_extra)}",
        ]
        if description:
            lines.append(f"DESCRIPTION:{description}")
        if location:
            lines.append(f"LOCATION:{location}")
        status = (d.get("status") or "").lower()
        if status == "cancelled":
            lines.append("STATUS:CANCELLED")
        elif status == "pending":
            lines.append("STATUS:TENTATIVE")
        else:
            lines.append("STATUS:CONFIRMED")
        lines.append("END:VEVENT")
    lines.append("END:VCALENDAR")

    body = "\r\n".join(lines) + "\r\n"
    return Response(
        content=body,
        media_type="text/calendar; charset=utf-8",
        headers={
            "Content-Disposition": 'inline; filename="saferide.ics"',
            "Cache-Control": "no-store",
        },
    )


def secrets_compare(a: str, b: str) -> bool:
    """Constant-time comparison — avoids timing leaks on the token."""
    import hmac
    return hmac.compare_digest(a, b)


# ---------------------------------------------------------------------------
#  Regenerate calendar token (in case the user leaked their subscription URL)
# ---------------------------------------------------------------------------
@router.post("/calendar/regenerate-token")
async def regenerate_calendar_token(admin=Depends(get_current_admin)):
    import secrets as _secrets
    token = _secrets.token_urlsafe(32)
    await db.business_settings.update_one(
        {"id": "default"}, {"$set": {"calendar_token": token}}
    )
    return {"calendar_token": token}


# ---------------------------------------------------------------------------
#  Student dashboard summary — driven by the overview cards
# ---------------------------------------------------------------------------
student_summary_router = APIRouter(prefix="/students", tags=["calendar"])


@student_summary_router.get("/{student_id}/summary")
async def student_summary(student_id: str, admin=Depends(get_current_admin)):
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Schüler nicht gefunden")

    # Invoices – open count + open sum (with MWST)
    invoices = await db.student_invoices.find(
        {"student_id": student_id}, {"_id": 0}
    ).to_list(1000)
    open_count = 0
    open_sum = 0.0
    for inv in invoices:
        if (inv.get("status") or "open") == "open":
            open_count += 1
            price = float(inv.get("price_chf") or 0)
            mwst = float(inv.get("mwst_rate") or 0)
            open_sum += price * (1 + mwst / 100.0)
    open_sum = round(open_sum, 2)

    # Appointments – upcoming vs completed for this student
    appts = await db.bookings.find(
        {"student_id": student_id}, {"_id": 0}
    ).to_list(1000)
    appts = [_resolve_public_bookings(a) for a in appts if _resolve_public_bookings(a).get("start_datetime")]
    now = datetime.now(timezone.utc)
    upcoming = []
    completed = 0
    for a in appts:
        s = _parse_iso(a.get("start_datetime"))
        if not s:
            continue
        if s >= now:
            upcoming.append(a)
        else:
            completed += 1
    upcoming.sort(key=lambda a: a.get("start_datetime", ""))

    # Lessons already logged in Fahrkontrolle (= completed lessons, additional signal)
    lesson_count = await db.student_lessons.count_documents({"student_id": student_id})

    return {
        "open_invoices_count": open_count,
        "open_invoices_sum_chf": open_sum,
        "invoice_count": len(invoices),
        "upcoming_appointments_count": len(upcoming),
        "next_appointment": upcoming[0] if upcoming else None,
        "completed_appointments_count": completed,
        "logged_lessons_count": lesson_count,
    }
