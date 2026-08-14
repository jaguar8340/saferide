"""Public online booking flow (Phase 2).

Endpoints (all under `/api/booking/public/…` and NOT protected by auth):

    GET  /vehicles           → active vehicles for the picker
    GET  /pickup-locations   → all locations for the picker
    GET  /slots              → free time slots for a chosen day
    POST /request            → submit a booking request (manual approval)

The slot algorithm respects
  – weekday opening hours (`calendar_availability.weekdays`)
  – the global `default_buffer_min` gap
  – the manual **travel-time matrix** between pickup locations
    (`pickup_distances`) — added ON TOP of the default buffer when the
    previous or next appointment on that day has a different pickup.

All submitted requests are stored in the **existing `bookings` collection**
with `status="pending"` + `source="public"` + `entry_type="appointment"`,
so they appear in the admin's "Nicht bestätigte Buchungen" panel and can
be scheduled from there with the existing drag-and-drop workflow.
"""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from core.db import db


router = APIRouter(prefix="/booking/public", tags=["booking-public"])

SLOT_GRID_MIN = 15  # candidate slots are checked every 15 min


# ---------------------------------------------------------------------------
#  Small helpers
# ---------------------------------------------------------------------------
def _parse_hhmm(s: str, default: str = "08:00") -> tuple[int, int]:
    """Turn "HH:MM" into (hours, minutes). Falls back on `default` on error."""
    m = re.match(r"^(\d{1,2}):(\d{2})$", (s or "").strip())
    if not m:
        m = re.match(r"^(\d{1,2}):(\d{2})$", default)
    return int(m.group(1)), int(m.group(2))


def _to_minutes(hh: int, mm: int) -> int:
    return hh * 60 + mm


def _fmt_hhmm(total_min: int) -> str:
    h, m = divmod(total_min, 60)
    return f"{h:02d}:{m:02d}"


def _parse_iso(value: str) -> Optional[datetime]:
    if not value:
        return None
    try:
        v = value.replace("Z", "+00:00")
        dt = datetime.fromisoformat(v)
        return dt
    except Exception:
        return None


def _bookings_on_day(all_bookings: List[Dict[str, Any]], date_iso: str) -> List[Dict[str, Any]]:
    """Filter existing bookings that overlap the given date_iso ("YYYY-MM-DD")."""
    out = []
    for b in all_bookings:
        if (b.get("status") or "").lower() in {"cancelled", "storniert"}:
            continue
        start = (b.get("start_datetime") or "")
        if not start:
            # `preferred_date/preferred_time` legacy fallback
            pd = (b.get("preferred_date") or "").strip()
            if not pd:
                continue
            # Normalise DD.MM.YYYY → YYYY-MM-DD
            m = re.match(r"^(\d{2})\.(\d{2})\.(\d{4})$", pd)
            if m:
                pd = f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
            if pd != date_iso:
                continue
            pt = (b.get("preferred_time") or "09:00").strip()
            if len(pt.split(":")[0]) == 1:
                pt = "0" + pt
            b = {**b, "start_datetime": f"{date_iso}T{pt}:00"}
        elif not start.startswith(date_iso):
            continue
        out.append(b)
    return out


def _pickup_id_from_booking(b: Dict[str, Any], loc_by_name: Dict[str, str]) -> Optional[str]:
    """Given a booking dict, try to resolve which pickup-location it references."""
    # New public bookings save `pickup_id` explicitly
    if b.get("pickup_id"):
        return b["pickup_id"]
    # Legacy: `pickup_location` is either a location name or a location-page slug
    key = (b.get("pickup_location") or "").strip().lower()
    if key and key in loc_by_name:
        return loc_by_name[key]
    return None


def _distance_matrix(distances: List[Dict[str, Any]]) -> Dict[tuple[str, str], int]:
    m: Dict[tuple[str, str], int] = {}
    for d in distances:
        a, b = d.get("from_id"), d.get("to_id")
        v = int(d.get("travel_min") or 0)
        if not a or not b:
            continue
        m[(a, b)] = v
        m[(b, a)] = v
    return m


def _required_gap(
    pickup_a: Optional[str],
    pickup_b: Optional[str],
    dist_matrix: Dict[tuple[str, str], int],
    default_buffer: int,
) -> int:
    """Return the minimum gap in minutes between an appointment at pickup_a
    (that ends first) and an appointment at pickup_b (that starts after)."""
    travel = 0
    if pickup_a and pickup_b and pickup_a != pickup_b:
        travel = dist_matrix.get((pickup_a, pickup_b), 0)
    return default_buffer + travel


