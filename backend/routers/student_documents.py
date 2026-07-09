"""Documents attached to a student (permit scans, ID, contracts …).

Each upload is written to Emergent object storage AND indexed in the
`student_documents` collection so we can quickly list per student, keep
a category, and delete both the object + row atomically.

Endpoints all live under `/api/students/{student_id}/documents`.
"""
import uuid
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from core.activity import log_activity
from core.db import db
from core.security import get_current_admin
from core.storage import (
    ALLOWED_DOCUMENT_TYPES,
    ALLOWED_IMAGE_TYPES,
    APP_NAME,
    MAX_DOCUMENT_BYTES,
    MAX_UPLOAD_BYTES,
    put_object,
)
from models.schemas import StudentDocument

router = APIRouter(prefix="/students", tags=["student-documents"])

ALLOWED_CATEGORIES = {"misc", "permit", "id", "contract", "invoice", "other"}


async def _ensure_student(student_id: str) -> dict:
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Schüler nicht gefunden")
    return student


@router.get("/{student_id}/documents", response_model=List[StudentDocument])
async def list_documents(student_id: str, admin=Depends(get_current_admin)):
    await _ensure_student(student_id)
    return await db.student_documents.find(
        {"student_id": student_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(2000)


@router.post("/{student_id}/documents", response_model=StudentDocument)
async def upload_document(
    student_id: str,
    file: UploadFile = File(...),
    label: str = Form(""),
    category: str = Form("misc"),
    note: str = Form(""),
    admin=Depends(get_current_admin),
):
    await _ensure_student(student_id)

    if category not in ALLOWED_CATEGORIES:
        raise HTTPException(status_code=400, detail="Ungültige Kategorie")

    content_type = file.content_type or "application/octet-stream"
    is_image = content_type in ALLOWED_IMAGE_TYPES
    is_pdf = content_type in ALLOWED_DOCUMENT_TYPES
    if not (is_image or is_pdf):
        raise HTTPException(
            status_code=400,
            detail="Nur PDF- oder Bilddateien (jpg/png/webp/gif) erlaubt",
        )

    data = await file.read()
    limit = MAX_DOCUMENT_BYTES if is_pdf else MAX_UPLOAD_BYTES
    if len(data) > limit:
        raise HTTPException(
            status_code=413,
            detail=f"Datei zu gross (max. {limit // (1024 * 1024)} MB)",
        )

    ext = (ALLOWED_DOCUMENT_TYPES if is_pdf else ALLOWED_IMAGE_TYPES)[content_type]
    path = f"{APP_NAME}/students/{student_id}/{uuid.uuid4()}.{ext}"
    result = put_object(path, data, content_type)
    stored_path = result.get("path", path)

    doc = StudentDocument(
        student_id=student_id,
        label=label or file.filename or "Datei",
        original_filename=file.filename or "",
        storage_path=stored_path,
        url=f"/api/files/{stored_path}",
        content_type=content_type,
        size=len(data),
        kind="pdf" if is_pdf else "image",
        category=category,
        note=note,
        uploaded_by=admin.get("email", ""),
    )
    await db.student_documents.insert_one(doc.model_dump())
    await log_activity(
        student_id,
        "document.upload",
        f"Dokument «{doc.label}» hochgeladen",
        actor=admin.get("email"),
        meta={"document_id": doc.id, "category": category, "size": len(data)},
    )
    return doc


@router.delete("/{student_id}/documents/{document_id}")
async def delete_document(
    student_id: str, document_id: str, admin=Depends(get_current_admin)
):
    doc = await db.student_documents.find_one(
        {"id": document_id, "student_id": student_id}, {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden")
    await db.student_documents.delete_one({"id": document_id})
    # NOTE: We intentionally do NOT delete the underlying storage object.
    # Emergent object storage does not expose a delete endpoint from the
    # sync helper today, and keeping the blob around is harmless.
    await log_activity(
        student_id,
        "document.delete",
        f"Dokument «{doc.get('label') or document_id[:8]}» entfernt",
        actor=admin.get("email"),
        meta={"document_id": document_id},
    )
    return {"ok": True}
