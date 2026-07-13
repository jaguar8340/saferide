"""Webmail — IMAP read + SMTP compose/reply from within the admin UI.

Configuration lives on business_settings.imap_* (host, port, user, pwd, tls).
SMTP re-uses the existing business_settings.smtp_* config.

Endpoints (all admin-only):
  GET  /api/mail/config              – return imap_* metadata (no password)
  PATCH /api/mail/config              – update imap config + test connection
  GET  /api/mail/folders              – list IMAP folders
  GET  /api/mail/messages?folder=…&limit=30&search=… – list envelopes
  GET  /api/mail/message?folder=…&uid=…             – full message body + attachments meta
  POST /api/mail/send                 – compose new mail (multipart optional)
  POST /api/mail/reply                – reply to an existing mail (quote body)
  POST /api/mail/mark-read?folder=…&uid=…
  DELETE /api/mail/message?folder=…&uid=…
"""
from __future__ import annotations

import email
import email.policy
import imaplib
import re
import smtplib
import ssl
from datetime import datetime, timezone
from email.header import decode_header, make_header
from email.message import EmailMessage
from email.utils import parseaddr, parsedate_to_datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from pydantic import BaseModel, EmailStr, Field

from core.db import db
from core.security import get_current_admin
from routers.business_settings import get_or_create_settings


router = APIRouter(prefix="/mail", tags=["mail"])


# ---------------------------------------------------------------------------
#  Config schemas
# ---------------------------------------------------------------------------
class ImapConfigPatch(BaseModel):
    imap_host: str | None = None
    imap_port: int | None = None
    imap_user: str | None = None
    imap_password: str | None = None
    imap_use_ssl: bool | None = None


class MailComposeIn(BaseModel):
    to: list[EmailStr] = Field(default_factory=list)
    cc: list[EmailStr] = Field(default_factory=list)
    subject: str = ""
    body: str = ""


class MailReplyIn(BaseModel):
    folder: str = "INBOX"
    uid: str
    body: str
    reply_all: bool = False


class MarkReadIn(BaseModel):
    folder: str = "INBOX"
    uid: str
    read: bool = True


# ---------------------------------------------------------------------------
#  Helpers
# ---------------------------------------------------------------------------
def _decode(s: Any) -> str:
    if not s:
        return ""
    if isinstance(s, bytes):
        try:
            return s.decode("utf-8", errors="replace")
        except Exception:
            return s.decode("latin-1", errors="replace")
    try:
        return str(make_header(decode_header(str(s))))
    except Exception:
        return str(s)


async def _imap_config() -> dict:
    settings = await get_or_create_settings()
    cfg = {
        "host": settings.get("imap_host") or "",
        "port": int(settings.get("imap_port") or 993),
        "user": settings.get("imap_user") or "",
        "password": settings.get("imap_password") or "",
        "use_ssl": bool(settings.get("imap_use_ssl", True)),
    }
    if not (cfg["host"] and cfg["user"] and cfg["password"]):
        raise HTTPException(400, "IMAP nicht konfiguriert (Mail → Einstellungen)")
    return cfg


def _open_imap(cfg: dict) -> imaplib.IMAP4:
    ctx = ssl.create_default_context()
    if cfg["use_ssl"]:
        conn = imaplib.IMAP4_SSL(cfg["host"], cfg["port"], ssl_context=ctx)
    else:
        conn = imaplib.IMAP4(cfg["host"], cfg["port"])
        try:
            conn.starttls(ssl_context=ctx)
        except imaplib.IMAP4.error:
            pass
    conn.login(cfg["user"], cfg["password"])
    return conn


def _envelope_from_bytes(uid: str, folder: str, data: bytes) -> dict:
    msg = email.message_from_bytes(data, policy=email.policy.default)
    from_name, from_addr = parseaddr(_decode(msg.get("From")))
    date_raw = msg.get("Date") or ""
    date_iso = ""
    try:
        date_iso = parsedate_to_datetime(date_raw).astimezone(timezone.utc).isoformat()
    except Exception:
        date_iso = ""
    return {
        "uid": uid,
        "folder": folder,
        "subject": _decode(msg.get("Subject")),
        "from_name": from_name,
        "from_email": from_addr,
        "to": _decode(msg.get("To")),
        "cc": _decode(msg.get("Cc")),
        "date": date_iso,
        "message_id": _decode(msg.get("Message-Id")),
        "preview": "",  # populated by list-view via envelope-headers only
    }


