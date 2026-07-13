"""Iteration 49 — AGB (Terms) + Webmail backend tests.

Focus:
  - POST /api/auth/login (admin)
  - GET /api/terms (public) + PATCH /api/terms (admin)
  - POST /api/terms/send/{sid} (admin, SMTP not configured → sent=false, valid URL)
  - GET /api/terms/confirm/validate?token=… (public happy path + 404 for invalid)
  - POST /api/terms/confirm (public confirm + token cleared afterwards)
  - GET /api/mail/config (admin)
  - GET /api/mail/folders + /api/mail/messages (admin, without IMAP → 400)
"""
from __future__ import annotations

import os
import re
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback: read from frontend/.env if env not exported
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


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data and isinstance(data["access_token"], str)
    assert len(data["access_token"]) > 0
    return data["access_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ---------------------------------------------------------------------------
#  Terms CRUD
# ---------------------------------------------------------------------------
class TestTermsCrud:
    def test_get_terms_public(self):
        r = requests.get(f"{BASE_URL}/api/terms", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "terms_de" in data
        assert "terms_en" in data
        assert "terms_updated_at" in data
        assert isinstance(data["terms_de"], str)

    def test_patch_terms_admin_persists(self, admin_headers):
        marker = "TEST_AGB_iteration49_marker"
        new_text = f"# AGB (Test)\n\n{marker}\n\nDies ist ein Testtext."
        r = requests.patch(
            f"{BASE_URL}/api/terms",
            json={"terms_de": new_text},
            headers=admin_headers,
            timeout=15,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["terms_de"] == new_text
        assert body["terms_updated_at"]  # non-empty ISO timestamp

        # GET to verify persistence
        r2 = requests.get(f"{BASE_URL}/api/terms", timeout=15)
        assert r2.status_code == 200
        assert r2.json()["terms_de"] == new_text
        assert r2.json()["terms_updated_at"] == body["terms_updated_at"]

    def test_patch_terms_requires_admin(self):
        r = requests.patch(
            f"{BASE_URL}/api/terms",
            json={"terms_de": "should not pass"},
            timeout=15,
        )
        assert r.status_code in (401, 403)


# ---------------------------------------------------------------------------
#  Terms send + public confirm flow
# ---------------------------------------------------------------------------
@pytest.fixture(scope="module")
def student_with_email(admin_headers):
    r = requests.get(f"{BASE_URL}/api/students", headers=admin_headers, timeout=15)
    assert r.status_code == 200
    students = r.json()
    for s in students:
        if (s.get("email") or "").strip():
            return s
    pytest.skip("No student with email found")


class TestTermsSendConfirm:
    _token_container: dict = {}

    def test_send_terms_no_smtp(self, admin_headers, student_with_email):
        sid = student_with_email["id"]
        r = requests.post(
            f"{BASE_URL}/api/terms/send/{sid}",
            headers=admin_headers,
            timeout=20,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == student_with_email["email"]
        assert data["sent"] is False
        assert "SMTP" in (data.get("detail") or "")
        url = data["confirm_url"]
        assert re.match(r"^https?://.+/agb/[A-Za-z0-9_\-]+$", url), url
        token = url.rsplit("/", 1)[-1]
        TestTermsSendConfirm._token_container["token"] = token
        TestTermsSendConfirm._token_container["student"] = student_with_email

    def test_validate_valid_token(self):
        token = TestTermsSendConfirm._token_container.get("token")
        assert token, "prev test must have set token"
        r = requests.get(
            f"{BASE_URL}/api/terms/confirm/validate",
            params={"token": token},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        student = TestTermsSendConfirm._token_container["student"]
        assert data["student_first_name"] == (student.get("first_name") or "")
        assert data["student_last_name"] == (student.get("last_name") or "")
        assert "terms_de" in data
        assert isinstance(data["terms_de"], str)
        assert "already_confirmed" in data
        assert isinstance(data["already_confirmed"], bool)

    def test_validate_invalid_token_404(self):
        r = requests.get(
            f"{BASE_URL}/api/terms/confirm/validate",
            params={"token": "invalid_xxx_does_not_exist"},
            timeout=15,
        )
        assert r.status_code == 404

    def test_confirm_invalid_token_404(self):
        r = requests.post(
            f"{BASE_URL}/api/terms/confirm",
            json={"token": "invalid_xxx_does_not_exist"},
            timeout=15,
        )
        assert r.status_code == 404

    def test_confirm_then_token_gone(self, admin_headers):
        token = TestTermsSendConfirm._token_container.get("token")
        assert token
        r = requests.post(
            f"{BASE_URL}/api/terms/confirm",
            json={"token": token},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True
        assert data.get("confirmed_at")

        # After confirm, token is unset → validate must 404
        r2 = requests.get(
            f"{BASE_URL}/api/terms/confirm/validate",
            params={"token": token},
            timeout=15,
        )
        assert r2.status_code == 404

        # And the student record should have agb_confirmed_at persisted in DB.
        # NOTE: GET /api/students uses Pydantic Student model with extra='ignore',
        # so agb_* fields are stripped from the API response even though they exist
        # in MongoDB. This breaks TermsManager badge rendering. Reporting to main agent.
        sid = TestTermsSendConfirm._token_container["student"]["id"]
        rlist = requests.get(f"{BASE_URL}/api/students", headers=admin_headers, timeout=15)
        assert rlist.status_code == 200
        target = next((s for s in rlist.json() if s["id"] == sid), None)
        assert target is not None
        if not target.get("agb_confirmed_at"):
            pytest.xfail(
                "GET /api/students does not return agb_confirmed_at field "
                "(Student model in schemas.py uses extra='ignore' — needs agb_* fields "
                "declared for TermsManager badge rendering)"
            )


# ---------------------------------------------------------------------------
#  Mail config + graceful fail without IMAP
# ---------------------------------------------------------------------------
class TestMailConfig:
    def test_mail_config_admin(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/mail/config", headers=admin_headers, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "imap_host" in data
        assert "imap_port" in data
        assert "imap_user" in data
        assert "imap_password_set" in data
        assert "imap_use_ssl" in data
        assert isinstance(data["imap_password_set"], bool)
        # When not configured (spec expectation)
        if not (data["imap_host"] and data["imap_user"] and data["imap_password_set"]):
            assert data["imap_host"] == ""
            assert data["imap_user"] == ""
            assert data["imap_password_set"] is False
            assert data["imap_port"] == 993

    def test_mail_config_requires_admin(self):
        r = requests.get(f"{BASE_URL}/api/mail/config", timeout=15)
        assert r.status_code in (401, 403)

    def test_folders_without_imap(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/mail/folders", headers=admin_headers, timeout=15)
        # If IMAP not configured in this env → 400 with German msg
        cfg = requests.get(f"{BASE_URL}/api/mail/config", headers=admin_headers, timeout=15).json()
        if not (cfg["imap_host"] and cfg["imap_user"] and cfg["imap_password_set"]):
            assert r.status_code == 400
            assert "IMAP nicht konfiguriert" in r.text
        else:
            # IMAP is configured — allow either OK or 502
            assert r.status_code in (200, 502)

    def test_messages_without_imap(self, admin_headers):
        cfg = requests.get(f"{BASE_URL}/api/mail/config", headers=admin_headers, timeout=15).json()
        r = requests.get(f"{BASE_URL}/api/mail/messages", headers=admin_headers, timeout=15)
        if not (cfg["imap_host"] and cfg["imap_user"] and cfg["imap_password_set"]):
            assert r.status_code == 400
            assert "IMAP nicht konfiguriert" in r.text
        else:
            assert r.status_code in (200, 502)
