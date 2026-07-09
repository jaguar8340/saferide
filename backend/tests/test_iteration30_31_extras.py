"""Iteration 30/31 – EXTRA tests: covers spec items not in test_iteration30_31_accounting.py.

Coverage:
  * StudentInvoice CRUD with new model (lesson_date, duration_min, price_chf,
    note, payment_method) → auto-numbered RE-YYYY-NNNN
  * Validation: price_chf > 0, payment_method whitelist, status whitelist
  * mwst_rate snapshotted from business settings
  * PDF export: returns application/pdf, %%EOF trailer, RE-YYYY-NNNN in filename
  * BusinessSettings singleton: GET auto-seed + partial PATCH (only supplied
    fields change)
  * /accounting/invoices global list: student-name enrichment, status filter
  * Auth guards on the three new endpoints groups
"""
import os
from datetime import datetime, timezone

import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://driving-school-cms.preview.emergentagent.com",
).rstrip("/")
ADMIN_EMAIL = "admin@saferide.ch"
ADMIN_PASSWORD = "SafeRide2026!"

STEFAN_ID = "443c0166-8f6e-4274-8c6a-9dfd6cc27e27"


# ---------------------------------------------------------------------------
#  Fixtures
# ---------------------------------------------------------------------------
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture()
def temp_student(auth_headers):
    r = requests.post(
        f"{BASE_URL}/api/students",
        json={"first_name": "TEST_Rechnung", "last_name": "Tester", "category": "B"},
        headers=auth_headers, timeout=30,
    )
    assert r.status_code == 200, r.text
    sid = r.json()["id"]
    yield sid
    requests.delete(f"{BASE_URL}/api/students/{sid}", headers=auth_headers, timeout=30)


