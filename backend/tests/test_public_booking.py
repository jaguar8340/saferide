"""Regression tests for the new public online-booking endpoints (Phase 2).

Covers:
  * GET  /api/booking/public/vehicles         – active vehicles list
  * GET  /api/booking/public/pickup-locations – locations list
  * GET  /api/booking/public/slots            – intelligent slot algorithm
  * POST /api/booking/public/request          – submit a booking request
  * GET  /api/booking/availability            – admin CRUD used by settings UI
"""
import os
import time
from datetime import datetime, timedelta

import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://driving-school-cms.preview.emergentagent.com",
).rstrip("/")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@saferide.ch")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "SafeRide2026!")


@pytest.fixture(scope="module")
def admin_headers():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, r.text[:200]
    tok = r.json().get("access_token") or r.json().get("token")
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module")
def future_date():
    """Pick a weekday (Mon–Fri) safely in the future so slots are open."""
    d = datetime.now() + timedelta(days=3)
    while d.weekday() >= 5:  # Skip Sat/Sun (Sunday closed in seed)
        d += timedelta(days=1)
    return d.strftime("%Y-%m-%d")


class TestPublicListings:
    def test_public_vehicles(self):
        r = requests.get(f"{BASE_URL}/api/booking/public/vehicles", timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        # Seeded default set has 3 vehicles (Audi Automat, Opel Handschaltung, Range Rover Anhänger)
        assert len(items) >= 3
        keys = set(items[0].keys())
        assert {"id", "name", "transmission", "category", "allowed_durations"} <= keys

    def test_public_pickup_locations(self):
        r = requests.get(f"{BASE_URL}/api/booking/public/pickup-locations", timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        # 3 seeded: Pfäffikon SZ, Lachen SZ, Chur GR
        assert len(items) >= 3
        for it in items:
            assert "id" in it
            assert "name" in it


class TestSlots:
    def test_slots_valid_weekday(self, future_date):
        r = requests.get(
            f"{BASE_URL}/api/booking/public/slots",
            params={"date": future_date, "duration_min": 90},
            timeout=15,
        )
        assert r.status_code == 200, r.text[:200]
        body = r.json()
        assert "slots" in body
        assert isinstance(body["slots"], list)
        # A weekday with default 08:00–18:00 hours has plenty of 90-min slots
        assert len(body["slots"]) > 5
        # All slots are HH:MM strings
        assert all(len(s) == 5 and s[2] == ":" for s in body["slots"])

    def test_slots_invalid_date(self):
        r = requests.get(
            f"{BASE_URL}/api/booking/public/slots",
            params={"date": "not-a-date", "duration_min": 90},
            timeout=15,
        )
        assert r.status_code == 400

    def test_slots_past_date(self):
        past = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        r = requests.get(
            f"{BASE_URL}/api/booking/public/slots",
            params={"date": past, "duration_min": 90},
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["slots"] == []
        assert r.json().get("reason") == "past_date"

    def test_slots_closed_day_sunday(self):
        # Find next Sunday
        d = datetime.now() + timedelta(days=1)
        while d.weekday() != 6:
            d += timedelta(days=1)
        r = requests.get(
            f"{BASE_URL}/api/booking/public/slots",
            params={"date": d.strftime("%Y-%m-%d"), "duration_min": 90},
            timeout=15,
        )
        assert r.status_code == 200
        # Default seed has Sunday closed
        body = r.json()
        assert body["slots"] == []
        assert body.get("reason") == "closed_day"


class TestBookingRequest:
    def test_full_roundtrip(self, admin_headers, future_date):
        """Post a request, verify slot is consumed, then cleanup."""
        # Grab vehicle + pickup ids
        vs = requests.get(f"{BASE_URL}/api/booking/public/vehicles", timeout=15).json()
        ps = requests.get(f"{BASE_URL}/api/booking/public/pickup-locations", timeout=15).json()
        vid = vs[0]["id"]
        pid = ps[0]["id"]

        # Check slots BEFORE booking
        before = requests.get(
            f"{BASE_URL}/api/booking/public/slots",
            params={"date": future_date, "duration_min": 90, "pickup_id": pid},
            timeout=15,
        ).json()
        # Pick a slot in the middle of the day so buffer effects don't hide it
        candidate = None
        for s in before["slots"]:
            if s.startswith("14:") or s.startswith("15:"):
                candidate = s
                break
        assert candidate, f"could not find a mid-afternoon slot in {before['slots']}"

        # POST the request
        email = f"pytest-wizard-{int(time.time())}@example.ch"
        r = requests.post(
            f"{BASE_URL}/api/booking/public/request",
            json={
                "first_name": "Pytest",
                "last_name": "Wizard",
                "email": email,
                "phone": "078 123 45 67",
                "date": future_date,
                "time": candidate,
                "duration_min": 90,
                "vehicle_id": vid,
                "pickup_id": pid,
                "notes": "automated regression test",
            },
            timeout=15,
        )
        assert r.status_code == 200, r.text[:200]
        booking_id = r.json()["id"]

        # Slot should now be gone
        after = requests.get(
            f"{BASE_URL}/api/booking/public/slots",
            params={"date": future_date, "duration_min": 90, "pickup_id": pid},
            timeout=15,
        ).json()
        assert candidate not in after["slots"], (
            f"slot {candidate} still available after booking; "
            f"before={len(before['slots'])} after={len(after['slots'])}"
        )
        # Ideally we get fewer slots after (blocked 90-min slot + buffer)
        assert len(after["slots"]) < len(before["slots"])

        # Verify the booking appears in admin list
        adm = requests.get(f"{BASE_URL}/api/bookings", headers=admin_headers, timeout=15)
        assert adm.status_code == 200
        found = next((b for b in adm.json() if b["id"] == booking_id), None)
        assert found is not None
        assert found["status"] == "pending"
        assert found["source"] == "public"
        assert found["vehicle_id"] == vid
        assert found["pickup_id"] == pid

        # Cleanup
        d = requests.delete(f"{BASE_URL}/api/bookings/{booking_id}", headers=admin_headers, timeout=15)
        assert d.status_code == 200

    def test_invalid_date(self):
        r = requests.post(
            f"{BASE_URL}/api/booking/public/request",
            json={
                "first_name": "X",
                "last_name": "Y",
                "email": "x@example.ch",
                "phone": "078 000 00 00",
                "date": "2020",
                "time": "10:00",
                "duration_min": 45,
            },
            timeout=15,
        )
        # Pydantic min_length rejects (422), our regex rejects (400) – either is acceptable
        assert r.status_code in (400, 422)

    def test_invalid_time(self, future_date):
        r = requests.post(
            f"{BASE_URL}/api/booking/public/request",
            json={
                "first_name": "X",
                "last_name": "Y",
                "email": "x@example.ch",
                "phone": "078 000 00 00",
                "date": future_date,
                "time": "invalid",
                "duration_min": 45,
            },
            timeout=15,
        )
        assert r.status_code in (400, 422)


class TestAdminBookingSettings:
    def test_availability_seed(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/booking/availability", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert len(body["weekdays"]) == 7
        assert body["default_buffer_min"] >= 0

    def test_vehicles_admin_list(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/booking/vehicles", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_email_templates_list(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/booking/email-templates", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        kinds = {t["kind"] for t in r.json()}
        assert {"requested", "confirmed", "rescheduled", "cancelled"} <= kinds
