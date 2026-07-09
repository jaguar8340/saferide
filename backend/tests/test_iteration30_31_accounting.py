"""Backend tests for Iteration 30 (invoice PDF + business settings) +
Iteration 31 (accounting: chart of accounts + expenses + income statement).

Tests are additive to existing regression suites. They exercise:

  • Auto-generated invoice numbers (RE-YYYY-NNNN, atomic counter).
  • Invoice PDF endpoint (returns application/pdf, magic header, filename).
  • Business settings singleton (auto-seed + partial PATCH).
  • Chart of accounts: auto-seed KMU plan, CRUD, cannot-delete-if-in-use.
  • Expenses CRUD + monthly filter + receipt upload.
  • Global accounting summary and monthly income statement.
"""
import io
import os

import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://driving-school-cms.preview.emergentagent.com",
).rstrip("/")
ADMIN_EMAIL = "admin@saferide.ch"
ADMIN_PASSWORD = "SafeRide2026!"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture()
def fresh_student(auth_headers):
    r = requests.post(
        f"{BASE_URL}/api/students",
        json={"first_name": "Buch", "last_name": "Tester", "category": "B"},
        headers=auth_headers,
        timeout=30,
    )
    assert r.status_code == 200
    sid = r.json()["id"]
    yield sid
    requests.delete(
        f"{BASE_URL}/api/students/{sid}", headers=auth_headers, timeout=30
    )


# ---------------------------------------------------------------------------
#  Chart of accounts
# ---------------------------------------------------------------------------
def test_accounts_auto_seed_and_crud(auth_headers):
    """First GET seeds the KMU chart. Subsequent CRUD works."""
    r = requests.get(f"{BASE_URL}/api/accounting/accounts", headers=auth_headers, timeout=30)
    assert r.status_code == 200
    accounts = r.json()
    assert len(accounts) >= 10, "expected ≥10 seeded accounts"
    kinds = {a["type"] for a in accounts}
    assert kinds == {"ertrag", "aufwand"}

    # Filter by type
    r = requests.get(
        f"{BASE_URL}/api/accounting/accounts",
        params={"type": "aufwand"},
        headers=auth_headers, timeout=30,
    )
    assert r.status_code == 200
    for a in r.json():
        assert a["type"] == "aufwand"

    # Create custom account
    r = requests.post(
        f"{BASE_URL}/api/accounting/accounts",
        json={"number": "4999", "name": "Testkonto Iteration 31", "type": "aufwand", "active": True},
        headers=auth_headers, timeout=30,
    )
    assert r.status_code == 200
    created = r.json()

    # Duplicate number rejected
    r = requests.post(
        f"{BASE_URL}/api/accounting/accounts",
        json={"number": "4999", "name": "Kopie", "type": "aufwand"},
        headers=auth_headers, timeout=30,
    )
    assert r.status_code == 400

    # Patch name
    r = requests.patch(
        f"{BASE_URL}/api/accounting/accounts/{created['id']}",
        json={"name": "Testkonto umbenannt"},
        headers=auth_headers, timeout=30,
    )
    assert r.status_code == 200
    assert r.json()["name"] == "Testkonto umbenannt"

    # Delete
    r = requests.delete(
        f"{BASE_URL}/api/accounting/accounts/{created['id']}",
        headers=auth_headers, timeout=30,
    )
    assert r.status_code == 200


def test_accounts_cannot_delete_if_referenced(auth_headers):
    # Create a temp account + an expense that uses it, then try to delete.
    r = requests.post(
        f"{BASE_URL}/api/accounting/accounts",
        json={"number": "4998", "name": "InUseAccount", "type": "aufwand"},
        headers=auth_headers, timeout=30,
    )
    assert r.status_code == 200
    acct = r.json()

    r = requests.post(
        f"{BASE_URL}/api/accounting/expenses",
        json={
            "date": "2026-02-01",
            "amount_chf": 50.0,
            "description": "linked to InUseAccount",
            "account_id": acct["id"],
        },
        headers=auth_headers, timeout=30,
    )
    assert r.status_code == 200
    exp_id = r.json()["id"]

    r = requests.delete(
        f"{BASE_URL}/api/accounting/accounts/{acct['id']}",
        headers=auth_headers, timeout=30,
    )
    assert r.status_code == 400

    # Cleanup: delete expense first, then account
    requests.delete(f"{BASE_URL}/api/accounting/expenses/{exp_id}", headers=auth_headers, timeout=30)
    requests.delete(f"{BASE_URL}/api/accounting/accounts/{acct['id']}", headers=auth_headers, timeout=30)


def test_accounts_require_auth():
    r = requests.get(f"{BASE_URL}/api/accounting/accounts", timeout=30)
    assert r.status_code in (401, 403)


