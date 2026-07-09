"""Read-only activity feed per student (Auditlog).

Rows are written by `core.activity.log_activity(...)` from other routers
(students, fahrkontrolle, invoices, documents). This endpoint just reads.
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query

from core.db import db
from core.security import get_current_admin
from models.schemas import StudentActivity

router = APIRouter(prefix="/students", tags=["student-activities"])


@router.get("/{student_id}/activities", response_model=List[StudentActivity])
async def list_activities(
    student_id: str,
    limit: int = Query(default=200, ge=1, le=1000),
    admin=Depends(get_current_admin),
):
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Schüler nicht gefunden")
    return (
        await db.student_activities.find(
            {"student_id": student_id}, {"_id": 0}
        )
        .sort("created_at", -1)
        .to_list(limit)
    )