def _message_body(msg) -> dict:
    """Extract text + html body and attachment metadata from an EmailMessage."""
    text_body = ""
    html_body = ""
    attachments = []
    if msg.is_multipart():
        for part in msg.walk():
            ct = part.get_content_type()
            disp = (part.get("Content-Disposition") or "").lower()
            if "attachment" in disp:
                attachments.append({
                    "filename": _decode(part.get_filename()),
                    "content_type": ct,
                    "size": len(part.get_payload(decode=True) or b""),
                })
            elif ct == "text/plain" and not text_body:
                text_body = _decode(part.get_payload(decode=True) or b"")
            elif ct == "text/html" and not html_body:
                html_body = _decode(part.get_payload(decode=True) or b"")
    else:
        ct = msg.get_content_type()
        payload = _decode(msg.get_payload(decode=True) or b"")
        if ct == "text/html":
            html_body = payload
        else:
            text_body = payload
    return {"text": text_body, "html": html_body, "attachments": attachments}


# ---------------------------------------------------------------------------
#  Config
# ---------------------------------------------------------------------------
@router.get("/config")
async def get_config(admin=Depends(get_current_admin)):
    settings = await get_or_create_settings()
    return {
        "imap_host": settings.get("imap_host") or "",
        "imap_port": int(settings.get("imap_port") or 993),
        "imap_user": settings.get("imap_user") or "",
        "imap_password_set": bool(settings.get("imap_password")),
        "imap_use_ssl": bool(settings.get("imap_use_ssl", True)),
    }


