"""Rating scale (Bewertungsskala) settings.

The admin can customise the rating-scale labels used inside the
Fahrkontrolle popup and PDF (currently: 1 = erklärt, 2 = geübt, …).

A single document lives in the ``rating_scale`` collection under
``id = "default"``:

    {
        "id": "default",
        "levels": [
            {"value": "1", "desc_de": "erklärt", "desc_en": "explained",
             "bg": "#dc2626", "fg": "#ffffff"},
            ...
        ],
        "retry": {"value": "X", "desc_de": "nochmals üben",
                  "desc_en": "practise again", "bg": "#94a3b8", "fg": "#0f172a"}
    }

Progress percentages are derived at read-time so the levels array can be
extended without touching schemas:  level index i → round((i+1)/N * 100).
The ``retry`` level always resolves to 0 %.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core.db import db
from core.security import get_current_admin

router = APIRouter(prefix="/settings", tags=["settings"])


# ---------------------------------------------------------------------------
# Defaults – used both as seed data and as fallback when the doc is missing.
# ---------------------------------------------------------------------------
DEFAULT_RATING_SCALE: dict = {
    "id": "default",
    "levels": [
        {"value": "1", "desc_de": "erklärt",     "desc_en": "explained",
         "bg": "#dc2626", "fg": "#ffffff"},
        {"value": "2", "desc_de": "geübt",       "desc_en": "practised",
         "bg": "#f97316", "fg": "#ffffff"},
        {"value": "3", "desc_de": "selbständig", "desc_en": "independent",
         "bg": "#84cc16", "fg": "#0f172a"},
        {"value": "4", "desc_de": "sicher",      "desc_en": "confident",
         "bg": "#166534", "fg": "#ffffff"},
    ],
    "retry": {
        "value": "X", "desc_de": "nochmals üben", "desc_en": "practise again",
        "bg": "#94a3b8", "fg": "#0f172a",
    },
}


class RatingLevel(BaseModel):
    value: str
    desc_de: str
    desc_en: str = ""
    bg: str
    fg: str = "#ffffff"


class RatingRetry(BaseModel):
    value: str = "X"
    desc_de: str
    desc_en: str = ""
    bg: str
    fg: str = "#0f172a"


class RatingScale(BaseModel):
    id: str = "default"
    levels: list[RatingLevel] = Field(default_factory=list)
    retry: RatingRetry
    updated_at: str = ""
    updated_by: str = ""


class RatingScalePatch(BaseModel):
    levels: list[RatingLevel] | None = None
    retry: RatingRetry | None = None


async def ensure_rating_scale() -> dict:
    """Return the rating-scale doc, creating it from defaults on first read."""
    doc = await db.rating_scale.find_one({"id": "default"}, {"_id": 0})
    if doc:
        return doc
    doc = dict(DEFAULT_RATING_SCALE)
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_by"] = "system"
    await db.rating_scale.insert_one(dict(doc))
    return doc


@router.get("/rating-scale", response_model=RatingScale)
async def get_rating_scale():
    """Public – the frontend renders these labels on every rating cell."""
    return await ensure_rating_scale()


@router.patch("/rating-scale", response_model=RatingScale)
async def update_rating_scale(
    payload: RatingScalePatch, admin=Depends(get_current_admin)
):
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "Nichts zu aktualisieren")

    # Guard: at least one positive level must remain.
    if "levels" in updates:
        if not updates["levels"]:
            raise HTTPException(400, "Mindestens ein Bewertungs-Level erforderlich")
        # Deduplicate values (they must be unique to serve as DB keys).
        seen = set()
        for lv in updates["levels"]:
            if lv["value"] in seen:
                raise HTTPException(400, f"Level-Wert doppelt: {lv['value']}")
            seen.add(lv["value"])

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    updates["updated_by"] = admin.get("email", "")
    await ensure_rating_scale()
    await db.rating_scale.update_one(
        {"id": "default"}, {"$set": updates}, upsert=True
    )
    return await db.rating_scale.find_one({"id": "default"}, {"_id": 0})
