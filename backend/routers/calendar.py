"""Calendar / appointment router.

Adds three admin endpoints on top of the existing bookings collection:

  POST   /api/appointments         admin creates a booked slot on the calendar
  PATCH  /api/appointments/{id}    edit slot / move / add notes
  DELETE /api/appointments/{id}    delete
  GET    /api/appointments         list within a date range (start/end params)
  GET    /api/appointments/upcoming  next N future appointments (sorted asc)

Plus a public iCal feed protected by a random token stored in BusinessSettings:

  GET    /api/calendar/{token}.ics  → subscribe from iPhone / Google

And external iCal-Feed import (iPhone/Google → block admin slots):
  GET    /api/calendar/external-feeds
  POST   /api/calendar/external-feeds       {url}
  DELETE /api/calendar/external-feeds/{index}

And an aggregation used by the student dashboard cards:

  GET    /api/students/{id}/summary
"""
from __future__ import annotations

import re
import time
import uuid
import httpx
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field

from core.activity import log_activity
from core.db import db
from core.security import get_current_admin
from models.schemas import AdminAppointmentCreate, AdminAppointmentPatch
from routers.business_settings import get_or_create_settings

try:
    from icalendar import Calendar as ICalendar
except Exception:      # pragma: no cover
    ICalendar = None


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

    # Externe iCal-Feeds mergen — read-only als „belegt"
    external = await _load_external_events(start_dt, end_dt)
    return {"appointments": within, "unscheduled": unscheduled, "external": external}


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
    doc.setdefault("entry_type", "appointment")
    # Sanity: Blockzeit ohne customer_name → Standard-Titel
    if doc.get("entry_type") == "block" and not (doc.get("customer_name") or "").strip():
        doc["customer_name"] = "Blockzeit"
    elif not (doc.get("customer_name") or "").strip():
        raise HTTPException(status_code=400, detail="Kunde muss ausgefüllt sein")
    # Keep legacy fields populated so the existing /bookings list still works
    parts = (doc["customer_name"] or "").split(" ", 1)
    doc["first_name"] = parts[0] if parts else ""
    doc["last_name"] = parts[1] if len(parts) > 1 else ""
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


@router.get("/appointments/upcoming")
async def upcoming_appointments(
    limit: int = Query(default=200, ge=1, le=1000),
    admin=Depends(get_current_admin),
):
    """Return every future appointment (own + external merged), sorted ASC.
    Used by the calendar's list view („Terminübersicht")."""
    now = datetime.now(timezone.utc)
    own = await db.bookings.find({}, {"_id": 0}).sort("start_datetime", 1).to_list(2000)
    own = [_resolve_public_bookings(d) for d in own]
    future_own = []
    for d in own:
        s = _parse_iso(d.get("start_datetime") or "")
        if s and s >= now - timedelta(minutes=15):     # 15 min Toleranz
            future_own.append(_serialize(d))

    external = await _load_external_events(now, now + timedelta(days=365))
    future_ext = [e for e in external if _parse_iso(e["start_datetime"]) >= now - timedelta(minutes=15)]

    merged = future_own + future_ext
    merged.sort(key=lambda a: a.get("start_datetime") or "")
    return {"appointments": merged[:limit]}


# ---------------------------------------------------------------------------
#  External iCal feed importer (iPhone / Google → block slots)
# ---------------------------------------------------------------------------
_EXT_CACHE: dict = {"ts": 0.0, "events": [], "urls": []}
_EXT_TTL_SECONDS = 300      # 5 Minuten


