"""Iteration 35 backend regression tests.

Covers:
- PWA manifest.json served under frontend
- /api/settings/business exposes SMTP fields + calendar_token
- /api/appointments CRUD (create, list, patch, delete)
- /api/appointments returns unscheduled legacy bookings + within-range appointments
- /api/calendar/{token}.ics public feed (200, text/calendar, BEGIN:VCALENDAR)
- Invalid ical token → 404
- /api/calendar/regenerate-token rotates the token
- /api/students/{id}/summary for Stefan Haas
"""
from __future__ import annotations

import os
import requests
import pytest
from datetime import datetime, timedelta, timezone

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback: read frontend .env directly
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL"):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                    break
    except Exception:
        pass

ADMIN_EMAIL = "admin@saferide.ch"
ADMIN_PASS = "SafeRide2026!"


# ---------------------------------------------------------------- fixtures
@pytest.fixture(scope="module")
def token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASS},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------------------------------------------------------------- PWA manifest
class TestPWA:
    def test_manifest_served(self):
        r = requests.get(f"{BASE_URL}/manifest.json", timeout=15)
        assert r.status_code == 200
        # accept both application/json and application/manifest+json
        ct = r.headers.get("content-type", "")
        assert "json" in ct.lower()
        data = r.json()
        assert data["name"] == "Safe Ride CMS"
        assert data["short_name"] == "SafeRide"
        assert data["display"] == "standalone"
        assert data["start_url"] == "/admin?tab=students"

    def test_index_meta_tags(self):
        r = requests.get(f"{BASE_URL}/", timeout=15)
        assert r.status_code == 200
        html = r.text
        assert 'rel="manifest"' in html
        assert 'apple-mobile-web-app-capable' in html
        assert 'apple-mobile-web-app-title' in html


# ---------------------------------------------------------------- Business Settings
class TestBusinessSettings:
    def test_business_settings_has_smtp_and_calendar_token(self, headers):
        r = requests.get(f"{BASE_URL}/api/settings/business", headers=headers, timeout=15)
        assert r.status_code == 200
        data = r.json()
        # SMTP fields still on backend model
        for f in [
            "smtp_host",
            "smtp_port",
            "smtp_username",
            "smtp_password",
            "smtp_from_email",
            "smtp_from_name",
            "smtp_use_tls",
            "email_subject_template",
            "email_body_template",
        ]:
            assert f in data, f"Missing field {f}"
        # New calendar_token backfilled
        assert "calendar_token" in data
        assert isinstance(data["calendar_token"], str)
        assert len(data["calendar_token"]) >= 16

    def test_patch_business_smtp_fields(self, headers):
        payload = {"smtp_from_name": "TEST_SafeRide_Iter35"}
        r = requests.patch(
            f"{BASE_URL}/api/settings/business",
            headers=headers,
            json=payload,
            timeout=15,
        )
        assert r.status_code == 200, r.text
        # Verify GET
        r2 = requests.get(f"{BASE_URL}/api/settings/business", headers=headers, timeout=15)
        assert r2.json()["smtp_from_name"] == "TEST_SafeRide_Iter35"


