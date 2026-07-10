"""Iteration 44 – Student portal + vouchers + Claude AI analysis.

Verifies the end-to-end flows for the three new modules:

  A. Student portal auth  (invite → validate → setup → login → me)
  B. Portal dashboard aggregate + invoice PDF authorization
  C. Voucher CRUD + redeem
  D. Fahrkontrolle AI analysis (Claude) – smoke test only

The AI test hits the real Emergent LLM endpoint and can take ≈10 s.
"""
from __future__ import annotations

import os
import time
from uuid import uuid4

import pytest
import requests

BASE = (os.environ.get("REACT_APP_BACKEND_URL") or "").rstrip("/")
if not BASE:
    pytest.skip("REACT_APP_BACKEND_URL not set", allow_module_level=True)
API = f"{BASE}/api"

ADMIN = {"email": "admin@saferide.ch", "password": "SafeRide2026!"}
STUDENT_EMAIL = "s.haas@auto-hinwil.ch"
STUDENT_PW = "schueler123!"
STUDENT_ID = "443c0166-8f6e-4274-8c6a-9dfd6cc27e27"


def _admin_headers() -> dict:
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=15)
    r.raise_for_status()
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _student_login() -> dict:
    r = requests.post(
        f"{API}/portal/login",
        json={"email": STUDENT_EMAIL, "password": STUDENT_PW},
        timeout=15,
    )
    r.raise_for_status()
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


# ---------------------------------------------------------------------------
#  A. Portal auth
# ---------------------------------------------------------------------------
def test_admin_can_invite_student():
    h = _admin_headers()
    r = requests.post(f"{API}/portal/students/{STUDENT_ID}/invite", headers=h, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["email"] == STUDENT_EMAIL
    assert d["setup_url"].startswith("http")
    # sent may be False if SMTP is not configured – that's fine
    assert isinstance(d["sent"], bool)


def test_student_login_with_stored_password():
    r = requests.post(
        f"{API}/portal/login",
        json={"email": STUDENT_EMAIL, "password": STUDENT_PW},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    assert r.json()["access_token"]


def test_portal_me_returns_student():
    h = _student_login()
    r = requests.get(f"{API}/portal/me", headers=h, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["email"].lower() == STUDENT_EMAIL.lower()
    assert d["id"] == STUDENT_ID
    # Auth fields must not leak
    assert "password_hash" not in d


def test_admin_cannot_use_portal_me():
    """Admin JWT must be rejected on student-only routes."""
    h = _admin_headers()
    r = requests.get(f"{API}/portal/me", headers=h, timeout=15)
    assert r.status_code == 403


def test_student_cannot_use_admin_route():
    h = _student_login()
    r = requests.get(f"{API}/students", headers=h, timeout=15)
    assert r.status_code == 403


# ---------------------------------------------------------------------------
#  B. Dashboard aggregate
# ---------------------------------------------------------------------------
def test_dashboard_returns_all_sections():
    h = _student_login()
    r = requests.get(f"{API}/portal/dashboard", headers=h, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["student"]["id"] == STUDENT_ID
    assert "lessons" in d and "count" in d["lessons"]
    assert "next_appointment" in d
    assert "invoices" in d and "open_count" in d["invoices"]
    assert "vouchers" in d
    assert "progress" in d and "overall_percent" in d["progress"]
    assert d["progress"]["status"] in ("Anfänger", "Grundlagen", "Fortgeschritten", "Prüfungsbereit")


def test_portal_invoice_pdf_download():
    h = _student_login()
    invs = requests.get(f"{API}/portal/invoices", headers=h, timeout=15).json()
    if not invs:
        pytest.skip("No invoices to download")
    iid = invs[0]["id"]
    r = requests.get(f"{API}/portal/invoices/{iid}.pdf", headers=h, timeout=30)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert len(r.content) > 1000


# ---------------------------------------------------------------------------
#  C. Vouchers
# ---------------------------------------------------------------------------
def test_voucher_crud_and_redeem():
    h_admin = _admin_headers()
    h_stud = _student_login()
    code = f"TEST{uuid4().hex[:8].upper()}"

    # 1. Create
    r = requests.post(
        f"{API}/vouchers", headers=h_admin,
        json={"code": code, "amount": 25, "discount_type": "chf", "note": "Regression"},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    vid = r.json()["id"]

    try:
        # 2. Duplicate rejected
        r = requests.post(
            f"{API}/vouchers", headers=h_admin,
            json={"code": code, "amount": 5, "discount_type": "chf"},
            timeout=15,
        )
        assert r.status_code == 409

        # 3. Redeem as student
        r = requests.post(
            f"{API}/portal/vouchers/redeem", headers=h_stud,
            json={"code": code}, timeout=15,
        )
        assert r.status_code == 200, r.text
        assert r.json()["redeemed_by_student_id"] == STUDENT_ID

        # 4. Re-redeem must fail
        r = requests.post(
            f"{API}/portal/vouchers/redeem", headers=h_stud,
            json={"code": code}, timeout=15,
        )
        assert r.status_code == 409

        # 5. Voucher now appears in dashboard
        d = requests.get(f"{API}/portal/dashboard", headers=h_stud, timeout=15).json()
        assert any(v["code"] == code for v in d["vouchers"])
    finally:
        # Clean up
        requests.delete(f"{API}/vouchers/{vid}", headers=h_admin, timeout=15)


# ---------------------------------------------------------------------------
#  D. Claude AI analysis  (real network call)
# ---------------------------------------------------------------------------
@pytest.mark.slow
def test_fahrkontrolle_ai_analysis_shape():
    h = _admin_headers()
    r = requests.post(
        f"{API}/students/{STUDENT_ID}/fahrkontrolle/ai",
        headers=h,
        json={"extra_note": "Fokus auf Kreisverkehr, war unsicher."},
        timeout=120,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert 0 <= d["exam_readiness_percent"] <= 100
    assert isinstance(d.get("summary_de"), str)
    assert isinstance(d.get("weak_areas"), list)
    assert isinstance(d.get("next_lessons"), list)
    assert d["model"].startswith("claude-sonnet-4-5")
    # And a subsequent GET returns the same data.
    r2 = requests.get(
        f"{API}/students/{STUDENT_ID}/fahrkontrolle/ai", headers=h, timeout=15,
    )
    assert r2.status_code == 200
    assert r2.json()["exam_readiness_percent"] == d["exam_readiness_percent"]
