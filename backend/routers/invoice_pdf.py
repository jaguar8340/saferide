"""PDF generator for a single student invoice.

Design goals (Iteration 32):
  * Clean, calm Swiss B2B layout in portrait A4
  * NO colored subtitles (calm greys + navy, no coral text)
  * Smaller, better-balanced typography — Rechnung + Nr. 16 pt / Firma 13 pt
  * Bigger breathing room between Absender-Kopf and Empfänger-Block
  * Firmen-Logo top-left (from BusinessSettings.logo_url)
  * Optional Swiss QR-Bill at the bottom (only when a valid CH-IBAN is
    stored in the settings — otherwise a plain footer is drawn instead).
"""
from __future__ import annotations

import io
import os
import re
from datetime import datetime, timedelta
from io import BytesIO

import requests
from reportlab.graphics import renderPDF
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from svglib.svglib import svg2rlg

PAYMENT_LABEL = {
    "bar": "Bar",
    "rechnung": "Rechnung (Bankeinzahlung)",
    "kreditkarte": "Kreditkarte",
    "twint": "Twint",
}
STATUS_LABEL = {
    "open": "Offen",
    "paid": "Bezahlt",
    "cancelled": "Storniert",
}

# Colour palette — kept intentionally quiet.
NAVY = colors.HexColor("#0f172a")
INK = colors.HexColor("#111827")
MUTED = colors.HexColor("#6b7280")
LIGHT = colors.HexColor("#e5e7eb")
FAINT = colors.HexColor("#9ca3af")


def _fmt_dmy(iso: str | None) -> str:
    if not iso:
        return "—"
    part = iso[:10]
    if len(part) != 10 or part[4] != "-" or part[7] != "-":
        return "—"
    return f"{part[8:10]}/{part[5:7]}/{part[0:4]}"


def _money(n: float) -> str:
    return f"{n:,.2f}".replace(",", "’")


def _iban_looks_valid_ch(iban: str) -> bool:
    """Very lenient sanity check — QR-Bill lib will do the strict check.

    Accepts strings starting with 'CH' or 'LI' after removing spaces and
    having 21 alnum chars total.
    """
    if not iban:
        return False
    cleaned = iban.replace(" ", "").upper()
    if not re.match(r"^(CH|LI)\d{2}[A-Z0-9]{17}$", cleaned):
        return False
    return True


def _load_logo(settings: dict) -> ImageReader | None:
    """Return a ReportLab ImageReader for the current logo, or None."""
    url = (settings.get("logo_url") or "").strip()
    if not url:
        return None

    # Local bundled default logo — read straight from disk.
    if url == "/api/assets/logo/default":
        default_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "assets",
            "saferide_logo.jpg",
        )
        if os.path.exists(default_path):
            return ImageReader(default_path)
        return None

    # /api/files/... paths → fetch via the local backend (fast, in-cluster)
    if url.startswith("/api/"):
        internal = f"http://127.0.0.1:8001{url}"
        try:
            resp = requests.get(internal, timeout=10)
            if resp.status_code == 200:
                return ImageReader(BytesIO(resp.content))
        except Exception:
            return None
        return None

    # Absolute URL — best-effort fetch (image_url points at a CDN)
    try:
        resp = requests.get(url, timeout=15)
        if resp.status_code == 200:
            return ImageReader(BytesIO(resp.content))
    except Exception:
        return None
    return None


