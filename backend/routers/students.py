"""Students – CRUD for the admin-only Fahrschüler management module."""
import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError

from core.activity import log_activity
from core.db import db
from core.security import get_current_admin
from models.schemas import Student, StudentCreate, StudentPatch

router = APIRouter(prefix="/students", tags=["students"])
log = logging.getLogger("students")


@router.get("", response_model=List[Student])
async def list_students(admin=Depends(get_current_admin)):
    # Serialise defensively: a single malformed legacy doc must never take
    # the entire list down. Skip + log any row that fails validation.
    docs = await db.students.find({}, {"_id": 0}).sort("last_name", 1).to_list(2000)
    out: List[Student] = []
    for doc in docs:
        try:
            out.append(Student(**doc))
        except ValidationError as e:
            log.warning(
                "students.list: skipping malformed doc id=%s err=%s",
                doc.get("id"), e.errors()[:2],
            )
    return out


@router.get("/check-duplicate")
async def check_student_duplicate(
    first_name: str,
    last_name: str,
    admin=Depends(get_current_admin),
):
    """Return existing students with the same first+last name (case-insensitive).

    Used by the New-Student form to warn Nadine before creating a doppelter Eintrag.
    Legit duplicates (father/son, same-name family members) can still be created —
    the frontend just surfaces a warning modal.
    """
    fn = (first_name or "").strip()
    ln = (last_name or "").strip()
    if not fn or not ln:
        return {"matches": []}
    # Case-insensitive exact match via regex anchors (^...$).
    import re
    fn_re = re.compile(f"^{re.escape(fn)}$", re.IGNORECASE)
    ln_re = re.compile(f"^{re.escape(ln)}$", re.IGNORECASE)
    docs = await db.students.find(
        {"first_name": fn_re, "last_name": ln_re},
        {
            "_id": 0, "id": 1, "first_name": 1, "last_name": 1,
            "email": 1, "phone": 1, "city": 1, "category": 1,
            "start_date": 1, "created_at": 1, "archived": 1,
        },
    ).to_list(20)
    return {"matches": docs}


@router.post("", response_model=Student)
async def create_student(payload: StudentCreate, admin=Depends(get_current_admin)):
    student = Student(**payload.model_dump())
    await db.students.insert_one(student.model_dump())
    await log_activity(
        student.id,
        "student.create",
        f"Schüler:in {student.first_name} {student.last_name} erstellt",
        actor=admin.get("email"),
    )
    return student


@router.get("/{student_id}", response_model=Student)
async def get_student(student_id: str, admin=Depends(get_current_admin)):
    doc = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Schüler nicht gefunden")
    return doc


@router.patch("/{student_id}", response_model=Student)
async def update_student(
    student_id: str, payload: StudentPatch, admin=Depends(get_current_admin)
):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Keine Änderungen übergeben")
    existing = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Schüler nicht gefunden")
    await db.students.update_one({"id": student_id}, {"$set": updates})
    # Log ONE compact activity per PATCH (list of fields changed).
    fields = ", ".join(updates.keys())
    await log_activity(
        student_id,
        "student.update",
        f"Stammdaten aktualisiert ({fields})",
        actor=admin.get("email"),
        meta={"changes": updates},
    )
    doc = await db.students.find_one({"id": student_id}, {"_id": 0})
    return doc


@router.delete("/{student_id}")
async def delete_student(student_id: str, admin=Depends(get_current_admin)):
    res = await db.students.delete_one({"id": student_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Schüler nicht gefunden")
    # Also clean up dependent data (lessons + assessments + invoices +
    # documents + activities) so we don't leave orphaned rows behind.
    await db.student_lessons.delete_many({"student_id": student_id})
    await db.student_assessments.delete_many({"student_id": student_id})
    await db.student_invoices.delete_many({"student_id": student_id})
    await db.student_documents.delete_many({"student_id": student_id})
    await db.student_activities.delete_many({"student_id": student_id})
    return {"ok": True}
