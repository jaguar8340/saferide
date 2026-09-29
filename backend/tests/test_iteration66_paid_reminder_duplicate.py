"""Iteration 66 — Backend tests for:
  * Feature 1 – paid_at auto-stamp on invoice PATCH
  * Feature 2 – Mahnung/Reminders (preview, level, fee, send-without-smtp -> 400)
  * Feature 3 – Business settings Mahnwesen fields persistence
  * Feature 4 – Duplicate student name check (case-insensitive)
  * Regression – invoice create/list, accounting/reminders/candidates
"""
from __future__ import annotations

import os
from datetime import date

import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
ADMIN_EMAIL = "admin@saferide.ch"
ADMIN_PASS = "SafeRide2026!"


@pytest.fixture(scope="module")
def token() -> str:
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASS},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------------------------------------------------------------------------
# Feature 4 – Duplicate check
# ---------------------------------------------------------------------------
class TestDuplicateCheck:
    def test_duplicate_stefan_haas_exact(self, headers):
        r = requests.get(
            f"{BASE_URL}/api/students/check-duplicate",
            params={"first_name": "Stefan", "last_name": "Haas"},
            headers=headers, timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "matches" in data
        assert len(data["matches"]) >= 1
        m = data["matches"][0]
        assert m["first_name"].lower() == "stefan"
        assert m["last_name"].lower() == "haas"

    def test_duplicate_case_insensitive(self, headers):
        r = requests.get(
            f"{BASE_URL}/api/students/check-duplicate",
            params={"first_name": "stefan", "last_name": "HAAS"},
            headers=headers, timeout=15,
        )
        assert r.status_code == 200
        assert len(r.json()["matches"]) >= 1

    def test_duplicate_no_match(self, headers):
        r = requests.get(
            f"{BASE_URL}/api/students/check-duplicate",
            params={"first_name": "Testnutzer", "last_name": "Xyz123ZZ"},
            headers=headers, timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["matches"] == []

    def test_duplicate_empty_names(self, headers):
        r = requests.get(
            f"{BASE_URL}/api/students/check-duplicate",
            params={"first_name": "", "last_name": ""},
            headers=headers, timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["matches"] == []


# ---------------------------------------------------------------------------
# Feature 3 – Business Settings Mahnwesen fields
# ---------------------------------------------------------------------------
class TestBusinessSettingsMahnwesen:
    def test_get_has_mahnwesen_fields(self, headers):
        r = requests.get(f"{BASE_URL}/api/settings/business", headers=headers, timeout=15)
        assert r.status_code == 200
        s = r.json()
        for k in [
            "payment_deadline_days", "reminder_interval_days",
            "reminder_fee_1", "reminder_fee_2", "reminder_fee_3",
            "reminder_1_subject", "reminder_1_body",
            "reminder_2_subject", "reminder_2_body",
            "reminder_3_subject", "reminder_3_body",
        ]:
            assert k in s, f"missing settings field: {k}"

    def test_patch_persist(self, headers):
        # snapshot original
        orig = requests.get(f"{BASE_URL}/api/settings/business", headers=headers).json()
        try:
            r = requests.patch(
                f"{BASE_URL}/api/settings/business",
                headers=headers,
                json={
                    "payment_deadline_days": 15,
                    "reminder_interval_days": 7,
                    "reminder_fee_1": 11.0,
                    "reminder_fee_2": 22.0,
                    "reminder_fee_3": 33.0,
                    "reminder_1_subject": "TEST Erinnerung {number}",
                },
                timeout=15,
            )
            assert r.status_code == 200, r.text
            s = r.json()
            assert s["payment_deadline_days"] == 15
            assert s["reminder_interval_days"] == 7
            assert s["reminder_fee_1"] == 11.0
            assert s["reminder_fee_2"] == 22.0
            assert s["reminder_fee_3"] == 33.0
            assert s["reminder_1_subject"] == "TEST Erinnerung {number}"

            # verify persistence
            r2 = requests.get(f"{BASE_URL}/api/settings/business", headers=headers).json()
            assert r2["payment_deadline_days"] == 15
            assert r2["reminder_fee_2"] == 22.0
        finally:
            # restore
            requests.patch(
                f"{BASE_URL}/api/settings/business",
                headers=headers,
                json={
                    "payment_deadline_days": orig.get("payment_deadline_days", 10),
                    "reminder_interval_days": orig.get("reminder_interval_days", 10),
                    "reminder_fee_1": orig.get("reminder_fee_1", 10.0),
                    "reminder_fee_2": orig.get("reminder_fee_2", 20.0),
                    "reminder_fee_3": orig.get("reminder_fee_3", 30.0),
                    "reminder_1_subject": orig.get("reminder_1_subject") or "Zahlungserinnerung zu Rechnung {number}",
                },
                timeout=15,
            )


# ---------------------------------------------------------------------------
# Feature 1 & 2 – paid_at + Mahnung tests using real overdue invoice
# ---------------------------------------------------------------------------
@pytest.fixture(scope="module")
def overdue_invoice(headers):
    """Pick an overdue open invoice via the candidates endpoint."""
    r = requests.get(
        f"{BASE_URL}/api/accounting/reminders/candidates", headers=headers, timeout=15
    )
    assert r.status_code == 200, r.text
    candidates = r.json()
    assert isinstance(candidates, list)
    assert len(candidates) >= 1, "No overdue invoices available for testing"
    return candidates[0]  # dict with student_id + id


class TestReminderCandidates:
    def test_has_candidates(self, overdue_invoice):
        assert overdue_invoice["status"] == "open"
        assert overdue_invoice.get("is_direct") is not True
        assert overdue_invoice["days_overdue"] > 0
        assert "next_level" in overdue_invoice
        assert "student_name" in overdue_invoice


class TestReminderPreview:
    def test_preview_default_level(self, headers, overdue_invoice):
        sid = overdue_invoice["student_id"]
        iid = overdue_invoice["id"]
        r = requests.post(
            f"{BASE_URL}/api/students/{sid}/invoices/{iid}/reminder/preview",
            headers=headers, json={}, timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["level"] in (1, 2, 3)
        assert "subject" in data and "body" in data
        assert "days_overdue" in data
        assert data["days_overdue"] > 0

    def test_preview_force_level_2(self, headers, overdue_invoice):
        sid = overdue_invoice["student_id"]
        iid = overdue_invoice["id"]
        r = requests.post(
            f"{BASE_URL}/api/students/{sid}/invoices/{iid}/reminder/preview",
            headers=headers, json={"level": 2}, timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["level"] == 2
        assert data["fee"] == 20.0  # default reminder_fee_2

    def test_preview_force_level_3_fee(self, headers, overdue_invoice):
        sid = overdue_invoice["student_id"]
        iid = overdue_invoice["id"]
        r = requests.post(
            f"{BASE_URL}/api/students/{sid}/invoices/{iid}/reminder/preview",
            headers=headers, json={"level": 3}, timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["level"] == 3
        assert r.json()["fee"] >= 30.0  # default is 30 but admin may configure higher


class TestReminderSend400:
    """When SMTP/Resend is not configured, POST /reminder should return 400."""

    def test_send_without_smtp_or_recipient_returns_400(self, headers, overdue_invoice):
        sid = overdue_invoice["student_id"]
        iid = overdue_invoice["id"]
        # Try sending — expect 400 either due to missing SMTP or missing recipient
        r = requests.post(
            f"{BASE_URL}/api/students/{sid}/invoices/{iid}/reminder",
            headers=headers, json={"level": 1}, timeout=20,
        )
        assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text}"
        detail = r.json().get("detail", "")
        assert isinstance(detail, str) and len(detail) > 0


# ---------------------------------------------------------------------------
# Feature 1 – paid_at auto-stamp using a TEST invoice we create + delete
# ---------------------------------------------------------------------------
class TestPaidAtAutoStamp:
    @pytest.fixture(scope="class")
    def test_invoice(self, headers):
        # Find any existing student
        r = requests.get(f"{BASE_URL}/api/students", headers=headers, timeout=15)
        assert r.status_code == 200
        students = r.json()
        assert students
        sid = students[0]["id"]
        # Create a new invoice
        payload = {
            "price_chf": 100.0,
            "status": "open",
            "payment_method": "rechnung",
            "item_title": "TEST_Iteration66_paid_at",
            "lesson_date": date.today().isoformat(),
        }
        r = requests.post(
            f"{BASE_URL}/api/students/{sid}/invoices",
            headers=headers, json=payload, timeout=15,
        )
        assert r.status_code == 200, r.text
        inv = r.json()
        yield {"sid": sid, "iid": inv["id"]}
        # cleanup
        requests.delete(
            f"{BASE_URL}/api/students/{sid}/invoices/{inv['id']}",
            headers=headers, timeout=15,
        )

    def test_paid_at_set_on_status_paid(self, headers, test_invoice):
        sid, iid = test_invoice["sid"], test_invoice["iid"]
        r = requests.patch(
            f"{BASE_URL}/api/students/{sid}/invoices/{iid}",
            headers=headers, json={"status": "paid"}, timeout=15,
        )
        assert r.status_code == 200, r.text
        inv = r.json()
        assert inv["status"] == "paid"
        assert inv.get("paid_at"), "paid_at must be auto-set"
        assert inv["paid_at"] == date.today().isoformat()

        # GET verify persisted
        r = requests.get(
            f"{BASE_URL}/api/students/{sid}/invoices", headers=headers, timeout=15
        )
        assert r.status_code == 200
        match = next((i for i in r.json() if i["id"] == iid), None)
        assert match and match["paid_at"] == date.today().isoformat()

    def test_paid_at_cleared_on_status_open(self, headers, test_invoice):
        sid, iid = test_invoice["sid"], test_invoice["iid"]
        r = requests.patch(
            f"{BASE_URL}/api/students/{sid}/invoices/{iid}",
            headers=headers, json={"status": "open"}, timeout=15,
        )
        assert r.status_code == 200, r.text
        inv = r.json()
        assert inv["status"] == "open"
        assert inv.get("paid_at", "") == ""

    def test_paid_at_explicit_date_honored(self, headers, test_invoice):
        sid, iid = test_invoice["sid"], test_invoice["iid"]
        r = requests.patch(
            f"{BASE_URL}/api/students/{sid}/invoices/{iid}",
            headers=headers, json={"status": "paid", "paid_at": "2026-01-05"}, timeout=15,
        )
        assert r.status_code == 200, r.text
        assert r.json()["paid_at"] == "2026-01-05"


# ---------------------------------------------------------------------------
# Reminder reset
# ---------------------------------------------------------------------------
class TestReminderReset:
    def test_reset_endpoint(self, headers, overdue_invoice):
        sid = overdue_invoice["student_id"]
        iid = overdue_invoice["id"]
        r = requests.post(
            f"{BASE_URL}/api/students/{sid}/invoices/{iid}/reminder/reset",
            headers=headers, timeout=15,
        )
        assert r.status_code == 200
        assert r.json().get("ok") is True
