"""Testimonials CRUD."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from core.db import db
from core.security import get_current_admin
from models.schemas import Testimonial, TestimonialCreate

router = APIRouter(tags=["testimonials"])


@router.get("/testimonials", response_model=List[Testimonial])
async def list_testimonials():
    return await db.testimonials.find({}, {"_id": 0}).to_list(500)


@router.post("/testimonials", response_model=Testimonial)
async def add_testimonial(payload: TestimonialCreate, admin=Depends(get_current_admin)):
    item = Testimonial(**payload.model_dump())
    await db.testimonials.insert_one(item.model_dump())
    return item


@router.put("/testimonials/{item_id}", response_model=Testimonial)
async def update_testimonial(item_id: str, payload: TestimonialCreate, admin=Depends(get_current_admin)):
    res = await db.testimonials.update_one({"id": item_id}, {"$set": payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Testimonial nicht gefunden")
    return await db.testimonials.find_one({"id": item_id}, {"_id": 0})


@router.delete("/testimonials/{item_id}")
async def delete_testimonial(item_id: str, admin=Depends(get_current_admin)):
    res = await db.testimonials.delete_one({"id": item_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Testimonial nicht gefunden")
    return {"ok": True}
