"""PDF export for the Fahrkontrolle (elektronisches Schülerblatt).

Generates a professional A4 landscape PDF with:

  Page 1 – Matrix
    * Header with student master data (name, category, instructor, dates)
    * Full evaluation matrix (categories × subitems × lessons) in one
      compact grid, colour-coded ratings, comment markers.
    * Routes summary per lesson.

  Page 2+ – Ausbildungsjournal
    * Chronological list of every rating cell with a comment, sorted by
      lesson number then subitem order.
    * Automatically flows across additional A4 pages if it doesn't fit.

The endpoint is admin-authenticated and streams the file back as
`application/pdf` with a friendly filename.
"""
from __future__ import annotations

from datetime import datetime
from io import BytesIO
from typing import Any

import qrcode
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

from core.db import db
from core.security import get_current_admin

router = APIRouter(prefix="/students", tags=["fahrkontrolle-pdf"])


# --------------------------------------------------------------------
#  Rating colour map – mirrors the frontend RatingPopup.
# --------------------------------------------------------------------
RATING_STYLES: dict[str, dict[str, Any]] = {
    "1": {"bg": colors.HexColor("#dc2626"), "fg": colors.white,           "label": "erklärt"},
    "2": {"bg": colors.HexColor("#f97316"), "fg": colors.white,           "label": "geübt"},
    "3": {"bg": colors.HexColor("#84cc16"), "fg": colors.HexColor("#0f172a"), "label": "selbständig"},
    "4": {"bg": colors.HexColor("#166534"), "fg": colors.white,           "label": "sicher"},
    "X": {"bg": colors.HexColor("#94a3b8"), "fg": colors.HexColor("#0f172a"), "label": "nochmals üben"},
}


# --------------------------------------------------------------------
#  Helpers
# --------------------------------------------------------------------
def _fmt_dmy(iso: str | None) -> str:
    """YYYY-MM-DD → DD/MM/YYYY (returns '—' for invalid input)."""
    if not iso:
        return "—"
    part = iso[:10]
    if len(part) != 10 or part[4] != "-" or part[7] != "-":
        return "—"
    return f"{part[8:10]}/{part[5:7]}/{part[0:4]}"


def _make_qr(text: str) -> ImageReader | None:
    """Render a QR code PNG in-memory for embedding in the PDF."""
    if not text:
        return None
    try:
        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=1,
        )
        qr.add_data(text)
        qr.make(fit=True)
        img = qr.make_image(fill_color="#0f172a", back_color="#ffffff")
        buf = BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        return ImageReader(buf)
    except Exception:
        return None


