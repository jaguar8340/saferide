"""PDF generator for a single student invoice.

Follows a clean Swiss B2B layout (portrait A4):

  ┌──────────────────────────────────────────────────────────┐
  │  Fahrschule Safe Ride by Nadine Stäubli                  │   ← Absender block
  │  Schnabelsberg · 8836 Benau                              │
  │                                                          │
  │                                Schüler-Name              │   ← Empfänger block
  │                                Adresse                   │
  │                                                          │
  │       Rechnung RE-2026-0001                              │   ← Titel
  │       Fahrstunde vom 09/02/2026                          │
  │                                                          │
  │  Datum: 09/02/2026        Zahlbar bis: 09/03/2026        │   ← Metadaten
  │  Kundennummer: 00001      MwSt.-Nr.: —                   │
  │                                                          │
  │  Sehr geehrte(r) …                                       │
  │  Wir erlauben uns, folgendes in Rechnung zu stellen:     │
  │                                                          │
  │  Pos  Beschreibung             Menge   Einzelpreis  CHF  │   ← Positions-Tabelle
  │  1    Fahrstunde 45 min …      1       120.00       120  │
  │                                                          │
  │                            Total     CHF 120.00          │
  │                            MWST 0%   CHF 0.00            │
  │                            Total     CHF 120.00          │
  │                                                          │
  │  Zahlungsweise: Twint                                    │
  │  Freundliche Grüsse, Nadine Stäubli                      │
  │                                                          │
  │  ─── Fusszeile ───                                       │
  │  Bank: … · IBAN: … · MWST-Nr.: …                         │
  └──────────────────────────────────────────────────────────┘
"""
from __future__ import annotations

from datetime import datetime, timedelta
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

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


def _fmt_dmy(iso: str | None) -> str:
    if not iso:
        return "—"
    part = iso[:10]
    if len(part) != 10 or part[4] != "-" or part[7] != "-":
        return "—"
    return f"{part[8:10]}/{part[5:7]}/{part[0:4]}"


def _money(n: float) -> str:
    return f"{n:,.2f}".replace(",", "’")


