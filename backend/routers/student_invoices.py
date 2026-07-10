"""Invoices per student — CRUD + PDF export (admin-only).

Numbering (year-reset):
  * `settings.invoice_prefix` (default "RE") + "-" + `<current year>` + "-"
    + 4-digit zero-padded sequence.  E.g. RE-2026-0001, RE-2026-0002.
  * Sequence is scoped to the current calendar year; new year starts at 0001.
  * MongoDB atomic sequence via `db.invoice_counters.find_one_and_update`.

Endpoints
  GET    /api/students/{sid}/invoices                     – list
  POST   /api/students/{sid}/invoices                     – create (auto number)
  PATCH  /api/students/{sid}/invoices/{iid}               – update
  DELETE /api/students/{sid}/invoices/{iid}               – delete
  GET    /api/students/{sid}/invoices/{iid}.pdf           – download PDF
  GET    /api/accounting/invoices                         – global list (Buchhaltung)
"""
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response

from core.activity import log_activity
from core.db import db
from core.security import get_current_admin
from models.schemas import (
    INVOICE_STATUSES,
    PAYMENT_METHODS,
    StudentInvoice,
    StudentInvoiceCreate,
    StudentInvoicePatch,
)
from routers.business_settings import get_or_create_settings

router = APIRouter(prefix="/students", tags=["student-invoices"])
accounting_router = APIRouter(prefix="/accounting", tags=["accounting"])


# ---------------------------------------------------------------------------
#  Helpers
# ---------------------------------------------------------------------------
async def _ensure_student(student_id: str) -> dict:
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Schüler nicht gefunden")
    return student


async def _next_invoice_number(prefix: str, year: int) -> str:
    """Atomically increment the yearly counter and return the formatted
    invoice number, e.g. 'RE-2026-0001'."""
    key = f"invoice:{year}"
    result = await db.invoice_counters.find_one_and_update(
        {"_id": key},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,   # motor accepts int (0=BEFORE, 1=AFTER)
    )
    # motor may not expose ReturnDocument enum, so handle both shapes.
    seq = None
    if result and isinstance(result, dict):
        seq = result.get("seq")
    if seq is None:
        # Fallback – read after upsert
        row = await db.invoice_counters.find_one({"_id": key})
        seq = (row or {}).get("seq", 1)
    return f"{prefix}-{year}-{int(seq):04d}"


# ---------------------------------------------------------------------------
#  CRUD
# ---------------------------------------------------------------------------
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
    if payload.status not in INVOICE_STATUSES:
        raise HTTPException(status_code=400, detail="Ungültiger Status")
    if payload.payment_method not in PAYMENT_METHODS:
        raise HTTPException(status_code=400, detail="Ungültige Zahlungsweise")
    if payload.price_chf <= 0:
        raise HTTPException(status_code=400, detail="Preis muss > 0 sein")

    settings = await get_or_create_settings()
    now = datetime.now(timezone.utc)
    number = await _next_invoice_number(
        settings.get("invoice_prefix") or "RE", now.year
    )

    invoice = StudentInvoice(
        student_id=student_id,
        number=number,
        date=now.date().isoformat(),
        mwst_rate=float(settings.get("mwst_rate") or 0.0),
        created_by=admin.get("email", ""),
        **payload.model_dump(),
    )
    await db.student_invoices.insert_one(invoice.model_dump())
    await log_activity(
        student_id,
        "invoice.create",
        f"Rechnung {number} erstellt (CHF {invoice.price_chf:.2f})",
        actor=admin.get("email"),
        meta={"invoice_id": invoice.id, "amount": invoice.price_chf, "number": number},
    )
    return invoice