# --------------------------------------------------------------------
#  Main endpoint
# --------------------------------------------------------------------
@router.get("/{student_id}/fahrkontrolle.pdf")
async def export_fahrkontrolle_pdf(
    student_id: str,
    back_url: str | None = None,
    admin=Depends(get_current_admin),
):
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Schüler nicht gefunden")

    categories = await db.fk_categories.find({}, {"_id": 0}).sort("order", 1).to_list(200)
    subitems = await db.fk_subitems.find({}, {"_id": 0}).sort("order", 1).to_list(2000)
    routes = await db.fk_routes.find({}, {"_id": 0}).sort("order", 1).to_list(500)
    lessons = (
        await db.student_lessons.find({"student_id": student_id}, {"_id": 0})
        .sort("lesson_number", 1)
        .to_list(500)
    )
    assessments = await db.student_assessments.find(
        {"student_id": student_id}, {"_id": 0}
    ).to_list(50000)

    # Build lookup maps
    subs_by_cat: dict[str, list[dict]] = {}
    for s in subitems:
        subs_by_cat.setdefault(s["category_id"], []).append(s)
    for arr in subs_by_cat.values():
        arr.sort(key=lambda x: x.get("order", 0))

    routes_by_id = {r["id"]: r for r in routes}
    subs_by_id = {s["id"]: s for s in subitems}
    cats_by_id = {c["id"]: c for c in categories}
    assess_by_key: dict[tuple[str, str], dict] = {
        (a["subitem_id"], a["lesson_id"]): a for a in assessments
    }

    # --------------------------------------------------------------
    #  PDF setup
    # --------------------------------------------------------------
    buf = BytesIO()
    page_w, page_h = landscape(A4)  # 297 × 210 mm
    c = canvas.Canvas(buf, pagesize=landscape(A4))

    left = 10 * mm
    right = page_w - 10 * mm
    top = page_h - 10 * mm
    bottom = 10 * mm

    # --------------------------------------------------------------
    #  Prepare optional QR-code (page 1 footer only). Frontend passes
    #  a `back_url` query param pointing at the student's admin
    #  detail page so instructors can scan the print & jump back.
    # --------------------------------------------------------------
    qr_target = (back_url or "").strip()
    qr_image = _make_qr(qr_target) if qr_target else None

    # --------------------------------------------------------------
    #  PAGE 1 – Matrix
    # --------------------------------------------------------------
    _draw_header(c, student, left, right, top)

    # Reserve top area for header (18mm), then start matrix
    matrix_top = top - 20 * mm
    matrix_bottom = bottom + 6 * mm
    _draw_matrix(
        c,
        student=student,
        categories=categories,
        subs_by_cat=subs_by_cat,
        lessons=lessons,
        assess_by_key=assess_by_key,
        routes_by_id=routes_by_id,
        left=left,
        right=right,
        top=matrix_top,
        bottom=matrix_bottom + (16 * mm if qr_image is not None else 0),
    )

    # Footer (with QR bottom-right on page 1 only)
    _draw_footer(
        c, student, left, right, bottom, page_num=1,
        qr=qr_image,
        qr_caption="Scannen für digitalen Datensatz" if qr_image else None,
    )

    # --------------------------------------------------------------
    #  PAGE 2 – Ausbildungsjournal + Fortschrittsdiagramm
    #  Always emitted, even if there are zero comments — the diagram
    #  alone is worth the second page.
    # --------------------------------------------------------------
    journal_entries: list[dict] = []
    for lesson in lessons:
        lesson_comments: list[dict] = []
        for a in assessments:
            if a.get("lesson_id") != lesson["id"]:
                continue
            if not a.get("comment"):
                continue
            sub = subs_by_id.get(a["subitem_id"])
            if not sub:
                continue
            cat = cats_by_id.get(sub["category_id"])
            lesson_comments.append(
                {
                    "cat_title": (cat or {}).get("title_de", ""),
                    "cat_order": (cat or {}).get("order", 999),
                    "sub_title": sub.get("title_de", ""),
                    "sub_order": sub.get("order", 999),
                    "value": a.get("value", ""),
                    "comment": a.get("comment", ""),
                }
            )
        lesson_comments.sort(key=lambda e: (e["cat_order"], e["sub_order"]))
        if lesson_comments:
            journal_entries.append({"lesson": lesson, "items": lesson_comments})

    # Compute per-category progress for the chart (always).
    chart_data = _compute_category_progress(
        categories, subs_by_cat, lessons, assess_by_key
    )

    if lessons:  # only show page 2 when there is data to summarize
        c.showPage()
        _draw_journal(
            c, student, journal_entries, page_w, page_h,
            left, right, top, bottom, chart_data,
        )

    c.save()
    pdf_bytes = buf.getvalue()
    buf.close()

    safe = (
        f"{student.get('last_name', '') or ''}_{student.get('first_name', '') or ''}"
        .strip("_")
        .replace(" ", "_")
    ) or "schueler"
    filename = f"Fahrkontrolle_{safe}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ====================================================================
