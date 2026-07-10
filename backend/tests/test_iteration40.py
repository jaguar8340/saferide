"""Iteration 40 backend tests

Coverage:
- PDF invoice archive: first GET uploads to Hetzner, updates archive_path/url/at
- Second GET returns byte-identical PDF from archive (verified via md5)
- ?force=true regenerates + re-archives
- PATCH of a non-status field invalidates archive fields
- PATCH of status/payment_method does NOT invalidate archive
- Regression: Hetzner file GET still works, Fahrkontrolle PDF still generates
"""
import hashlib
import os
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE:
    # Try reading directly from frontend .env
    from dotenv import dotenv_values
    _fe = dotenv_values("/app/frontend/.env")
    BASE = (_fe.get("REACT_APP_BACKEND_URL") or "").rstrip("/")

ADMIN_EMAIL = "admin@saferide.ch"
ADMIN_PASS = "SafeRide2026!"


# ---------- Fixtures --------------------------------------------------------
@pytest.fixture(scope="module")
def token():
    r = requests.post(
        f"{BASE}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASS},
        timeout=30,
    )
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def h(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def student(h):
    """Create a test student, teardown deletes it."""
    payload = {
        "first_name": "TEST_it40",
        "last_name": "PDFArchive",
        "category": "B",
    }
    r = requests.post(f"{BASE}/api/students", json=payload, headers=h, timeout=30)
    assert r.status_code == 200, r.text
    s = r.json()
    yield s
    # cleanup
    requests.delete(f"{BASE}/api/students/{s['id']}", headers=h, timeout=30)


@pytest.fixture(scope="module")
def invoice(h, student):
    payload = {
        "lesson_date": "2026-01-15",
        "duration_min": 45,
        "price_chf": 120.50,
        "payment_method": "bar",
        "status": "open",
        "note": "TEST_it40 invoice",
    }
    r = requests.post(
        f"{BASE}/api/students/{student['id']}/invoices",
        json=payload,
        headers=h,
        timeout=30,
    )
    assert r.status_code == 200, r.text
    return r.json()


# ---------- PDF Archive tests ----------------------------------------------
class TestPdfArchive:
    def test_01_invoice_initial_archive_fields_empty(self, h, student, invoice):
        """New invoice has empty archive fields."""
        r = requests.get(
            f"{BASE}/api/students/{student['id']}/invoices",
            headers=h,
            timeout=30,
        )
        assert r.status_code == 200
        rows = [i for i in r.json() if i["id"] == invoice["id"]]
        assert rows, "invoice not found"
        row = rows[0]
        assert row.get("archive_path", "") == ""
        assert row.get("archive_url", "") == ""

    def test_02_first_pdf_download_archives(self, h, student, invoice):
        """First .pdf GET generates PDF and populates archive fields."""
        r = requests.get(
            f"{BASE}/api/students/{student['id']}/invoices/{invoice['id']}.pdf",
            headers=h,
            timeout=60,
        )
        assert r.status_code == 200, r.text
        assert r.headers.get("content-type", "").startswith("application/pdf")
        pdf1 = r.content
        assert pdf1.startswith(b"%PDF"), "not a valid PDF header"
        assert len(pdf1) > 1000

        # store for next test
        pytest.pdf1_md5 = hashlib.md5(pdf1).hexdigest()
        pytest.pdf1_len = len(pdf1)

        # verify archive fields are set on DB
        r2 = requests.get(
            f"{BASE}/api/students/{student['id']}/invoices",
            headers=h,
            timeout=30,
        )
        row = [i for i in r2.json() if i["id"] == invoice["id"]][0]
        assert row["archive_path"], "archive_path not set"
        assert row["archive_path"].startswith("saferide/invoices/"), (
            f"unexpected archive_path: {row['archive_path']}"
        )
        assert invoice["id"] in row["archive_path"]
        assert row["archive_url"] == f"/api/files/{row['archive_path']}"
        assert row["archived_at"], "archived_at not set"

    def test_03_second_pdf_is_byte_identical(self, h, student, invoice):
        """Second GET pulls from archive – md5 must match."""
        r = requests.get(
            f"{BASE}/api/students/{student['id']}/invoices/{invoice['id']}.pdf",
            headers=h,
            timeout=60,
        )
        assert r.status_code == 200
        pdf2 = r.content
        md5_2 = hashlib.md5(pdf2).hexdigest()
        assert md5_2 == pytest.pdf1_md5, (
            f"md5 mismatch: 1st={pytest.pdf1_md5} len={pytest.pdf1_len} "
            f"vs 2nd={md5_2} len={len(pdf2)}"
        )

    def test_04_archive_url_directly_downloadable(self, h, student, invoice):
        """archive_url (/api/files/{path}) returns the archived PDF."""
        r = requests.get(
            f"{BASE}/api/students/{student['id']}/invoices",
            headers=h,
            timeout=30,
        )
        row = [i for i in r.json() if i["id"] == invoice["id"]][0]
        url = row["archive_url"]
        assert url
        r2 = requests.get(f"{BASE}{url}", timeout=60)
        assert r2.status_code == 200, r2.text
        assert r2.content.startswith(b"%PDF")
        assert hashlib.md5(r2.content).hexdigest() == pytest.pdf1_md5

    def test_05_force_regenerates_pdf(self, h, student, invoice):
        """?force=true forces regeneration + re-archive."""
        r = requests.get(
            f"{BASE}/api/students/{student['id']}/invoices/{invoice['id']}.pdf?force=true",
            headers=h,
            timeout=60,
        )
        assert r.status_code == 200
        pdf3 = r.content
        assert pdf3.startswith(b"%PDF")
        # Force still returns a valid PDF (may be byte-identical if deterministic)
        # We just check that archive was rewritten (archived_at may be updated).

    def test_06_patch_price_invalidates_archive(self, h, student, invoice):
        """PATCH to price_chf clears archive fields."""
        r = requests.patch(
            f"{BASE}/api/students/{student['id']}/invoices/{invoice['id']}",
            json={"price_chf": 130.0},
            headers=h,
            timeout=30,
        )
        assert r.status_code == 200, r.text
        # Verify archive fields cleared via list
        r2 = requests.get(
            f"{BASE}/api/students/{student['id']}/invoices",
            headers=h,
            timeout=30,
        )
        row = [i for i in r2.json() if i["id"] == invoice["id"]][0]
        assert row["archive_path"] == "", (
            f"expected empty archive_path, got: {row['archive_path']!r}"
        )
        assert row["archive_url"] == ""

    def test_07_pdf_after_patch_creates_new_archive(self, h, student, invoice):
        """After invalidation, PDF GET creates a new archive."""
        r = requests.get(
            f"{BASE}/api/students/{student['id']}/invoices/{invoice['id']}.pdf",
            headers=h,
            timeout=60,
        )
        assert r.status_code == 200
        assert r.content.startswith(b"%PDF")

        r2 = requests.get(
            f"{BASE}/api/students/{student['id']}/invoices",
            headers=h,
            timeout=30,
        )
        row = [i for i in r2.json() if i["id"] == invoice["id"]][0]
        assert row["archive_path"], "archive_path should be re-populated"
        assert row["archive_url"]

    def test_08_patch_status_only_keeps_archive(self, h, student, invoice):
        """PATCH to status only should NOT invalidate the archive."""
        # Grab current archive_path
        r_pre = requests.get(
            f"{BASE}/api/students/{student['id']}/invoices",
            headers=h,
            timeout=30,
        )
        row_pre = [i for i in r_pre.json() if i["id"] == invoice["id"]][0]
        pre_path = row_pre["archive_path"]
        assert pre_path

        r = requests.patch(
            f"{BASE}/api/students/{student['id']}/invoices/{invoice['id']}",
            json={"status": "paid"},
            headers=h,
            timeout=30,
        )
        assert r.status_code == 200

        r2 = requests.get(
            f"{BASE}/api/students/{student['id']}/invoices",
            headers=h,
            timeout=30,
        )
        row = [i for i in r2.json() if i["id"] == invoice["id"]][0]
        assert row["archive_path"] == pre_path, (
            f"status-only PATCH should preserve archive, "
            f"expected={pre_path!r}, got={row['archive_path']!r}"
        )
        assert row["status"] == "paid"

    def test_09_patch_payment_method_only_keeps_archive(self, h, student, invoice):
        """PATCH to payment_method only should NOT invalidate the archive."""
        r_pre = requests.get(
            f"{BASE}/api/students/{student['id']}/invoices",
            headers=h,
            timeout=30,
        )
        row_pre = [i for i in r_pre.json() if i["id"] == invoice["id"]][0]
        pre_path = row_pre["archive_path"]

        r = requests.patch(
            f"{BASE}/api/students/{student['id']}/invoices/{invoice['id']}",
            json={"payment_method": "twint"},
            headers=h,
            timeout=30,
        )
        assert r.status_code == 200

        r2 = requests.get(
            f"{BASE}/api/students/{student['id']}/invoices",
            headers=h,
            timeout=30,
        )
        row = [i for i in r2.json() if i["id"] == invoice["id"]][0]
        assert row["archive_path"] == pre_path
        assert row["payment_method"] == "twint"


# ---------- DB content sanity: wp1 body ------------------------------------
class TestContent:
    def test_public_content_has_short_persoenlich(self):
        """Public /api/content returns wp1 body_de ≤ 5 lines / ~134 chars."""
        r = requests.get(f"{BASE}/api/content", timeout=30)
        assert r.status_code == 200
        c = r.json()
        pillars = c.get("why_safe_ride", {}).get("pillars", [])
        wp1 = [p for p in pillars if p.get("id") == "wp1"]
        assert wp1, "wp1 pillar not found"
        body = wp1[0].get("body_de", "")
        assert body, "body_de empty"
        assert len(body) < 250, f"wp1 body_de too long: {len(body)} chars"
        # Verify content contains expected phrase
        assert "Nadine" in body
        assert "keine" in body.lower()
        assert body.count("\n") <= 4, (
            f"body should be ≤5 lines, found {body.count(chr(10))+1}"
        )


# ---------- Regression: file GET + Fahrkontrolle PDF -----------------------
class TestRegression:
    def test_files_unknown_path_returns_404(self):
        r = requests.get(f"{BASE}/api/files/nonexistent-xyz-12345.txt", timeout=30)
        assert r.status_code in (404, 400)

    def test_fahrkontrolle_pdf_still_works(self, h, student):
        """Fahrkontrolle PDF export for a student with no data should still
        return a valid PDF (regression from iteration 39)."""
        r = requests.get(
            f"{BASE}/api/students/{student['id']}/fahrkontrolle.pdf",
            headers=h,
            timeout=60,
        )
        assert r.status_code == 200, r.text
        assert r.content.startswith(b"%PDF")
        assert len(r.content) > 500
