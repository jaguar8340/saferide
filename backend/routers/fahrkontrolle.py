"""Fahrkontrolle – master data (categories, subitems, routes) + per-student
lessons and rating cells.

All endpoints require admin auth. Data is fully database-driven so the
category/subitem/route lists can be edited via the admin UI without any
code changes.
"""
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel

from core.activity import log_activity
from core.db import db
from core.security import get_current_admin
from core.storage import (
    ALLOWED_IMAGE_TYPES,
    APP_NAME,
    MAX_UPLOAD_BYTES,
    put_object,
)
from models.schemas import (
    Assessment,
    AssessmentUpsert,
    FkCategory,
    FkCategoryCreate,
    FkOrderRequest,
    FkRoute,
    FkRouteCreate,
    FkSubitem,
    FkSubitemCreate,
    StudentLesson,
    StudentLessonCreate,
    StudentLessonPatch,
)

router = APIRouter(prefix="/fahrkontrolle", tags=["fahrkontrolle"])


# ============================================================
#  Categories
# ============================================================
@router.get("/categories", response_model=List[FkCategory])
async def list_categories(admin=Depends(get_current_admin)):
    return (
        await db.fk_categories.find({}, {"_id": 0}).sort("order", 1).to_list(200)
    )


@router.post("/categories", response_model=FkCategory)
async def create_category(payload: FkCategoryCreate, admin=Depends(get_current_admin)):
    # If order not provided (0), append at end.
    order = payload.order
    if order == 0:
        last = await db.fk_categories.find_one({}, sort=[("order", -1)])
        order = ((last or {}).get("order", 0) or 0) + 1
    cat = FkCategory(**payload.model_dump())
    cat.order = order
    await db.fk_categories.insert_one(cat.model_dump())
    return cat