def _draw_qr_bill(
    c: canvas.Canvas,
    invoice: dict,
    student: dict,
    settings: dict,
    total: float,
    page_w: float,
    page_h: float,
) -> bool:
    """Render a Swiss QR-bill on its own dedicated page.

    Returns True when a QR-bill was drawn on a new page, False when the
    IBAN is missing/invalid — the caller can then fall back to the plain
    bank footer on the current page.
    """
    iban = (settings.get("iban") or "").replace(" ", "").upper()
    if not _iban_looks_valid_ch(iban):
        return False

    try:
        from qrbill import QRBill        # deferred import — heavy lib

        # Build creditor block
        creditor = {
            "name": settings.get("business_name") or "Fahrschule Safe Ride",
            "street": settings.get("address_line1") or "",
            "pcode": settings.get("zip") or "",
            "city": settings.get("city") or "",
            "country": "CH",
        }
        debtor = None
        if student.get("first_name") or student.get("last_name"):
            debtor = {
                "name": f"{student.get('first_name','')} {student.get('last_name','')}".strip(),
                "street": student.get("street") or "",
                "pcode": student.get("zip") or "",
                "city": student.get("city") or "",
                "country": "CH",
            }

        bill = QRBill(
            account=iban,
            creditor=creditor,
            amount=f"{total:.2f}" if total > 0 else None,
            debtor=debtor,
            additional_information=(
                f"Rechnung {invoice.get('number', '')} · "
                f"Fahrstunde {_fmt_dmy(invoice.get('lesson_date'))}"
            )[:140],
            language="de",
            top_line=True,       # printed perforation line on top of slip
        )
        # Render to SVG in-memory. svg2rlg refuses StringIO with an
        # <?xml encoding=…?> declaration – so encode to bytes and feed
        # a BytesIO instead.
        svg_str = io.StringIO()
        bill.as_svg(svg_str)
        svg_bytes = BytesIO(svg_str.getvalue().encode("utf-8"))
        drawing = svg2rlg(svg_bytes)
        if drawing is None:
            raise RuntimeError("svg2rlg returned None (unable to parse QR-Bill SVG)")

        # New page dedicated to the QR-Bill payment slip.
        c.showPage()

        # Small header explaining what this page is (before the payment slip).
        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(20 * mm, page_h - 20 * mm, "Zahlteil (Swiss QR-Rechnung)")
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 9)
        c.drawString(
            20 * mm,
            page_h - 25 * mm,
            "Diese Seite kann für die Zahlung per Bank-App oder Einzahlung am Postschalter gescannt werden.",
        )

        # QR-bill payment slip is 210 × 105 mm (A4 landscape half). Scale so
        # width matches the page width.
        target_w = page_w
        scale = target_w / drawing.width
        drawing.scale(scale, scale)
        # Draw the slip at the very bottom of the page (canonical position).
        renderPDF.draw(drawing, c, 0, 0)

        return True
    except Exception as e:
        # QR-Bill generation failed (invalid data, missing fields, etc.).
        # Silent fallback — caller draws the plain bank footer instead.
        print(f"[invoice_pdf] QR-Bill skipped: {e}")
        return False


