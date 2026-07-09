"""Students – CRUD for the admin-only Fahrschüler management module."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from core.activity import log_activity
from core.db import db
from core.security import get_current_admin
from models.schemas import Student, StudentCreate, StudentPatch

router = APIRouter(prefix="/students", tags=["students"])


@router.get("", response_model=List[Student])
async def list_students(admin=Depends(get_current_admin)):
    return await db.students.find({}, {"_id": 0}).sort("last_name", 1).to_list(2000)


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
