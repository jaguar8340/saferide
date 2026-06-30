"""Booking packages CRUD + public booking creation + admin booking management."""
import uuid
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Body, Depends, HTTPException

from core.db import db
from core.security import get_current_admin
from models.schemas import (
    BookingCreate,
    BookingPackageCreate,
    BookingPackagePatch,
)

router = APIRouter(tags=["bookings"])


# ---------- Booking Packages ----------
@router.get("/packages")
async def list_packages():
    items = await db.booking_packages.find({}, {"_id": 0}).sort("order", 1).to_list(200)
    return [p for p in items if p.get("active", True)]


@router.get("/packages/admin")
async def list_packages_admin(admin=Depends(get_current_admin)):
    return await db.booking_packages.find({}, {"_id": 0}).sort("order", 1).to_list(200)


@router.get("/packages/{slug}")
async def get_package(slug: str):
    doc = await db.booking_packages.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Paket nicht gefunden")
    return doc


@router.post("/packages")
async def create_package(payload: BookingPackageCreate, admin=Depends(get_current_admin)):
    body = payload.model_dump()
    body["slug"] = body["slug"].lower().strip()
    if await db.booking_packages.find_one({"slug": body["slug"]}):
        raise HTTPException(status_code=409, detail="Slug existiert bereits")
    body["id"] = str(uuid.uuid4())
    body.setdefault("active", True)
    body.setdefault("order", await db.booking_packages.count_documents({}))
    await db.booking_packages.insert_one(body)
    return {k: v for k, v in body.items() if k != "_id"}


@router.patch("/packages/{slug}")
async def update_package(slug: str, payload: BookingPackagePatch, admin=Depends(get_current_admin)):
    set_ops = payload.model_dump(exclude_unset=True)
    if not set_ops:
        raise HTTPException(status_code=400, detail="Leere Aktualisierung")
    res = await db.booking_packages.update_one({"slug": slug}, {"$set": set_ops})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Paket nicht gefunden")
    return await db.booking_packages.find_one({"slug": slug}, {"_id": 0})


@router.delete("/packages/{slug}")
async def delete_package(slug: str, admin=Depends(get_current_admin)):
    res = await db.booking_packages.delete_one({"slug": slug})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Paket nicht gefunden")
    return {"ok": True}


# ---------- Bookings ----------
@router.post("/bookings")
async def create_booking(payload: BookingCreate):
    """Public booking creation – stored as a pending request that Nadine confirms manually."""
    pkg = await db.booking_packages.find_one({"slug": payload.package_slug})
    if not pkg or not pkg.get("active", True):
        raise HTTPException(status_code=404, detail="Paket nicht verfuegbar")
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["status"] = "pending"
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["package_snapshot"] = {
        "slug": pkg["slug"],
        "title_de": pkg.get("title_de"),
        "title_en": pkg.get("title_en"),
        "price_chf": pkg.get("price_chf"),
        "lesson_count": pkg.get("lesson_count"),
        "service_type": pkg.get("service_type"),
    }
    await db.bookings.insert_one(doc)
    return {"ok": True, "id": doc["id"]}


@router.get("/bookings")
async def list_bookings(admin=Depends(get_current_admin)):
    return await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@router.patch("/bookings/{booking_id}")
async def update_booking(
    booking_id: str,
    payload: Dict[str, Any] = Body(...),
    admin=Depends(get_current_admin),
):
    allowed = {"status", "admin_note"}
    set_ops = {k: v for k, v in payload.items() if k in allowed}
    if not set_ops:
        raise HTTPException(status_code=400, detail="Keine erlaubten Felder")
    res = await db.bookings.update_one({"id": booking_id}, {"$set": set_ops})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Buchung nicht gefunden")
    return await db.bookings.find_one({"id": booking_id}, {"_id": 0})


@router.delete("/bookings/{booking_id}")
async def delete_booking(booking_id: str, admin=Depends(get_current_admin)):
    res = await db.bookings.delete_one({"id": booking_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Buchung nicht gefunden")
    return {"ok": True}
