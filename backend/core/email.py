"""Shared SMTP helpers used by invoice-email and booking-request routers.

Extracted from `routers/invoice_email.py` so multiple senders can share the
same configuration & connection lifecycle. Nothing here is booking- or
invoice-specific.
"""
from __future__ import annotations

import smtplib
import ssl
from email.message import EmailMessage
from typing import Dict, Optional

from fastapi import HTTPException


def build_smtp_config(settings: dict, override: Optional[Dict] = None) -> dict:
    """Merge stored BusinessSettings.smtp_* fields with optional overrides.

    Now also carries the Resend fields so `send_email` can pick whichever
    transport is configured without a second lookup.
    """
    cfg = {
        "host": settings.get("smtp_host") or "",
        "port": int(settings.get("smtp_port") or 587),
        "user": settings.get("smtp_username") or "",
        "password": settings.get("smtp_password") or "",
        "use_tls": bool(settings.get("smtp_use_tls", True)),
        "resend_api_key": settings.get("resend_api_key") or "",
        "resend_from_email": settings.get("resend_from_email") or "",
    }
    if override:
        for src, dst in [
            ("smtp_host", "host"),
            ("smtp_port", "port"),
            ("smtp_username", "user"),
            ("smtp_password", "password"),
            ("smtp_use_tls", "use_tls"),
            ("resend_api_key", "resend_api_key"),
            ("resend_from_email", "resend_from_email"),
        ]:
            if override.get(src) is not None:
                cfg[dst] = override[src]
    return cfg


def open_smtp(cfg: dict):
    """Open + authenticate an SMTP connection. Raises HTTPException on failure."""
    if not cfg["host"]:
        raise HTTPException(status_code=400, detail="SMTP-Host ist nicht gesetzt")
    try:
        if cfg["port"] == 465:
            # Implicit SSL — the connection starts encrypted. `use_tls` is
            # ignored in this branch to avoid the accidental STARTTLS-on-465
            # miscombination that produces "UNEXPECTED_EOF_WHILE_READING".
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
            status_code=400,
            detail=f"SMTP-Anmeldung fehlgeschlagen: "
                   f"{e.smtp_error.decode('utf-8', 'replace') if hasattr(e, 'smtp_error') else e}",
        )
    except ssl.SSLError as e:
        # Very common admin mistake — SSL negotiation failed. Tell them
        # exactly which knob to touch instead of dumping the raw OpenSSL msg.
        hint = (
            "SSL-Fehler beim Verbindungsaufbau. "
            "Wenn du Port 465 nutzt und dieser Fehler kommt, versuche Port 587 "
            "mit aktiviertem STARTTLS. Wenn du Port 587 nutzt und dieser Fehler "
            "kommt, prüfe ob STARTTLS aktiviert ist."
        )
        raise HTTPException(status_code=400, detail=f"{hint} (Details: {e})")
    except (ConnectionError, TimeoutError, OSError) as e:
        # These are typical for firewall/port-blocked situations.
        hint = (
            "Der SMTP-Server konnte nicht erreicht werden. "
            "Bei Hostpoint funktioniert normalerweise Port 587 mit STARTTLS. "
            "Prüfe Host, Port und ob der Provider die Verbindung blockiert."
        )
        raise HTTPException(status_code=400, detail=f"{hint} (Details: {e})")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SMTP-Verbindung fehlgeschlagen: {e}")


def render_template(tpl: str, ctx: dict) -> str:
    """Safe .format_map – missing keys collapse to empty string."""
    class _Safe(dict):
        def __missing__(self, key):
            return ""
    try:
        return tpl.format_map(_Safe(ctx))
    except Exception:
        return tpl


def html_to_text(html: str) -> str:
    """Very small HTML → plain-text fallback (no external dep)."""
    import re
    txt = re.sub(r"<br\s*/?>", "\n", html or "", flags=re.IGNORECASE)
    txt = re.sub(r"</p>", "\n\n", txt, flags=re.IGNORECASE)
    txt = re.sub(r"</li>", "\n", txt, flags=re.IGNORECASE)
    txt = re.sub(r"<li[^>]*>", "• ", txt, flags=re.IGNORECASE)
    txt = re.sub(r"<[^>]+>", "", txt)
    # collapse whitespace
    txt = re.sub(r"\n{3,}", "\n\n", txt)
    return txt.strip()


def send_email(
    cfg: dict,
    *,
    to: str,
    subject: str,
    body_text: str,
    body_html: str = "",
    from_email: str,
    from_name: str = "",
    reply_to: Optional[str] = None,
    attachments: Optional[list] = None,
) -> None:
    """Compose + send a plain-or-HTML email.

    Transport is chosen automatically:
      - If `cfg["resend_api_key"]` is set → send via Resend HTTPS API
        (works from any IP, avoids Hostpoint/Abusix blacklists).
      - Otherwise fall back to direct SMTP via smtplib.

    `attachments` (optional) is a list of `{filename, content, content_type}`.
    """
    if cfg.get("resend_api_key"):
        _send_via_resend(
            cfg,
            to=to,
            subject=subject,
            body_text=body_text,
            body_html=body_html,
            from_email=from_email,
            from_name=from_name,
            reply_to=reply_to,
            attachments=attachments,
        )
        return

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{from_email}>" if from_name else from_email
    msg["To"] = to
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.set_content(body_text or html_to_text(body_html))
    if body_html:
        msg.add_alternative(body_html, subtype="html")
    for att in attachments or []:
        msg.add_attachment(
            att["content"],
            maintype=att.get("content_type", "application/octet-stream").split("/")[0],
            subtype=att.get("content_type", "application/octet-stream").split("/", 1)[-1],
            filename=att["filename"],
        )

    server = open_smtp(cfg)
    try:
        server.send_message(msg)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"E-Mail-Versand fehlgeschlagen: {e}")
    finally:
        try:
            server.quit()
        except Exception:
            pass


def _send_via_resend(
    cfg: dict,
    *,
    to: str,
    subject: str,
    body_text: str,
    body_html: str = "",
    from_email: str,
    from_name: str = "",
    reply_to: Optional[str] = None,
    attachments: Optional[list] = None,
) -> None:
    """Send via Resend's REST API. Errors surface as HTTP 400 so callers can
    display them the same way as smtplib errors."""
    try:
        import resend                            # local import — optional dep
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="Resend-SDK ist nicht installiert. Bitte `pip install resend` ausführen.",
        )

    resend.api_key = cfg["resend_api_key"]
    # Prefer explicit Resend-From, fall back to the SMTP-From so Nadine only
    # needs to set the API key + verified domain once.
    sender = cfg.get("resend_from_email") or from_email
    if not sender:
        raise HTTPException(
            status_code=400,
            detail="Resend-Absender-E-Mail fehlt (Fahrschul-Daten → E-Mail-Versand).",
        )
    params: dict = {
        "from": f"{from_name} <{sender}>" if from_name else sender,
        "to": [to],
        "subject": subject or "(kein Betreff)",
    }
    if body_html:
        params["html"] = body_html
    if body_text or not body_html:
        params["text"] = body_text or html_to_text(body_html)
    if reply_to:
        params["reply_to"] = reply_to
    if attachments:
        # Resend expects base64-encoded content
        import base64
        params["attachments"] = [
            {
                "filename": a["filename"],
                "content": base64.b64encode(a["content"]).decode("ascii"),
                "content_type": a.get("content_type", "application/octet-stream"),
            }
            for a in attachments
        ]

    try:
        resend.Emails.send(params)
    except Exception as e:                                   # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Resend-Versand fehlgeschlagen: {e}")
