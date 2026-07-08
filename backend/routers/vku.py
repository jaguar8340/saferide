"""VKU course registrations – public POST + admin management."""
import uuid
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from core.db import db
from core.security import get_current_admin
from core.storage import (
    ALLOWED_DOCUMENT_TYPES,
    ALLOWED_IMAGE_TYPES,
    APP_NAME,
    MAX_DOCUMENT_BYTES,
    put_object,
)
from models.schemas import VkuRegistration, VkuRegistrationCreate

router = APIRouter(tags=["vku"])


@router.post("/vku/permit-upload")
async def upload_permit(file: UploadFile = File(...)):
    """PUBLIC endpoint for uploading a learner permit (Lernfahrerausweis)
    scan or photo as part of the VKU registration flow. Accepts JPEG/PNG/WebP
    images or a single PDF. Max 8 MB. No auth required – the returned URL is
    stored on the VkuRegistration row created immediately afterwards."""
    content_type = (file.content_type or "application/octet-stream").lower()
    is_image = content_type in ALLOWED_IMAGE_TYPES
    is_pdf = content_type in ALLOWED_DOCUMENT_TYPES
    if not (is_image or is_pdf):
        raise HTTPException(
            status_code=400,
            detail="Nur Bilder (JPG/PNG/WebP) oder PDF-Dateien erlaubt.",
        )
    data = await file.read()
    if len(data) > MAX_DOCUMENT_BYTES:
        max_mb = MAX_DOCUMENT_BYTES // (1024 * 1024)
        raise HTTPException(
            status_code=413, detail=f"Datei zu gross (max. {max_mb} MB)."
        )
    ext = (
        ALLOWED_DOCUMENT_TYPES[content_type]
        if is_pdf
        else ALLOWED_IMAGE_TYPES[content_type]
    )
    path = f"{APP_NAME}/vku-permits/{uuid.uuid4()}.{ext}"
    result = put_object(path, data, content_type)
    stored_path = result.get("path", path)
    return {
        "path": stored_path,
        "url": f"/api/files/{stored_path}",
        "filename": file.filename or f"permit.{ext}",
        "kind": "pdf" if is_pdf else "image",
    }


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
