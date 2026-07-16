"""Buchhaltung — global accounting endpoints.

Groups
  /api/accounting/accounts        – chart of accounts (Kontenplan)
  /api/accounting/expenses        – expenses (Ausgaben)
  /api/accounting/invoices        – already served by student_invoices.py
  /api/accounting/summary         – overview (open receivables total)
  /api/accounting/income-statement/{year}   – Erfolgsrechnung
"""
from __future__ import annotations

import calendar
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile

from core.db import db
from core.security import get_current_admin
from core.storage import (
    ALLOWED_DOCUMENT_TYPES,
    ALLOWED_IMAGE_TYPES,
    APP_NAME,
    MAX_DOCUMENT_BYTES,
    MAX_UPLOAD_BYTES,
    put_object,
)
from models.schemas import (
    ACCOUNT_TYPES,
    Account,
    AccountPatch,
    Expense,
    ExpenseCreate,
    ExpensePatch,
)

router = APIRouter(prefix="/accounting", tags=["accounting"])


# ---------------------------------------------------------------------------
#  Chart of Accounts (Kontenplan)
# ---------------------------------------------------------------------------
DEFAULT_ACCOUNTS: list[dict] = [
    # Erträge (Revenue) — 3xxx
    {"number": "3200", "name": "Erlöse Fahrstunden",     "type": "ertrag"},
    {"number": "3210", "name": "Erlöse VKU",             "type": "ertrag"},
    {"number": "3220", "name": "Erlöse Nothelferkurs",   "type": "ertrag"},
    {"number": "3400", "name": "Übrige Erträge",         "type": "ertrag"},
    # Aufwände (Expenses) — 4xxx-6xxx
    {"number": "4000", "name": "Fahrzeugaufwand",        "type": "aufwand"},
    {"number": "4200", "name": "Treibstoff",             "type": "aufwand"},
    {"number": "4400", "name": "Versicherungen",         "type": "aufwand"},
    {"number": "4500", "name": "Marketing / Werbung",    "type": "aufwand"},
    {"number": "4600", "name": "Büro / Verwaltung",      "type": "aufwand"},
    {"number": "4700", "name": "IT / Software",          "type": "aufwand"},
    {"number": "5000", "name": "Personalaufwand",        "type": "aufwand"},
    {"number": "6000", "name": "Miete / Räume",          "type": "aufwand"},
    {"number": "6800", "name": "Übrige Aufwände",        "type": "aufwand"},
]


async def ensure_default_accounts() -> None:
    """Seed the KMU chart of accounts on the very first read."""
    existing = await db.accounts.count_documents({})
    if existing:
        return
    from uuid import uuid4
    now = datetime.now(timezone.utc).isoformat()
    docs = [
        {
            "id": str(uuid4()),
            "number": a["number"],
            "name": a["name"],
            "type": a["type"],
            "active": True,
            "created_at": now,
        }
        for a in DEFAULT_ACCOUNTS
    ]
    await db.accounts.insert_many(docs)


@router.get("/accounts", response_model=List[Account])
async def list_accounts(
    type: Optional[str] = Query(default=None),
    admin=Depends(get_current_admin),
):
    await ensure_default_accounts()
    q: dict = {}
    if type in ACCOUNT_TYPES:
        q["type"] = type
    return await db.accounts.find(q, {"_id": 0}).sort("number", 1).to_list(500)


@router.post("/accounts", response_model=Account)
async def create_account(payload: Account, admin=Depends(get_current_admin)):
    await ensure_default_accounts()
    if payload.type not in ACCOUNT_TYPES:
        raise HTTPException(status_code=400, detail="Ungültiger Konto-Typ")
    if not payload.number or not payload.name:
        raise HTTPException(status_code=400, detail="Kontonummer und Name sind Pflicht")
    if await db.accounts.find_one({"number": payload.number}):
        raise HTTPException(status_code=400, detail="Kontonummer bereits vorhanden")
    await db.accounts.insert_one(payload.model_dump())
    return payload


