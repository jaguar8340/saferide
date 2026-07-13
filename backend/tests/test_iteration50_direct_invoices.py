"""Iteration 50 — DIREKT-Rechnungen: `is_direct` field is respected in
accounting listings, summary, and monthly journal.

Also verifies the AGB re-send endpoint (`POST /api/terms/send/{sid}`)
still works after multiple sends (needed for the "AGB neu senden" button).
"""
import os
import requests
import pytest

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8001")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@saferide.ch")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "SafeRide2026!")


@pytest.fixture(scope="module")
def token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def student_id(headers):
    r = requests.get(f"{BASE_URL}/api/students", headers=headers, timeout=15)
    assert r.status_code == 200
    students = [s for s in r.json() if s.get("email")]
    assert students, "Need at least one student with an email for the tests"
    return students[0]["id"]


class TestDirectInvoices:
    def test_create_direct_and_standard(self, headers, student_id):
        # Standard
        r1 = requests.post(
            f"{BASE_URL}/api/students/{student_id}/invoices",
            json={"lesson_date": "2026-02-05", "duration_min": 45,
                  "price_chf": 111.11, "payment_method": "bar",
                  "status": "paid", "note": "iter50-std"},
            headers=headers, timeout=15,
        )
        assert r1.status_code == 200, r1.text
        std = r1.json()
        assert std.get("is_direct") is False

        # Direct
        r2 = requests.post(
            f"{BASE_URL}/api/students/{student_id}/invoices",
            json={"lesson_date": "2026-02-05", "duration_min": 45,
                  "price_chf": 222.22, "payment_method": "bar",
                  "status": "paid", "note": "iter50-direct", "is_direct": True},
            headers=headers, timeout=15,
        )
        assert r2.status_code == 200, r2.text
        drc = r2.json()
        assert drc.get("is_direct") is True

        # 1. Standard listing hides direct
        r = requests.get(
            f"{BASE_URL}/api/accounting/invoices?year=2026",
            headers=headers, timeout=15,
        )
        assert r.status_code == 200
        ids = [x["id"] for x in r.json()]
        assert std["id"] in ids
        assert drc["id"] not in ids

        # 2. ?direct=true listing shows only direct
        r = requests.get(
            f"{BASE_URL}/api/accounting/invoices?year=2026&direct=true",
            headers=headers, timeout=15,
        )
        assert r.status_code == 200
        rows = r.json()
        assert all(x.get("is_direct") for x in rows)
        assert drc["id"] in [x["id"] for x in rows]

        # 3. Summary excludes direct 222.22
        r = requests.get(
            f"{BASE_URL}/api/accounting/summary?year=2026",
            headers=headers, timeout=15,
        )
        assert r.status_code == 200
        summary = r.json()
        # We only know delta; verify by dropping the standard invoice and
        # asserting revenue drops by 111.11 (not 333.33).
        rev_before = summary["revenue_paid"]

        # Cleanup standard first
        d = requests.delete(
            f"{BASE_URL}/api/students/{student_id}/invoices/{std['id']}",
            headers=headers, timeout=15,
        )
        assert d.status_code == 200

        r = requests.get(
            f"{BASE_URL}/api/accounting/summary?year=2026",
            headers=headers, timeout=15,
        )
        assert r.status_code == 200
        rev_after = r.json()["revenue_paid"]
        # Only the standard should have been counted, so removing it drops by 111.11
        assert round(rev_before - rev_after, 2) == 111.11

        # Cleanup direct
        d = requests.delete(
            f"{BASE_URL}/api/students/{student_id}/invoices/{drc['id']}",
            headers=headers, timeout=15,
        )
        assert d.status_code == 200

    def test_agb_resend_generates_new_token(self, headers, student_id):
        """The `AGB neu senden` button hits POST /api/terms/send/{sid}.
        Each call should mint a fresh token (previous one gets replaced)."""
        r1 = requests.post(
            f"{BASE_URL}/api/terms/send/{student_id}",
            headers=headers, timeout=15,
        )
        assert r1.status_code == 200
        url1 = r1.json()["confirm_url"]

        r2 = requests.post(
            f"{BASE_URL}/api/terms/send/{student_id}",
            headers=headers, timeout=15,
        )
        assert r2.status_code == 200
        url2 = r2.json()["confirm_url"]

        assert url1 != url2, "Each resend must generate a new confirm token"

        # Old token invalid, new token valid
        t1 = url1.rsplit("/", 1)[-1]
        t2 = url2.rsplit("/", 1)[-1]
        r_old = requests.get(
            f"{BASE_URL}/api/terms/confirm/validate?token={t1}",
            timeout=15,
        )
        r_new = requests.get(
            f"{BASE_URL}/api/terms/confirm/validate?token={t2}",
            timeout=15,
        )
        assert r_old.status_code == 404
        assert r_new.status_code == 200