# ---------------------------------------------------------------- Appointments CRUD
class TestAppointments:
    _created_id = None

    def test_create_appointment(self, headers):
        start = (
            datetime.now(timezone.utc) + timedelta(days=2)
        ).replace(minute=0, second=0, microsecond=0).isoformat()
        payload = {
            "customer_name": "TEST_ITER35 Kunde",
            "start_datetime": start,
            "duration_min": 45,
            "pickup_location": "Bahnhof Zürich",
            "notes": "iteration 35 auto-test",
            "phone": "+41 79 000 00 00",
            "email": "test@example.com",
        }
        r = requests.post(
            f"{BASE_URL}/api/appointments",
            headers=headers,
            json=payload,
            timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["customer_name"] == "TEST_ITER35 Kunde"
        assert data["duration_min"] == 45
        assert data["status"] == "confirmed"
        assert data["source"] == "admin"
        assert "id" in data
        assert data.get("end_datetime")
        assert "_id" not in data
        TestAppointments._created_id = data["id"]

    def test_list_within_range(self, headers):
        now = datetime.now(timezone.utc)
        start = (now - timedelta(days=1)).isoformat()
        end = (now + timedelta(days=7)).isoformat()
        r = requests.get(
            f"{BASE_URL}/api/appointments?start={start}&end={end}",
            headers=headers,
            timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "appointments" in data
        assert "unscheduled" in data
        assert isinstance(data["appointments"], list)
        ids = [a["id"] for a in data["appointments"]]
        assert TestAppointments._created_id in ids

    def test_patch_appointment(self, headers):
        appt_id = TestAppointments._created_id
        assert appt_id, "prev test did not create"
        r = requests.patch(
            f"{BASE_URL}/api/appointments/{appt_id}",
            headers=headers,
            json={"notes": "TEST_ITER35 updated", "status": "pending"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["notes"] == "TEST_ITER35 updated"
        assert data["status"] == "pending"

    def test_delete_appointment(self, headers):
        appt_id = TestAppointments._created_id
        r = requests.delete(
            f"{BASE_URL}/api/appointments/{appt_id}",
            headers=headers,
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json().get("ok") is True
        # Second delete returns 404
        r2 = requests.delete(
            f"{BASE_URL}/api/appointments/{appt_id}",
            headers=headers,
            timeout=15,
        )
        assert r2.status_code == 404

    def test_create_invalid_start(self, headers):
        r = requests.post(
            f"{BASE_URL}/api/appointments",
            headers=headers,
            json={
                "customer_name": "TEST_ITER35 Bad",
                "start_datetime": "not-a-date",
                "duration_min": 60,
            },
            timeout=15,
        )
        assert r.status_code == 400


# ---------------------------------------------------------------- iCal Feed
class TestICalFeed:
    def test_public_ical_feed_valid_token(self, headers):
        # Get current token
        r = requests.get(f"{BASE_URL}/api/settings/business", headers=headers, timeout=15)
        token = r.json()["calendar_token"]
        assert token

        # Request WITHOUT auth headers
        r2 = requests.get(f"{BASE_URL}/api/calendar/{token}.ics", timeout=15)
        assert r2.status_code == 200
        assert "text/calendar" in r2.headers.get("content-type", "").lower()
        body = r2.text
        assert body.startswith("BEGIN:VCALENDAR")
        assert "END:VCALENDAR" in body

    def test_public_ical_feed_invalid_token(self):
        r = requests.get(f"{BASE_URL}/api/calendar/INVALID_TOKEN.ics", timeout=15)
        assert r.status_code == 404

    def test_regenerate_token(self, headers):
        # Get current
        r_before = requests.get(
            f"{BASE_URL}/api/settings/business", headers=headers, timeout=15
        ).json()
        old_token = r_before["calendar_token"]

        r = requests.post(
            f"{BASE_URL}/api/calendar/regenerate-token", headers=headers, timeout=15
        )
        assert r.status_code == 200, r.text
        new_token = r.json()["calendar_token"]
        assert new_token != old_token
        assert len(new_token) >= 16

        # Old token no longer valid
        r_old = requests.get(f"{BASE_URL}/api/calendar/{old_token}.ics", timeout=15)
        assert r_old.status_code == 404

        # New token works
        r_new = requests.get(f"{BASE_URL}/api/calendar/{new_token}.ics", timeout=15)
        assert r_new.status_code == 200


# ---------------------------------------------------------------- Student Summary
class TestStudentSummary:
    def _find_stefan(self, headers):
        r = requests.get(f"{BASE_URL}/api/students", headers=headers, timeout=15)
        assert r.status_code == 200
        for s in r.json():
            if (
                s.get("first_name", "").strip().lower() == "stefan"
                and s.get("last_name", "").strip().lower() == "haas"
            ):
                return s["id"]
        return None

    def test_summary_shape_and_values(self, headers):
        sid = self._find_stefan(headers)
        if not sid:
            pytest.skip("Stefan Haas not found in DB")
        r = requests.get(
            f"{BASE_URL}/api/students/{sid}/summary", headers=headers, timeout=15
        )
        assert r.status_code == 200, r.text
        data = r.json()
        for k in [
            "open_invoices_count",
            "open_invoices_sum_chf",
            "invoice_count",
            "upcoming_appointments_count",
            "next_appointment",
            "completed_appointments_count",
            "logged_lessons_count",
        ]:
            assert k in data, f"missing {k}"
        # per the spec: open_invoices_count >= 1 and logged_lessons_count > 0
        assert data["open_invoices_count"] >= 1, data
        assert data["logged_lessons_count"] > 0, data

    def test_summary_not_found(self, headers):
        r = requests.get(
            f"{BASE_URL}/api/students/DOES_NOT_EXIST/summary",
            headers=headers,
            timeout=15,
        )
        assert r.status_code == 404


# ---------------------------------------------------------------- Legacy bookings still there
class TestLegacyBookings:
    def test_bookings_router_still_alive(self, headers):
        r = requests.get(f"{BASE_URL}/api/bookings", headers=headers, timeout=15)
        assert r.status_code == 200
