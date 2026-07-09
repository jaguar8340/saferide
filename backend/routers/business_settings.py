"""Fahrschul-Settings (single-document collection).

Holds the business identity used on every generated invoice PDF —
Absenderadresse, IBAN/Bank/BIC, MWST-Nummer + Standard-MWST-Satz,
Fusszeile UND das Firmen-Logo (auf dem PDF oben links).

Only one row exists (id='default'); GET auto-creates it on first call so
the admin UI never sees a 404.
"""
import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from core.db import db
from core.security import get_current_admin
from core.storage import (
    ALLOWED_IMAGE_TYPES,
    APP_NAME,
    MAX_UPLOAD_BYTES,
    put_object,
)
from models.schemas import BusinessSettings, BusinessSettingsPatch

router = APIRouter(prefix="/settings", tags=["business-settings"])

# Path to the bundled default Safe Ride logo — served via GET /api/assets/logo/default.
DEFAULT_LOGO_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "assets", "saferide_logo.jpg"
)
DEFAULT_LOGO_URL = "/api/assets/logo/default"


async def get_or_create_settings() -> dict:
    doc = await db.business_settings.find_one({"id": "default"}, {"_id": 0})
    if not doc:
        # Seed with sensible defaults + the bundled Safe Ride logo.
        seed = BusinessSettings().model_dump()
        seed["logo_url"] = DEFAULT_LOGO_URL
        await db.business_settings.insert_one(seed)
        return seed
    # Back-fill logo_url on rows created before it existed.
    if not doc.get("logo_url"):
        doc["logo_url"] = DEFAULT_LOGO_URL
        await db.business_settings.update_one(
            {"id": "default"}, {"$set": {"logo_url": DEFAULT_LOGO_URL}}
        )
    return doc


@router.get("/business", response_model=BusinessSettings)
async def read_settings(admin=Depends(get_current_admin)):
    return await get_or_create_settings()


@router.patch("/business", response_model=BusinessSettings)
async def update_settings(
    payload: BusinessSettingsPatch, admin=Depends(get_current_admin)
):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    updates["updated_by"] = admin.get("email", "")
    await get_or_create_settings()          # ensure the row exists
    await db.business_settings.update_one(
        {"id": "default"}, {"$set": updates}, upsert=True
    )
    return await db.business_settings.find_one({"id": "default"}, {"_id": 0})


@router.post("/business/logo", response_model=BusinessSettings)
async def upload_logo(
    file: UploadFile = File(...),
    admin=Depends(get_current_admin),
):
    """Replace the Fahrschul-Logo. Accepts PNG / JPEG / WebP / GIF up to 10 MB."""
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Nur Bilddateien (PNG / JPG / WebP / GIF) erlaubt",
        )
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Datei zu gross (max. {MAX_UPLOAD_BYTES // (1024*1024)} MB)",
        )
    ext = ALLOWED_IMAGE_TYPES[content_type]
    path = f"{APP_NAME}/logo/{uuid.uuid4()}.{ext}"
    result = put_object(path, data, content_type)
    stored = result.get("path", path)
    logo_url = f"/api/files/{stored}"

    await get_or_create_settings()
    await db.business_settings.update_one(
        {"id": "default"},
        {"$set": {
            "logo_url": logo_url,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": admin.get("email", ""),
        }},
    )
    return await db.business_settings.find_one({"id": "default"}, {"_id": 0})


@router.delete("/business/logo", response_model=BusinessSettings)
async def reset_logo(admin=Depends(get_current_admin)):
    """Revert to the bundled default Safe Ride logo."""
    await get_or_create_settings()
    await db.business_settings.update_one(
        {"id": "default"},
        {"$set": {
            "logo_url": DEFAULT_LOGO_URL,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": admin.get("email", ""),
        }},
    )
    return await db.business_settings.find_one({"id": "default"}, {"_id": 0})


# ---------------------------------------------------------------------------
#  Public asset route — returns the bundled default logo. Publicly readable
#  so both the CMS preview and the PDF generator can fetch it without auth.
# ---------------------------------------------------------------------------
assets_router = APIRouter(prefix="/assets", tags=["assets"])


@assets_router.get("/logo/default")
async def get_default_logo():
    if not os.path.exists(DEFAULT_LOGO_PATH):
        raise HTTPException(status_code=404, detail="Default-Logo nicht gefunden")
    return FileResponse(
        DEFAULT_LOGO_PATH,
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=86400"},
    )