#  Drawing helpers
# ====================================================================
def _draw_header(c: canvas.Canvas, student: dict, left: float, right: float, top: float) -> None:
    """Compact 3-column student data block at the top of page 1."""
    c.setFillColor(colors.HexColor("#0f172a"))
    c.setFont("Helvetica-Bold", 14)
    c.drawString(left, top, "Fahrkontrolle · Elektronisches Schülerblatt")

    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#64748b"))
    generated = datetime.now().strftime("%d/%m/%Y · %H:%M")
    c.drawRightString(right, top, f"Erstellt {generated}")

    # Divider
    c.setStrokeColor(colors.HexColor("#e2e8f0"))
    c.setLineWidth(0.4)
    c.line(left, top - 2.5 * mm, right, top - 2.5 * mm)

    # Student info row (3 columns)
    col_w = (right - left) / 3
    y = top - 6 * mm

    full_name = f"{student.get('first_name', '')} {student.get('last_name', '')}".strip()

    # Column 1: Name + Kategorie (stacked)
    c.setFillColor(colors.HexColor("#94a3b8"))
    c.setFont("Helvetica-Bold", 6.5)
    c.drawString(left, y, "SCHÜLER:IN")
    c.drawString(left, y - 7.5 * mm, "KATEGORIE")

    c.setFillColor(colors.HexColor("#0f172a"))
    c.setFont("Helvetica", 9)
    c.drawString(left, y - 3.5 * mm, full_name or "—")
    c.drawString(left, y - 11 * mm, student.get("category") or "—")

    # Column 2: Fahrlehrer + Wohnort
    x2 = left + col_w
    c.setFillColor(colors.HexColor("#94a3b8"))
    c.setFont("Helvetica-Bold", 6.5)
    c.drawString(x2, y, "FAHRLEHRER:IN")
    c.drawString(x2, y - 7.5 * mm, "WOHNORT")
    c.setFillColor(colors.HexColor("#0f172a"))
    c.setFont("Helvetica", 9)
    c.drawString(x2, y - 3.5 * mm, student.get("instructor") or "—")
    address = " ".join(
        p for p in [student.get("street", ""),
                    f"{student.get('zip', '')} {student.get('city', '')}".strip()]
        if p
    )
    c.drawString(x2, y - 11 * mm, address or "—")

    # Column 3: Termine
    x3 = left + 2 * col_w
    c.setFillColor(colors.HexColor("#94a3b8"))
    c.setFont("Helvetica-Bold", 6.5)
    c.drawString(x3, y, "AUSBILDUNG SEIT")
    c.drawString(x3, y - 7.5 * mm, "VORPRÜFUNG / PRÜFUNG")
    c.setFillColor(colors.HexColor("#0f172a"))
    c.setFont("Helvetica", 9)
    c.drawString(x3, y - 3.5 * mm, _fmt_dmy(student.get("start_date")))
    exams = f"{_fmt_dmy(student.get('prep_exam_date'))}   ·   {_fmt_dmy(student.get('exam_date'))}"
    c.drawString(x3, y - 11 * mm, exams)


