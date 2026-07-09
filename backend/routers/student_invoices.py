"""Invoices per student — CRUD (admin-only).

Simple book-keeping module. Each invoice belongs to exactly one student
and captures: number, date, amount CHF, status (open/paid/cancelled),
free-form note, and an optional linked file URL.

Endpoints all live under `/api/students/{student_id}/invoices` so they
compose naturally with the rest of the student module.
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from core.activity import log_activity
from core.db import db
from core.security import get_current_admin
from models.schemas import (
    StudentInvoice,
    StudentInvoiceCreate,
    StudentInvoicePatch,
)

router = APIRouter(prefix="/students", tags=["student-invoices"])


ALLOWED_STATUSES = {"open", "paid", "cancelled"}


async def _ensure_student(student_id: str) -> dict:
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Schüler nicht gefunden")
    return student


@router.get("/{student_id}/invoices", response_model=List[StudentInvoice])
async def list_invoices(student_id: str, admin=Depends(get_current_admin)):
    await _ensure_student(student_id)
    return await db.student_invoices.find(
        {"student_id": student_id}, {"_id": 0}
    ).sort("date", -1).to_list(2000)


@router.post("/{student_id}/invoices", response_model=StudentInvoice)
async def create_invoice(
    student_id: str,
    payload: StudentInvoiceCreate,
    admin=Depends(get_current_admin),
):
    await _ensure_student(student_id)
    if payload.status and payload.status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail="Ungültiger Status")

    invoice = StudentInvoice(
        student_id=student_id,
        created_by=admin.get("email", ""),
        **payload.model_dump(),
    )
    await db.student_invoices.insert_one(invoice.model_dump())
    await log_activity(
        student_id,
        "invoice.create",
        f"Rechnung {invoice.number or invoice.id[:8]} erstellt (CHF {invoice.amount_chf:.2f})",
        actor=admin.get("email"),
        meta={"invoice_id": invoice.id, "amount": invoice.amount_chf},
    )
    return invoice


@router.patch("/{student_id}/invoices/{invoice_id}", response_model=StudentInvoice)
async def update_invoice(
    student_id: str,
    invoice_id: str,
    payload: StudentInvoicePatch,
    admin=Depends(get_current_admin),
):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Keine Änderungen übergeben")
    if "status" in updates and updates["status"] not in ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail="Ungültiger Status")

    res = await db.student_invoices.update_one(
        {"id": invoice_id, "student_id": student_id}, {"$set": updates}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Rechnung nicht gefunden")

    doc = await db.student_invoices.find_one(
        {"id": invoice_id}, {"_id": 0}
    )
    await log_activity(
        student_id,
        "invoice.update",
        f"Rechnung {doc.get('number') or invoice_id[:8]} aktualisiert",
        actor=admin.get("email"),
        meta={"invoice_id": invoice_id, "changes": list(updates.keys())},
    )
    return doc


@router.delete("/{student_id}/invoices/{invoice_id}")
async def delete_invoice(
    student_id: str, invoice_id: str, admin=Depends(get_current_admin)
):
    doc = await db.student_invoices.find_one(
        {"id": invoice_id, "student_id": student_id}, {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Rechnung nicht gefunden")
    await db.student_invoices.delete_one({"id": invoice_id})
    await log_activity(
        student_id,
        "invoice.delete",
        f"Rechnung {doc.get('number') or invoice_id[:8]} gelöscht",
        actor=admin.get("email"),
        meta={"invoice_id": invoice_id},
    )
    return {"ok": True}
