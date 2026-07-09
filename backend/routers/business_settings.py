"""Fahrschul-Settings (single-document collection).

Holds the business identity used on every generated invoice PDF —
Absenderadresse, IBAN/Bank, MWST-Nummer + Standard-MWST-Satz, Fusszeile.

Only one row exists (id='default'); GET auto-creates it on first call so
the admin UI never sees a 404.
"""
from fastapi import APIRouter, Depends

from core.db import db
from core.security import get_current_admin
from models.schemas import BusinessSettings, BusinessSettingsPatch

router = APIRouter(prefix="/settings", tags=["business-settings"])


async def get_or_create_settings() -> dict:
    doc = await db.business_settings.find_one({"id": "default"}, {"_id": 0})
    if not doc:
        # Seed with sensible defaults (from BusinessSettings() defaults).
        seed = BusinessSettings().model_dump()
        await db.business_settings.insert_one(seed)
        return seed
    return doc


@router.get("/business", response_model=BusinessSettings)
async def read_settings(admin=Depends(get_current_admin)):
    return await get_or_create_settings()


@router.patch("/business", response_model=BusinessSettings)
async def update_settings(
    payload: BusinessSettingsPatch, admin=Depends(get_current_admin)
):
    from datetime import datetime, timezone
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    updates["updated_by"] = admin.get("email", "")
    await get_or_create_settings()          # ensure the row exists
    await db.business_settings.update_one(
        {"id": "default"}, {"$set": updates}, upsert=True
    )
    return await db.business_settings.find_one({"id": "default"}, {"_id": 0})