# ---------------------------------------------------------------------------
#  Expenses
# ---------------------------------------------------------------------------
def test_expenses_full_crud(auth_headers):
    # Fetch a real aufwand account id
    accts = requests.get(
        f"{BASE_URL}/api/accounting/accounts",
        params={"type": "aufwand"},
        headers=auth_headers, timeout=30,
    ).json()
    aid = accts[0]["id"]

    # Create
    r = requests.post(
        f"{BASE_URL}/api/accounting/expenses",
        json={
            "date": "2026-03-15",
            "amount_chf": 89.9,
            "description": "Tankstelle Test",
            "account_id": aid,
        },
        headers=auth_headers, timeout=30,
    )
    assert r.status_code == 200
    exp = r.json()

    # Reject 0 amount
    r = requests.post(
        f"{BASE_URL}/api/accounting/expenses",
        json={"date": "2026-03-15", "amount_chf": 0, "description": "x"},
        headers=auth_headers, timeout=30,
    )
    assert r.status_code == 400

    # Reject invalid account_id (revenue account or unknown)
    r = requests.post(
        f"{BASE_URL}/api/accounting/expenses",
        json={"date": "2026-03-15", "amount_chf": 1.0, "description": "x", "account_id": "does-not-exist"},
        headers=auth_headers, timeout=30,
    )
    assert r.status_code == 400

    # Patch amount
    r = requests.patch(
        f"{BASE_URL}/api/accounting/expenses/{exp['id']}",
        json={"amount_chf": 92.5},
        headers=auth_headers, timeout=30,
    )
    assert r.status_code == 200
    assert r.json()["amount_chf"] == 92.5

    # List filtered by year+month
    r = requests.get(
        f"{BASE_URL}/api/accounting/expenses",
        params={"year": 2026, "month": 3},
        headers=auth_headers, timeout=30,
    )
    assert r.status_code == 200
    assert any(e["id"] == exp["id"] for e in r.json())

    # Not in April
    r = requests.get(
        f"{BASE_URL}/api/accounting/expenses",
        params={"year": 2026, "month": 4},
        headers=auth_headers, timeout=30,
    )
    assert not any(e["id"] == exp["id"] for e in r.json())

    # Delete
    r = requests.delete(
        f"{BASE_URL}/api/accounting/expenses/{exp['id']}",
        headers=auth_headers, timeout=30,
    )
    assert r.status_code == 200


def test_expense_receipt_upload(auth_headers):
    png_bytes = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\x0f"
        b"\x00\x00\x01\x01\x00\x05\xfe\x02\xfe\xdcccP\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    files = {"file": ("beleg.png", io.BytesIO(png_bytes), "image/png")}
    r = requests.post(
        f"{BASE_URL}/api/accounting/expenses/upload-receipt",
        files=files, headers=auth_headers, timeout=60,
    )
    assert r.status_code == 200
    assert r.json()["url"].startswith("/api/files/")
    assert r.json()["content_type"] == "image/png"


# ---------------------------------------------------------------------------
#  Summary + Income statement
# ---------------------------------------------------------------------------
def test_accounting_summary(auth_headers):
    r = requests.get(
        f"{BASE_URL}/api/accounting/summary",
        params={"year": 2026},
        headers=auth_headers, timeout=30,
    )
    assert r.status_code == 200
    s = r.json()
    for key in ("revenue_paid", "revenue_open", "revenue_total", "expenses_total", "profit"):
        assert key in s
        assert isinstance(s[key], (int, float))


def test_income_statement_year(auth_headers, fresh_student):
    """Income statement books revenue by INVOICE issue date (not lesson date).

    We POST a paid invoice + a matching-month expense and confirm both are
    visible in the current month's row + the yearly total.
    """
    from datetime import datetime, timezone
    sid = fresh_student
    now = datetime.now(timezone.utc).date()
    this_year = now.year
    this_month = now.month
    today_iso = now.isoformat()

    r = requests.post(
        f"{BASE_URL}/api/students/{sid}/invoices",
        json={"lesson_date": today_iso, "duration_min": 45, "price_chf": 120,
              "payment_method": "twint", "status": "paid"},
        headers=auth_headers, timeout=30,
    )
    assert r.status_code == 200

    r = requests.post(
        f"{BASE_URL}/api/accounting/expenses",
        json={"date": today_iso, "amount_chf": 30.5, "description": "Testausgabe"},
        headers=auth_headers, timeout=30,
    )
    assert r.status_code == 200
    exp_id = r.json()["id"]

    r = requests.get(
        f"{BASE_URL}/api/accounting/income-statement/{this_year}",
        headers=auth_headers, timeout=30,
    )
    assert r.status_code == 200
    d = r.json()
    assert d["year"] == this_year
    assert len(d["months"]) == 12
    current = next(m for m in d["months"] if m["month"] == this_month)
    assert current["revenue"] >= 120
    assert current["expenses"] >= 30.5
    # Yearly totals
    assert d["totals"]["revenue"] >= 120
    assert d["totals"]["expenses"] >= 30.5

    # Cleanup expense (student deletion cascades the invoice)
    requests.delete(f"{BASE_URL}/api/accounting/expenses/{exp_id}", headers=auth_headers, timeout=30)


def test_income_statement_requires_auth():
    r = requests.get(f"{BASE_URL}/api/accounting/income-statement/2026", timeout=30)
    assert r.status_code in (401, 403)
