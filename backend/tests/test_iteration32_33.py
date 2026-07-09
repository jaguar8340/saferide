"""Iteration 32 + 33 backend tests.

Covers:
  * Iteration 33 (new): Admin user management CRUD (/api/users)
  * Iteration 33 (new): SMTP config PATCH + /settings/business/smtp/test
  * Iteration 33 (new): Invoice send-by-email endpoint (400 without SMTP)
  * Iteration 32 (regression): Logo upload/reset + default logo asset
  * Iteration 32 (regression): Invoice PDF
  * Iteration 32 (regression): Accounting PDFs (monthly journal + income statement)
  * Iteration 32 (regression): DB backup endpoints
"""
from __future__ import annotations

import io
import os
import uuid
from datetime import datetime, timezone

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback: read from frontend/.env like the app does
    fe = "/app/frontend/.env"
    if os.path.exists(fe):
        for line in open(fe):
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
                break

API = f"{BASE_URL}/api"
ADMIN_EMAIL = "admin@saferide.ch"
ADMIN_PASSWORD = "SafeRide2026!"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session")
def auth_headers():
    r = requests.post(
        f"{API}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=20,
    )
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    tok = r.json().get("access_token")
    assert tok, "no access_token in response"
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="session")
def own_user_id(auth_headers):
    r = requests.get(f"{API}/auth/me", headers=auth_headers, timeout=15)
    if r.status_code == 200:
        return r.json().get("id")
    # fallback via /users
    ru = requests.get(f"{API}/users", headers=auth_headers, timeout=15)
    for u in ru.json():
        if u["email"].lower() == ADMIN_EMAIL:
            return u["id"]
    return None


