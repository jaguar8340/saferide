"""PDF builders for the Buchhaltung views.

* build_monthly_pdf(data, settings)      – one-page journal for a month
* build_income_statement_pdf(data, s)    – yearly Erfolgsrechnung
"""
from __future__ import annotations

from datetime import datetime
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

MONTHS_DE = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember",
]

NAVY = colors.HexColor("#0f172a")
INK = colors.HexColor("#111827")
MUTED = colors.HexColor("#6b7280")
FAINT = colors.HexColor("#9ca3af")
LIGHT = colors.HexColor("#e5e7eb")
GREEN = colors.HexColor("#166534")
RED = colors.HexColor("#b91c1c")


def _money(n: float) -> str:
    return f"{n:,.2f}".replace(",", "’")


def _fmt_dmy(iso: str | None) -> str:
    if not iso:
        return "—"
    part = iso[:10]
    if len(part) != 10 or part[4] != "-" or part[7] != "-":
        return "—"
    return f"{part[8:10]}/{part[5:7]}/{part[0:4]}"


# ---------------------------------------------------------------------------
#  Shared header/footer
# ---------------------------------------------------------------------------
def _draw_header(c: canvas.Canvas, title: str, subtitle: str,
                 settings: dict, left: float, right: float, top: float) -> float:
    """Standard page header. Returns y after header."""
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 15)
    c.drawString(left, top, title)

    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9)
    c.drawString(left, top - 6 * mm, subtitle)

    business = settings.get("business_name") or ""
    if business:
        c.setFillColor(FAINT)
        c.setFont("Helvetica", 7.5)
        c.drawRightString(right, top, business)
        c.drawRightString(right, top - 6 * mm,
                          f"Erstellt {datetime.now().strftime('%d/%m/%Y · %H:%M')}")

    c.setStrokeColor(LIGHT)
    c.setLineWidth(0.4)
    c.line(left, top - 10 * mm, right, top - 10 * mm)
    return top - 14 * mm


def _draw_page_footer(c: canvas.Canvas, page_num: int, settings: dict,
                      left: float, right: float, bottom: float) -> None:
    c.setFillColor(FAINT)
    c.setFont("Helvetica", 6.5)
    c.drawString(left, bottom - 4 * mm,
                 settings.get("business_name") or "Fahrschule Safe Ride")
    c.drawRightString(right, bottom - 4 * mm, f"Seite {page_num}")


