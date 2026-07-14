"""SEO location landing pages CRUD."""
import uuid
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException

from core.db import db
from core.security import get_current_admin
from models.schemas import LocationCreate

router = APIRouter(tags=["locations"])


@router.get("/locations")
async def list_locations():
    return await db.locations.find({}, {"_id": 0}).sort("order", 1).to_list(200)


@router.get("/locations/{slug}")
async def get_location(slug: str):
    doc = await db.locations.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Standort nicht gefunden")
    return doc


@router.post("/locations")
async def create_location(payload: LocationCreate, admin=Depends(get_current_admin)):
    body = payload.model_dump()
    body["slug"] = body["slug"].lower().strip()
    if await db.locations.find_one({"slug": body["slug"]}):
        raise HTTPException(status_code=409, detail="Slug existiert bereits")
    body["id"] = str(uuid.uuid4())
    body.setdefault("order", await db.locations.count_documents({}))
    await db.locations.insert_one(body)
    return {k: v for k, v in body.items() if k != "_id"}


@router.patch("/locations/{slug}")
async def patch_location(slug: str, updates: Dict[str, Any], admin=Depends(get_current_admin)):
    """Partial update of a location document using dot-notation paths."""
    if not updates:
        raise HTTPException(status_code=400, detail="Keine Updates angegeben")
    set_ops = {k: v for k, v in updates.items() if k not in ("_id", "id", "slug")}
    if not set_ops:
        raise HTTPException(status_code=400, detail="Keine gültigen Felder")
    res = await db.locations.update_one({"slug": slug}, {"$set": set_ops})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Standort nicht gefunden")
    return await db.locations.find_one({"slug": slug}, {"_id": 0})


@router.delete("/locations/{slug}")
async def delete_location(slug: str, admin=Depends(get_current_admin)):
    res = await db.locations.delete_one({"slug": slug})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Standort nicht gefunden")
    return {"ok": True}


@router.post("/locations/{slug}/broadcast-field")
async def broadcast_field_to_all_locations(
    slug: str,
    payload: Dict[str, Any],
    admin=Depends(get_current_admin),
):
    """Copy one field value from this location to ALL other locations.

    Body: `{"field": "hero_image_url"}` (or any allowed field name).
    The source value is fetched from the current location, then applied to
    every other location document via `$set`. Blocked keys (`slug`, `id`,
    `_id`) cannot be broadcast.
    """
    field = (payload.get("field") or "").strip()
    if not field:
        raise HTTPException(status_code=400, detail="Feldname fehlt")
    if field in ("_id", "id", "slug"):
        raise HTTPException(status_code=400, detail=f"Feld '{field}' darf nicht übertragen werden")

    source = await db.locations.find_one({"slug": slug}, {"_id": 0})
    if not source:
        raise HTTPException(status_code=404, detail="Quell-Standort nicht gefunden")
    if field not in source:
        raise HTTPException(status_code=400, detail=f"Feld '{field}' nicht am Quell-Standort vorhanden")

    value = source[field]
    result = await db.locations.update_many(
        {"slug": {"$ne": slug}}, {"$set": {field: value}}
    )
    return {"ok": True, "field": field, "updated": result.modified_count}