@router.patch(
    "/{student_id}/invoices/{invoice_id}", response_model=StudentInvoice
)
async def update_invoice(
    student_id: str,
    invoice_id: str,
    payload: StudentInvoicePatch,
    admin=Depends(get_current_admin),
):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Keine Änderungen übergeben")
    if "status" in updates and updates["status"] not in INVOICE_STATUSES:
        raise HTTPException(status_code=400, detail="Ungültiger Status")
    if "payment_method" in updates and updates["payment_method"] not in PAYMENT_METHODS:
        raise HTTPException(status_code=400, detail="Ungültige Zahlungsweise")

    # Invalidate the PDF archive whenever any invoice field changes –
    # simplest correctness win. Next PDF download regenerates + re-archives.
    invalidate_archive = any(k not in ("status", "payment_method") for k in updates.keys())
    if invalidate_archive:
        updates["archive_path"] = ""
        updates["archive_url"] = ""

    res = await db.student_invoices.update_one(
        {"id": invoice_id, "student_id": student_id}, {"$set": updates}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Rechnung nicht gefunden")

    doc = await db.student_invoices.find_one({"id": invoice_id}, {"_id": 0})
    await log_activity(
        student_id,
        "invoice.update",
        f"Rechnung {doc.get('number', invoice_id[:8])} aktualisiert",
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
        f"Rechnung {doc.get('number', invoice_id[:8])} gelöscht",
        actor=admin.get("email"),
        meta={"invoice_id": invoice_id, "number": doc.get("number")},
    )
    return {"ok": True}


# ---------------------------------------------------------------------------
#  PDF export – see invoice_pdf.py
# ---------------------------------------------------------------------------
from routers.invoice_pdf import build_invoice_pdf  # noqa: E402 – circular-safe


@router.get("/{student_id}/invoices/{invoice_id}.pdf")
async def export_invoice_pdf(
    student_id: str,
    invoice_id: str,
    force: bool = False,
    admin=Depends(get_current_admin),
):
    """Return the PDF for this invoice. First call generates, uploads to
    Hetzner and stores the archive path. Subsequent calls stream the archived
    PDF straight from storage. Use `?force=true` to force a regeneration."""
    from core.storage import get_object, put_object
    student = await _ensure_student(student_id)
    invoice = await db.student_invoices.find_one(
        {"id": invoice_id, "student_id": student_id}, {"_id": 0}
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Rechnung nicht gefunden")

    filename = f"{invoice.get('number', 'Rechnung')}.pdf"
    archive_path = invoice.get("archive_path")

    # Fast path — pull from archive if available and not forcing regen
    if archive_path and not force:
        try:
            pdf_bytes, _ = get_object(archive_path)
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            )
        except Exception:
            # Archive is missing or storage error – clear the stale reference
            # so we don't keep hitting the missing key on every request, and
            # fall through to regeneration below.
            await db.student_invoices.update_one(
                {"id": invoice_id, "student_id": student_id},
                {"$set": {"archive_path": "", "archive_url": ""}},
            )

    settings = await get_or_create_settings()
    pdf_bytes = build_invoice_pdf(invoice, student, settings)

    # Persist to Hetzner + remember the path on the invoice row
    number = (invoice.get("number") or "invoice").replace("/", "-")
    stored_path = f"saferide/invoices/{number}-{invoice_id}.pdf"
    try:
        put_object(stored_path, pdf_bytes, "application/pdf")
        now_iso = datetime.now(timezone.utc).isoformat()
        await db.student_invoices.update_one(
            {"id": invoice_id, "student_id": student_id},
            {
                "$set": {
                    "archive_path": stored_path,
                    "archive_url": f"/api/files/{stored_path}",
                    "archived_at": now_iso,
                }
            },
        )
    except Exception:
        # If storage is down we still deliver the PDF – archive is a nice-to-have
        pass

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---------------------------------------------------------------------------
#  Global accounting endpoints (Buchhaltung)
# ---------------------------------------------------------------------------
@accounting_router.get("/invoices")
async def list_all_invoices(
    status: Optional[str] = Query(default=None),
    year: Optional[int] = Query(default=None),
    admin=Depends(get_current_admin),
):
    """Global invoice list across all students (Buchhaltung view).

    Joins each invoice with its student's basic info (name) so the UI
    doesn't need N+1 lookups.
    """
    q: dict = {}
    if status and status in INVOICE_STATUSES:
        q["status"] = status
    if year:
        q["date"] = {"$gte": f"{year}-01-01", "$lte": f"{year}-12-31"}

    invoices = await db.student_invoices.find(q, {"_id": 0}).sort("date", -1).to_list(5000)
    student_ids = list({i["student_id"] for i in invoices})
    students = await db.students.find(
        {"id": {"$in": student_ids}},
        {"_id": 0, "id": 1, "first_name": 1, "last_name": 1, "category": 1},
    ).to_list(2000)
    student_map = {s["id"]: s for s in students}

    out = []
    for inv in invoices:
        s = student_map.get(inv["student_id"]) or {}
        out.append({
            **inv,
            "student_name": f"{s.get('first_name','')} {s.get('last_name','')}".strip(),
            "student_category": s.get("category", ""),
        })
    return out