def build_invoice_pdf(invoice: dict, student: dict, settings: dict) -> bytes:
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    page_w, page_h = A4

    left = 20 * mm
    right = page_w - 20 * mm
    top = page_h - 22 * mm
    bottom = 18 * mm

    # ------------------------------------------------------------------
    #  Letterhead — Logo (left) + business identity (right of logo)
    # ------------------------------------------------------------------
    logo = _load_logo(settings)
    logo_max_h = 20 * mm
    logo_max_w = 50 * mm
    text_x = left  # starting x for the sender text block
    if logo is not None:
        try:
            iw, ih = logo.getSize()
            scale = min(logo_max_w / iw, logo_max_h / ih)
            draw_w = iw * scale
            draw_h = ih * scale
            c.drawImage(
                logo,
                left,
                top - draw_h + 2 * mm,
                width=draw_w,
                height=draw_h,
                mask="auto",
                preserveAspectRatio=True,
            )
            text_x = left + draw_w + 6 * mm
        except Exception:
            pass

    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(text_x, top - 3 * mm, settings.get("business_name") or "")

    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8.5)
    addr_parts = [
        settings.get("address_line1", ""),
        settings.get("address_line2", ""),
        f"{settings.get('zip', '')} {settings.get('city', '')}".strip(),
    ]
    addr_line = " · ".join(p for p in addr_parts if p)
    c.drawString(text_x, top - 8 * mm, addr_line)

    contact_parts = [
        f"Tel {settings.get('phone', '')}" if settings.get("phone") else "",
        settings.get("email") or "",
        settings.get("website") or "",
    ]
    contact_line = " · ".join(p for p in contact_parts if p)
    if contact_line:
        c.drawString(text_x, top - 12 * mm, contact_line)

    # ------------------------------------------------------------------
    #  Recipient block — sits with generous breathing room below sender
    # ------------------------------------------------------------------
    rcpt_y = top - 40 * mm         # was 22 mm — bigger gap now
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 10.5)
    name = f"{student.get('first_name', '')} {student.get('last_name', '')}".strip()
    c.drawString(left, rcpt_y, name or "—")

    c.setFillColor(INK)
    c.setFont("Helvetica", 10)
    line_y = rcpt_y - 4.5 * mm
    for line in [
        student.get("street") or "",
        f"{student.get('zip', '')} {student.get('city', '')}".strip(),
        student.get("country") or "",
    ]:
        if line:
            c.drawString(left, line_y, line)
            line_y -= 4.2 * mm

    # ------------------------------------------------------------------
    #  Title + soft subtitle (no coral colour anymore)
    # ------------------------------------------------------------------
    title_y = rcpt_y - 30 * mm
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 16)                # was 22
    c.drawString(left, title_y, f"Rechnung {invoice.get('number', '')}")

    c.setFillColor(MUTED)                           # muted grey, no red
    c.setFont("Helvetica", 10)
    subtitle = f"Fahrstunde vom {_fmt_dmy(invoice.get('lesson_date'))}"
    c.drawString(left, title_y - 5.5 * mm, subtitle)

    # Metadata table (2 rows × 3 cols)
    meta_y = title_y - 15 * mm

    def meta_pair(x: float, label: str, value: str) -> None:
        c.setFillColor(FAINT)
        c.setFont("Helvetica-Bold", 6.5)
        c.drawString(x, meta_y, label.upper())
        c.setFillColor(INK)
        c.setFont("Helvetica", 9.5)
        c.drawString(x, meta_y - 4.2 * mm, value or "—")

    invoice_date = _fmt_dmy(invoice.get("date") or datetime.utcnow().date().isoformat())
    try:
        due_iso = (datetime.fromisoformat(invoice.get("date", "")) + timedelta(days=30)).date().isoformat()
    except Exception:
        due_iso = ""
    due_date = _fmt_dmy(due_iso) if due_iso else "—"

    meta_pair(left, "Datum", invoice_date)
    meta_pair(left + 60 * mm, "Zahlbar bis", due_date)
    meta_pair(left + 115 * mm, "MwSt.-Nr.", settings.get("mwst_number") or "nicht MWST-pflichtig")

    meta_y -= 12 * mm
    meta_pair(left, "Kundennummer", (student.get("id") or "")[:8].upper() or "—")
    meta_pair(left + 60 * mm, "Zahlungsweise", PAYMENT_LABEL.get(invoice.get("payment_method"), "—"))
    meta_pair(left + 115 * mm, "Status", STATUS_LABEL.get(invoice.get("status"), "—"))

    # ------------------------------------------------------------------
    #  Salutation
    # ------------------------------------------------------------------
    salut_y = meta_y - 15 * mm
    c.setFillColor(INK)
    c.setFont("Helvetica", 10)
    c.drawString(left, salut_y, f"Hallo {student.get('first_name', '')},")
    c.drawString(left, salut_y - 5 * mm, "wir erlauben uns, Ihnen wie folgt in Rechnung zu stellen:")

    # ------------------------------------------------------------------
    #  Positions table (single row for now)
    # ------------------------------------------------------------------
    table_top = salut_y - 12 * mm
    col_pos = left
    col_desc = left + 12 * mm
    col_qty = left + 118 * mm
    col_price = left + 140 * mm
    col_total = right

    c.setFillColor(colors.HexColor("#f8fafc"))
    c.rect(left, table_top - 7 * mm, right - left, 7 * mm, fill=1, stroke=0)
    c.setFillColor(FAINT)
    c.setFont("Helvetica-Bold", 7.5)
    c.drawString(col_pos + 1 * mm, table_top - 4.5 * mm, "POS.")
    c.drawString(col_desc, table_top - 4.5 * mm, "BESCHREIBUNG")
    c.drawRightString(col_qty, table_top - 4.5 * mm, "MENGE")
    c.drawRightString(col_price, table_top - 4.5 * mm, "EINZELPREIS")
    c.drawRightString(col_total, table_top - 4.5 * mm, "PREIS IN CHF")

    price = float(invoice.get("price_chf") or 0)
    duration = int(invoice.get("duration_min") or 0)
    lesson_date = _fmt_dmy(invoice.get("lesson_date"))
    description = f"Fahrstunde ({duration} min) am {lesson_date}"
    note = invoice.get("note") or ""

    row_y = table_top - 11 * mm
    c.setFillColor(INK)
    c.setFont("Helvetica", 10)
    c.drawString(col_pos + 1 * mm, row_y, "1")
    c.drawString(col_desc, row_y, description)
    if note:
        c.setFillColor(MUTED)
        c.setFont("Helvetica-Oblique", 8.5)
        c.drawString(col_desc, row_y - 4 * mm, note[:110])
        c.setFillColor(INK)
        c.setFont("Helvetica", 10)
    c.drawRightString(col_qty, row_y, "1")
    c.drawRightString(col_price, row_y, _money(price))
    c.drawRightString(col_total, row_y, _money(price))

    # Row separator
    c.setStrokeColor(LIGHT)
    c.setLineWidth(0.4)
    row_bottom = row_y - (9 * mm if note else 4 * mm)
    c.line(left, row_bottom, right, row_bottom)

    # ------------------------------------------------------------------
    #  Totals block (right-aligned)
    # ------------------------------------------------------------------
    total_y = row_bottom - 7 * mm
    mwst_rate = float(invoice.get("mwst_rate") or 0.0)
    subtotal = price
    mwst_amount = round(subtotal * mwst_rate / 100.0, 2)
    total_incl = subtotal + mwst_amount

    def total_row(y: float, label: str, value: str, bold: bool = False) -> None:
        c.setFont("Helvetica-Bold" if bold else "Helvetica", 10.5 if bold else 10)
        c.setFillColor(MUTED if not bold else NAVY)
        c.drawRightString(col_price, y, label)
        c.setFillColor(INK)
        c.drawRightString(col_total, y, value)

    total_row(total_y, "Zwischentotal", f"CHF {_money(subtotal)}")
    total_row(total_y - 5 * mm, f"MWST {mwst_rate:.1f} %", f"CHF {_money(mwst_amount)}")

    # Bold total with underline
    c.setStrokeColor(NAVY)
    c.setLineWidth(0.6)
    c.line(col_price - 5 * mm, total_y - 8 * mm, col_total, total_y - 8 * mm)
    total_row(total_y - 12 * mm, "Total inkl. MWST", f"CHF {_money(total_incl)}", bold=True)

    # ------------------------------------------------------------------
    #  Closing paragraph
    # ------------------------------------------------------------------
    close_y = total_y - 24 * mm
    c.setFillColor(INK)
    c.setFont("Helvetica", 10)
    payment_line = f"Zahlungsweise: {PAYMENT_LABEL.get(invoice.get('payment_method'), '—')}"
    c.drawString(left, close_y, payment_line)

    footer_note = settings.get("invoice_footer_note") or ""
    if footer_note:
        c.setFillColor(MUTED)
        c.setFont("Helvetica-Oblique", 9.5)
        c.drawString(left, close_y - 6 * mm, footer_note)

    c.setFillColor(INK)
    c.setFont("Helvetica", 10)
    c.drawString(left, close_y - 14 * mm, "Freundliche Grüsse")
    c.setFont("Helvetica-Bold", 10.5)
    c.drawString(left, close_y - 19 * mm, settings.get("business_name") or "")

    # ------------------------------------------------------------------
    #  Bottom of page 1: plain bank details footer (always shown).
    #  If a valid CH-IBAN is configured, a Swiss QR-Bill is then appended
    #  on a dedicated second page below.
    # ------------------------------------------------------------------
    c.setStrokeColor(LIGHT)
    c.setLineWidth(0.4)
    c.line(left, bottom + 20 * mm, right, bottom + 20 * mm)

    footer_rows = [
        [("Bank", settings.get("bank")),
         ("Kontoinhaber", settings.get("account_holder") or settings.get("business_name")),
         ("BIC", settings.get("bic"))],
        [("IBAN", settings.get("iban")),
         ("MWST-Nr.", settings.get("mwst_number") or "—"),
         ("Website", settings.get("website"))],
    ]
    for i, row in enumerate(footer_rows):
        y = bottom + 15 * mm - i * 6 * mm
        for j, (label, value) in enumerate(row):
            x = left + j * ((right - left) / 3)
            c.setFillColor(FAINT)
            c.setFont("Helvetica-Bold", 6.5)
            c.drawString(x, y, label.upper())
            c.setFillColor(INK)
            c.setFont("Helvetica", 8.5)
            c.drawString(x, y - 3.5 * mm, value or "—")

    # Swiss QR-Bill – appended on a separate page 2 (only when IBAN valid).
    # _draw_qr_bill() itself calls c.showPage() before drawing the slip, so
    # the QR-Bill lives on its own page while the plain footer above stays
    # on page 1. We do NOT call c.showPage() again here to avoid an empty
    # trailing page.
    _draw_qr_bill(
        c, invoice, student, settings, total=total_incl,
        page_w=page_w, page_h=page_h,
    )

    c.save()
    data = buf.getvalue()
    buf.close()
    return data