@router.patch("/accounts/{account_id}", response_model=Account)
async def update_account(
    account_id: str, payload: AccountPatch, admin=Depends(get_current_admin)
):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Keine Änderungen übergeben")
    if "type" in updates and updates["type"] not in ACCOUNT_TYPES:
        raise HTTPException(status_code=400, detail="Ungültiger Konto-Typ")
    if "number" in updates:
        clash = await db.accounts.find_one(
            {"number": updates["number"], "id": {"$ne": account_id}}
        )
        if clash:
            raise HTTPException(status_code=400, detail="Kontonummer bereits vorhanden")
    res = await db.accounts.update_one({"id": account_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Konto nicht gefunden")
    return await db.accounts.find_one({"id": account_id}, {"_id": 0})


@router.delete("/accounts/{account_id}")
async def delete_account(account_id: str, admin=Depends(get_current_admin)):
    # Do not orphan expenses. Refuse delete if the account is referenced.
    in_use = await db.expenses.count_documents({"account_id": account_id})
    if in_use:
        raise HTTPException(
            status_code=400,
            detail=f"Konto ist in {in_use} Ausgabe(n) referenziert – bitte zuerst umbuchen.",
        )
    res = await db.accounts.delete_one({"id": account_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Konto nicht gefunden")
    return {"ok": True}


# ---------------------------------------------------------------------------
#  Expenses (Ausgaben)
# ---------------------------------------------------------------------------
@router.get("/expenses", response_model=List[Expense])
async def list_expenses(
    year: Optional[int] = Query(default=None),
    month: Optional[int] = Query(default=None, ge=1, le=12),
    account_id: Optional[str] = Query(default=None),
    admin=Depends(get_current_admin),
):
    q: dict = {}
    if year and month:
        last = calendar.monthrange(year, month)[1]
        q["date"] = {
            "$gte": f"{year}-{month:02d}-01",
            "$lte": f"{year}-{month:02d}-{last:02d}",
        }
    elif year:
        q["date"] = {"$gte": f"{year}-01-01", "$lte": f"{year}-12-31"}
    if account_id:
        q["account_id"] = account_id
    return await db.expenses.find(q, {"_id": 0}).sort("date", -1).to_list(5000)


@router.post("/expenses", response_model=Expense)
async def create_expense(payload: ExpenseCreate, admin=Depends(get_current_admin)):
    if payload.amount_chf <= 0:
        raise HTTPException(status_code=400, detail="Betrag muss > 0 sein")
    if not payload.date:
        raise HTTPException(status_code=400, detail="Datum ist Pflicht")
    if payload.account_id:
        acct = await db.accounts.find_one({"id": payload.account_id, "type": "aufwand"})
        if not acct:
            raise HTTPException(status_code=400, detail="Ungültiges Aufwandskonto")
    expense = Expense(created_by=admin.get("email", ""), **payload.model_dump())
    await db.expenses.insert_one(expense.model_dump())
    return expense


@router.patch("/expenses/{expense_id}", response_model=Expense)
async def update_expense(
    expense_id: str, payload: ExpensePatch, admin=Depends(get_current_admin)
):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Keine Änderungen übergeben")
    if "account_id" in updates and updates["account_id"]:
        acct = await db.accounts.find_one({"id": updates["account_id"], "type": "aufwand"})
        if not acct:
            raise HTTPException(status_code=400, detail="Ungültiges Aufwandskonto")
    res = await db.expenses.update_one({"id": expense_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ausgabe nicht gefunden")
    return await db.expenses.find_one({"id": expense_id}, {"_id": 0})


@router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, admin=Depends(get_current_admin)):
    res = await db.expenses.delete_one({"id": expense_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ausgabe nicht gefunden")
    return {"ok": True}


@router.post("/expenses/upload-receipt")
async def upload_expense_receipt(
    file: UploadFile = File(...),
    admin=Depends(get_current_admin),
):
    """Multipart upload for a Beleg (JPG/PNG/WebP/PDF).

    Returns `{ url, content_type, size }`. The frontend then patches the
    created expense with the returned `url` value.
    """
    from uuid import uuid4

    content_type = file.content_type or "application/octet-stream"
    is_image = content_type in ALLOWED_IMAGE_TYPES
    is_pdf = content_type in ALLOWED_DOCUMENT_TYPES
    if not (is_image or is_pdf):
        raise HTTPException(
            status_code=400,
            detail="Nur PDF- oder Bilddateien (jpg/png/webp/gif) erlaubt",
        )
    data = await file.read()
    limit = MAX_DOCUMENT_BYTES if is_pdf else MAX_UPLOAD_BYTES
    if len(data) > limit:
        raise HTTPException(
            status_code=413,
            detail=f"Datei zu gross (max. {limit // (1024 * 1024)} MB)",
        )
    ext = (ALLOWED_DOCUMENT_TYPES if is_pdf else ALLOWED_IMAGE_TYPES)[content_type]
    path = f"{APP_NAME}/expenses/{uuid4()}.{ext}"
    result = put_object(path, data, content_type)
    stored = result.get("path", path)
    return {
        "url": f"/api/files/{stored}",
        "content_type": content_type,
        "size": len(data),
    }


# ---------------------------------------------------------------------------
#  Summary / Buchhaltungs-Dashboard
# ---------------------------------------------------------------------------
@router.get("/summary")
async def accounting_summary(
    year: Optional[int] = Query(default=None),
    admin=Depends(get_current_admin),
):
    """High-level buchhaltungs dashboard used by the Buchhaltung landing tab.

    Numbers scoped to the given year (default: current year).
    """
    year = year or datetime.now(timezone.utc).year
    year_filter = {"$gte": f"{year}-01-01", "$lte": f"{year}-12-31"}

    invoices = await db.student_invoices.find(
        {"date": year_filter, "is_direct": {"$ne": True}}, {"_id": 0}
    ).to_list(5000)
    expenses = await db.expenses.find(
        {"date": year_filter}, {"_id": 0}
    ).to_list(5000)

    def _sum(items, key, statuses=None):
        total = 0.0
        for i in items:
            if statuses and i.get("status") not in statuses:
                continue
            total += float(i.get(key) or 0)
        return round(total, 2)

    total_paid = _sum(invoices, "price_chf", {"paid"})
    total_open = _sum(invoices, "price_chf", {"open"})
    total_cancelled = _sum(invoices, "price_chf", {"cancelled"})
    total_expenses = _sum(expenses, "amount_chf")

    return {
        "year": year,
        "invoices_count": len(invoices),
        "expenses_count": len(expenses),
        "revenue_paid": total_paid,
        "revenue_open": total_open,
        "revenue_cancelled": total_cancelled,
        "revenue_total": round(total_paid + total_open, 2),
        "expenses_total": total_expenses,
        "profit": round(total_paid - total_expenses, 2),
    }


@router.get("/monthly/{year}/{month}")
async def monthly_journal(year: int, month: int, admin=Depends(get_current_admin)):
    """Chronological month journal — every Einnahme (paid invoice) + every
    Ausgabe combined into a single sorted list with type tags.

    Returned rows look like:
        { date, kind: "income"|"expense", label, amount, meta:{...} }
    Sorted ASCending by date. Also carries a totals block for the month.
    """
    import calendar as _cal
    if not 1 <= month <= 12:
        raise HTTPException(status_code=400, detail="Ungültiger Monat")
    last = _cal.monthrange(year, month)[1]
    date_from = f"{year}-{month:02d}-01"
    date_to = f"{year}-{month:02d}-{last:02d}"
    date_filter = {"$gte": date_from, "$lte": date_to}

    invoices = await db.student_invoices.find(
        {"date": date_filter, "is_direct": {"$ne": True}}, {"_id": 0}
    ).to_list(5000)
    expenses = await db.expenses.find({"date": date_filter}, {"_id": 0}).to_list(5000)

    # Enrich invoices with student names for the PDF
    student_ids = list({i["student_id"] for i in invoices})
    students = await db.students.find(
        {"id": {"$in": student_ids}},
        {"_id": 0, "id": 1, "first_name": 1, "last_name": 1},
    ).to_list(2000) if student_ids else []
    student_map = {s["id"]: s for s in students}

    accounts = await db.accounts.find({}, {"_id": 0}).to_list(500)
    account_map = {a["id"]: a for a in accounts}

    rows: list[dict] = []
    revenue = 0.0
    revenue_open = 0.0
    revenue_cancelled = 0.0

    for inv in invoices:
        student = student_map.get(inv["student_id"]) or {}
        student_name = f"{student.get('first_name','')} {student.get('last_name','')}".strip()
        amount = float(inv.get("price_chf") or 0)
        if inv.get("status") == "paid":
            revenue += amount
        elif inv.get("status") == "open":
            revenue_open += amount
        elif inv.get("status") == "cancelled":
            revenue_cancelled += amount
            # Storniert: taucht nicht in der Erfolgsrechnung als Zeile auf,
            # bleibt aber im separaten `revenue_cancelled`-Zähler für den Audit.
            continue
        rows.append({
            "date": inv.get("date"),
            "kind": "income",
            "label": f"Rechnung {inv.get('number','')} · {student_name}",
            "amount": amount,
            "status": inv.get("status"),
            "payment_method": inv.get("payment_method"),
            "note": inv.get("note", ""),
        })

    expense_total = 0.0
    for e in expenses:
        acct = account_map.get(e.get("account_id") or "") or {}
        amount = float(e.get("amount_chf") or 0)
        expense_total += amount
        rows.append({
            "date": e.get("date"),
            "kind": "expense",
            "label": e.get("description", ""),
            "amount": amount,
            "account_number": acct.get("number", ""),
            "account_name": acct.get("name", "— unzugeordnet —"),
            "receipt_url": e.get("receipt_url", ""),
        })

    rows.sort(key=lambda r: (r["date"] or "", r["kind"]))

    return {
        "year": year,
        "month": month,
        "rows": rows,
        "totals": {
            "revenue_paid": round(revenue, 2),
            "revenue_open": round(revenue_open, 2),
            "revenue_cancelled": round(revenue_cancelled, 2),
            "expenses_total": round(expense_total, 2),
            "profit": round(revenue - expense_total, 2),
        },
    }


# ---------------------------------------------------------------------------
#  PDF exports
# ---------------------------------------------------------------------------
from routers.accounting_pdf import (   # noqa: E402
    build_monthly_pdf,
    build_income_statement_pdf,
)
from fastapi.responses import Response  # noqa: E402


@router.get("/monthly/{year}/{month}/pdf")
async def monthly_journal_pdf(year: int, month: int, admin=Depends(get_current_admin)):
    """PDF export of the monthly journal (Einnahmen + Ausgaben combined)."""
    data = await monthly_journal(year, month, admin=admin)
    settings = await db.business_settings.find_one({"id": "default"}, {"_id": 0}) or {}
    pdf = build_monthly_pdf(data, settings)
    filename = f"Monatsjournal_{year}-{month:02d}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/income-statement/{year}/pdf")
async def income_statement_pdf(year: int, admin=Depends(get_current_admin)):
    """PDF export of the annual Erfolgsrechnung."""
    data = await income_statement(year, admin=admin)
    settings = await db.business_settings.find_one({"id": "default"}, {"_id": 0}) or {}
    pdf = build_income_statement_pdf(data, settings)
    filename = f"Erfolgsrechnung_{year}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
@router.get("/income-statement/{year}")
async def income_statement(year: int, admin=Depends(get_current_admin)):
    """Return monthly income statement for the given year.

    Structure:
      {
        year: 2026,
        months: [
          {month: 1, revenue: 0, expenses: 0, profit: 0,
           by_account: [{account_id, number, name, type, amount}, ...]},
          ... (12 rows total)
        ],
        totals: {revenue, expenses, profit, by_account: [...]},
      }
    """
    await ensure_default_accounts()
    year_filter = {"$gte": f"{year}-01-01", "$lte": f"{year}-12-31"}
    invoices = await db.student_invoices.find(
        {"date": year_filter, "status": "paid", "is_direct": {"$ne": True}}, {"_id": 0}
    ).to_list(5000)
    expenses = await db.expenses.find({"date": year_filter}, {"_id": 0}).to_list(5000)
    accounts = await db.accounts.find({}, {"_id": 0}).sort("number", 1).to_list(500)
    account_map = {a["id"]: a for a in accounts}

    # Fahrstunden-Erlöse fall on account "3200" by default. We look it up
    # once so revenue lines nicely show up under a real Ertragskonto.
    revenue_default = next(
        (a for a in accounts if a["number"] == "3200" and a["type"] == "ertrag"),
        None,
    )

    months: list[dict] = []
    year_totals = {"revenue": 0.0, "expenses": 0.0}
    year_by_account: dict[str, dict] = {}

    for m in range(1, 13):
        month_key = f"{year}-{m:02d}"
        month_invoices = [i for i in invoices if (i.get("date") or "").startswith(month_key)]
        month_expenses = [e for e in expenses if (e.get("date") or "").startswith(month_key)]
        revenue = round(sum(float(i.get("price_chf") or 0) for i in month_invoices), 2)
        expense_total = round(sum(float(e.get("amount_chf") or 0) for e in month_expenses), 2)

        # Per-account breakdown for this month.
        by_account: dict[str, dict] = {}
        if revenue and revenue_default:
            by_account[revenue_default["id"]] = {
                "account_id": revenue_default["id"],
                "number": revenue_default["number"],
                "name": revenue_default["name"],
                "type": "ertrag",
                "amount": revenue,
            }
        for e in month_expenses:
            aid = e.get("account_id") or ""
            acct = account_map.get(aid)
            key = aid or "unassigned"
            row = by_account.setdefault(key, {
                "account_id": aid,
                "number": (acct or {}).get("number", ""),
                "name":   (acct or {}).get("name", "— unzugeordnet —"),
                "type":   (acct or {}).get("type", "aufwand"),
                "amount": 0.0,
            })
            row["amount"] = round(row["amount"] + float(e.get("amount_chf") or 0), 2)
            # accumulate yearly per-account
            year_key = f"y-{key}"
            yr = year_by_account.setdefault(year_key, {**row, "amount": 0.0})
            yr["amount"] = round(yr["amount"] + float(e.get("amount_chf") or 0), 2)

        # Yearly revenue accumulator per revenue account
        if revenue and revenue_default:
            year_key = f"y-{revenue_default['id']}"
            yr = year_by_account.setdefault(year_key, {
                **by_account[revenue_default["id"]], "amount": 0.0,
            })
            yr["amount"] = round(yr["amount"] + revenue, 2)

        year_totals["revenue"] += revenue
        year_totals["expenses"] += expense_total

        months.append({
            "month": m,
            "revenue": revenue,
            "expenses": expense_total,
            "profit": round(revenue - expense_total, 2),
            "by_account": list(by_account.values()),
        })

    return {
        "year": year,
        "months": months,
        "totals": {
            "revenue": round(year_totals["revenue"], 2),
            "expenses": round(year_totals["expenses"], 2),
            "profit": round(year_totals["revenue"] - year_totals["expenses"], 2),
            "by_account": list(year_by_account.values()),
        },
    }