def build_invoice_pdf(invoice: dict, student: dict, settings: dict) -> bytes:
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    page_w, page_h = A4

    left = 20 * mm
    right = page_w - 20 * mm
    top = page_h - 20 * mm
    bottom = 20 * mm

    NAVY = colors.HexColor("#0f172a")
    CORAL = colors.HexColor("#ff5a36")
    MUTED = colors.HexColor("#64748b")
    LIGHT = colors.HexColor("#e2e8f0")

    # ------------------------------------------------------------------
    #  Sender / letterhead
    # ------------------------------------------------------------------
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(left, top, settings.get("business_name") or "")

    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9)
    addr_line = " · ".join(
        p for p in [
            settings.get("address_line1", ""),
            settings.get("address_line2", ""),
            f"{settings.get('zip', '')} {settings.get('city', '')}".strip(),
        ] if p
    )
    c.drawString(left, top - 5.5 * mm, addr_line)

    contact_line = " · ".join(
        p for p in [
            f"Tel {settings.get('phone', '')}" if settings.get("phone") else "",
            settings.get("email") or "",
            settings.get("website") or "",
        ] if p
    )
    if contact_line:
        c.drawString(left, top - 9.5 * mm, contact_line)

    # ------------------------------------------------------------------
    #  Recipient block (upper right)
    # ------------------------------------------------------------------
    rcpt_y = top - 22 * mm
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 10.5)
    name = f"{student.get('first_name', '')} {student.get('last_name', '')}".strip()
    c.drawString(left, rcpt_y, name or "—")
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
    #  Title + metadata
    # ------------------------------------------------------------------
    title_y = rcpt_y - 32 * mm
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(left, title_y, f"Rechnung {invoice.get('number', '')}")

    subtitle = f"Fahrstunde vom {_fmt_dmy(invoice.get('lesson_date'))}"
    c.setFillColor(CORAL)
    c.setFont("Helvetica", 11)
    c.drawString(left, title_y - 6.5 * mm, subtitle)

    # Metadata table (2 columns)
    meta_y = title_y - 16 * mm

    def meta_pair(x: float, label: str, value: str) -> None:
        c.setFillColor(MUTED)
        c.setFont("Helvetica-Bold", 7)
        c.drawString(x, meta_y, label.upper())
        c.setFillColor(NAVY)
        c.setFont("Helvetica", 10)
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
    meta_pair(left, "Kundennummer", student.get("id", "")[:8].upper() if student.get("id") else "—")
    meta_pair(left + 60 * mm, "Zahlungsweise", PAYMENT_LABEL.get(invoice.get("payment_method"), "—"))
    meta_pair(left + 115 * mm, "Status", STATUS_LABEL.get(invoice.get("status"), "—"))

    # ------------------------------------------------------------------
    #  Salutation
    # ------------------------------------------------------------------
    salut_y = meta_y - 16 * mm
    c.setFillColor(NAVY)
    c.setFont("Helvetica", 10.5)
    c.drawString(left, salut_y, f"Hallo {student.get('first_name', '')},")
    c.drawString(left, salut_y - 5 * mm, "wir erlauben uns, Ihnen wie folgt in Rechnung zu stellen:")

    # ------------------------------------------------------------------
    #  Line items table (single row for now)
    # ------------------------------------------------------------------
    table_top = salut_y - 15 * mm
    col_pos = left
    col_desc = left + 12 * mm
    col_qty = left + 118 * mm
    col_price = left + 140 * mm
    col_total = right

    c.setFillColor(LIGHT)
    c.rect(left, table_top - 8 * mm, right - left, 8 * mm, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(col_pos + 1 * mm, table_top - 5 * mm, "POS.")
    c.drawString(col_desc, table_top - 5 * mm, "BESCHREIBUNG")
    c.drawRightString(col_qty, table_top - 5 * mm, "MENGE")
    c.drawRightString(col_price, table_top - 5 * mm, "EINZELPREIS")
    c.drawRightString(col_total, table_top - 5 * mm, "PREIS IN CHF")

    price = float(invoice.get("price_chf") or 0)
    duration = int(invoice.get("duration_min") or 0)
    lesson_date = _fmt_dmy(invoice.get("lesson_date"))
    description = f"Fahrstunde ({duration} min) am {lesson_date}"
    note = invoice.get("note") or ""

    row_y = table_top - 12 * mm
    c.setFillColor(NAVY)
    c.setFont("Helvetica", 10)
    c.drawString(col_pos + 1 * mm, row_y, "1")
    c.drawString(col_desc, row_y, description)
    if note:
        c.setFillColor(MUTED)
        c.setFont("Helvetica-Oblique", 9)
        c.drawString(col_desc, row_y - 4.5 * mm, note[:110])
        c.setFillColor(NAVY)
        c.setFont("Helvetica", 10)
    c.drawRightString(col_qty, row_y, "1")
    c.drawRightString(col_price, row_y, _money(price))
    c.drawRightString(col_total, row_y, _money(price))

    # Row separator
    c.setStrokeColor(LIGHT)
    c.setLineWidth(0.4)
    row_bottom = row_y - (10 * mm if note else 5 * mm)
    c.line(left, row_bottom, right, row_bottom)

    # ------------------------------------------------------------------
    #  Totals block (right-aligned)
    # ------------------------------------------------------------------
    total_y = row_bottom - 8 * mm
    mwst_rate = float(invoice.get("mwst_rate") or 0.0)
    subtotal = price
    mwst_amount = round(subtotal * mwst_rate / 100.0, 2)
    total_incl = subtotal + mwst_amount

    def total_row(y: float, label: str, value: str, bold: bool = False) -> None:
        c.setFont("Helvetica-Bold" if bold else "Helvetica", 10.5 if bold else 10)
        c.setFillColor(NAVY if bold else MUTED)
        c.drawRightString(col_price, y, label)
        c.setFillColor(NAVY)
        c.drawRightString(col_total, y, value)

    total_row(total_y, "Zwischentotal", f"CHF {_money(subtotal)}")
    total_row(total_y - 5 * mm, f"MWST {mwst_rate:.1f} %", f"CHF {_money(mwst_amount)}")

    # Bold total with underline
    c.setStrokeColor(NAVY)
    c.setLineWidth(0.6)
    c.line(col_price - 5 * mm, total_y - 8 * mm, col_total, total_y - 8 * mm)
    total_row(total_y - 12 * mm, "Total inkl. MWST", f"CHF {_money(total_incl)}", bold=True)

    # ------------------------------------------------------------------
    #  Payment / closing paragraph
    # ------------------------------------------------------------------
    close_y = total_y - 24 * mm
    c.setFillColor(NAVY)
    c.setFont("Helvetica", 10)
    payment_line = f"Zahlungsweise: {PAYMENT_LABEL.get(invoice.get('payment_method'), '—')}"
    c.drawString(left, close_y, payment_line)

    footer_note = settings.get("invoice_footer_note") or ""
    if footer_note:
        c.setFillColor(MUTED)
        c.setFont("Helvetica-Oblique", 9.5)
        c.drawString(left, close_y - 6 * mm, footer_note)

    c.setFillColor(NAVY)
    c.setFont("Helvetica", 10)
    c.drawString(left, close_y - 14 * mm, "Freundliche Grüsse")
    c.setFont("Helvetica-Bold", 10.5)
    c.drawString(left, close_y - 19 * mm, settings.get("business_name") or "")

    # ------------------------------------------------------------------
    #  Footer bank details
    # ------------------------------------------------------------------
    c.setStrokeColor(LIGHT)
    c.setLineWidth(0.4)
    c.line(left, bottom + 20 * mm, right, bottom + 20 * mm)

    c.setFillColor(MUTED)
    c.setFont("Helvetica", 7.5)

    footer_rows = [
        [("Bank", settings.get("bank")), ("Kontoinhaber", settings.get("account_holder") or settings.get("business_name")), ("BIC", settings.get("bic"))],
        [("IBAN", settings.get("iban")), ("MWST-Nr.", settings.get("mwst_number") or "—"), ("Website", settings.get("website"))],
    ]
    for i, row in enumerate(footer_rows):
        y = bottom + 15 * mm - i * 6 * mm
        for j, (label, value) in enumerate(row):
            x = left + j * ((right - left) / 3)
            c.setFillColor(MUTED)
            c.setFont("Helvetica-Bold", 6.5)
            c.drawString(x, y, label.upper())
            c.setFillColor(NAVY)
            c.setFont("Helvetica", 8.5)
            c.drawString(x, y - 3.5 * mm, value or "—")

    c.showPage()
    c.save()
    data = buf.getvalue()
    buf.close()
    return data
