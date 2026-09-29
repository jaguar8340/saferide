"""Iteration 65 — verify Resend transport migration across all 4 senders.

Bug: portal_auth.py, terms.py, mail.py used to call smtplib directly and thus
bypassed the Resend transport. Now they all use core.email.send_email, so
when neither SMTP host nor Resend key is configured the response should
be a friendly German message (not a raw traceback).
"""
import os
import uuid

import pytest
import requests

def _read_backend_url():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if v:
        return v.rstrip("/")
    # Fallback: read from /app/frontend/.env
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass
    raise RuntimeError("REACT_APP_BACKEND_URL not set")


BASE_URL = _read_backend_url()
ADMIN_EMAIL = "admin@saferide.ch"
ADMIN_PASSWORD = "SafeRide2026!"


# ---------------------------------------------------------------------------
#  Fixtures
# ---------------------------------------------------------------------------
@pytest.fixture(scope="module")
def s():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    r = session.post(f"{BASE_URL}/api/auth/login",
                     json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    tok = r.json()["access_token"]
    session.headers.update({"Authorization": f"Bearer {tok}"})
    return session


@pytest.fixture(scope="module", autouse=True)
def ensure_empty_transports(s):
    """Reset SMTP + Resend to empty before AND after the tests."""
    def _reset():
        s.patch(f"{BASE_URL}/api/settings/business", json={
            "smtp_host": "", "smtp_username": "", "smtp_password": "",
            "smtp_from_email": "", "smtp_from_name": "",
            "resend_api_key": "", "resend_from_email": "",
        })
    _reset()
    yield
    _reset()


# ---------------------------------------------------------------------------
#  1) BusinessSettings — resend_api_key / resend_from_email persist
# ---------------------------------------------------------------------------
class TestBusinessSettingsResendFields:
    def test_get_returns_resend_fields(self, s):
        r = s.get(f"{BASE_URL}/api/settings/business")
        assert r.status_code == 200
        data = r.json()
        assert "resend_api_key" in data
        assert "resend_from_email" in data

    def test_patch_and_persist(self, s):
        payload = {
            "resend_api_key": "re_test_dummy_key_123",
            "resend_from_email": "no-reply@example.ch",
        }
        r = s.patch(f"{BASE_URL}/api/settings/business", json=payload)
        assert r.status_code == 200, r.text
        assert r.json()["resend_api_key"] == "re_test_dummy_key_123"
        assert r.json()["resend_from_email"] == "no-reply@example.ch"

        # Re-fetch to ensure persistence in DB
        r2 = s.get(f"{BASE_URL}/api/settings/business")
        assert r2.json()["resend_api_key"] == "re_test_dummy_key_123"
        assert r2.json()["resend_from_email"] == "no-reply@example.ch"

    def test_reset_to_empty(self, s):
        r = s.patch(f"{BASE_URL}/api/settings/business",
                    json={"resend_api_key": "", "resend_from_email": ""})
        assert r.status_code == 200
        assert r.json()["resend_api_key"] == ""
        assert r.json()["resend_from_email"] == ""


# ---------------------------------------------------------------------------
#  2) Portal-Zugang invite — friendly fallback when no transport
# ---------------------------------------------------------------------------
class TestPortalInviteFallback:
    def _find_student_with_email(self, s):
        r = s.get(f"{BASE_URL}/api/students")
        assert r.status_code == 200
        for st in r.json():
            if (st.get("email") or "").strip():
                return st
        pytest.skip("no student with email found")

    def test_invite_no_transport_returns_friendly_detail(self, s):
        student = self._find_student_with_email(s)
        r = s.post(f"{BASE_URL}/api/portal/students/{student['id']}/invite")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("sent") is False
        detail = (data.get("detail") or "").lower()
        assert "resend" in detail or "smtp" in detail, f"unexpected detail: {data.get('detail')}"
        # setup_url still returned so admin can copy manually
        assert data.get("setup_url", "").startswith("http")


# ---------------------------------------------------------------------------
#  3) AGB send — same friendly fallback
# ---------------------------------------------------------------------------
class TestAgbSendFallback:
    def _find_student_with_email(self, s):
        r = s.get(f"{BASE_URL}/api/students")
        for st in r.json():
            if (st.get("email") or "").strip():
                return st
        pytest.skip("no student with email")

    def test_agb_no_transport_returns_friendly_detail(self, s):
        student = self._find_student_with_email(s)
        r = s.post(f"{BASE_URL}/api/terms/send/{student['id']}?target=student")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("sent") is False
        detail = (data.get("detail") or "").lower()
        assert "resend" in detail or "smtp" in detail, detail
        assert data.get("confirm_url", "").startswith("http")


# ---------------------------------------------------------------------------
#  4) Invoice email — expects 400 friendly message
# ---------------------------------------------------------------------------
class TestInvoiceEmailFallback:
    def test_invoice_email_no_transport_returns_400(self, s):
        # find a student + invoice
        r = s.get(f"{BASE_URL}/api/students")
        target = None
        for st in r.json():
            inv = s.get(f"{BASE_URL}/api/students/{st['id']}/invoices")
            if inv.status_code == 200 and inv.json():
                target = (st["id"], inv.json()[0]["id"])
                break
        if not target:
            pytest.skip("no student+invoice combo found")
        sid, iid = target
        r = s.post(f"{BASE_URL}/api/students/{sid}/invoices/{iid}/email", json={})
        assert r.status_code == 400, r.text
        detail = r.json().get("detail", "").lower()
        assert "resend" in detail and "smtp" in detail, detail


# ---------------------------------------------------------------------------
#  5) General mail send — bad host should surface friendly 4xx / 5xx (no traceback)
# ---------------------------------------------------------------------------
class TestGeneralMailSendBadHost:
    def test_bad_host_surfaces_friendly_error(self, s):
        # temporarily set bad SMTP host
        s.patch(f"{BASE_URL}/api/settings/business", json={
            "smtp_host": "invalid.example.com",
            "smtp_port": 9999,
            "smtp_username": "test@example.com",
            "smtp_password": "x",
            "smtp_from_email": "test@example.com",
        })
        try:
            r = s.post(f"{BASE_URL}/api/mail/send", json={
                "to": ["someone@example.com"],
                "subject": "Test",
                "body": "hi",
            })
            # Should be 4xx/5xx JSON — never a 200 or crash
            assert r.status_code in (400, 502), f"{r.status_code} {r.text}"
            detail = (r.json().get("detail") or "").lower()
            # Should be a friendly German message, not a raw python traceback
            assert "traceback" not in detail
            assert ("smtp" in detail or "e-mail" in detail
                    or "verbindung" in detail or "versand" in detail)
        finally:
            s.patch(f"{BASE_URL}/api/settings/business", json={
                "smtp_host": "", "smtp_port": 587,
                "smtp_username": "", "smtp_password": "",
                "smtp_from_email": "",
            })


# ---------------------------------------------------------------------------
#  6) Regression — core routes still respond
# ---------------------------------------------------------------------------
class TestRegression:
    def test_students_list(self, s):
        r = s.get(f"{BASE_URL}/api/students")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_bookings_list(self, s):
        r = s.get(f"{BASE_URL}/api/bookings")
        assert r.status_code == 200

    def test_backup_status(self, s):
        r = s.get(f"{BASE_URL}/api/backup/status")
        assert r.status_code == 200

    def test_auth_login_roundtrip(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        assert "access_token" in r.json()
