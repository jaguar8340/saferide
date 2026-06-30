"""Site content (single big CMS document) GET/PUT/PATCH."""
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException

from core.db import _clean, db
from core.security import get_current_admin

router = APIRouter(tags=["content"])


@router.get("/content")
async def get_content():
    doc = await db.site_content.find_one({"id": "main"})
    return _clean(doc) or {}


@router.put("/content")
async def update_content(body: Dict[str, Any], admin=Depends(get_current_admin)):
    body.pop("_id", None)
    body["id"] = "main"
    await db.site_content.update_one({"id": "main"}, {"$set": body}, upsert=True)
    doc = await db.site_content.find_one({"id": "main"})
    return _clean(doc)


@router.patch("/content")
async def patch_content(updates: Dict[str, Any], admin=Depends(get_current_admin)):
    """Partial update via dot-notation paths.

    Example body: {"hero.title_de": "Neuer Titel", "services.0.title_de": "Foo"}
    """
    if not updates:
        raise HTTPException(status_code=400, detail="Keine Updates angegeben")
    set_ops = {k: v for k, v in updates.items() if k != "_id" and k != "id"}
    if not set_ops:
        raise HTTPException(status_code=400, detail="Keine gültigen Felder")
    await db.site_content.update_one({"id": "main"}, {"$set": set_ops}, upsert=True)
    doc = await db.site_content.find_one({"id": "main"})
    return _clean(doc)