async def _fetch_ical_events(url: str) -> List[dict]:
    """Download & parse an iCal feed. Returns a list of dicts with
    keys: start_datetime, end_datetime, summary. Silently skips
    unreachable / malformed feeds — the calendar keeps working."""
    if not ICalendar or not (url or "").strip():
        return []
    # `webcal://` ist ein Convenience-Prefix — auf https umschreiben
    fetch_url = url.strip()
    if fetch_url.startswith("webcal://"):
        fetch_url = "https://" + fetch_url[len("webcal://"):]
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            r = await client.get(fetch_url)
            if r.status_code != 200:
                return []
            raw = r.content
    except Exception:
        return []

    try:
        cal = ICalendar.from_ical(raw)
    except Exception:
        return []

    events: List[dict] = []
    for comp in cal.walk():
        if comp.name != "VEVENT":
            continue
        dtstart = comp.get("dtstart")
        dtend = comp.get("dtend")
        if not dtstart:
            continue
        start = dtstart.dt
        end = dtend.dt if dtend else None
        # icalendar liefert entweder datetime oder date
        if not isinstance(start, datetime):
            # Ganztägig → 00:00–23:59
            start = datetime(start.year, start.month, start.day, 0, 0, tzinfo=timezone.utc)
            if end is None or not isinstance(end, datetime):
                end = start + timedelta(days=1)
            elif not isinstance(end, datetime):
                end = datetime(end.year, end.month, end.day, 0, 0, tzinfo=timezone.utc)
        else:
            if start.tzinfo is None:
                start = start.replace(tzinfo=timezone.utc)
            if end is None:
                end = start + timedelta(hours=1)
            elif isinstance(end, datetime) and end.tzinfo is None:
                end = end.replace(tzinfo=timezone.utc)

        summary = str(comp.get("summary") or "Extern belegt")
        events.append({
            "id": f"ext-{comp.get('uid') or uuid.uuid4()}",
            "start_datetime": start.isoformat(),
            "end_datetime": end.isoformat(),
            "duration_min": int((end - start).total_seconds() / 60),
            "customer_name": summary,
            "notes": "",
            "pickup_location": "",
            "status": "confirmed",
            "entry_type": "external",
            "source": "external_ical",
            "is_readonly": True,
        })
    return events


async def _load_external_events(
    start_dt: Optional[datetime], end_dt: Optional[datetime]
) -> List[dict]:
    """Return events from all configured external iCal feeds, filtered to the
    given range. Uses a 5-minute in-memory cache to keep the calendar fast."""
    settings = await get_or_create_settings()
    urls: List[str] = list(settings.get("external_ical_urls") or [])
    if not urls:
        return []

    now_ts = time.time()
    if (
        _EXT_CACHE["urls"] == urls
        and now_ts - _EXT_CACHE["ts"] < _EXT_TTL_SECONDS
    ):
        events = list(_EXT_CACHE["events"])
    else:
        events = []
        for u in urls:
            events.extend(await _fetch_ical_events(u))
        _EXT_CACHE["urls"] = urls
        _EXT_CACHE["events"] = events
        _EXT_CACHE["ts"] = now_ts

    # Range filtern
    out: List[dict] = []
    for e in events:
        s = _parse_iso(e["start_datetime"])
        if not s:
            continue
        if start_dt and s < start_dt:
            continue
        if end_dt and s >= end_dt:
            continue
        out.append(e)
    return out


class ExternalFeedIn(BaseModel):
    url: str = Field(min_length=4, max_length=1000)


@router.get("/calendar/external-feeds")
async def list_external_feeds(admin=Depends(get_current_admin)):
    settings = await get_or_create_settings()
    return {"urls": list(settings.get("external_ical_urls") or [])}


@router.post("/calendar/external-feeds")
async def add_external_feed(payload: ExternalFeedIn, admin=Depends(get_current_admin)):
    url = payload.url.strip()
    settings = await get_or_create_settings()
    urls: List[str] = list(settings.get("external_ical_urls") or [])
    if url in urls:
        raise HTTPException(status_code=400, detail="Feed bereits abonniert")
    urls.append(url)
    await db.business_settings.update_one(
        {"id": "default"}, {"$set": {"external_ical_urls": urls}}
    )
    _EXT_CACHE["ts"] = 0     # Cache invalidieren
    # Kurzer Fetch-Check gibt Feedback ob URL überhaupt funktioniert
    events = await _fetch_ical_events(url)
    return {"urls": urls, "events_found": len(events)}


@router.delete("/calendar/external-feeds/{index}")
async def remove_external_feed(index: int, admin=Depends(get_current_admin)):
    settings = await get_or_create_settings()
    urls: List[str] = list(settings.get("external_ical_urls") or [])
    if index < 0 or index >= len(urls):
        raise HTTPException(status_code=404, detail="Feed-Index ungültig")
    urls.pop(index)
    await db.business_settings.update_one(
        {"id": "default"}, {"$set": {"external_ical_urls": urls}}
    )
    _EXT_CACHE["ts"] = 0
    return {"urls": urls}


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