# ---------------------------------------------------------------------------
#  Monthly journal PDF
# ---------------------------------------------------------------------------
def build_monthly_pdf(data: dict, settings: dict) -> bytes:
    """One-page (or multi-page) journal for a single month.

    Rows are already sorted asc by date on the API side. Income rows are
    shown with a green amount, expenses with red. Cancelled invoices show
    as strike-through.
    """
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    page_w, page_h = A4
    left = 18 * mm
    right = page_w - 18 * mm
    top = page_h - 18 * mm
    bottom = 18 * mm

    year = data["year"]
    month = data["month"]
    totals = data["totals"]

    y = _draw_header(
        c,
        title=f"Monatsjournal {MONTHS_DE[month - 1]} {year}",
        subtitle="Einnahmen und Ausgaben chronologisch",
        settings=settings,
        left=left, right=right, top=top,
    )

    # KPI cards
    kpi_h = 22 * mm
    kpi_w = (right - left - 3 * 4 * mm) / 4
    kpis = [
        ("Einnahmen", f"CHF {_money(totals['revenue_paid'])}", GREEN),
        ("Offen",     f"CHF {_money(totals['revenue_open'])}", colors.HexColor("#c2410c")),
        ("Ausgaben",  f"CHF {_money(totals['expenses_total'])}", RED),
        ("Gewinn/Verlust", f"CHF {_money(totals['profit'])}",
         GREEN if totals["profit"] >= 0 else RED),
    ]
    for i, (label, value, tint) in enumerate(kpis):
        x = left + i * (kpi_w + 4 * mm)
        c.setStrokeColor(LIGHT)
        c.setFillColor(colors.white)
        c.roundRect(x, y - kpi_h, kpi_w, kpi_h, 3 * mm, fill=1, stroke=1)
        c.setFillColor(FAINT)
        c.setFont("Helvetica-Bold", 6.5)
        c.drawString(x + 3 * mm, y - 5 * mm, label.upper())
        c.setFillColor(tint)
        c.setFont("Helvetica-Bold", 12.5)
        c.drawString(x + 3 * mm, y - kpi_h + 5 * mm, value)
    y -= kpi_h + 6 * mm

    # Table header
    c.setFillColor(colors.HexColor("#f8fafc"))
    c.rect(left, y - 6 * mm, right - left, 6 * mm, fill=1, stroke=0)
    c.setFillColor(FAINT)
    c.setFont("Helvetica-Bold", 7.5)
    c.drawString(left + 2 * mm, y - 4 * mm, "DATUM")
    c.drawString(left + 20 * mm, y - 4 * mm, "TYP")
    c.drawString(left + 34 * mm, y - 4 * mm, "BEZEICHNUNG")
    c.drawString(left + 128 * mm, y - 4 * mm, "KONTO / STATUS")
    c.drawRightString(right - 2 * mm, y - 4 * mm, "BETRAG CHF")
    y -= 8 * mm

    # Rows
    c.setFont("Helvetica", 9)
    row_h = 6.5 * mm
    page_num = 1
    for row in data["rows"]:
        if y - row_h < bottom + 20 * mm:
            _draw_totals_footer(c, totals, left, right, y, settings, page_num)
            _draw_page_footer(c, page_num, settings, left, right, bottom)
            c.showPage()
            page_num += 1
            y = _draw_header(
                c,
                title=f"Monatsjournal {MONTHS_DE[month - 1]} {year} (Forts.)",
                subtitle="",
                settings=settings,
                left=left, right=right, top=top,
            )
            y -= 6 * mm  # extra spacing before continued rows

        c.setFillColor(INK)
        c.setFont("Helvetica", 9)
        c.drawString(left + 2 * mm, y - 4 * mm, _fmt_dmy(row["date"]))

        if row["kind"] == "income":
            c.setFillColor(GREEN)
            c.setFont("Helvetica-Bold", 8)
            c.drawString(left + 20 * mm, y - 4 * mm, "EINGANG")
            status = row.get("status") or ""
            status_label = {"paid": "Bezahlt", "open": "Offen", "cancelled": "Storniert"}.get(status, "")
            payment_label = {"bar": "Bar", "rechnung": "Rechnung",
                              "kreditkarte": "Kreditkarte", "twint": "Twint"}.get(
                row.get("payment_method"), "")
            c.setFillColor(MUTED)
            c.setFont("Helvetica", 8)
            c.drawString(left + 128 * mm, y - 4 * mm,
                          f"{status_label} · {payment_label}".strip(" ·"))
            amount_color = GREEN if status == "paid" else MUTED
            amount_prefix = "+" if status == "paid" else ""
        else:
            c.setFillColor(RED)
            c.setFont("Helvetica-Bold", 8)
            c.drawString(left + 20 * mm, y - 4 * mm, "AUSGABE")
            c.setFillColor(MUTED)
            c.setFont("Helvetica", 8)
            acc = f"{row.get('account_number','')} · {row.get('account_name','')}"
            c.drawString(left + 128 * mm, y - 4 * mm, acc[:36])
            amount_color = RED
            amount_prefix = "-"

        c.setFillColor(INK)
        c.setFont("Helvetica", 9)
        label = row.get("label") or ""
        # crude truncation to ~55 chars
        if c.stringWidth(label, "Helvetica", 9) > 88 * mm:
            while c.stringWidth(label + "…", "Helvetica", 9) > 88 * mm and len(label) > 5:
                label = label[:-1]
            label += "…"
        c.drawString(left + 34 * mm, y - 4 * mm, label)

        c.setFillColor(amount_color)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawRightString(right - 2 * mm, y - 4 * mm,
                          f"{amount_prefix}{_money(row['amount'])}")

        # Bottom rule
        c.setStrokeColor(colors.HexColor("#f1f5f9"))
        c.setLineWidth(0.3)
        c.line(left, y - row_h, right, y - row_h)
        y -= row_h

    if not data["rows"]:
        c.setFillColor(FAINT)
        c.setFont("Helvetica-Oblique", 10)
        c.drawString(left, y - 4 * mm, "Keine Einträge in diesem Monat.")

    _draw_totals_footer(c, totals, left, right, y, settings, page_num)
    _draw_page_footer(c, page_num, settings, left, right, bottom)
    c.showPage()
    c.save()
    return buf.getvalue()


def _draw_totals_footer(c: canvas.Canvas, totals: dict, left: float, right: float,
                        y: float, settings: dict, page_num: int) -> None:
    """Bold summary line at the bottom of every page."""
    band_h = 12 * mm
    c.setFillColor(NAVY)
    c.rect(left, y - band_h, right - left, band_h, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 8.5)
    y_text = y - band_h + 7 * mm
    c.drawString(left + 3 * mm, y_text, "TOTAL")
    parts = [
        (f"Einnahmen  CHF {_money(totals['revenue_paid'])}",  left + 25 * mm),
        (f"Ausgaben  CHF {_money(totals['expenses_total'])}", left + 85 * mm),
        (f"Gewinn/Verlust  CHF {_money(totals['profit'])}", left + 145 * mm),
    ]
    for text, x in parts:
        c.drawString(x, y_text, text)


