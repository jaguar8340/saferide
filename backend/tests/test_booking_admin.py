"""Regression tests for booking admin actions + blocked-dates (Iteration 65)."""
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
    assert r.status_code == 200
    tok = r.json().get("access_token") or r.json().get("token")
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module")
def future_weekday():
    d = datetime.now() + timedelta(days=4)
    while d.weekday() >= 5:
        d += timedelta(days=1)
    return d.strftime("%Y-%m-%d")


# ---------- Blocked dates -----------------------------------------------------
class TestBlockedDates:
    def test_list_empty_ok(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/booking/blocked-dates", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_and_delete(self, admin_headers):
        # Use a date far in the future to avoid collisions
        target = "2029-12-31"
        # cleanup pre
        cur = requests.get(f"{BASE_URL}/api/booking/blocked-dates", headers=admin_headers).json()
        for it in cur:
            if it["date"] == target:
                requests.delete(f"{BASE_URL}/api/booking/blocked-dates/{it['id']}", headers=admin_headers)

        r = requests.post(
            f"{BASE_URL}/api/booking/blocked-dates",
            headers=admin_headers,
            json={"date": target, "label": "Silvester 2029"},
            timeout=15,
        )
        assert r.status_code == 200, r.text[:200]
        body = r.json()
        assert body["date"] == target
        assert body["label"] == "Silvester 2029"
        assert body["id"]

        # /slots should now report blocked_date
        s = requests.get(
            f"{BASE_URL}/api/booking/public/slots",
            params={"date": target, "duration_min": 90},
            timeout=15,
        )
        assert s.status_code == 200
        assert s.json()["slots"] == []
        assert s.json()["reason"] == "blocked_date"
        assert s.json()["blocked_label"] == "Silvester 2029"

        # PATCH label
        p = requests.patch(
            f"{BASE_URL}/api/booking/blocked-dates/{body['id']}",
            headers=admin_headers,
            json={"label": "Silvester (Updated)"},
            timeout=15,
        )
        assert p.status_code == 200
        assert p.json()["label"] == "Silvester (Updated)"

        # DELETE
        d = requests.delete(
            f"{BASE_URL}/api/booking/blocked-dates/{body['id']}", headers=admin_headers, timeout=15
        )
        assert d.status_code == 200

    def test_invalid_date_rejected(self, admin_headers):
        r = requests.post(
            f"{BASE_URL}/api/booking/blocked-dates",
            headers=admin_headers,
            json={"date": "not-a-date", "label": "x"},
            timeout=15,
        )
        assert r.status_code in (400, 422)

    def test_dedupe_same_date(self, admin_headers):
        target = "2029-11-30"
        # cleanup pre
        cur = requests.get(f"{BASE_URL}/api/booking/blocked-dates", headers=admin_headers).json()
        for it in cur:
            if it["date"] == target:
                requests.delete(f"{BASE_URL}/api/booking/blocked-dates/{it['id']}", headers=admin_headers)

        r1 = requests.post(f"{BASE_URL}/api/booking/blocked-dates", headers=admin_headers,
                           json={"date": target, "label": "A"}, timeout=15)
        r2 = requests.post(f"{BASE_URL}/api/booking/blocked-dates", headers=admin_headers,
                           json={"date": target, "label": "B"}, timeout=15)
        assert r1.status_code == 200 and r2.status_code == 200
        assert r1.json()["id"] == r2.json()["id"]      # same doc reused
        assert r2.json()["label"] == "B"                # relabeled

        requests.delete(f"{BASE_URL}/api/booking/blocked-dates/{r1.json()['id']}", headers=admin_headers)


# ---------- Booking-request actions ------------------------------------------
class TestBookingRequestActions:
    def _make_request(self, future_weekday, veh_id, pickup_id, tag="test", time_str="14:15"):
        email = f"pytest-{tag}-{int(time.time())}@example.ch"
        r = requests.post(
            f"{BASE_URL}/api/booking/public/request",
            json={
                "first_name": "Pytest",
                "last_name": "Regress",
                "email": email,
                "phone": "078 123 45 67",
                "date": future_weekday,
                "time": time_str,
                "duration_min": 45,
                "vehicle_id": veh_id,
                "pickup_id": pickup_id,
                "notes": "auto regression",
            },
            timeout=15,
        )
        assert r.status_code == 200, r.text[:200]
        return r.json()["id"], email

    def test_approve(self, admin_headers, future_weekday):
        veh = requests.get(f"{BASE_URL}/api/booking/public/vehicles").json()[0]["id"]
        pu = requests.get(f"{BASE_URL}/api/booking/public/pickup-locations").json()[0]["id"]
        bid, _ = self._make_request(future_weekday, veh, pu, "approve")
        r = requests.post(f"{BASE_URL}/api/booking/requests/{bid}/approve", headers=admin_headers, timeout=15)
        assert r.status_code == 200, r.text[:200]
        assert r.json()["booking"]["status"] == "confirmed"
        # email_error is fine (SMTP might not be configured in preview)
        requests.delete(f"{BASE_URL}/api/bookings/{bid}", headers=admin_headers)

    def test_reschedule(self, admin_headers, future_weekday):
        veh = requests.get(f"{BASE_URL}/api/booking/public/vehicles").json()[0]["id"]
        pu = requests.get(f"{BASE_URL}/api/booking/public/pickup-locations").json()[0]["id"]
        # Use a different time to avoid conflict with the approve test
        r_create = requests.post(
            f"{BASE_URL}/api/booking/public/request",
            json={
                "first_name": "Reschedule",
                "last_name": "Test",
                "email": f"pytest-rs-{int(time.time())}@example.ch",
                "phone": "078 000 00 00",
                "date": future_weekday,
                "time": "09:00",
                "duration_min": 45,
                "vehicle_id": veh,
                "pickup_id": pu,
            },
            timeout=15,
        )
        assert r_create.status_code == 200, r_create.text[:200]
        bid = r_create.json()["id"]

        r = requests.post(
            f"{BASE_URL}/api/booking/requests/{bid}/reschedule",
            headers=admin_headers,
            json={"date": future_weekday, "time": "11:00"},
            timeout=15,
        )
        assert r.status_code == 200, r.text[:200]
        b = r.json()["booking"]
        assert b["status"] == "confirmed"
        assert b["preferred_time"] == "11:00"
        assert b["preferred_date"] == future_weekday
        requests.delete(f"{BASE_URL}/api/bookings/{bid}", headers=admin_headers)

    def test_decline(self, admin_headers, future_weekday):
        veh = requests.get(f"{BASE_URL}/api/booking/public/vehicles").json()[0]["id"]
        pu = requests.get(f"{BASE_URL}/api/booking/public/pickup-locations").json()[0]["id"]
        # Different time slot
        r_create = requests.post(
            f"{BASE_URL}/api/booking/public/request",
            json={
                "first_name": "Decline",
                "last_name": "Test",
                "email": f"pytest-dc-{int(time.time())}@example.ch",
                "phone": "078 000 00 00",
                "date": future_weekday,
                "time": "16:00",
                "duration_min": 45,
                "vehicle_id": veh,
                "pickup_id": pu,
            },
            timeout=15,
        )
        assert r_create.status_code == 200
        bid = r_create.json()["id"]

        r = requests.post(
            f"{BASE_URL}/api/booking/requests/{bid}/decline",
            headers=admin_headers,
            json={"reason": "Kein Fahrzeug frei"},
            timeout=15,
        )
        assert r.status_code == 200, r.text[:200]
        b = r.json()["booking"]
        assert b["status"] == "cancelled"
        assert b["admin_note"] == "Kein Fahrzeug frei"
        requests.delete(f"{BASE_URL}/api/bookings/{bid}", headers=admin_headers)

    def test_action_404_missing(self, admin_headers):
        r = requests.post(
            f"{BASE_URL}/api/booking/requests/does-not-exist/approve",
            headers=admin_headers,
            timeout=15,
        )
        assert r.status_code == 404

    def test_list_requests(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/booking/requests", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