@router.patch("/categories/{cat_id}", response_model=FkCategory)
async def update_category(
    cat_id: str, payload: FkCategoryCreate, admin=Depends(get_current_admin)
):
    res = await db.fk_categories.update_one(
        {"id": cat_id}, {"$set": payload.model_dump()}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
    doc = await db.fk_categories.find_one({"id": cat_id}, {"_id": 0})
    return doc


@router.delete("/categories/{cat_id}")
async def delete_category(cat_id: str, admin=Depends(get_current_admin)):
    res = await db.fk_categories.delete_one({"id": cat_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kategorie nicht gefunden")
    # Also delete all its subitems.
    await db.fk_subitems.delete_many({"category_id": cat_id})
    return {"ok": True}


@router.post("/categories/reorder")
async def reorder_categories(payload: FkOrderRequest, admin=Depends(get_current_admin)):
    for item in payload.items:
        await db.fk_categories.update_one(
            {"id": item.id}, {"$set": {"order": item.order}}
        )
    return {"ok": True}


# ============================================================
#  Sub-items
# ============================================================
@router.get("/subitems", response_model=List[FkSubitem])
async def list_subitems(admin=Depends(get_current_admin)):
    return (
        await db.fk_subitems.find({}, {"_id": 0}).sort("order", 1).to_list(2000)
    )


@router.post("/subitems", response_model=FkSubitem)
async def create_subitem(payload: FkSubitemCreate, admin=Depends(get_current_admin)):
    order = payload.order
    if order == 0:
        last = await db.fk_subitems.find_one(
            {"category_id": payload.category_id}, sort=[("order", -1)]
        )
        order = ((last or {}).get("order", 0) or 0) + 1
    item = FkSubitem(**payload.model_dump())
    item.order = order
    await db.fk_subitems.insert_one(item.model_dump())
    return item


@router.patch("/subitems/{item_id}", response_model=FkSubitem)
async def update_subitem(
    item_id: str, payload: FkSubitemCreate, admin=Depends(get_current_admin)
):
    res = await db.fk_subitems.update_one(
        {"id": item_id}, {"$set": payload.model_dump()}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Unterpunkt nicht gefunden")
    doc = await db.fk_subitems.find_one({"id": item_id}, {"_id": 0})
    return doc


@router.delete("/subitems/{item_id}")
async def delete_subitem(item_id: str, admin=Depends(get_current_admin)):
    res = await db.fk_subitems.delete_one({"id": item_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Unterpunkt nicht gefunden")
    return {"ok": True}


@router.post("/subitems/reorder")
async def reorder_subitems(payload: FkOrderRequest, admin=Depends(get_current_admin)):
    for item in payload.items:
        await db.fk_subitems.update_one(
            {"id": item.id}, {"$set": {"order": item.order}}
        )
    return {"ok": True}


# ============================================================
#  Routes (Gefahrene Strecken)
# ============================================================
@router.get("/routes", response_model=List[FkRoute])
async def list_routes(admin=Depends(get_current_admin)):
    return await db.fk_routes.find({}, {"_id": 0}).sort("order", 1).to_list(500)


@router.post("/routes", response_model=FkRoute)
async def create_route(payload: FkRouteCreate, admin=Depends(get_current_admin)):
    order = payload.order
    if order == 0:
        last = await db.fk_routes.find_one({}, sort=[("order", -1)])
        order = ((last or {}).get("order", 0) or 0) + 1
    route = FkRoute(**payload.model_dump())
    route.order = order
    await db.fk_routes.insert_one(route.model_dump())
    return route


@router.patch("/routes/{route_id}", response_model=FkRoute)
async def update_route(
    route_id: str, payload: FkRouteCreate, admin=Depends(get_current_admin)
):
    res = await db.fk_routes.update_one({"id": route_id}, {"$set": payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Strecke nicht gefunden")
    doc = await db.fk_routes.find_one({"id": route_id}, {"_id": 0})
    return doc


@router.delete("/routes/{route_id}")
async def delete_route(route_id: str, admin=Depends(get_current_admin)):
    res = await db.fk_routes.delete_one({"id": route_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Strecke nicht gefunden")
    return {"ok": True}


@router.post("/routes/reorder")
async def reorder_routes(payload: FkOrderRequest, admin=Depends(get_current_admin)):
    for item in payload.items:
        await db.fk_routes.update_one(
            {"id": item.id}, {"$set": {"order": item.order}}
        )
    return {"ok": True}


# ============================================================
#  Student lessons
# ============================================================
@router.get("/students/{student_id}/lessons", response_model=List[StudentLesson])
async def list_student_lessons(student_id: str, admin=Depends(get_current_admin)):
    return (
        await db.student_lessons.find({"student_id": student_id}, {"_id": 0})
        .sort("lesson_number", 1)
        .to_list(500)
    )


@router.post("/students/{student_id}/lessons", response_model=StudentLesson)
async def create_student_lesson(
    student_id: str,
    payload: StudentLessonCreate,
    admin=Depends(get_current_admin),
):
    last = await db.student_lessons.find_one(
        {"student_id": student_id}, sort=[("lesson_number", -1)]
    )
    next_num = ((last or {}).get("lesson_number", 0) or 0) + 1
    lesson = StudentLesson(
        student_id=student_id, lesson_number=next_num, **payload.model_dump()
    )
    await db.student_lessons.insert_one(lesson.model_dump())
    await log_activity(
        student_id,
        "lesson.create",
        f"Lektion {next_num} angelegt",
        actor=admin.get("email"),
        meta={"lesson_id": lesson.id, "lesson_number": next_num, "date": lesson.date},
    )
    return lesson


@router.patch(
    "/students/{student_id}/lessons/{lesson_id}", response_model=StudentLesson
)
async def update_student_lesson(
    student_id: str,
    lesson_id: str,
    payload: StudentLessonPatch,
    admin=Depends(get_current_admin),
):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Keine Änderungen übergeben")
    res = await db.student_lessons.update_one(
        {"id": lesson_id, "student_id": student_id}, {"$set": updates}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lektion nicht gefunden")
    doc = await db.student_lessons.find_one(
        {"id": lesson_id, "student_id": student_id}, {"_id": 0}
    )
    await log_activity(
        student_id,
        "lesson.update",
        f"Lektion {doc.get('lesson_number','?')} aktualisiert ({', '.join(updates.keys())})",
        actor=admin.get("email"),
        meta={"lesson_id": lesson_id, "changes": list(updates.keys())},
    )
    return doc


@router.delete("/students/{student_id}/lessons/{lesson_id}")
async def delete_student_lesson(
    student_id: str, lesson_id: str, admin=Depends(get_current_admin)
):
    doc = await db.student_lessons.find_one(
        {"id": lesson_id, "student_id": student_id}, {"_id": 0}
    )
    res = await db.student_lessons.delete_one(
        {"id": lesson_id, "student_id": student_id}
    )
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lektion nicht gefunden")
    # Purge all assessment cells for this lesson.
    await db.student_assessments.delete_many({"lesson_id": lesson_id})
    await log_activity(
        student_id,
        "lesson.delete",
        f"Lektion {(doc or {}).get('lesson_number','?')} gelöscht",
        actor=admin.get("email"),
        meta={"lesson_id": lesson_id},
    )
    return {"ok": True}

# ============================================================
#  Diverse Notizen (per student, freie Datum/Text-Notizen)
# ============================================================
class FkNoteIn(BaseModel):
    date: str = ""      # ISO YYYY-MM-DD (kann leer sein)
    text: str = ""
    image_url: str = ""     # /api/files/... path to uploaded photo (via /api/upload)


class FkNotePatch(BaseModel):
    date: Optional[str] = None
    text: Optional[str] = None
    image_url: Optional[str] = None


class FkNote(FkNoteIn):
    id: str
    student_id: str
    created_at: str = ""
    updated_at: str = ""


@router.get("/students/{student_id}/notes", response_model=List[FkNote])
async def list_student_notes(student_id: str, admin=Depends(get_current_admin)):
    return await db.student_fk_notes.find(
        {"student_id": student_id}, {"_id": 0}
    ).sort("date", -1).to_list(500)


@router.post("/students/{student_id}/notes", response_model=FkNote)
async def create_student_note(
    student_id: str, payload: FkNoteIn, admin=Depends(get_current_admin),
):
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "student_id": student_id,
        "date": (payload.date or now[:10]).strip(),
        "text": (payload.text or "").strip(),
        "image_url": (payload.image_url or "").strip(),
        "created_at": now,
        "updated_at": now,
    }
    await db.student_fk_notes.insert_one(doc)
    await log_activity(
        student_id, "note.create", "Diverse Notiz hinzugefügt",
        actor=admin.get("email"), meta={"note_id": doc["id"]},
    )
    return {k: v for k, v in doc.items() if k != "_id"}


@router.patch("/students/{student_id}/notes/{note_id}", response_model=FkNote)
async def update_student_note(
    student_id: str, note_id: str, payload: FkNotePatch,
    admin=Depends(get_current_admin),
):
    updates: dict = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if payload.date is not None:
        updates["date"] = payload.date.strip()
    if payload.text is not None:
        updates["text"] = payload.text.strip()
    if payload.image_url is not None:
        updates["image_url"] = payload.image_url.strip()
    res = await db.student_fk_notes.update_one(
        {"id": note_id, "student_id": student_id}, {"$set": updates}
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Notiz nicht gefunden")
    doc = await db.student_fk_notes.find_one(
        {"id": note_id, "student_id": student_id}, {"_id": 0}
    )
    return doc


@router.delete("/students/{student_id}/notes/{note_id}")
async def delete_student_note(
    student_id: str, note_id: str, admin=Depends(get_current_admin),
):
    res = await db.student_fk_notes.delete_one(
        {"id": note_id, "student_id": student_id}
    )
    if res.deleted_count == 0:
        raise HTTPException(404, "Notiz nicht gefunden")
    await log_activity(
        student_id, "note.delete", "Diverse Notiz gelöscht",
        actor=admin.get("email"), meta={"note_id": note_id},
    )
    return {"ok": True}




# ============================================================
#  Assessments (single rating + comment per cell)
# ============================================================
@router.get("/students/{student_id}/assessments", response_model=List[Assessment])
async def list_assessments(student_id: str, admin=Depends(get_current_admin)):
    return await db.student_assessments.find(
        {"student_id": student_id}, {"_id": 0}
    ).to_list(50000)


@router.put("/students/{student_id}/assessments", response_model=Assessment)
async def upsert_assessment(
    student_id: str,
    payload: AssessmentUpsert,
    admin=Depends(get_current_admin),
):
    """Upsert a single rating cell. Same (student_id, subitem_id, lesson_id)
    combination is unique. Empty value + comment + no photos deletes the row."""
    # Look up lesson number & subitem title once so the activity log is
    # human-readable ("Lektion 3 · 1.1 Rundumkontrolle → 4").
    lesson = await db.student_lessons.find_one(
        {"id": payload.lesson_id, "student_id": student_id}, {"_id": 0}
    )
    subitem = await db.fk_subitems.find_one({"id": payload.subitem_id}, {"_id": 0})
    ctx_lesson = f"L{(lesson or {}).get('lesson_number', '?')}"
    ctx_sub = (subitem or {}).get("title_de", "Punkt")

    filter_ = {
        "student_id": student_id,
        "subitem_id": payload.subitem_id,
        "lesson_id": payload.lesson_id,
    }
    existing = await db.student_assessments.find_one(filter_, {"_id": 0})
    photo_urls = (existing or {}).get("photo_urls", []) or []

    if payload.value == "" and payload.comment == "" and not photo_urls:
        # All three empty: delete the cell entirely.
        await db.student_assessments.delete_one(filter_)
        await log_activity(
            student_id,
            "assessment.upsert",
            f"{ctx_lesson} · {ctx_sub} → geleert",
            actor=admin.get("email"),
            meta={
                "lesson_id": payload.lesson_id,
                "subitem_id": payload.subitem_id,
                "value": "",
            },
        )
        return Assessment(
            student_id=student_id,
            subitem_id=payload.subitem_id,
            lesson_id=payload.lesson_id,
            value="",
            comment="",
            photo_urls=[],
            updated_by=admin.get("email", ""),
        )
    now = datetime.now(timezone.utc).isoformat()
    if existing:
        await db.student_assessments.update_one(
            filter_,
            {
                "$set": {
                    "value": payload.value,
                    "comment": payload.comment,
                    "updated_at": now,
                    "updated_by": admin.get("email", ""),
                }
            },
        )
        doc = await db.student_assessments.find_one(filter_, {"_id": 0})
        await log_activity(
            student_id,
            "assessment.upsert",
            f"{ctx_lesson} · {ctx_sub} → {payload.value or '—'}"
            + (" (mit Kommentar)" if payload.comment else ""),
            actor=admin.get("email"),
            meta={
                "lesson_id": payload.lesson_id,
                "subitem_id": payload.subitem_id,
                "value": payload.value,
                "has_comment": bool(payload.comment),
            },
        )
        return doc
    assessment = Assessment(
        student_id=student_id,
        subitem_id=payload.subitem_id,
        lesson_id=payload.lesson_id,
        value=payload.value,
        comment=payload.comment,
        photo_urls=[],
        updated_at=now,
        updated_by=admin.get("email", ""),
    )
    await db.student_assessments.insert_one(assessment.model_dump())
    await log_activity(
        student_id,
        "assessment.upsert",
        f"{ctx_lesson} · {ctx_sub} → {payload.value or '—'}"
        + (" (mit Kommentar)" if payload.comment else ""),
        actor=admin.get("email"),
        meta={
            "lesson_id": payload.lesson_id,
            "subitem_id": payload.subitem_id,
            "value": payload.value,
            "has_comment": bool(payload.comment),
        },
    )
    return assessment


# ============================================================
#  Assessment photos (Kamera-Aufnahme aus dem Rating-Popup)
# ============================================================
async def _ensure_assessment(student_id: str, subitem_id: str, lesson_id: str) -> dict:
    """Fetch or create an empty assessment row so photos can be attached even
    before any rating/comment was set."""
    filter_ = {
        "student_id": student_id,
        "subitem_id": subitem_id,
        "lesson_id": lesson_id,
    }
    doc = await db.student_assessments.find_one(filter_, {"_id": 0})
    if doc:
        return doc
    doc = Assessment(
        student_id=student_id,
        subitem_id=subitem_id,
        lesson_id=lesson_id,
    ).model_dump()
    await db.student_assessments.insert_one(doc)
    return doc


@router.post(
    "/students/{student_id}/assessments/photo",
    response_model=Assessment,
)
async def upload_assessment_photo(
    student_id: str,
    subitem_id: str = Query(...),
    lesson_id: str = Query(...),
    file: UploadFile = File(...),
    admin=Depends(get_current_admin),
):
    """Attach a JPEG/PNG snapshot to a rating cell. Multiple photos per cell OK."""
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
            detail=f"Datei zu gross (max. {MAX_UPLOAD_BYTES // (1024 * 1024)} MB)",
        )
    ext = ALLOWED_IMAGE_TYPES[content_type]
    path = f"{APP_NAME}/fahrkontrolle/{uuid.uuid4()}.{ext}"
    result = put_object(path, data, content_type)
    stored = result.get("path", path)
    photo_url = f"/api/files/{stored}"

    await _ensure_assessment(student_id, subitem_id, lesson_id)
    filter_ = {
        "student_id": student_id,
        "subitem_id": subitem_id,
        "lesson_id": lesson_id,
    }
    now = datetime.now(timezone.utc).isoformat()
    await db.student_assessments.update_one(
        filter_,
        {
            "$push": {"photo_urls": photo_url},
            "$set": {"updated_at": now, "updated_by": admin.get("email", "")},
        },
    )
    doc = await db.student_assessments.find_one(filter_, {"_id": 0})

    lesson = await db.student_lessons.find_one(
        {"id": lesson_id, "student_id": student_id}, {"_id": 0}
    )
    subitem = await db.fk_subitems.find_one({"id": subitem_id}, {"_id": 0})
    await log_activity(
        student_id,
        "assessment.photo.add",
        f"L{(lesson or {}).get('lesson_number', '?')} · {(subitem or {}).get('title_de', 'Punkt')} → Foto hinzugefügt",
        actor=admin.get("email"),
        meta={"lesson_id": lesson_id, "subitem_id": subitem_id, "photo_url": photo_url},
    )
    return doc


@router.delete(
    "/students/{student_id}/assessments/photo",
    response_model=Assessment,
)
async def delete_assessment_photo(
    student_id: str,
    subitem_id: str = Query(...),
    lesson_id: str = Query(...),
    url: str = Query(..., description="Full /api/files/... URL to remove"),
    admin=Depends(get_current_admin),
):
    filter_ = {
        "student_id": student_id,
        "subitem_id": subitem_id,
        "lesson_id": lesson_id,
    }
    existing = await db.student_assessments.find_one(filter_, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Zelle nicht gefunden")

    photos = [u for u in (existing.get("photo_urls") or []) if u != url]
    updates = {
        "photo_urls": photos,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": admin.get("email", ""),
    }

    # If the cell is now empty (no rating, no comment, no photos), delete it.
    if (
        not photos
        and not (existing.get("value") or "")
        and not (existing.get("comment") or "")
    ):
        await db.student_assessments.delete_one(filter_)
        return Assessment(
            student_id=student_id,
            subitem_id=subitem_id,
            lesson_id=lesson_id,
            value="",
            comment="",
            photo_urls=[],
            updated_by=admin.get("email", ""),
        )

    await db.student_assessments.update_one(filter_, {"$set": updates})
    return await db.student_assessments.find_one(filter_, {"_id": 0})
