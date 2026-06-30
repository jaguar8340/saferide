"""Gallery CRUD."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from core.db import db
from core.security import get_current_admin
from models.schemas import GalleryItem, GalleryItemCreate

router = APIRouter(tags=["gallery"])


@router.get("/gallery", response_model=List[GalleryItem])
async def list_gallery():
    return await db.gallery.find({}, {"_id": 0}).to_list(500)


@router.post("/gallery", response_model=GalleryItem)
async def add_gallery(payload: GalleryItemCreate, admin=Depends(get_current_admin)):
    item = GalleryItem(**payload.model_dump())
    await db.gallery.insert_one(item.model_dump())
    return item


@router.put("/gallery/{item_id}", response_model=GalleryItem)
async def update_gallery(item_id: str, payload: GalleryItemCreate, admin=Depends(get_current_admin)):
    res = await db.gallery.update_one({"id": item_id}, {"$set": payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden")
    return await db.gallery.find_one({"id": item_id}, {"_id": 0})


@router.delete("/gallery/{item_id}")
async def delete_gallery(item_id: str, admin=Depends(get_current_admin)):
    res = await db.gallery.delete_one({"id": item_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden")
    return {"ok": True}
