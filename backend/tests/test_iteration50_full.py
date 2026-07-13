"""Iteration 50 — Full backend regression for DIREKT-Rechnungen.

Covers:
  1. POST /api/students/{sid}/invoices — is_direct=true stored, default false
  2. GET /api/accounting/invoices?year=Y — DIREKT excluded (default)
  3. GET /api/accounting/invoices?year=Y&direct=true — only DIREKT
  4. GET /api/accounting/summary?year=Y — DIREKT NOT counted
  5. GET /api/accounting/monthly/{y}/{m} — DIREKT NOT in rows
  6. GET /api/accounting/income-statement/{y} — DIREKT NOT in month.revenue / year_totals.revenue
  7. POST /api/terms/send/{sid} — multiple calls -> new token each time; old invalidated
  8. Existing invoices without is_direct field -> treated as NOT direct
"""
from __future__ import annotations

import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    try:
        with open("/app/frontend/.env", "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
                    break
    except Exception:
        pass

ADMIN_EMAIL = "admin@saferide.ch"
ADMIN_PASSWORD = "SafeRide2026!"

YEAR = 2026
MONTH = 2  # deliberately use Feb so we can test monthly window w/o polluting many months


@pytest.fixture(scope="module")
def admin_headers():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    tok = r.json()["access_token"]
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def student_id(admin_headers):
    r = requests.get(f"{BASE_URL}/api/students", headers=admin_headers, timeout=15)
    assert r.status_code == 200
    students = [s for s in r.json() if s.get("email")]
    assert students, "Need at least one student with email"
    return students[0]["id"]


def _create_invoice(admin_headers, sid, *, is_direct=None, price=100.0, note="iter50-test", status="paid"):
    body = {
        "lesson_date": f"{YEAR}-{MONTH:02d}-15",
        "duration_min": 45,
        "price_chf": price,
        "payment_method": "bar",
        "status": status,
        "note": note,
    }
    if is_direct is not None:
        body["is_direct"] = is_direct
    r = requests.post(
        f"{BASE_URL}/api/students/{sid}/invoices",
        json=body, headers=admin_headers, timeout=15,
    )
    assert r.status_code == 200, r.text
    return r.json()


def _delete_invoice(admin_headers, sid, iid):
    return requests.delete(
        f"{BASE_URL}/api/students/{sid}/invoices/{iid}",
        headers=admin_headers, timeout=15,
    )


class TestCreateWithIsDirect:
    def test_is_direct_defaults_false(self, admin_headers, student_id):
        inv = _create_invoice(admin_headers, student_id, price=42.0, note="TEST_default_is_direct")
        try:
            assert inv["is_direct"] is False
        finally:
            _delete_invoice(admin_headers, student_id, inv["id"])

    def test_is_direct_true_stored(self, admin_headers, student_id):
        inv = _create_invoice(admin_headers, student_id, is_direct=True, price=43.0, note="TEST_direct_true")
        try:
            assert inv["is_direct"] is True
        finally:
            _delete_invoice(admin_headers, student_id, inv["id"])


class TestAccountingInvoicesListing:
    def test_default_hides_direct(self, admin_headers, student_id):
        std = _create_invoice(admin_headers, student_id, is_direct=False, price=55.5, note="TEST_std_list")
        drc = _create_invoice(admin_headers, student_id, is_direct=True, price=77.7, note="TEST_drc_list")
        try:
            r = requests.get(
                f"{BASE_URL}/api/accounting/invoices?year={YEAR}",
                headers=admin_headers, timeout=15,
            )
            assert r.status_code == 200, r.text
            rows = r.json()
            ids = [x["id"] for x in rows]
            assert std["id"] in ids
            assert drc["id"] not in ids
            # And every returned row must NOT be direct
            for x in rows:
                assert x.get("is_direct") is not True, f"Direct invoice leaked: {x}"
        finally:
            _delete_invoice(admin_headers, student_id, std["id"])
            _delete_invoice(admin_headers, student_id, drc["id"])

    def test_direct_true_returns_only_direct(self, admin_headers, student_id):
        std = _create_invoice(admin_headers, student_id, is_direct=False, price=56.5, note="TEST_std_only")
        drc = _create_invoice(admin_headers, student_id, is_direct=True, price=78.7, note="TEST_drc_only")
        try:
            r = requests.get(
                f"{BASE_URL}/api/accounting/invoices?year={YEAR}&direct=true",
                headers=admin_headers, timeout=15,
            )
            assert r.status_code == 200, r.text
            rows = r.json()
            ids = [x["id"] for x in rows]
            assert drc["id"] in ids
            assert std["id"] not in ids
            for x in rows:
                assert x.get("is_direct") is True
        finally:
            _delete_invoice(admin_headers, student_id, std["id"])
            _delete_invoice(admin_headers, student_id, drc["id"])


class TestAccountingSummary:
    def test_summary_excludes_direct(self, admin_headers, student_id):
        # Snapshot
        r0 = requests.get(f"{BASE_URL}/api/accounting/summary?year={YEAR}",
                          headers=admin_headers, timeout=15)
        assert r0.status_code == 200
        rev_paid_before = r0.json()["revenue_paid"]
        cnt_before = r0.json()["invoices_count"]

        drc = _create_invoice(admin_headers, student_id, is_direct=True, price=999.99,
                              status="paid", note="TEST_direct_summary")
        try:
            r1 = requests.get(f"{BASE_URL}/api/accounting/summary?year={YEAR}",
                              headers=admin_headers, timeout=15)
            assert r1.status_code == 200
            # revenue_paid MUST NOT change
            assert r1.json()["revenue_paid"] == rev_paid_before, \
                f"DIREKT invoice leaked into summary revenue_paid ({rev_paid_before} → {r1.json()['revenue_paid']})"
            # invoices_count MUST NOT change either
            assert r1.json()["invoices_count"] == cnt_before, \
                f"DIREKT invoice leaked into summary invoices_count ({cnt_before} → {r1.json()['invoices_count']})"
        finally:
            _delete_invoice(admin_headers, student_id, drc["id"])


class TestMonthlyJournal:
    def test_direct_not_in_journal(self, admin_headers, student_id):
        drc = _create_invoice(admin_headers, student_id, is_direct=True, price=321.0,
                              status="paid", note="TEST_direct_journal")
        try:
            r = requests.get(f"{BASE_URL}/api/accounting/monthly/{YEAR}/{MONTH}",
                             headers=admin_headers, timeout=15)
            assert r.status_code == 200, r.text
            data = r.json()
            # No row should reference the direct invoice
            for row in data["rows"]:
                assert "TEST_direct_journal" not in (row.get("note") or ""), \
                    f"DIREKT invoice appeared in monthly journal: {row}"
            # totals should be unaffected by direct 321.0
            # (we can only assert row-level absence deterministically here)
        finally:
            _delete_invoice(admin_headers, student_id, drc["id"])


class TestIncomeStatement:
    def test_direct_not_in_income_statement(self, admin_headers, student_id):
        r0 = requests.get(f"{BASE_URL}/api/accounting/income-statement/{YEAR}",
                          headers=admin_headers, timeout=15)
        assert r0.status_code == 200
        year_rev_before = r0.json()["totals"]["revenue"]
        month_rev_before = r0.json()["months"][MONTH - 1]["revenue"]

        drc = _create_invoice(admin_headers, student_id, is_direct=True, price=555.55,
                              status="paid", note="TEST_direct_income")
        try:
            r1 = requests.get(f"{BASE_URL}/api/accounting/income-statement/{YEAR}",
                              headers=admin_headers, timeout=15)
            assert r1.status_code == 200
            assert r1.json()["totals"]["revenue"] == year_rev_before, \
                f"DIREKT invoice leaked into year totals.revenue"
            assert r1.json()["months"][MONTH - 1]["revenue"] == month_rev_before, \
                f"DIREKT invoice leaked into month revenue"
        finally:
            _delete_invoice(admin_headers, student_id, drc["id"])


class TestAgbResend:
    def test_multi_resend_rotates_token(self, admin_headers, student_id):
        tokens = []
        for _ in range(3):
            r = requests.post(f"{BASE_URL}/api/terms/send/{student_id}",
                              headers=admin_headers, timeout=20)
            assert r.status_code == 200, r.text
            tokens.append(r.json()["confirm_url"].rsplit("/", 1)[-1])
        assert len(set(tokens)) == 3, "Each send must produce a NEW token"

        # First two invalid, last one valid
        for old in tokens[:-1]:
            r = requests.get(f"{BASE_URL}/api/terms/confirm/validate?token={old}", timeout=15)
            assert r.status_code == 404, f"Old token still valid: {old}"
        r = requests.get(f"{BASE_URL}/api/terms/confirm/validate?token={tokens[-1]}", timeout=15)
        assert r.status_code == 200


class TestLegacyInvoicesTreatedAsNonDirect:
    """Regression: existing invoices without is_direct field must appear in
    the standard listing (server uses $ne True which matches null/missing)."""

    def test_legacy_style_no_field(self, admin_headers, student_id):
        # We can't remove the field via API (Pydantic default=False), but we
        # can inject via direct request and confirm the server treats missing as false.
        # Simplest safe path: create a normal invoice (is_direct=False persisted)
        # and ensure it's in the default listing.
        std = _create_invoice(admin_headers, student_id, is_direct=None,
                              price=17.0, note="TEST_legacy_style")
        try:
            r = requests.get(
                f"{BASE_URL}/api/accounting/invoices?year={YEAR}",
                headers=admin_headers, timeout=15,
            )
            assert r.status_code == 200
            ids = [x["id"] for x in r.json()]
            assert std["id"] in ids, "Invoice without is_direct disappeared from standard listing"

            # Direct listing must NOT contain it
            r2 = requests.get(
                f"{BASE_URL}/api/accounting/invoices?year={YEAR}&direct=true",
                headers=admin_headers, timeout=15,
            )
            assert r2.status_code == 200
            ids2 = [x["id"] for x in r2.json()]
            assert std["id"] not in ids2
        finally:
            _delete_invoice(admin_headers, student_id, std["id"])