@router.patch("/config")
async def patch_config(payload: ImapConfigPatch, admin=Depends(get_current_admin)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        await get_or_create_settings()
        await db.business_settings.update_one(
            {"id": "default"}, {"$set": updates}, upsert=True
        )
    # After every save, try a real IMAP connect to give immediate feedback.
    try:
        cfg = await _imap_config()
        conn = _open_imap(cfg)
        conn.select("INBOX")
        conn.logout()
        return {"ok": True, "test": "connected"}
    except HTTPException:
        raise
    except Exception as e:      # noqa: BLE001
        raise HTTPException(502, f"IMAP-Verbindung fehlgeschlagen: {e}")


# ---------------------------------------------------------------------------
#  Folders
# ---------------------------------------------------------------------------
@router.get("/folders")
async def list_folders(admin=Depends(get_current_admin)):
    cfg = await _imap_config()
    try:
        conn = _open_imap(cfg)
    except Exception as e:      # noqa: BLE001
        raise HTTPException(502, f"IMAP-Verbindung: {e}")
    try:
        status, folders = conn.list()
        out = []
        if status == "OK":
            for raw in folders or []:
                if isinstance(raw, bytes):
                    raw = raw.decode("utf-8", errors="replace")
                # e.g.  '(\\HasNoChildren) "/" "INBOX"'
                m = re.match(r'\(([^)]*)\)\s+"([^"]+)"\s+"?(.+?)"?$', raw)
                if not m:
                    continue
                flags, sep, name = m.groups()
                name = name.strip('"')
                out.append({
                    "name": name,
                    "path": name,
                    "flags": flags.split() if flags else [],
                    "delimiter": sep,
                })
        return out
    finally:
        conn.logout()


# ---------------------------------------------------------------------------
#  Message list
# ---------------------------------------------------------------------------
@router.get("/messages")
async def list_messages(
    folder: str = Query("INBOX"),
    limit: int = Query(30, ge=1, le=200),
    search: str = Query(""),
    admin=Depends(get_current_admin),
):
    cfg = await _imap_config()
    try:
        conn = _open_imap(cfg)
    except Exception as e:      # noqa: BLE001
        raise HTTPException(502, f"IMAP-Verbindung: {e}")
    try:
        status, _ = conn.select(folder, readonly=True)
        if status != "OK":
            raise HTTPException(404, f"Ordner nicht gefunden: {folder}")

        query = f'TEXT "{search}"' if search else "ALL"
        status, data = conn.uid("search", None, query)
        if status != "OK":
            return []
        uids = data[0].split()[-limit:][::-1]  # newest last, take tail, reverse
        out = []
        for uid_b in uids:
            uid = uid_b.decode()
            status, msg_data = conn.uid(
                "fetch", uid,
                "(RFC822.HEADER FLAGS BODY.PEEK[TEXT]<0.400>)",
            )
            if status != "OK" or not msg_data or not msg_data[0]:
                continue
            header_bytes = msg_data[0][1]
            env = _envelope_from_bytes(uid, folder, header_bytes)
            # Extract a plain-text preview from the partial body
            preview = ""
            for part in msg_data[1:]:
                if isinstance(part, tuple) and len(part) > 1:
                    preview_bytes = part[1]
                    preview = _decode(preview_bytes)[:200]
                    break
            env["preview"] = re.sub(r"\s+", " ", preview).strip()
            # Extract \Seen flag from headers
            flags_raw = str(msg_data[0][0])
            env["unread"] = "\\Seen" not in flags_raw
            out.append(env)
        return out
    finally:
        conn.logout()


# ---------------------------------------------------------------------------
#  Single message
# ---------------------------------------------------------------------------
@router.get("/message")
async def get_message(
    folder: str = Query("INBOX"),
    uid: str = Query(...),
    admin=Depends(get_current_admin),
):
    cfg = await _imap_config()
    try:
        conn = _open_imap(cfg)
    except Exception as e:      # noqa: BLE001
        raise HTTPException(502, f"IMAP-Verbindung: {e}")
    try:
        status, _ = conn.select(folder)
        if status != "OK":
            raise HTTPException(404, f"Ordner nicht gefunden: {folder}")
        status, data = conn.uid("fetch", uid, "(RFC822)")
        if status != "OK" or not data or not data[0]:
            raise HTTPException(404, "Nachricht nicht gefunden")
        raw = data[0][1]
        msg = email.message_from_bytes(raw, policy=email.policy.default)
        env = _envelope_from_bytes(uid, folder, raw)
        body = _message_body(msg)
        return {**env, **body}
    finally:
        conn.logout()


# ---------------------------------------------------------------------------
#  Send / Reply
# ---------------------------------------------------------------------------
def _smtp_config(settings: dict) -> dict:
    from routers.invoice_email import _build_smtp_config
    cfg = _build_smtp_config(settings, override=None)
    if not cfg.get("host"):
        raise HTTPException(400, "SMTP nicht konfiguriert")
    return cfg


def _persist_sent(msg: EmailMessage, cfg: dict) -> None:
    """Try to APPEND the sent message into the IMAP 'Sent' folder so it
    shows up in the webmail's Gesendet view.  Best-effort — swallow errors."""
    try:
        imap = _open_imap({
            "host": cfg["host"].replace("smtp", "imap") if "smtp" in cfg["host"] else cfg["host"],
            "port": 993,
            "user": cfg["user"],
            "password": cfg["password"],
            "use_ssl": True,
        })
        # Common Sent-folder names — try in order.
        for name in ("Sent", "INBOX.Sent", "Sent Messages", "Gesendet"):
            try:
                imap.append(name, "\\Seen", None, msg.as_bytes())
                break
            except Exception:
                continue
        imap.logout()
    except Exception:
        pass


@router.post("/send")
async def send_mail(payload: MailComposeIn, admin=Depends(get_current_admin)):
    if not payload.to:
        raise HTTPException(400, "Empfänger fehlt")
    settings = await get_or_create_settings()
    cfg = _smtp_config(settings)

    msg = EmailMessage()
    msg["From"] = cfg.get("from_email") or cfg.get("user") or "no-reply@saferide.ch"
    msg["To"] = ", ".join(payload.to)
    if payload.cc:
        msg["Cc"] = ", ".join(payload.cc)
    msg["Subject"] = payload.subject
    msg.set_content(payload.body)

    try:
        from routers.invoice_email import _open_smtp
        with _open_smtp(cfg) as server:
            server.send_message(msg)
    except Exception as e:      # noqa: BLE001
        raise HTTPException(502, f"SMTP-Versand fehlgeschlagen: {e}")

    _persist_sent(msg, cfg)
    return {"ok": True}


@router.post("/reply")
async def reply_mail(payload: MailReplyIn, admin=Depends(get_current_admin)):
    settings = await get_or_create_settings()
    cfg = _smtp_config(settings)
    imap_cfg = await _imap_config()

    # Fetch original to build quoted body + subject + Message-Id.
    try:
        conn = _open_imap(imap_cfg)
        conn.select(payload.folder, readonly=True)
        status, data = conn.uid("fetch", payload.uid, "(RFC822)")
        conn.logout()
        if status != "OK" or not data or not data[0]:
            raise HTTPException(404, "Original-Nachricht nicht gefunden")
        original = email.message_from_bytes(data[0][1], policy=email.policy.default)
    except imaplib.IMAP4.error as e:
        raise HTTPException(502, f"IMAP: {e}")

    orig_subject = _decode(original.get("Subject"))
    reply_subject = orig_subject if orig_subject.lower().startswith("re:") else f"Re: {orig_subject}"
    orig_from = _decode(original.get("From"))
    orig_message_id = _decode(original.get("Message-Id"))
    orig_text = _message_body(original)["text"] or ""
    quoted = "\n".join("> " + ln for ln in orig_text.splitlines()[:60])

    to_list = [parseaddr(orig_from)[1]]
    cc_list = []
    if payload.reply_all:
        for hdr_name in ("To", "Cc"):
            for _, addr in email.utils.getaddresses(original.get_all(hdr_name, [])):
                if addr and addr != cfg.get("user"):
                    cc_list.append(addr)

    msg = EmailMessage()
    msg["From"] = cfg.get("from_email") or cfg.get("user") or "no-reply@saferide.ch"
    msg["To"] = ", ".join(to_list)
    if cc_list:
        msg["Cc"] = ", ".join(cc_list)
    msg["Subject"] = reply_subject
    if orig_message_id:
        msg["In-Reply-To"] = orig_message_id
        msg["References"] = orig_message_id
    body = (
        f"{payload.body.strip()}\n\n"
        f"Am {original.get('Date','')} schrieb {orig_from}:\n{quoted}"
    )
    msg.set_content(body)

    try:
        from routers.invoice_email import _open_smtp
        with _open_smtp(cfg) as server:
            server.send_message(msg)
    except Exception as e:      # noqa: BLE001
        raise HTTPException(502, f"SMTP: {e}")

    _persist_sent(msg, cfg)
    return {"ok": True}


# ---------------------------------------------------------------------------
#  Read / delete flags
# ---------------------------------------------------------------------------
@router.post("/mark-read")
async def mark_read(payload: MarkReadIn, admin=Depends(get_current_admin)):
    cfg = await _imap_config()
    try:
        conn = _open_imap(cfg)
        conn.select(payload.folder)
        flag = "+FLAGS" if payload.read else "-FLAGS"
        conn.uid("store", payload.uid, flag, "(\\Seen)")
        conn.logout()
        return {"ok": True}
    except Exception as e:      # noqa: BLE001
        raise HTTPException(502, str(e))


@router.delete("/message")
async def delete_message(
    folder: str = Query("INBOX"),
    uid: str = Query(...),
    admin=Depends(get_current_admin),
):
    cfg = await _imap_config()
    try:
        conn = _open_imap(cfg)
        conn.select(folder)
        conn.uid("store", uid, "+FLAGS", "(\\Deleted)")
        conn.expunge()
        conn.logout()
        return {"ok": True}
    except Exception as e:      # noqa: BLE001
        raise HTTPException(502, str(e))
