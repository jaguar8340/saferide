"""Send an invoice by e-mail via SMTP (uses BusinessSettings SMTP fields).

Endpoints
  POST /api/students/{sid}/invoices/{iid}/email      – send this invoice
  POST /api/settings/business/smtp/test              – no-op SMTP handshake

Password is stored in `business_settings.smtp_password` – never exposed to
the frontend beyond the admin who typed it (settings endpoint is admin-only).

SMTP behaviour:
  * port 465 → implicit SSL (SMTPS)
  * port 587 or anything else with `smtp_use_tls=True` → STARTTLS
  * `smtp_use_tls=False` → plain SMTP (dev / on-prem relays only)
"""
from __future__ import annotations

import smtplib
import ssl
from email.message import EmailMessage
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from core.activity import log_activity
from core.db import db
from core.security import get_current_admin
from routers.business_settings import get_or_create_settings
from routers.invoice_pdf import build_invoice_pdf


router = APIRouter(tags=["invoice-email"])


# ---------------------------------------------------------------------------
#  Request bodies
# ---------------------------------------------------------------------------
class SendInvoiceEmail(BaseModel):
    model_config = ConfigDict(extra="ignore")
    to: Optional[EmailStr] = None            # override — else student.email is used
    subject: Optional[str] = Field(default=None, max_length=300)
    body: Optional[str] = Field(default=None, max_length=8000)


class SmtpTestPayload(BaseModel):
    """Optional overrides — if not set we use the stored BusinessSettings.

    Handy for the 'Verbindung testen' button, so Nadine can validate a new
    host/user combination BEFORE saving it.
    """
    model_config = ConfigDict(extra="ignore")
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_use_tls: Optional[bool] = None


# ---------------------------------------------------------------------------
#  Helpers
# ---------------------------------------------------------------------------
def _build_smtp_config(settings: dict, override: SmtpTestPayload | None) -> dict:
    cfg = {
        "host": settings.get("smtp_host") or "",
        "port": int(settings.get("smtp_port") or 587),
        "user": settings.get("smtp_username") or "",
        "password": settings.get("smtp_password") or "",
        "use_tls": bool(settings.get("smtp_use_tls", True)),
    }
    if override is not None:
        if override.smtp_host is not None:
            cfg["host"] = override.smtp_host
        if override.smtp_port is not None:
            cfg["port"] = int(override.smtp_port)
        if override.smtp_username is not None:
            cfg["user"] = override.smtp_username
        if override.smtp_password is not None:
            cfg["password"] = override.smtp_password
        if override.smtp_use_tls is not None:
            cfg["use_tls"] = bool(override.smtp_use_tls)
    return cfg


def _open_smtp(cfg: dict) -> smtplib.SMTP | smtplib.SMTP_SSL:
    """Open + authenticate an SMTP connection. Raises HTTPException on failure."""
    if not cfg["host"]:
        raise HTTPException(status_code=400, detail="SMTP-Host ist nicht gesetzt")
    try:
        if cfg["port"] == 465:
            context = ssl.create_default_context()
            server = smtplib.SMTP_SSL(cfg["host"], cfg["port"], timeout=15, context=context)
        else:
            server = smtplib.SMTP(cfg["host"], cfg["port"], timeout=15)
            server.ehlo()
            if cfg["use_tls"]:
                server.starttls(context=ssl.create_default_context())
                server.ehlo()
        if cfg["user"] and cfg["password"]:
            server.login(cfg["user"], cfg["password"])
        return server
    except smtplib.SMTPAuthenticationError as e:
        raise HTTPException(
            status_code=502, detail=f"SMTP-Anmeldung fehlgeschlagen: {e.smtp_error.decode('utf-8', 'replace') if hasattr(e, 'smtp_error') else e}"
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"SMTP-Verbindung fehlgeschlagen: {e}")


def _render_template(tpl: str, ctx: dict) -> str:
    """Safe .format() – missing keys are replaced with empty string."""
    class _Safe(dict):
        def __missing__(self, key):     # noqa: D401
            return ""
    try:
        return tpl.format_map(_Safe(ctx))
    except Exception:
        return tpl


# ---------------------------------------------------------------------------
#  Send invoice
# ---------------------------------------------------------------------------
invoice_router = APIRouter(prefix="/students", tags=["invoice-email"])


@invoice_router.post("/{student_id}/invoices/{invoice_id}/email")
async def send_invoice_email(
    student_id: str,
    invoice_id: str,
    payload: SendInvoiceEmail,
    admin=Depends(get_current_admin),
):
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Schüler nicht gefunden")
    invoice = await db.student_invoices.find_one(
        {"id": invoice_id, "student_id": student_id}, {"_id": 0}
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Rechnung nicht gefunden")

    settings = await get_or_create_settings()
    cfg = _build_smtp_config(settings, override=None)
    if not cfg["host"]:
        raise HTTPException(
            status_code=400,
            detail="SMTP ist noch nicht konfiguriert. Bitte zuerst in Fahrschul-Daten → E-Mail-Versand einrichten.",
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

    # Build the PDF exactly like the download endpoint would
    pdf_bytes = build_invoice_pdf(invoice, student, settings)
    number = invoice.get("number") or "Rechnung"

    # Compute a friendly total (with MWST) for the template context
    price = float(invoice.get("price_chf") or 0)
    mwst_rate = float(invoice.get("mwst_rate") or 0)
    total = round(price * (1 + mwst_rate / 100.0), 2)

    ctx = {
        "number": number,
        "first_name": student.get("first_name", ""),
        "last_name": student.get("last_name", ""),
        "business_name": settings.get("business_name", ""),
        "total": f"{total:,.2f}".replace(",", "’"),
        "lesson_date": (invoice.get("lesson_date") or ""),
    }
    subject_tpl = payload.subject or settings.get("email_subject_template") or "Rechnung {number}"
    body_tpl = payload.body or settings.get("email_body_template") or "Hallo {first_name},\n\nim Anhang die Rechnung {number}."
    subject = _render_template(subject_tpl, ctx)
    body = _render_template(body_tpl, ctx)

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{from_email}>" if from_name else from_email
    msg["To"] = to_email
    msg.set_content(body)
    msg.add_attachment(
        pdf_bytes,
        maintype="application",
        subtype="pdf",
        filename=f"{number}.pdf",
    )

    server = _open_smtp(cfg)
    try:
        server.send_message(msg)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"E-Mail-Versand fehlgeschlagen: {e}")
    finally:
        try:
            server.quit()
        except Exception:
            pass

    await log_activity(
        student_id,
        "invoice.email",
        f"Rechnung {number} per E-Mail an {to_email} versendet",
        actor=admin.get("email"),
        meta={"invoice_id": invoice_id, "to": to_email},
    )
    return {"ok": True, "to": to_email, "subject": subject}


# ---------------------------------------------------------------------------
#  SMTP handshake test
# ---------------------------------------------------------------------------
settings_router = APIRouter(prefix="/settings", tags=["invoice-email"])


@settings_router.post("/business/smtp/test")
async def smtp_test(payload: SmtpTestPayload, admin=Depends(get_current_admin)):
    settings = await get_or_create_settings()
    cfg = _build_smtp_config(settings, override=payload)
    server = _open_smtp(cfg)
    try:
        server.noop()
    finally:
        try:
            server.quit()
        except Exception:
            pass
    return {"ok": True, "host": cfg["host"], "port": cfg["port"]}