# ---------------------------------------------------------------------------
#  Public listings (no auth) – only expose the essentials
# ---------------------------------------------------------------------------
@router.get("/vehicles")
async def public_vehicles():
    """Active vehicles only, minimal payload."""
    docs = await db.vehicles.find({}, {"_id": 0}).sort("order", 1).to_list(200)
    return [
        {
            "id": v["id"],
            "name": v.get("name", ""),
            "transmission": v.get("transmission", ""),
            "category": v.get("category", "B"),
            "allowed_durations": v.get("allowed_durations", [45, 90, 135]),
        }
        for v in docs
        if v.get("active", True)
    ]


@router.get("/pickup-locations")
async def public_locations():
    docs = await db.pickup_locations.find({}, {"_id": 0}).sort("order", 1).to_list(500)
    return [{"id": d["id"], "name": d.get("name", ""), "address": d.get("address", "")} for d in docs]


# ---------------------------------------------------------------------------
#  GET /slots — the intelligent slot calculator
# ---------------------------------------------------------------------------
@router.get("/slots")
async def public_slots(
    date: str = Query(..., min_length=10, max_length=10, description="YYYY-MM-DD"),
    duration_min: int = Query(..., ge=15, le=480),
    pickup_id: Optional[str] = Query(default=None),
    vehicle_id: Optional[str] = Query(default=None),  # accepted for future filtering, unused today
):
    # ---- validate date ----
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", date)
    if not m:
        raise HTTPException(status_code=400, detail="Ungültiges Datum – erwartet YYYY-MM-DD")
    try:
        target_date = datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)))
    except ValueError:
        raise HTTPException(status_code=400, detail="Ungültiges Datum")

    # Never offer slots in the past
    today = datetime.now(timezone.utc).replace(tzinfo=None)
    if target_date.date() < today.date():
        return {"slots": [], "reason": "past_date"}

    weekday = target_date.weekday()  # Mon=0..Sun=6

    # ---- availability ----
    avail = await db.calendar_availability.find_one({"id": "default"}, {"_id": 0}) or {}
    weekdays = {w["weekday"]: w for w in avail.get("weekdays", []) if "weekday" in w}
    day_cfg = weekdays.get(weekday)
    if not day_cfg or not day_cfg.get("open", True):
        return {"slots": [], "reason": "closed_day"}
    default_buffer = int(avail.get("default_buffer_min", 15) or 0)

    start_h, start_m = _parse_hhmm(day_cfg.get("start_time"), "08:00")
    end_h, end_m = _parse_hhmm(day_cfg.get("end_time"), "18:00")
    day_start = _to_minutes(start_h, start_m)
    day_end = _to_minutes(end_h, end_m)
    if day_end - day_start < duration_min:
        return {"slots": [], "reason": "too_short_window"}

    # ---- lookup tables ----
    locs = await db.pickup_locations.find({}, {"_id": 0}).to_list(500)
    loc_by_name = {(l.get("name") or "").strip().lower(): l["id"] for l in locs if l.get("id")}
    dists = await db.pickup_distances.find({}, {"_id": 0}).to_list(2000)
    dist_matrix = _distance_matrix(dists)

    # ---- occupied bookings for that day ----
    all_bookings = await db.bookings.find({}, {"_id": 0}).to_list(5000)
    day_bookings = _bookings_on_day(all_bookings, date)
    intervals: List[Dict[str, Any]] = []
    for b in day_bookings:
        start_dt = _parse_iso(b.get("start_datetime") or "")
        if not start_dt:
            continue
        b_start_min = start_dt.hour * 60 + start_dt.minute
        b_dur = int(b.get("duration_min") or 60)
        b_end_min = b_start_min + b_dur
        intervals.append(
            {
                "start": b_start_min,
                "end": b_end_min,
                "pickup_id": _pickup_id_from_booking(b, loc_by_name),
            }
        )
    intervals.sort(key=lambda x: x["start"])

    # ---- iterate candidate slots ----
    slots: List[str] = []
    # If date is today, don't return slots that already started
    if target_date.date() == today.date():
        cur_min = today.hour * 60 + today.minute
        # Round UP to next 15-min grid so we don't propose "in 3 minutes"
        cur_min = ((cur_min // SLOT_GRID_MIN) + 1) * SLOT_GRID_MIN
        earliest = max(day_start, cur_min)
    else:
        earliest = day_start

    t = earliest
    latest = day_end - duration_min
    while t <= latest:
        cand_start = t
        cand_end = t + duration_min
        conflict = False
        for it in intervals:
            if cand_start < it["end"] and cand_end > it["start"]:
                conflict = True
                break
            if it["end"] <= cand_start:
                gap = cand_start - it["end"]
                need = _required_gap(it["pickup_id"], pickup_id, dist_matrix, default_buffer)
                if gap < need:
                    conflict = True
                    break
            elif cand_end <= it["start"]:
                gap = it["start"] - cand_end
                need = _required_gap(pickup_id, it["pickup_id"], dist_matrix, default_buffer)
                if gap < need:
                    conflict = True
                    break
        if not conflict:
            slots.append(_fmt_hhmm(cand_start))
        t += SLOT_GRID_MIN

    return {"slots": slots, "opening": f"{_fmt_hhmm(day_start)}–{_fmt_hhmm(day_end)}"}


# ---------------------------------------------------------------------------
#  POST /request — persist a pending booking request
# ---------------------------------------------------------------------------
class PublicBookingRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    phone: str = Field(min_length=4, max_length=40)
    date: str = Field(min_length=10, max_length=10)          # YYYY-MM-DD
    time: str = Field(min_length=4, max_length=5)            # HH:MM
    duration_min: int = Field(ge=15, le=480)
    vehicle_id: Optional[str] = Field(default=None, max_length=64)
    pickup_id: Optional[str] = Field(default=None, max_length=64)
    notes: str = Field(default="", max_length=2000)


@router.post("/request")
async def create_public_request(payload: PublicBookingRequest):
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", payload.date):
        raise HTTPException(status_code=400, detail="Ungültiges Datum")
    if not re.match(r"^\d{1,2}:\d{2}$", payload.time):
        raise HTTPException(status_code=400, detail="Ungültige Uhrzeit")

    time_norm = payload.time
    if len(time_norm.split(":")[0]) == 1:
        time_norm = "0" + time_norm
    start_iso = f"{payload.date}T{time_norm}:00"

    # ----- lightweight server-side conflict guard -----
    # Reject if the exact same time-slot is already reserved. This prevents
    # a race condition where two visitors submit the same slot at the same
    # moment before the admin approves either. Cancelled / declined slots
    # are ignored so admins can free them up again.
    hh, mm = _parse_hhmm(time_norm)
    req_start = _to_minutes(hh, mm)
    req_end = req_start + payload.duration_min
    same_day_docs = await db.bookings.find({}, {"_id": 0}).to_list(5000)
    for b in _bookings_on_day(same_day_docs, payload.date):
        b_dt = _parse_iso(b.get("start_datetime") or "")
        if not b_dt:
            continue
        b_start = b_dt.hour * 60 + b_dt.minute
        b_end = b_start + int(b.get("duration_min") or 60)
        if req_start < b_end and req_end > b_start:
            raise HTTPException(
                status_code=409,
                detail="Dieser Slot ist inzwischen belegt. Bitte wähle einen anderen Zeitpunkt.",
            )

    # Resolve vehicle + pickup names for display
    veh_name = ""
    if payload.vehicle_id:
        v = await db.vehicles.find_one({"id": payload.vehicle_id}, {"_id": 0})
        if v:
            veh_name = f"{v.get('name', '')} ({v.get('transmission', '')})".strip(" ()")
    pickup_name = ""
    if payload.pickup_id:
        p = await db.pickup_locations.find_one({"id": payload.pickup_id}, {"_id": 0})
        if p:
            pickup_name = p.get("name", "")

    customer_name = f"{payload.first_name} {payload.last_name}".strip()
    doc: Dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "source": "public",
        "entry_type": "appointment",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        # Contact
        "first_name": payload.first_name,
        "last_name": payload.last_name,
        "customer_name": customer_name,
        "email": payload.email,
        "phone": payload.phone,
        # Slot
        "start_datetime": start_iso,
        "duration_min": payload.duration_min,
        "end_datetime": (
            datetime.fromisoformat(start_iso) + timedelta(minutes=payload.duration_min)
        ).isoformat(),
        # Vehicle + pickup
        "vehicle_id": payload.vehicle_id or "",
        "vehicle_name": veh_name,
        "pickup_id": payload.pickup_id or "",
        "pickup_location": pickup_name,
        # Legacy compatibility fields consumed by the calendar list
        "preferred_date": payload.date,
        "preferred_time": time_norm,
        "notes": payload.notes,
        "message": payload.notes,
    }
    await db.bookings.insert_one(doc)
    return {"ok": True, "id": doc["id"]}