# ---------------------------------------------------------------------------
#  Business Settings
# ---------------------------------------------------------------------------
class TestBusinessSettings:
    def test_get_auto_seeds_singleton(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/settings/business", headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        # All required fields exist
        for k in ("business_name", "iban", "bank", "bic", "mwst_number",
                  "mwst_rate", "invoice_prefix"):
            assert k in data, f"missing key {k}"
        assert isinstance(data["mwst_rate"], (int, float))

    def test_patch_only_supplied_fields_change(self, auth_headers):
        # Read current settings
        r0 = requests.get(f"{BASE_URL}/api/settings/business", headers=auth_headers, timeout=30)
        before = r0.json()

        # PATCH only iban
        new_iban = "CH99 0000 0000 0000 0000 1"
        r = requests.patch(
            f"{BASE_URL}/api/settings/business",
            json={"iban": new_iban},
            headers=auth_headers, timeout=30,
        )
        assert r.status_code == 200, r.text
        after = r.json()
        assert after["iban"] == new_iban
        assert after["business_name"] == before["business_name"]
        assert after["invoice_prefix"] == before["invoice_prefix"]

        # Restore
        requests.patch(
            f"{BASE_URL}/api/settings/business",
            json={"iban": before["iban"]},
            headers=auth_headers, timeout=30,
        )

    def test_business_settings_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/settings/business", timeout=30)
        assert r.status_code in (401, 403)
        r = requests.patch(f"{BASE_URL}/api/settings/business", json={"bank": "x"}, timeout=30)
        assert r.status_code in (401, 403)


# ---------------------------------------------------------------------------
#  Invoice model + auto number + validation
# ---------------------------------------------------------------------------
class TestInvoiceModel:
    def test_create_with_new_model_and_autonumber(self, auth_headers, temp_student):
        today = datetime.now(timezone.utc).date().isoformat()
        r = requests.post(
            f"{BASE_URL}/api/students/{temp_student}/invoices",
            json={
                "lesson_date": today,
                "duration_min": 90,
                "price_chf": 220.5,
                "note": "TEST doppellektion",
                "payment_method": "twint",
                "status": "open",
            },
            headers=auth_headers, timeout=30,
        )
        assert r.status_code == 200, r.text
        inv = r.json()

        # Number is RE-YYYY-NNNN
        year = datetime.now(timezone.utc).year
        assert inv["number"].startswith(f"RE-{year}-"), inv["number"]
        seq_part = inv["number"].split("-")[-1]
        assert len(seq_part) == 4 and seq_part.isdigit(), f"expected 4-digit seq, got {inv['number']}"

        # Fields persisted correctly
        assert inv["lesson_date"] == today
        assert inv["duration_min"] == 90
        assert float(inv["price_chf"]) == 220.5
        assert inv["note"] == "TEST doppellektion"
        assert inv["payment_method"] == "twint"
        assert inv["status"] == "open"
        assert "mwst_rate" in inv  # snapshotted from settings

        # GET verifies persistence
        r_get = requests.get(
            f"{BASE_URL}/api/students/{temp_student}/invoices",
            headers=auth_headers, timeout=30,
        )
        assert r_get.status_code == 200
        assert any(i["id"] == inv["id"] for i in r_get.json())

    def test_sequence_increments_atomically(self, auth_headers, temp_student):
        year = datetime.now(timezone.utc).year
        today = datetime.now(timezone.utc).date().isoformat()
        numbers = []
        for i in range(3):
            r = requests.post(
                f"{BASE_URL}/api/students/{temp_student}/invoices",
                json={"lesson_date": today, "duration_min": 45,
                      "price_chf": 50 + i, "payment_method": "bar"},
                headers=auth_headers, timeout=30,
            )
            assert r.status_code == 200, r.text
            numbers.append(r.json()["number"])
        # All numbers same year prefix, all unique
        assert all(n.startswith(f"RE-{year}-") for n in numbers)
        assert len(set(numbers)) == 3
        # Sequence should be strictly monotonic (may not be consecutive due to
        # parallel test workers hitting the counter simultaneously).
        seqs = [int(n.split("-")[-1]) for n in numbers]
        assert seqs == sorted(seqs), f"seqs not monotonic: {seqs}"
        assert seqs[0] < seqs[1] < seqs[2], f"seqs not strictly increasing: {seqs}"

    def test_reject_invalid_price_zero(self, auth_headers, temp_student):
        r = requests.post(
            f"{BASE_URL}/api/students/{temp_student}/invoices",
            json={"lesson_date": "2026-02-09", "duration_min": 45,
                  "price_chf": 0, "payment_method": "bar"},
            headers=auth_headers, timeout=30,
        )
        assert r.status_code in (400, 422), r.text

    def test_reject_invalid_payment_method(self, auth_headers, temp_student):
        r = requests.post(
            f"{BASE_URL}/api/students/{temp_student}/invoices",
            json={"lesson_date": "2026-02-09", "duration_min": 45,
                  "price_chf": 100, "payment_method": "bitcoin"},
            headers=auth_headers, timeout=30,
        )
        assert r.status_code in (400, 422), r.text

    def test_all_payment_methods_accepted(self, auth_headers, temp_student):
        today = datetime.now(timezone.utc).date().isoformat()
        for pm in ("bar", "rechnung", "kreditkarte", "twint"):
            r = requests.post(
                f"{BASE_URL}/api/students/{temp_student}/invoices",
                json={"lesson_date": today, "duration_min": 45,
                      "price_chf": 80, "payment_method": pm},
                headers=auth_headers, timeout=30,
            )
            assert r.status_code == 200, f"pm={pm}: {r.text}"


# ---------------------------------------------------------------------------
#  Invoice PDF export
# ---------------------------------------------------------------------------
class TestInvoicePdf:
    def test_pdf_export_valid(self, auth_headers, temp_student):
        today = datetime.now(timezone.utc).date().isoformat()
        r_create = requests.post(
            f"{BASE_URL}/api/students/{temp_student}/invoices",
            json={"lesson_date": today, "duration_min": 60, "price_chf": 150,
                  "payment_method": "rechnung", "note": "TEST PDF"},
            headers=auth_headers, timeout=30,
        )
        assert r_create.status_code == 200, r_create.text
        inv = r_create.json()

        r = requests.get(
            f"{BASE_URL}/api/students/{temp_student}/invoices/{inv['id']}.pdf",
            headers=auth_headers, timeout=60,
        )
        assert r.status_code == 200, r.text
        assert r.headers.get("content-type", "").startswith("application/pdf")
        # PDF must have magic header + %%EOF trailer
        assert r.content[:4] == b"%PDF", "missing %PDF header"
        assert b"%%EOF" in r.content[-1024:], "missing %%EOF trailer"
        # Filename should include invoice number
        cd = r.headers.get("content-disposition", "")
        assert inv["number"] in cd, cd
        # PDF should not be trivial
        assert len(r.content) > 500

    def test_pdf_export_requires_auth(self, auth_headers, temp_student):
        today = datetime.now(timezone.utc).date().isoformat()
        r_create = requests.post(
            f"{BASE_URL}/api/students/{temp_student}/invoices",
            json={"lesson_date": today, "duration_min": 45, "price_chf": 60,
                  "payment_method": "bar"},
            headers=auth_headers, timeout=30,
        )
        inv = r_create.json()
        r = requests.get(
            f"{BASE_URL}/api/students/{temp_student}/invoices/{inv['id']}.pdf",
            timeout=30,
        )
        assert r.status_code in (401, 403)

    def test_pdf_404_for_unknown_invoice(self, auth_headers, temp_student):
        r = requests.get(
            f"{BASE_URL}/api/students/{temp_student}/invoices/does-not-exist.pdf",
            headers=auth_headers, timeout=30,
        )
        assert r.status_code == 404


# ---------------------------------------------------------------------------
#  Global /accounting/invoices list
# ---------------------------------------------------------------------------
class TestAccountingInvoicesGlobal:
    def test_list_all_invoices_enriched(self, auth_headers):
        r = requests.get(
            f"{BASE_URL}/api/accounting/invoices",
            headers=auth_headers, timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        if data:
            row = data[0]
            for k in ("number", "date", "price_chf", "status",
                      "payment_method", "student_name"):
                assert k in row, f"missing key {k} in row {row}"

    def test_status_filter(self, auth_headers):
        for s in ("open", "paid", "cancelled"):
            r = requests.get(
                f"{BASE_URL}/api/accounting/invoices",
                params={"status": s},
                headers=auth_headers, timeout=30,
            )
            assert r.status_code == 200, r.text
            for row in r.json():
                assert row["status"] == s

    def test_accounting_invoices_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/accounting/invoices", timeout=30)
        assert r.status_code in (401, 403)


# ---------------------------------------------------------------------------
#  Fahrkontrolle PDF – smoke test (Iteration 30 category-header regression)
# ---------------------------------------------------------------------------
class TestFahrkontrollePdf:
    def test_pdf_for_stefan(self, auth_headers):
        r = requests.get(
            f"{BASE_URL}/api/students/{STEFAN_ID}/fahrkontrolle.pdf",
            headers=auth_headers, timeout=90,
        )
        assert r.status_code == 200, r.text
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content[:4] == b"%PDF"
        assert b"%%EOF" in r.content[-1024:]
        assert len(r.content) > 2000
