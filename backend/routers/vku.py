"""VKU course registrations – public POST + admin management."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from core.db import db
from core.security import get_current_admin
from models.schemas import VkuRegistration, VkuRegistrationCreate

router = APIRouter(tags=["vku"])


@router.post("/vku/registrations", response_model=VkuRegistration)
async def create_vku_registration(payload: VkuRegistrationCreate):
    reg = VkuRegistration(**payload.model_dump())
    await db.vku_registrations.insert_one(reg.model_dump())
    return reg


@router.get("/vku/registrations", response_model=List[VkuRegistration])
async def list_vku_registrations(admin=Depends(get_current_admin)):
    return (
        await db.vku_registrations.find({}, {"_id": 0})
        .sort("created_at", -1)
        .to_list(1000)
    )


@router.patch("/vku/registrations/{reg_id}/read")
async def mark_vku_read(reg_id: str, admin=Depends(get_current_admin)):
    res = await db.vku_registrations.update_one(
        {"id": reg_id}, {"$set": {"read": True}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Anmeldung nicht gefunden")
    return {"ok": True}


@router.delete("/vku/registrations/{reg_id}")
async def delete_vku_registration(reg_id: str, admin=Depends(get_current_admin)):
    res = await db.vku_registrations.delete_one({"id": reg_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Anmeldung nicht gefunden")
    return {"ok": True}
