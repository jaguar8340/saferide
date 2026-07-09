"""Iteration 36 – regression for drag-and-drop backend calls.

Verifies:
- PATCH /api/appointments/{id} with just {start_datetime} moves the event and
  keeps duration_min unchanged; end_datetime auto-recomputed.
- Newly patched start_datetime persists (visible in /api/appointments range list).
- Moving across days works (Do → Fr shift of +24h).
- No _id leak in response.

Also documents:
- Backend PATCH currently does NOT validate start_datetime string format
  (POST does). Frontend drag error-recovery relies on PATCH rejecting invalid
  values — noted in test report.
"""
from __future__ import annotations

import os
import re
import requests
import pytest
from datetime import datetime, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL"):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

ADMIN_EMAIL = "admin@saferide.ch"
ADMIN_PASS = "SafeRide2026!"


@pytest.fixture(scope="module")
def headers():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASS},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    tok = r.json()["access_token"]
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


def _iso_local(dt: datetime) -> str:
    """toLocalISO equivalent used by CalendarManager.jsx (no tzinfo)."""
    return dt.strftime("%Y-%m-%dT%H:%M:00")


def _parse_hm(iso: str):
    """Parse the returned start_datetime string – tolerate 'Z' or offset or naive."""
    # Extract HH:MM after 'T'
    m = re.search(r"T(\d{2}):(\d{2})", iso)
    return (int(m.group(1)), int(m.group(2))) if m else (None, None)


def _parse_date(iso: str):
    return iso[:10]


def _get_from_list(headers, appt_id, around_dt):
    """List appointments in a ±5-day window around a datetime and find the one by id."""
    start = (around_dt - timedelta(days=5)).isoformat()
    end = (around_dt + timedelta(days=5)).isoformat()
    r = requests.get(
        f"{BASE_URL}/api/appointments",
        headers=headers,
        params={"start": start, "end": end},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    for a in r.json().get("appointments", []):
        if a["id"] == appt_id:
            return a
    return None


@pytest.fixture()
def appt(headers):
    """Create a scratch appointment 3 days from now @ 09:00 local; cleanup after."""
    start_dt = (datetime.now() + timedelta(days=3)).replace(
        hour=9, minute=0, second=0, microsecond=0
    )
    payload = {
        "customer_name": "TEST_ITER36 Drag",
        "start_datetime": _iso_local(start_dt),
        "duration_min": 60,
        "pickup_location": "Bahnhof Zürich",
    }
    r = requests.post(f"{BASE_URL}/api/appointments", headers=headers, json=payload, timeout=15)
    assert r.status_code == 200, r.text
    doc = r.json()
    doc["_test_start_dt"] = start_dt
    yield doc
    try:
        requests.delete(f"{BASE_URL}/api/appointments/{doc['id']}", headers=headers, timeout=15)
    except Exception:
        pass


class TestDragPatch:
    """Backend contract that the frontend drag-and-drop relies on."""

    def test_patch_only_start_datetime_moves_slot_same_day(self, headers, appt):
        # Move 09:00 -> 12:30 (snap to 30-min slot) same day
        orig_dt = appt["_test_start_dt"]
        new_start = orig_dt.replace(hour=12, minute=30)
        r = requests.patch(
            f"{BASE_URL}/api/appointments/{appt['id']}",
            headers=headers,
            json={"start_datetime": _iso_local(new_start)},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        # Duration unchanged
        assert data["duration_min"] == 60, data
        # No _id leak
        assert "_id" not in data
        # Time reflects the move
        h, m = _parse_hm(data["start_datetime"])
        assert (h, m) == (12, 30), data["start_datetime"]
        # preferred_date + preferred_time updated
        assert data["preferred_date"] == new_start.strftime("%Y-%m-%d")
        assert data["preferred_time"] == "12:30"
        # end_datetime recomputed to +60min
        eh, em = _parse_hm(data["end_datetime"])
        assert (eh, em) == (13, 30)

        # Verify persistence via list endpoint
        listed = _get_from_list(headers, appt["id"], new_start)
        assert listed is not None
        h2, m2 = _parse_hm(listed["start_datetime"])
        assert (h2, m2) == (12, 30)

    def test_patch_start_datetime_moves_across_days(self, headers, appt):
        # Move to next day, 10:00 (Do → Fr scenario)
        orig_dt = appt["_test_start_dt"]
        next_day = orig_dt + timedelta(days=1)
        new_start = next_day.replace(hour=10, minute=0)
        r = requests.patch(
            f"{BASE_URL}/api/appointments/{appt['id']}",
            headers=headers,
            json={"start_datetime": _iso_local(new_start)},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        h, m = _parse_hm(data["start_datetime"])
        assert (h, m) == (10, 0)
        assert data["preferred_date"] == new_start.strftime("%Y-%m-%d")
        # end_datetime = start + 60 = 11:00
        eh, em = _parse_hm(data["end_datetime"])
        assert (eh, em) == (11, 0)

    def test_patch_snapshot_30min_slot_boundary(self, headers, appt):
        # 30-min slot boundary values (13:30, 14:00) — no rounding errors on server side
        orig_dt = appt["_test_start_dt"]
        for hh, mm in [(13, 30), (14, 0), (18, 30)]:
            new_start = orig_dt.replace(hour=hh, minute=mm)
            r = requests.patch(
                f"{BASE_URL}/api/appointments/{appt['id']}",
                headers=headers,
                json={"start_datetime": _iso_local(new_start)},
                timeout=15,
            )
            assert r.status_code == 200, r.text
            h, m = _parse_hm(r.json()["start_datetime"])
            assert (h, m) == (hh, mm)

    def test_patch_invalid_start_datetime_documents_current_behaviour(self, headers, appt):
        """Documents that backend PATCH currently accepts malformed start_datetime.

        POST validates via _parse_iso -> 400, but PATCH does not.
        This means the frontend's drag error-recovery/rollback for a bad server
        response will never trigger via this input. Reported as a backend gap.
        """
        r = requests.patch(
            f"{BASE_URL}/api/appointments/{appt['id']}",
            headers=headers,
            json={"start_datetime": "not-a-date"},
            timeout=15,
        )
        # We ASSERT the current (buggy) behaviour so this test is stable & the
        # gap is visible in the report. If backend gets fixed to return 400/422,
        # flip this assert.
        assert r.status_code == 200, r.text
        # Data is now corrupted — end_datetime becomes '' because _parse_iso failed
        body = r.json()
        assert body["start_datetime"] == "not-a-date"
        assert body["end_datetime"] == ""
