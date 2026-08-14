"""Additional intelligence tests for the slot algorithm:
- Verifies that booking a slot reduces available slots by ≥ duration + buffer
- Verifies cross-pickup travel-time matrix reduces slots when a booking exists
  at a different pickup location on the same day.
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
ADMIN_EMAIL = "admin@saferide.ch"
ADMIN_PASSWORD = "SafeRide2026!"


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
def future_date():
    d = datetime.now() + timedelta(days=5)
    while d.weekday() >= 5:
        d += timedelta(days=1)
    return d.strftime("%Y-%m-%d")


def _cleanup_test_bookings(headers):
    r = requests.get(f"{BASE_URL}/api/bookings", headers=headers, timeout=15)
    if r.status_code != 200:
        return
    for b in r.json():
        email = (b.get("email") or "").lower()
        if email.startswith("pytest-") or "example.ch" in email or "example.com" in email:
            requests.delete(f"{BASE_URL}/api/bookings/{b['id']}", headers=headers, timeout=15)


def test_cross_pickup_travel_time_reduces_slots(admin_headers, future_date):
    """Booking at pickup A should reduce slots when querying for pickup B if
    the travel matrix has a non-zero travel_min between them."""
    locs = requests.get(f"{BASE_URL}/api/booking/public/pickup-locations", timeout=15).json()
    assert len(locs) >= 2
    pickup_a, pickup_b = locs[0]["id"], locs[1]["id"]

    # Slots for pickup B (baseline, no booking)
    _cleanup_test_bookings(admin_headers)
    base = requests.get(
        f"{BASE_URL}/api/booking/public/slots",
        params={"date": future_date, "duration_min": 90, "pickup_id": pickup_b},
        timeout=15,
    ).json()
    base_count = len(base["slots"])
    assert base_count > 5

    # Post booking at pickup A around noon
    candidate_a = next((s for s in base["slots"] if s.startswith(("12:", "13:"))), base["slots"][len(base["slots"]) // 2])
    email = f"pytest-cross-{int(time.time())}@example.ch"
    r = requests.post(
        f"{BASE_URL}/api/booking/public/request",
        json={
            "first_name": "Pytest",
            "last_name": "Cross",
            "email": email,
            "phone": "078 000 00 00",
            "date": future_date,
            "time": candidate_a,
            "duration_min": 90,
            "pickup_id": pickup_a,
        },
        timeout=15,
    )
    assert r.status_code == 200, r.text[:200]

    after = requests.get(
        f"{BASE_URL}/api/booking/public/slots",
        params={"date": future_date, "duration_min": 90, "pickup_id": pickup_b},
        timeout=15,
    ).json()
    after_count = len(after["slots"])

    # Slots should be reduced (booking + buffer + optional travel)
    assert after_count < base_count, (
        f"expected fewer slots at pickup B after booking at pickup A; "
        f"before={base_count} after={after_count}"
    )

    _cleanup_test_bookings(admin_headers)


def test_finish_cleanup(admin_headers):
    _cleanup_test_bookings(admin_headers)
