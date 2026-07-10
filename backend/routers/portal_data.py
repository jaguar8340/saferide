"""Student portal data endpoints.

All routes here require a student JWT (role="student") and only return
data belonging to that student. Endpoint prefix: /api/portal.
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from core.db import db
from core.security import get_current_student

router = APIRouter(prefix="/portal", tags=["portal-data"])


# ---------------------------------------------------------------------------
#  Dashboard aggregate — one call for the whole home screen
# ---------------------------------------------------------------------------
@router.get("/dashboard")
async def dashboard(student=Depends(get_current_student)) -> dict:
    sid = student["id"]
    now = datetime.now(timezone.utc)

    # 1. Fahrstunden – count all lessons + practice minutes total
    lessons = await db.student_lessons.find(
        {"student_id": sid}, {"_id": 0}
    ).sort("date", 1).to_list(5000)
    total_lessons = len(lessons)
    total_minutes = sum(int(l.get("duration_min") or 0) for l in lessons)

    # 2. Next appointment (from calendar)
    next_appt = await db.appointments.find_one(
        {"student_id": sid, "start_datetime": {"$gte": now.isoformat()}},
        {"_id": 0},
        sort=[("start_datetime", 1)],
    )

    # 3. Invoices – total, open, sum open amount
    invoices = await db.student_invoices.find(
        {"student_id": sid}, {"_id": 0}
    ).sort("date", -1).to_list(500)
    open_invoices = [i for i in invoices if i.get("status", "open") != "paid"]
    open_total = sum(float(i.get("price_chf") or i.get("total_incl") or 0) for i in open_invoices)

    # 4. Vouchers owned by student
    vouchers = await db.vouchers.find(
        {"redeemed_by_student_id": sid}, {"_id": 0}
    ).to_list(200)

    # 5. Fortschritt – reuse the same weighting as the PDF/matrix
    from routers.rating_scale import ensure_rating_scale
    rating_scale = await ensure_rating_scale()
    levels = rating_scale.get("levels") or []
    weights = {
        lv["value"]: round((i + 1) / max(len(levels), 1) * 100)
        for i, lv in enumerate(levels)
    }
    retry_val = (rating_scale.get("retry") or {}).get("value", "X")
    weights[retry_val] = 0

    categories = await db.fk_categories.find({}, {"_id": 0}).sort("order", 1).to_list(200)
    subs = await db.fk_subitems.find({}, {"_id": 0}).to_list(2000)
    subs_by_cat: dict[str, list[dict]] = {}
    for s in subs:
        subs_by_cat.setdefault(s["category_id"], []).append(s)

    assess = await db.student_assessments.find(
        {"student_id": sid}, {"_id": 0}
    ).to_list(50000)
    best_by_sub: dict[str, int] = {}
    for a in assess:
        v = a.get("value")
        if not v:
            continue
        w = weights.get(v, 0)
        sub_id = a.get("subitem_id")
        if sub_id and w > best_by_sub.get(sub_id, -1):
            best_by_sub[sub_id] = w

    progress: list[dict] = []
    total_pct = 0
    total_subs = 0
    for cat in categories:
        cat_subs = subs_by_cat.get(cat["id"], [])
        if not cat_subs:
            continue
        sum_best = sum(best_by_sub.get(s["id"], 0) for s in cat_subs)
        pct = round(sum_best / len(cat_subs))
        progress.append({
            "id": cat["id"],
            "title": cat.get("title_de", ""),
            "percent": pct,
        })
        total_pct += sum_best
        total_subs += len(cat_subs)

    overall_percent = round(total_pct / total_subs) if total_subs else 0

    # 6. Ausbildungsstand – human readable status label based on overall %
    if overall_percent >= 85:
        status = "Prüfungsbereit"
    elif overall_percent >= 60:
        status = "Fortgeschritten"
    elif overall_percent >= 30:
        status = "Grundlagen"
    else:
        status = "Anfänger"

    return {
        "student": {
            "id": student["id"],
            "first_name": student.get("first_name", ""),
            "last_name": student.get("last_name", ""),
            "email": student.get("email", ""),
        },
        "lessons": {
            "count": total_lessons,
            "total_minutes": total_minutes,
        },
        "next_appointment": next_appt,
        "invoices": {
            "count": len(invoices),
            "open_count": len(open_invoices),
            "open_total": round(open_total, 2),
            "recent": invoices[:5],
        },
        "vouchers": vouchers,
        "progress": {
            "overall_percent": overall_percent,
            "status": status,
            "categories": progress,
        },
    }


# ---------------------------------------------------------------------------
#  Invoice list + PDF download for the student
# ---------------------------------------------------------------------------
@router.get("/invoices")
async def portal_invoices(student=Depends(get_current_student)) -> list[dict]:
    invoices = await db.student_invoices.find(
        {"student_id": student["id"]}, {"_id": 0}
    ).sort("date", -1).to_list(500)
    return invoices


@router.get("/invoices/{invoice_id}.pdf")
async def portal_invoice_pdf(invoice_id: str, student=Depends(get_current_student)):
    from fastapi import HTTPException
    from fastapi.responses import Response
    from routers.invoice_pdf import build_invoice_pdf
    from routers.business_settings import get_or_create_settings

    invoice = await db.student_invoices.find_one(
        {"id": invoice_id, "student_id": student["id"]}, {"_id": 0}
    )
    if not invoice:
        raise HTTPException(404, "Rechnung nicht gefunden")

    settings = await get_or_create_settings()
    pdf = build_invoice_pdf(invoice, student, settings)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{invoice.get("number","invoice")}.pdf"',
        },
    )