# ---------------------------------------------------------------------------
#  Yearly income statement (Erfolgsrechnung) PDF
# ---------------------------------------------------------------------------
def build_income_statement_pdf(data: dict, settings: dict) -> bytes:
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    page_w, page_h = A4
    left = 18 * mm
    right = page_w - 18 * mm
    top = page_h - 18 * mm
    bottom = 18 * mm

    year = data["year"]
    totals = data["totals"]

    y = _draw_header(
        c,
        title=f"Erfolgsrechnung {year}",
        subtitle="Monatliche Übersicht · Erträge, Aufwände, Gewinn / Verlust",
        settings=settings,
        left=left, right=right, top=top,
    )

    # KPI cards
    kpi_h = 22 * mm
    kpi_w = (right - left - 2 * 4 * mm) / 3
    kpis = [
        ("Ertrag",     f"CHF {_money(totals['revenue'])}",  GREEN),
        ("Aufwand",    f"CHF {_money(totals['expenses'])}", RED),
        ("Gewinn/Verlust", f"CHF {_money(totals['profit'])}",
         GREEN if totals["profit"] >= 0 else RED),
    ]
    for i, (label, value, tint) in enumerate(kpis):
        x = left + i * (kpi_w + 4 * mm)
        c.setStrokeColor(LIGHT)
        c.setFillColor(colors.white)
        c.roundRect(x, y - kpi_h, kpi_w, kpi_h, 3 * mm, fill=1, stroke=1)
        c.setFillColor(FAINT)
        c.setFont("Helvetica-Bold", 6.5)
        c.drawString(x + 3 * mm, y - 5 * mm, label.upper())
        c.setFillColor(tint)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(x + 3 * mm, y - kpi_h + 5 * mm, value)
    y -= kpi_h + 8 * mm

    # Monthly table
    c.setFillColor(colors.HexColor("#f8fafc"))
    c.rect(left, y - 6 * mm, right - left, 6 * mm, fill=1, stroke=0)
    c.setFillColor(FAINT)
    c.setFont("Helvetica-Bold", 7.5)
    c.drawString(left + 2 * mm, y - 4 * mm, "MONAT")
    c.drawRightString(left + 90 * mm, y - 4 * mm, "ERTRAG")
    c.drawRightString(left + 130 * mm, y - 4 * mm, "AUFWAND")
    c.drawRightString(right - 2 * mm, y - 4 * mm, "GEWINN / VERLUST")
    y -= 8 * mm

    row_h = 6.8 * mm
    for m in data["months"]:
        highlight = m["revenue"] or m["expenses"]

        c.setFillColor(INK if highlight else FAINT)
        c.setFont("Helvetica-Bold" if highlight else "Helvetica", 9.5)
        c.drawString(left + 2 * mm, y - 4 * mm, MONTHS_DE[m["month"] - 1])

        c.setFillColor(GREEN if m["revenue"] else FAINT)
        c.setFont("Helvetica", 9.5)
        c.drawRightString(left + 90 * mm, y - 4 * mm,
                          _money(m["revenue"]) if highlight else "—")

        c.setFillColor(RED if m["expenses"] else FAINT)
        c.drawRightString(left + 130 * mm, y - 4 * mm,
                          _money(m["expenses"]) if highlight else "—")

        c.setFillColor(GREEN if m["profit"] >= 0 else RED)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawRightString(right - 2 * mm, y - 4 * mm,
                          _money(m["profit"]) if highlight else "—")

        c.setStrokeColor(colors.HexColor("#f1f5f9"))
        c.setLineWidth(0.3)
        c.line(left, y - row_h, right, y - row_h)
        y -= row_h

    # Yearly totals row (dark band)
    band_h = 10 * mm
    c.setFillColor(NAVY)
    c.rect(left, y - band_h, right - left, band_h, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 10)
    ty = y - band_h + 6.5 * mm
    c.drawString(left + 2 * mm, ty, f"TOTAL {year}")
    c.drawRightString(left + 90 * mm, ty, _money(totals["revenue"]))
    c.drawRightString(left + 130 * mm, ty, _money(totals["expenses"]))
    c.drawRightString(right - 2 * mm, ty, _money(totals["profit"]))
    y -= band_h + 6 * mm

    # Per-account breakdown
    if totals.get("by_account"):
        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(left, y, "Aufteilung nach Konto")
        y -= 6 * mm

        rows = sorted(totals["by_account"], key=lambda r: (r.get("number") or ""))
        for row in rows:
            if y - 5 * mm < bottom + 10 * mm:
                _draw_page_footer(c, 1, settings, left, right, bottom)
                c.showPage()
                y = _draw_header(
                    c, title=f"Erfolgsrechnung {year}",
                    subtitle="Aufteilung nach Konto (Fortsetzung)",
                    settings=settings, left=left, right=right, top=top,
                )
                y -= 4 * mm

            c.setFillColor(FAINT)
            c.setFont("Helvetica-Bold", 8.5)
            c.drawString(left, y, row.get("number", "") or "—")

            c.setFillColor(INK)
            c.setFont("Helvetica", 9.5)
            name = row.get("name") or "—"
            c.drawString(left + 14 * mm, y, name[:60])

            c.setFillColor(GREEN if row.get("type") == "ertrag" else RED)
            c.setFont("Helvetica-Bold", 9.5)
            c.drawRightString(right, y, _money(row.get("amount", 0)))

            y -= 5 * mm

    _draw_page_footer(c, 1, settings, left, right, bottom)
    c.showPage()
    c.save()
    return buf.getvalue()
