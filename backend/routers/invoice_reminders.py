"""Dunning / Mahnwesen — send payment reminders for overdue invoices.

Endpoints
  POST /api/students/{sid}/invoices/{iid}/reminder      – send next reminder (auto-advances stufe)
  POST /api/students/{sid}/invoices/{iid}/reminder/preview  – preview the mail (no send)
  GET  /api/accounting/reminders/candidates             – list all overdue invoices with computed level

Behaviour
  * Reminder level 1..3 is stored on the invoice (`reminder_level`).
  * Fees are cumulative and stored on `reminder_fee_chf` (added to price in PDF).
  * Only invoices with status="open" and `is_direct != True` are eligible.
  * PDF is regenerated on the next download (archive is cleared).
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from core.activity import log_activity
from core.db import db
from core.email import build_smtp_config, render_template, send_email
from core.security import get_current_admin
from routers.business_settings import get_or_create_settings
from routers.invoice_pdf import build_invoice_pdf


router = APIRouter(prefix="/students", tags=["invoice-reminders"])
accounting_router = APIRouter(prefix="/accounting", tags=["invoice-reminders"])


# ---------------------------------------------------------------------------
#  Helpers
# ---------------------------------------------------------------------------
def _parse_iso_date(value: str) -> Optional[date]:
    if not value or not isinstance(value, str):
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def _days_overdue(invoice: dict, settings: dict, today: Optional[date] = None) -> int:
    """Return how many days the invoice is past its payment deadline.

    Deadline = invoice.date + settings.payment_deadline_days. Negative
    numbers (still within grace period) are returned as 0.
    """
    today = today or date.today()
    invoice_date = _parse_iso_date(invoice.get("date")) or today
    deadline_days = int(settings.get("payment_deadline_days") or 10)
    deadline = invoice_date.toordinal() + deadline_days
    diff = today.toordinal() - deadline
    return max(0, diff)


def _next_reminder_level(invoice: dict, settings: dict, today: Optional[date] = None) -> int:
    """Compute the SUGGESTED next reminder level (0..3) for this invoice.

    * Already at level 3 → stays at 3 (letzter Stand).
    * Level is auto-advanced by the interval days from settings.
    """
    if invoice.get("status") != "open" or invoice.get("is_direct"):
        return 0
    today = today or date.today()
    overdue = _days_overdue(invoice, settings, today)
    if overdue <= 0:
        return 0
    interval = int(settings.get("reminder_interval_days") or 10)
    current = int(invoice.get("reminder_level") or 0)
    last_sent = _parse_iso_date(invoice.get("last_reminder_at"))
    if current == 0:
        return 1
    # If a reminder was sent recently, don't auto-suggest the next stage yet.
    if last_sent and (today.toordinal() - last_sent.toordinal()) < interval:
        return current
    return min(current + 1, 3)


def _fee_for_level(level: int, settings: dict) -> float:
    if level == 1:
        return float(settings.get("reminder_fee_1") or 0.0)
    if level == 2:
        return float(settings.get("reminder_fee_2") or 0.0)
    if level == 3:
        return float(settings.get("reminder_fee_3") or 0.0)
    return 0.0


def _fmt_money(n: float) -> str:
    return f"{n:,.2f}".replace(",", "’")


def _fmt_dmy(iso: str) -> str:
    if not iso or len(iso) < 10:
        return ""
    return f"{iso[8:10]}.{iso[5:7]}.{iso[0:4]}"


def _build_reminder_ctx(
    invoice: dict,
    student: dict,
    settings: dict,
    level: int,
    new_fee: float,
) -> dict:
    """Template context — safe .format_map so missing keys collapse to ''."""
    price = float(invoice.get("price_chf") or 0)
    mwst_rate = float(invoice.get("mwst_rate") or 0)
    total = round(price * (1 + mwst_rate / 100.0), 2)
    total_fees = float(invoice.get("reminder_fee_chf") or 0) + float(new_fee or 0)
    new_total = round(total + total_fees, 2)
    return {
        "number": invoice.get("number", ""),
        "first_name": student.get("first_name", ""),
        "last_name": student.get("last_name", ""),
        "business_name": settings.get("business_name", ""),
        "invoice_date": _fmt_dmy(invoice.get("date", "")),
        "lesson_date": _fmt_dmy(invoice.get("lesson_date", "")),
        "total": _fmt_money(total),
        "reminder_fee": _fmt_money(total_fees),
        "new_total": _fmt_money(new_total),
        "days_overdue": _days_overdue(invoice, settings),
        "level": level,
    }


def _get_template(settings: dict, level: int) -> tuple[str, str]:
    """Return (subject_tpl, body_tpl) for the given reminder level."""
    if level <= 1:
        return (
            settings.get("reminder_1_subject") or "Zahlungserinnerung zu Rechnung {number}",
            settings.get("reminder_1_body") or "",
        )
    if level == 2:
        return (
            settings.get("reminder_2_subject") or "2. Mahnung zu Rechnung {number}",
            settings.get("reminder_2_body") or "",
        )
    return (
        settings.get("reminder_3_subject") or "3. und letzte Mahnung – Rechnung {number}",
        settings.get("reminder_3_body") or "",
    )


# ---------------------------------------------------------------------------
#  Request bodies
# ---------------------------------------------------------------------------
class SendReminderPayload(BaseModel):
    """Body for POST /reminder. All fields are optional overrides."""
    model_config = ConfigDict(extra="ignore")
    to: Optional[EmailStr] = None            # override — else student.email is used
    level: Optional[int] = Field(default=None, ge=1, le=3)  # force a specific stage
    subject: Optional[str] = Field(default=None, max_length=300)
    body: Optional[str] = Field(default=None, max_length=8000)
    fee: Optional[float] = Field(default=None, ge=0, le=10_000)


# ---------------------------------------------------------------------------
#  Overview endpoint — used by the "Mahnwesen" filter in accounting
# ---------------------------------------------------------------------------
@accounting_router.get("/reminders/candidates")
async def list_reminder_candidates(admin=Depends(get_current_admin)):
    """Return all open, overdue invoices with a computed `next_level` field.

    Filters to `is_direct != True` because DIREKT-Rechnungen are cash and
    should never trigger a Mahnung.
    """
    settings = await get_or_create_settings()
    today = date.today()
    invoices = await db.student_invoices.find(
        {"status": "open", "is_direct": {"$ne": True}}, {"_id": 0}
    ).sort("date", 1).to_list(2000)

    # Join with student info in one bulk call
    student_ids = list({inv["student_id"] for inv in invoices})
    students = await db.students.find(
        {"id": {"$in": student_ids}},
        {"_id": 0, "id": 1, "first_name": 1, "last_name": 1, "email": 1},
    ).to_list(2000)
    smap = {s["id"]: s for s in students}

    out = []
    for inv in invoices:
        overdue = _days_overdue(inv, settings, today)
        next_level = _next_reminder_level(inv, settings, today)
        if overdue <= 0 and int(inv.get("reminder_level") or 0) == 0:
            continue  # not overdue yet AND no reminder history → skip
        s = smap.get(inv["student_id"]) or {}
        out.append({
            **inv,
            "days_overdue": overdue,
            "next_level": next_level,
            "next_fee": _fee_for_level(next_level, settings) if next_level else 0.0,
            "student_name": f"{s.get('first_name','')} {s.get('last_name','')}".strip(),
            "student_email": s.get("email", ""),
        })
    return out


# ---------------------------------------------------------------------------
#  Preview + Send
# ---------------------------------------------------------------------------
@router.post("/{student_id}/invoices/{invoice_id}/reminder/preview")
async def preview_reminder(
    student_id: str,
    invoice_id: str,
    payload: SendReminderPayload,
    admin=Depends(get_current_admin),
):
    """Compute the subject + body that would be sent — without sending."""
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Schüler nicht gefunden")
    invoice = await db.student_invoices.find_one(
        {"id": invoice_id, "student_id": student_id}, {"_id": 0}
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Rechnung nicht gefunden")

    settings = await get_or_create_settings()
    level = int(payload.level or _next_reminder_level(invoice, settings) or 1)
    level = max(1, min(3, level))
    fee = float(payload.fee if payload.fee is not None else _fee_for_level(level, settings))
    ctx = _build_reminder_ctx(invoice, student, settings, level, fee)
    subj_tpl, body_tpl = _get_template(settings, level)
    subj_tpl = payload.subject or subj_tpl
    body_tpl = payload.body or body_tpl
    return {
        "level": level,
        "fee": fee,
        "days_overdue": ctx["days_overdue"],
        "subject": render_template(subj_tpl, ctx),
        "body": render_template(body_tpl, ctx),
        "to": (payload.to or student.get("email") or "").strip(),
    }


@router.post("/{student_id}/invoices/{invoice_id}/reminder")
async def send_reminder(
    student_id: str,
    invoice_id: str,
    payload: SendReminderPayload,
    admin=Depends(get_current_admin),
):
    """Send a dunning e-mail with the updated invoice PDF attached.

    Steps:
      1. Build the reminder context, pick level (auto or forced).
      2. Increment `reminder_level` + `reminder_fee_chf` on the invoice.
      3. Clear the PDF archive so the next PDF regenerates with fees.
      4. Regenerate the PDF and send via Resend/SMTP.
      5. Log activity.
    """
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Schüler nicht gefunden")
    invoice = await db.student_invoices.find_one(
        {"id": invoice_id, "student_id": student_id}, {"_id": 0}
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Rechnung nicht gefunden")

    if invoice.get("status") != "open":
        raise HTTPException(
            status_code=400,
            detail="Mahnungen können nur für offene Rechnungen gesendet werden.",
        )
    if invoice.get("is_direct"):
        raise HTTPException(
            status_code=400,
            detail="DIREKT-Rechnungen können nicht gemahnt werden.",
        )

    settings = await get_or_create_settings()
    cfg = build_smtp_config(settings, override=None)
    if not cfg["host"] and not cfg.get("resend_api_key"):
        raise HTTPException(
            status_code=400,
            detail="Weder SMTP noch Resend sind eingerichtet. Bitte zuerst in Fahrschul-Daten → E-Mail-Versand einrichten.",
        )

    from_email = settings.get("smtp_from_email") or settings.get("smtp_username") or ""
    if not from_email:
        raise HTTPException(status_code=400, detail="Absender-E-Mail nicht konfiguriert")
    from_name = settings.get("smtp_from_name") or settings.get("business_name") or ""

    to_email = (payload.to or student.get("email") or "").strip()
    if not to_email:
        raise HTTPException(
            status_code=400,
            detail="Empfänger-E-Mail fehlt – bitte E-Mail beim Schüler eintragen.",
        )

    # Determine level + fee
    suggested_level = _next_reminder_level(invoice, settings)
    level = int(payload.level or suggested_level or 1)
    level = max(1, min(3, level))
    fee = float(
        payload.fee if payload.fee is not None else _fee_for_level(level, settings)
    )

    # Apply updates BEFORE building PDF, so the PDF reflects new totals.
    now_iso = datetime.now(timezone.utc).isoformat()
    prev_fee = float(invoice.get("reminder_fee_chf") or 0)
    updates = {
        "reminder_level": level,
        "reminder_fee_chf": round(prev_fee + fee, 2),
        "last_reminder_at": now_iso,
        # Invalidate archive so next PDF download regenerates with fee
        "archive_path": "",
        "archive_url": "",
    }
    await db.student_invoices.update_one(
        {"id": invoice_id, "student_id": student_id}, {"$set": updates}
    )
    invoice.update(updates)

    # Build context AFTER the update so `reminder_fee` shows the new cumulative fee
    ctx = _build_reminder_ctx(invoice, student, settings, level, 0)  # already applied
    subj_tpl, body_tpl = _get_template(settings, level)
    subject = render_template(payload.subject or subj_tpl, ctx)
    body = render_template(payload.body or body_tpl, ctx)

    # Build fresh PDF with the reminder fee included
    pdf_bytes = build_invoice_pdf(invoice, student, settings)
    number = invoice.get("number") or "Rechnung"
    filename = f"{number}-Mahnung-{level}.pdf"

    send_email(
        cfg,
        to=to_email,
        subject=subject,
        body_text=body,
        from_email=from_email,
        from_name=from_name,
        attachments=[{
            "filename": filename,
            "content": pdf_bytes,
            "content_type": "application/pdf",
        }],
    )

    await log_activity(
        student_id,
        "invoice.reminder",
        f"{level}. Mahnung für {number} an {to_email} versendet (Gebühr CHF {fee:.2f})",
        actor=admin.get("email"),
        meta={
            "invoice_id": invoice_id,
            "level": level,
            "fee": fee,
            "to": to_email,
        },
    )
    return {
        "ok": True,
        "level": level,
        "fee": fee,
        "to": to_email,
        "subject": subject,
    }


# ---------------------------------------------------------------------------
#  Reset — undo a wrongly-sent reminder (Admin QoL)
# ---------------------------------------------------------------------------
@router.post("/{student_id}/invoices/{invoice_id}/reminder/reset")
async def reset_reminders(
    student_id: str,
    invoice_id: str,
    admin=Depends(get_current_admin),
):
    """Reset reminder_level & fees on an invoice (e.g. mahnung was in error).

    Also clears the archive so the NEXT PDF download shows the original
    amount without the mahngebühr.
    """
    invoice = await db.student_invoices.find_one(
        {"id": invoice_id, "student_id": student_id}, {"_id": 0}
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Rechnung nicht gefunden")
    await db.student_invoices.update_one(
        {"id": invoice_id, "student_id": student_id},
        {"$set": {
            "reminder_level": 0,
            "reminder_fee_chf": 0.0,
            "last_reminder_at": "",
            "archive_path": "",
            "archive_url": "",
        }},
    )
    await log_activity(
        student_id,
        "invoice.reminder.reset",
        f"Mahnstatus für {invoice.get('number', invoice_id[:8])} zurückgesetzt",
        actor=admin.get("email"),
        meta={"invoice_id": invoice_id},
    )
    return {"ok": True}