def _draw_matrix(
    c: canvas.Canvas,
    *,
    student: dict,
    categories: list[dict],
    subs_by_cat: dict[str, list[dict]],
    lessons: list[dict],
    assess_by_key: dict[tuple[str, str], dict],
    routes_by_id: dict[str, dict],
    left: float,
    right: float,
    top: float,
    bottom: float,
) -> None:
    """Render the full matrix on ONE page.

    The layout is table-like:
      • First column: numbered subitem title (widest column)
      • One column per lesson: `L{n}` header + coloured value cell.

    Fonts and paddings are chosen so 6 categories × ~35 subitems × up to
    ~14 lessons fit on a single A4 landscape sheet. If the student has
    more lessons we shrink further so it still fits.
    """
    n_lessons = len(lessons)
    if n_lessons == 0:
        c.setFillColor(colors.HexColor("#64748b"))
        c.setFont("Helvetica-Oblique", 10)
        c.drawString(left, top, "Noch keine Lektion erfasst.")
        return

    # Fixed left column width, remaining shared equally between lessons.
    label_col_w = 68 * mm
    grid_w = right - left - label_col_w
    col_w = max(6 * mm, grid_w / n_lessons)
    row_h = 5.6 * mm  # matrix row height
    header_h = 8 * mm
    # Category header rows are ALWAYS taller than data rows so the white
    # title text on the dark navy band stays legible even when the matrix
    # is squeezed to fit lots of lessons.
    cat_row_h = 5.5 * mm

    # Count total rows we need (category header + subitems) + routes
    n_categories = len(categories)
    n_subitems = sum(len(subs_by_cat.get(c["id"], [])) for c in categories)
    routes_row_h = 5.6 * mm

    available_h = (
        top - bottom
        - header_h                   # column header
        - n_categories * cat_row_h   # dark category bands (fixed)
        - routes_row_h               # routes summary row
        - 3 * mm                     # safety margin
    )
    max_data_row_h = available_h / max(n_subitems, 1)
    row_h = min(row_h, max_data_row_h)
    if row_h < 2.7 * mm:
        row_h = 2.7 * mm  # hard minimum with 6pt font stays legible
    # Choose subitem font size based on available row height.
    sub_font_size = 6.8 if row_h >= 3.4 * mm else 6.0

    # ---- Column header ----
    y = top
    c.setFillColor(colors.HexColor("#f8fafc"))
    c.rect(left, y - header_h, right - left, header_h, fill=1, stroke=0)
    c.setStrokeColor(colors.HexColor("#e2e8f0"))
    c.setLineWidth(0.3)
    c.line(left, y - header_h, right, y - header_h)

    c.setFillColor(colors.HexColor("#334155"))
    c.setFont("Helvetica-Bold", 7)
    c.drawString(left + 2 * mm, y - header_h + 2.8 * mm, "PUNKT")
    for idx, lesson in enumerate(lessons):
        cx = left + label_col_w + idx * col_w
        cx_center = cx + col_w / 2
        c.setFillColor(colors.HexColor("#0f172a"))
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(cx_center, y - 3 * mm, f"L{lesson.get('lesson_number', idx + 1)}")
        c.setFillColor(colors.HexColor("#64748b"))
        c.setFont("Helvetica", 6)
        c.drawCentredString(cx_center, y - 6.2 * mm, _fmt_dmy(lesson.get("date")))

    y -= header_h

    # ---- Rows ----
    cat_number = 0
    for cat in categories:
        cat_number += 1
        cat_subs = subs_by_cat.get(cat["id"], [])

        # Category header row — dark navy band with WHITE bold title.
        # Uses `cat_row_h` (fixed, always ≥ 6.5 mm) so the text is legible
        # even when the data rows have been squeezed.
        c.setFillColor(colors.HexColor("#0f172a"))
        c.rect(left, y - cat_row_h, right - left, cat_row_h, fill=1, stroke=0)
        # Slim accent strip on the left in coral
        c.setFillColor(colors.HexColor("#ff5a36"))
        c.rect(left, y - cat_row_h, 1.4 * mm, cat_row_h, fill=1, stroke=0)
        # Category title (bigger + vertically centered)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(
            left + 4 * mm,
            y - cat_row_h + (cat_row_h - 3.4 * mm) / 2 + 0.5 * mm,
            f"{cat_number}. {cat.get('title_de', '')}",
        )
        y -= cat_row_h

        for sub_idx, sub in enumerate(cat_subs, start=1):
            # Alternating row shading
            if sub_idx % 2 == 0:
                c.setFillColor(colors.HexColor("#fafaf9"))
                c.rect(left, y - row_h, right - left, row_h, fill=1, stroke=0)

            # Vertically center the text baseline inside the row.
            # For 7pt Helvetica the visual centre is ≈ 34 % up from the bottom.
            baseline_y = y - row_h + row_h * 0.32

            # Subitem label (numbered)
            c.setFillColor(colors.HexColor("#94a3b8"))
            c.setFont("Helvetica-Bold", 6)
            c.drawString(
                left + 2 * mm,
                baseline_y,
                f"{cat_number}.{sub_idx}",
            )
            c.setFillColor(colors.HexColor("#0f172a"))
            c.setFont("Helvetica", sub_font_size)
            title = sub.get("title_de", "")
            # Truncate to fit column width (label_col_w minus number badge ~10mm)
            avail = label_col_w - 12 * mm
            while c.stringWidth(title, "Helvetica", sub_font_size) > avail and len(title) > 1:
                title = title[:-1]
            if title != sub.get("title_de", ""):
                title += "…"
            c.drawString(left + 12 * mm, baseline_y, title)

            # Row grid lines
            c.setStrokeColor(colors.HexColor("#f1f5f9"))
            c.setLineWidth(0.2)
            c.line(left, y - row_h, right, y - row_h)

            # Rating cells
            for idx, lesson in enumerate(lessons):
                cell = assess_by_key.get((sub["id"], lesson["id"]))
                cx = left + label_col_w + idx * col_w
                cx_center = cx + col_w / 2
                cy_center = y - row_h / 2

                # Cell separator
                c.setStrokeColor(colors.HexColor("#e2e8f0"))
                c.setLineWidth(0.15)
                c.line(cx, y, cx, y - row_h)

                if cell and cell.get("value"):
                    style = RATING_STYLES.get(cell["value"])
                    if style:
                        # Filled rounded rectangle
                        pad = 0.6 * mm
                        rect_w = min(col_w - 2 * pad, row_h - pad)
                        rect_h = row_h - 2 * pad
                        rx = cx_center - rect_w / 2
                        ry = y - row_h + pad
                        c.setFillColor(style["bg"])
                        c.roundRect(rx, ry, rect_w, rect_h, 0.7 * mm, fill=1, stroke=0)
                        c.setFillColor(style["fg"])
                        c.setFont("Helvetica-Bold", 8)
                        c.drawCentredString(cx_center, cy_center - 1.1 * mm, cell["value"])
                if cell and cell.get("comment"):
                    # Small orange dot in top-right to signal a note exists.
                    dot_r = 0.9 * mm
                    c.setFillColor(colors.HexColor("#ff5a36"))
                    c.circle(cx + col_w - dot_r - 0.6 * mm, y - dot_r - 0.6 * mm, dot_r, stroke=0, fill=1)

            y -= row_h
            if y < bottom + 6 * mm:
                # Hard overflow – only happens when the matrix genuinely
                # can't fit even at the minimum row height.
                return

    # ---- Routes summary ----
    y -= 2 * mm
    c.setFillColor(colors.HexColor("#eff6ff"))
    c.rect(left, y - row_h, right - left, row_h, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#1e6fff"))
    c.setFont("Helvetica-Bold", 7)
    c.drawString(left + 2 * mm, y - row_h + 1.7 * mm, "GEFAHRENE STRECKEN")
    y -= row_h

    # One row of comma-separated route names per lesson (compact).
    for idx, lesson in enumerate(lessons):
        cx = left + label_col_w + idx * col_w
        cx_center = cx + col_w / 2
        route_names = [
            routes_by_id.get(rid, {}).get("name", "")
            for rid in (lesson.get("routes") or [])
        ]
        route_names = [n for n in route_names if n]
        c.setFillColor(colors.HexColor("#334155"))
        c.setFont("Helvetica", 5.5)
        for row_i, name in enumerate(route_names[:4]):
            display = name if len(name) <= 12 else name[:11] + "…"
            c.drawCentredString(cx_center, y - 1.5 * mm - row_i * 2.2 * mm, display)


def _draw_footer(c: canvas.Canvas, student: dict, left: float, right: float,
                 bottom: float, page_num: int, qr: ImageReader | None = None,
                 qr_caption: str | None = None) -> None:
    c.setFillColor(colors.HexColor("#94a3b8"))
    c.setFont("Helvetica", 6.5)
    name = f"{student.get('first_name', '')} {student.get('last_name', '')}".strip()
    c.drawString(left, bottom - 4 * mm, f"Fahrschule Safe Ride · {name}")
    c.drawRightString(right, bottom - 4 * mm, f"Seite {page_num}")

    if qr is not None:
        # Bottom-right QR code (14×14 mm) sitting ABOVE the footer text.
        qr_size = 14 * mm
        qr_x = right - qr_size
        qr_y = bottom - 0.5 * mm
        c.drawImage(qr, qr_x, qr_y, width=qr_size, height=qr_size,
                    mask="auto", preserveAspectRatio=True)
        # Caption below (small, muted).
        if qr_caption:
            c.setFillColor(colors.HexColor("#94a3b8"))
            c.setFont("Helvetica", 5.2)
            c.drawRightString(right, qr_y - 1.8 * mm, qr_caption)


# ====================================================================
#  Progress chart (page 2)
# ====================================================================
#  Same weighting as the frontend `progress.js` helper so PDF stays
#  consistent with the on-screen numbers.
_VALUE_WEIGHT = {"1": 25, "2": 50, "3": 75, "4": 100, "X": 0}


def _compute_category_progress(
    categories: list[dict],
    subs_by_cat: dict[str, list[dict]],
    lessons: list[dict],
    assess_by_key: dict[tuple[str, str], dict],
) -> list[dict]:
    """Return one row per category:
        { title, percent (0-100), color (#hex based on % ramp) }
    """
    out: list[dict] = []
    for cat in categories:
        subs = subs_by_cat.get(cat["id"], [])
        if not subs:
            out.append({"title": cat.get("title_de", ""), "percent": 0, "color": "#94a3b8"})
            continue
        total = 0
        for s in subs:
            best = 0
            for lesson_row in lessons:
                cell = assess_by_key.get((s["id"], lesson_row["id"]))
                if cell and cell.get("value"):
                    w = _VALUE_WEIGHT.get(cell["value"], 0)
                    if w > best:
                        best = w
            total += best
        pct = round(total / len(subs))
        color = (
            "#16a34a" if pct >= 80
            else "#ff5a36" if pct >= 60
            else "#eab308" if pct >= 30
            else "#dc2626"
        )
        out.append({"title": cat.get("title_de", ""), "percent": pct, "color": color})
    return out


def _draw_progress_chart(
    c: canvas.Canvas,
    data: list[dict],
    left: float,
    right: float,
    top: float,
    height: float = 55 * mm,
) -> float:
    """Horizontal bar chart of category percents.

    Returns the y coordinate of the bottom of the chart (so caller can
    continue drawing below it).
    """
    if not data:
        return top

    # Title
    c.setFillColor(colors.HexColor("#0f172a"))
    c.setFont("Helvetica-Bold", 11)
    c.drawString(left, top, "Fortschritt pro Kategorie")

    # Overall percent (right aligned)
    overall = round(sum(d["percent"] for d in data) / max(len(data), 1))
    overall_color = (
        colors.HexColor("#16a34a") if overall >= 80
        else colors.HexColor("#ff5a36") if overall >= 60
        else colors.HexColor("#eab308") if overall >= 30
        else colors.HexColor("#dc2626")
    )
    c.setFillColor(overall_color)
    c.setFont("Helvetica-Bold", 11)
    c.drawRightString(right, top, f"Gesamt: {overall} %")

    chart_top = top - 6 * mm
    n = len(data)
    row_gap = 1.8 * mm
    row_h = (height - row_gap * (n - 1)) / n
    label_col = 44 * mm
    bar_x0 = left + label_col
    bar_max_w = right - bar_x0 - 14 * mm  # reserve space for percent label

    for i, d in enumerate(data):
        y = chart_top - i * (row_h + row_gap) - row_h
        # Label
        c.setFillColor(colors.HexColor("#0f172a"))
        c.setFont("Helvetica-Bold", 8.5)
        title = d["title"]
        while c.stringWidth(f"{i + 1}. {title}", "Helvetica-Bold", 8.5) > label_col - 4 * mm and len(title) > 1:
            title = title[:-1]
        suffix = "" if title == d["title"] else "…"
        c.drawString(left, y + row_h / 2 - 1.2 * mm, f"{i + 1}. {title}{suffix}")

        # Background track
        c.setFillColor(colors.HexColor("#f1f5f9"))
        c.roundRect(bar_x0, y, bar_max_w, row_h, row_h / 2, fill=1, stroke=0)

        # Filled portion
        pct = max(0, min(100, d["percent"]))
        fill_w = max(row_h, bar_max_w * pct / 100.0) if pct > 0 else 0
        if fill_w > 0:
            c.setFillColor(colors.HexColor(d["color"]))
            c.roundRect(bar_x0, y, fill_w, row_h, row_h / 2, fill=1, stroke=0)

        # Percent label at end
        c.setFillColor(colors.HexColor("#0f172a"))
        c.setFont("Helvetica-Bold", 9)
        c.drawString(bar_x0 + bar_max_w + 3 * mm, y + row_h / 2 - 1.2 * mm, f"{pct} %")

    return chart_top - height



def _draw_journal(
    c: canvas.Canvas,
    student: dict,
    entries: list[dict],
    page_w: float,
    page_h: float,
    left: float,
    right: float,
    top: float,
    bottom: float,
    chart_data: list[dict] | None = None,
) -> None:
    """Ausbildungsjournal page(s): chart on top + chronological comments below.

    Auto-flows to more pages if the comment list is long.
    """
    def draw_header(page_num: int, subtitle: str = "") -> float:
        c.setFillColor(colors.HexColor("#0f172a"))
        c.setFont("Helvetica-Bold", 14)
        c.drawString(left, top, "Ausbildungsjournal · Kommentare chronologisch")
        c.setFillColor(colors.HexColor("#64748b"))
        c.setFont("Helvetica", 8)
        name = f"{student.get('first_name', '')} {student.get('last_name', '')}".strip()
        c.drawRightString(right, top, f"{name}")
        c.setStrokeColor(colors.HexColor("#e2e8f0"))
        c.setLineWidth(0.4)
        c.line(left, top - 2.5 * mm, right, top - 2.5 * mm)
        return top - 8 * mm

    page_num = 2
    y = draw_header(page_num)

    # ---- Progress chart at the top of page 2 (only) ----
    if chart_data:
        y = _draw_progress_chart(c, chart_data, left, right, y - 2 * mm)
        # Divider under the chart
        c.setStrokeColor(colors.HexColor("#e2e8f0"))
        c.setLineWidth(0.4)
        c.line(left, y - 4 * mm, right, y - 4 * mm)
        # Section title for the journal list
        c.setFillColor(colors.HexColor("#0f172a"))
        c.setFont("Helvetica-Bold", 11)
        c.drawString(left, y - 10 * mm, "Kommentare pro Lektion")
        y = y - 15 * mm

    def ensure_space(needed: float) -> None:
        nonlocal y, page_num
        if y - needed < bottom + 8 * mm:
            _draw_footer(c, student, left, right, bottom, page_num)
            c.showPage()
            page_num += 1
            y = draw_header(page_num)

    style_body = ParagraphStyle(
        name="body",
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#0f172a"),
    )

    if not entries:
        c.setFillColor(colors.HexColor("#94a3b8"))
        c.setFont("Helvetica-Oblique", 10)
        c.drawString(left, y, "Noch keine Kommentare erfasst.")

    for entry in entries:
        lesson = entry["lesson"]
        items = entry["items"]

        ensure_space(10 * mm)
        # Lesson block header
        c.setFillColor(colors.HexColor("#0f172a"))
        c.setFont("Helvetica-Bold", 10)
        c.drawString(left, y, f"Lektion {lesson.get('lesson_number', '?')}")
        c.setFillColor(colors.HexColor("#64748b"))
        c.setFont("Helvetica", 8)
        c.drawString(
            left + 30 * mm,
            y,
            f"{_fmt_dmy(lesson.get('date'))}   ·   {lesson.get('duration_min', 45)} min",
        )
        c.setStrokeColor(colors.HexColor("#e2e8f0"))
        c.setLineWidth(0.3)
        c.line(left, y - 1.5 * mm, right, y - 1.5 * mm)
        y -= 5 * mm

        for it in items:
            # Rating badge
            style = RATING_STYLES.get(it["value"], {"bg": colors.HexColor("#e2e8f0"), "fg": colors.HexColor("#0f172a")})
            badge_w = 5 * mm
            badge_h = 5 * mm
            c.setFillColor(style["bg"])
            c.roundRect(left, y - badge_h + 0.6 * mm, badge_w, badge_h, 0.8 * mm, fill=1, stroke=0)
            c.setFillColor(style["fg"])
            c.setFont("Helvetica-Bold", 8)
            c.drawCentredString(left + badge_w / 2, y - 3 * mm, it["value"] or "?")

            # Title + comment (paragraph for wrapping)
            text_x = left + badge_w + 3 * mm
            avail_w = right - text_x
            c.setFillColor(colors.HexColor("#0f172a"))
            c.setFont("Helvetica-Bold", 8.5)
            title = f"{it['cat_title']} · {it['sub_title']}"
            c.drawString(text_x, y - 2 * mm, title[:140])

            # Comment via Paragraph so it wraps naturally
            para = Paragraph(
                (it["comment"] or "").replace("\n", "<br/>").replace("&", "&amp;"),
                style_body,
            )
            _, para_h = para.wrap(avail_w, 60 * mm)
            para.drawOn(c, text_x, y - 4 * mm - para_h)
            block_h = max(badge_h, para_h + 5 * mm) + 3 * mm
            y -= block_h
            ensure_space(15 * mm)

        y -= 3 * mm

    _draw_footer(c, student, left, right, bottom, page_num)