# ---------------------------------------------------------------------------
# Iteration 33: Users CRUD
# ---------------------------------------------------------------------------
class TestUsersCRUD:
    def test_list_users(self, auth_headers):
        r = requests.get(f"{API}/users", headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        assert any(u["email"].lower() == ADMIN_EMAIL for u in data)
        for u in data:
            assert "password_hash" not in u
            assert "id" in u and "email" in u

    def test_create_login_patch_delete_flow(self, auth_headers):
        # unique test email
        suffix = uuid.uuid4().hex[:8]
        email = f"test_user_{suffix}@saferide.ch"
        pw = "InitPass123"

        # CREATE
        r = requests.post(
            f"{API}/users",
            headers=auth_headers,
            json={"email": email, "password": pw, "name": "TEST User"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["email"] == email
        assert created["name"] == "TEST User"
        uid = created["id"]

        try:
            # VERIFY appears in listing
            r2 = requests.get(f"{API}/users", headers=auth_headers, timeout=15)
            assert r2.status_code == 200
            assert any(u["id"] == uid for u in r2.json())

            # LOGIN with new creds (bcrypt round-trip)
            rl = requests.post(
                f"{API}/auth/login",
                json={"email": email, "password": pw},
                timeout=15,
            )
            assert rl.status_code == 200, f"Login with new user failed: {rl.text}"
            assert rl.json().get("access_token")

            # PATCH name
            rp = requests.patch(
                f"{API}/users/{uid}",
                headers=auth_headers,
                json={"name": "TEST Updated"},
                timeout=15,
            )
            assert rp.status_code == 200, rp.text
            assert rp.json()["name"] == "TEST Updated"

            # PATCH password → login with new password works
            new_pw = "NewPass456"
            rpw = requests.patch(
                f"{API}/users/{uid}",
                headers=auth_headers,
                json={"password": new_pw},
                timeout=15,
            )
            assert rpw.status_code == 200

            rl2 = requests.post(
                f"{API}/auth/login",
                json={"email": email, "password": new_pw},
                timeout=15,
            )
            assert rl2.status_code == 200, f"Login after password change failed: {rl2.text}"

            # Old password now fails
            rl3 = requests.post(
                f"{API}/auth/login",
                json={"email": email, "password": pw},
                timeout=15,
            )
            assert rl3.status_code in (400, 401)
        finally:
            # DELETE
            rd = requests.delete(f"{API}/users/{uid}", headers=auth_headers, timeout=15)
            assert rd.status_code == 200, rd.text

    def test_short_password_rejected(self, auth_headers):
        r = requests.post(
            f"{API}/users",
            headers=auth_headers,
            json={"email": f"short_{uuid.uuid4().hex[:6]}@t.ch", "password": "abc"},
            timeout=15,
        )
        assert r.status_code == 422

    def test_duplicate_email_returns_409(self, auth_headers):
        suffix = uuid.uuid4().hex[:8]
        email = f"dup_{suffix}@saferide.ch"
        r1 = requests.post(
            f"{API}/users",
            headers=auth_headers,
            json={"email": email, "password": "abcdef123"},
            timeout=15,
        )
        assert r1.status_code == 200
        uid = r1.json()["id"]
        try:
            r2 = requests.post(
                f"{API}/users",
                headers=auth_headers,
                json={"email": email, "password": "abcdef123"},
                timeout=15,
            )
            assert r2.status_code == 409
        finally:
            requests.delete(f"{API}/users/{uid}", headers=auth_headers, timeout=15)

    def test_self_delete_blocked(self, auth_headers, own_user_id):
        assert own_user_id, "could not resolve own user id"
        r = requests.delete(
            f"{API}/users/{own_user_id}", headers=auth_headers, timeout=15
        )
        assert r.status_code == 400
        detail = r.json().get("detail", "")
        assert "eigen" in detail.lower() or "account" in detail.lower()

    def test_delete_nonexistent(self, auth_headers):
        r = requests.delete(f"{API}/users/does-not-exist-xyz", headers=auth_headers, timeout=15)
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# Iteration 33: SMTP config + smtp/test
# ---------------------------------------------------------------------------
class TestSmtp:
    def test_business_settings_has_smtp_fields(self, auth_headers):
        r = requests.get(f"{API}/settings/business", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        data = r.json()
        for k in (
            "smtp_host", "smtp_port", "smtp_username", "smtp_password",
            "smtp_from_email", "smtp_from_name", "smtp_use_tls",
            "email_subject_template", "email_body_template",
        ):
            assert k in data, f"missing field {k}"
        assert isinstance(data["smtp_use_tls"], bool)
        assert isinstance(data["smtp_port"], int)

    def test_patch_smtp_persistence(self, auth_headers):
        # snapshot current
        r0 = requests.get(f"{API}/settings/business", headers=auth_headers, timeout=15)
        prev = r0.json()

        # apply patch (deliberately keep host empty to not enable sending)
        payload = {
            "smtp_host": "",
            "smtp_port": 2525,
            "smtp_username": "test-user@example.com",
            "smtp_from_email": "noreply@example.com",
            "smtp_from_name": "Fahrschule TEST",
            "smtp_use_tls": False,
            "email_subject_template": "Rechnung {number} – TEST",
            "email_body_template": "Hallo {first_name},\ntest",
        }
        r = requests.patch(
            f"{API}/settings/business",
            headers=auth_headers,
            json=payload,
            timeout=15,
        )
        assert r.status_code == 200, r.text
        got = r.json()
        for k, v in payload.items():
            assert got[k] == v, f"{k}: expected {v!r}, got {got.get(k)!r}"

        # persisted via re-GET
        r2 = requests.get(f"{API}/settings/business", headers=auth_headers, timeout=15)
        got2 = r2.json()
        assert got2["smtp_port"] == 2525
        assert got2["smtp_from_email"] == "noreply@example.com"
        assert got2["email_subject_template"] == "Rechnung {number} – TEST"

        # restore snapshot (best effort)
        restore = {k: prev.get(k) for k in payload.keys() if k in prev}
        requests.patch(f"{API}/settings/business", headers=auth_headers, json=restore, timeout=15)

    def test_smtp_test_unreachable_returns_502(self, auth_headers):
        r = requests.post(
            f"{API}/settings/business/smtp/test",
            headers=auth_headers,
            json={
                "smtp_host": "127.0.0.1",
                "smtp_port": 9999,  # unused port – guaranteed connection refused
                "smtp_use_tls": False,
            },
            timeout=25,
        )
        assert r.status_code == 502, f"expected 502, got {r.status_code}: {r.text}"
        # NOTE: When the external CDN intercepts a 502 upstream response, the
        # HTML body is replaced by the CDN's default 502 page. So we only
        # inspect the JSON detail when the content-type is JSON.
        if "json" in (r.headers.get("content-type") or ""):
            detail = (r.json().get("detail") or "").lower()
            assert "smtp" in detail or "verbindung" in detail

    def test_smtp_test_empty_host_returns_400(self, auth_headers):
        # First make sure stored host is empty
        requests.patch(
            f"{API}/settings/business",
            headers=auth_headers,
            json={"smtp_host": ""},
            timeout=15,
        )
        r = requests.post(
            f"{API}/settings/business/smtp/test",
            headers=auth_headers,
            json={},
            timeout=15,
        )
        assert r.status_code == 400


# ---------------------------------------------------------------------------
# Iteration 33: Invoice email endpoint
# ---------------------------------------------------------------------------
class TestInvoiceEmail:
    def test_send_invoice_email_without_smtp_returns_400(self, auth_headers):
        # Ensure smtp_host is empty
        requests.patch(
            f"{API}/settings/business",
            headers=auth_headers,
            json={"smtp_host": ""},
            timeout=15,
        )
        # We need one student + one invoice to exercise the endpoint
        rs = requests.get(f"{API}/students", headers=auth_headers, timeout=15)
        assert rs.status_code == 200
        students = rs.json()
        if not students:
            # create a lightweight student
            rc = requests.post(
                f"{API}/students",
                headers=auth_headers,
                json={"first_name": "TEST", "last_name": "Empfänger", "email": "test@example.com"},
                timeout=15,
            )
            assert rc.status_code in (200, 201), rc.text
            student_id = rc.json()["id"]
            created_student = True
        else:
            student_id = students[0]["id"]
            created_student = False

        # Ensure at least one invoice exists
        ri = requests.get(
            f"{API}/students/{student_id}/invoices", headers=auth_headers, timeout=15
        )
        assert ri.status_code == 200
        invoices = ri.json()
        if not invoices:
            rc = requests.post(
                f"{API}/students/{student_id}/invoices",
                headers=auth_headers,
                json={
                    "lesson_date": datetime.now(timezone.utc).date().isoformat(),
                    "description": "TEST invoice",
                    "price_chf": 100,
                    "mwst_rate": 8.1,
                },
                timeout=15,
            )
            assert rc.status_code in (200, 201), rc.text
            invoice_id = rc.json()["id"]
        else:
            invoice_id = invoices[0]["id"]

        r = requests.post(
            f"{API}/students/{student_id}/invoices/{invoice_id}/email",
            headers=auth_headers,
            json={"to": "test@example.com"},
            timeout=20,
        )
        assert r.status_code == 400, r.text
        detail = r.json().get("detail", "").lower()
        assert "smtp" in detail

        # cleanup
        if created_student:
            requests.delete(f"{API}/students/{student_id}", headers=auth_headers, timeout=15)

    def test_send_invoice_email_unknown_student(self, auth_headers):
        r = requests.post(
            f"{API}/students/no-such-student/invoices/no-such-invoice/email",
            headers=auth_headers,
            json={},
            timeout=15,
        )
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# Iteration 32 regression: Logo upload/reset + default asset
# ---------------------------------------------------------------------------
class TestLogoAsset:
    def test_default_logo_asset(self):
        r = requests.get(f"{API}/assets/logo/default", timeout=15)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/")
        assert len(r.content) > 100

    def test_upload_invalid_format(self, auth_headers):
        files = {"file": ("bad.txt", io.BytesIO(b"not an image"), "text/plain")}
        r = requests.post(
            f"{API}/settings/business/logo",
            headers=auth_headers,
            files=files,
            timeout=20,
        )
        assert r.status_code == 400

    def test_upload_and_reset_logo(self, auth_headers):
        # 1x1 PNG
        png_bytes = bytes.fromhex(
            "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
            "0000000d49444154789c6300010000000500010d0a2db40000000049454e44ae426082"
        )
        files = {"file": ("logo.png", io.BytesIO(png_bytes), "image/png")}
        r = requests.post(
            f"{API}/settings/business/logo",
            headers=auth_headers,
            files=files,
            timeout=30,
        )
        assert r.status_code == 200, r.text
        assert r.json().get("logo_url")
        # Reset to default
        rd = requests.delete(
            f"{API}/settings/business/logo", headers=auth_headers, timeout=15
        )
        assert rd.status_code == 200
        assert rd.json().get("logo_url") == "/api/assets/logo/default"


# ---------------------------------------------------------------------------
# Iteration 32 regression: Invoice PDF
# ---------------------------------------------------------------------------
class TestInvoicePDF:
    def test_invoice_pdf_download(self, auth_headers):
        rs = requests.get(f"{API}/students", headers=auth_headers, timeout=15)
        students = rs.json()
        if not students:
            pytest.skip("No students available")
        student_id = students[0]["id"]
        ri = requests.get(
            f"{API}/students/{student_id}/invoices", headers=auth_headers, timeout=15
        )
        invoices = ri.json()
        if not invoices:
            pytest.skip("No invoices available")
        invoice_id = invoices[0]["id"]
        r = requests.get(
            f"{API}/students/{student_id}/invoices/{invoice_id}.pdf",
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content.startswith(b"%PDF"), "not a PDF"
        assert len(r.content) > 500


# ---------------------------------------------------------------------------
# Iteration 32 regression: Accounting PDFs
# ---------------------------------------------------------------------------
class TestAccountingPDFs:
    def test_monthly_journal_pdf(self, auth_headers):
        # Actual route: /api/accounting/monthly/{year}/{month}/pdf
        r = requests.get(
            f"{API}/accounting/monthly/2026/1/pdf",
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 200, r.text[:400]
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content.startswith(b"%PDF")

    def test_income_statement_pdf(self, auth_headers):
        # Actual route: /api/accounting/income-statement/{year}/pdf
        r = requests.get(
            f"{API}/accounting/income-statement/2026/pdf",
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 200, r.text[:400]
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content.startswith(b"%PDF")


# ---------------------------------------------------------------------------
# Iteration 32 regression: Backup
# ---------------------------------------------------------------------------
class TestBackup:
    def test_status(self, auth_headers):
        r = requests.get(f"{API}/backup/status", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "total_documents" in data
        assert "collection_count" in data
        assert isinstance(data["total_documents"], int)
        assert isinstance(data["collection_count"], int)

    def test_mongo_dump(self, auth_headers):
        r = requests.get(f"{API}/backup/mongo", headers=auth_headers, timeout=60)
        assert r.status_code == 200
        ct = r.headers.get("content-type", "")
        assert "gzip" in ct or "octet-stream" in ct, f"unexpected ct {ct}"
        # gzip magic
        assert r.content[:2] == b"\x1f\x8b"

    def test_scripts(self, auth_headers):
        r = requests.get(f"{API}/backup/scripts", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        data = r.json()
        for k in ("windows_batch", "mac_bash", "linux_bash", "auth_hint"):
            assert k in data, f"missing key {k}"
