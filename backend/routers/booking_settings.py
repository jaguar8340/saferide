"""Booking Settings (Phase 1 – admin-editable).

Groups everything needed for the online booking flow that is still to be
built in Phase 2. Endpoints follow REST conventions:

    /api/booking/availability                – single-doc CRUD (working hours)
    /api/booking/pickup-locations            – CRUD + move/reorder
    /api/booking/pickup-locations/distances  – upsert travel-time matrix
    /api/booking/vehicles                    – CRUD
    /api/booking/email-templates             – CRUD by `kind`

Everything is 100 % additive. No existing collection touched.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from core.db import db
from core.security import get_current_admin
from models.schemas import (
    CalendarAvailability,
    EmailTemplate,
    EmailTemplatePatch,
    PickupDistance,
    PickupDistanceUpsert,
    PickupLocation,
    PickupLocationCreate,
    PickupLocationPatch,
    Vehicle,
    VehicleCreate,
    VehiclePatch,
    WeekdayHours,
)


router = APIRouter(prefix="/booking", tags=["booking-settings"])


# ---------------------------------------------------------------------------
#  Calendar availability (weekday hours + default buffer)
# ---------------------------------------------------------------------------
DEFAULT_WEEKDAYS = [
    WeekdayHours(weekday=0, open=True,  start_time="08:00", end_time="18:00"),
    WeekdayHours(weekday=1, open=True,  start_time="08:00", end_time="18:00"),
    WeekdayHours(weekday=2, open=True,  start_time="08:00", end_time="18:00"),
    WeekdayHours(weekday=3, open=True,  start_time="08:00", end_time="18:00"),
    WeekdayHours(weekday=4, open=True,  start_time="08:00", end_time="18:00"),
    WeekdayHours(weekday=5, open=True,  start_time="09:00", end_time="15:00"),
    WeekdayHours(weekday=6, open=False, start_time="09:00", end_time="15:00"),
]


class CalendarAvailabilityPatch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    weekdays: Optional[List[WeekdayHours]] = None
    default_buffer_min: Optional[int] = Field(default=None, ge=0, le=240)


@router.get("/availability", response_model=CalendarAvailability)
async def get_availability(admin=Depends(get_current_admin)):
    doc = await db.calendar_availability.find_one({"id": "default"}, {"_id": 0})
    if not doc:
        doc = CalendarAvailability(weekdays=DEFAULT_WEEKDAYS).model_dump()
        await db.calendar_availability.insert_one(doc)
    # Ensure the weekdays list is always length-7 and sorted so the UI is stable.
    weekdays = {w["weekday"]: w for w in doc.get("weekdays", [])}
    doc["weekdays"] = [
        weekdays.get(i, WeekdayHours(weekday=i).model_dump())
        for i in range(7)
    ]
    return doc


@router.put("/availability", response_model=CalendarAvailability)
async def update_availability(
    payload: CalendarAvailabilityPatch,
    admin=Depends(get_current_admin),
):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Keine Änderungen übergeben")
    from datetime import datetime, timezone
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.calendar_availability.update_one(
        {"id": "default"}, {"$set": updates}, upsert=True
    )
    return await get_availability(admin=admin)  # normalized response


# ---------------------------------------------------------------------------
#  Pickup locations (Abholorte)
# ---------------------------------------------------------------------------
@router.get("/pickup-locations", response_model=List[PickupLocation])
async def list_pickup_locations(admin=Depends(get_current_admin)):
    return await db.pickup_locations.find({}, {"_id": 0}).sort("order", 1).to_list(500)


@router.post("/pickup-locations", response_model=PickupLocation)
async def create_pickup_location(
    payload: PickupLocationCreate, admin=Depends(get_current_admin)
):
    if not payload.order:
        n = await db.pickup_locations.count_documents({})
        payload = payload.model_copy(update={"order": n})
    loc = PickupLocation(**payload.model_dump())
    await db.pickup_locations.insert_one(loc.model_dump())
    return loc


@router.patch("/pickup-locations/{loc_id}", response_model=PickupLocation)
async def update_pickup_location(
    loc_id: str, payload: PickupLocationPatch, admin=Depends(get_current_admin)
):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Keine Änderungen übergeben")
    res = await db.pickup_locations.update_one({"id": loc_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Abholort nicht gefunden")
    return await db.pickup_locations.find_one({"id": loc_id}, {"_id": 0})


@router.delete("/pickup-locations/{loc_id}")
async def delete_pickup_location(loc_id: str, admin=Depends(get_current_admin)):
    # Also remove any distance entries referencing this location.
    await db.pickup_distances.delete_many(
        {"$or": [{"from_id": loc_id}, {"to_id": loc_id}]}
    )
    res = await db.pickup_locations.delete_one({"id": loc_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Abholort nicht gefunden")
    return {"ok": True}


# ---------------------------------------------------------------------------
#  Pickup distance matrix (unordered pairs)
# ---------------------------------------------------------------------------
def _pair_key(a: str, b: str) -> tuple[str, str]:
    """Return a canonical (sorted) pair so both directions collapse to one doc."""
    return (a, b) if a <= b else (b, a)


@router.get("/pickup-locations/distances", response_model=List[PickupDistance])
async def list_distances(admin=Depends(get_current_admin)):
    return await db.pickup_distances.find({}, {"_id": 0}).to_list(2000)


@router.put("/pickup-locations/distances", response_model=PickupDistance)
async def upsert_distance(
    payload: PickupDistanceUpsert, admin=Depends(get_current_admin)
):
    if payload.from_id == payload.to_id:
        raise HTTPException(status_code=400, detail="Gleicher Standort")
    a, b = _pair_key(payload.from_id, payload.to_id)
    existing = await db.pickup_distances.find_one({"from_id": a, "to_id": b}, {"_id": 0})
    if existing:
        await db.pickup_distances.update_one(
            {"id": existing["id"]},
            {"$set": {"travel_min": payload.travel_min}},
        )
        existing["travel_min"] = payload.travel_min
        return existing
    doc = PickupDistance(from_id=a, to_id=b, travel_min=payload.travel_min)
    await db.pickup_distances.insert_one(doc.model_dump())
    return doc


# ---------------------------------------------------------------------------
#  Vehicles (Audi Automat, Opel Handschaltung, Range Rover Anhänger)
# ---------------------------------------------------------------------------
@router.get("/vehicles", response_model=List[Vehicle])
async def list_vehicles(admin=Depends(get_current_admin)):
    return await db.vehicles.find({}, {"_id": 0}).sort("order", 1).to_list(200)


@router.post("/vehicles", response_model=Vehicle)
async def create_vehicle(payload: VehicleCreate, admin=Depends(get_current_admin)):
    if not payload.order:
        n = await db.vehicles.count_documents({})
        payload = payload.model_copy(update={"order": n})
    v = Vehicle(**payload.model_dump())
    await db.vehicles.insert_one(v.model_dump())
    return v


@router.patch("/vehicles/{veh_id}", response_model=Vehicle)
async def update_vehicle(
    veh_id: str, payload: VehiclePatch, admin=Depends(get_current_admin)
):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Keine Änderungen übergeben")
    res = await db.vehicles.update_one({"id": veh_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Fahrzeug nicht gefunden")
    return await db.vehicles.find_one({"id": veh_id}, {"_id": 0})


@router.delete("/vehicles/{veh_id}")
async def delete_vehicle(veh_id: str, admin=Depends(get_current_admin)):
    res = await db.vehicles.delete_one({"id": veh_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fahrzeug nicht gefunden")
    return {"ok": True}


# ---------------------------------------------------------------------------
#  E-mail templates (4 fixed kinds)
# ---------------------------------------------------------------------------
TEMPLATE_KINDS = ("requested", "confirmed", "rescheduled", "cancelled")


@router.get("/email-templates", response_model=List[EmailTemplate])
async def list_templates(admin=Depends(get_current_admin)):
    docs = await db.booking_email_templates.find({}, {"_id": 0}).to_list(20)
    # Return in fixed order matching TEMPLATE_KINDS so the UI is stable.
    by_kind = {d["kind"]: d for d in docs}
    return [by_kind[k] for k in TEMPLATE_KINDS if k in by_kind]


@router.patch("/email-templates/{kind}", response_model=EmailTemplate)
async def update_template(
    kind: str, payload: EmailTemplatePatch, admin=Depends(get_current_admin)
):
    if kind not in TEMPLATE_KINDS:
        raise HTTPException(status_code=400, detail=f"Unbekannter Vorlagen-Typ: {kind}")
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Keine Änderungen übergeben")
    from datetime import datetime, timezone
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.booking_email_templates.update_one(
        {"kind": kind}, {"$set": updates}, upsert=True
    )
    return await db.booking_email_templates.find_one({"kind": kind}, {"_id": 0})
