"""Iteration 56.5 — Calendar improvements: block-time entry_type, upcoming
endpoint (list view), external iCal feed subscription."""
import os
import requests
import pytest

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8001")
ADMIN_EMAIL = "admin@saferide.ch"
ADMIN_PASSWORD = "SafeRide2026!"


@pytest.fixture(scope="module")
def headers():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


class TestBlockTimeEntry:
    def test_create_block_without_customer_name(self, headers):
        r = requests.post(
            f"{BASE_URL}/api/appointments",
            json={
                "start_datetime": "2026-12-15T10:00:00",
                "duration_min": 60,
                "entry_type": "block",
                "notes": "Test-Blockzeit",
            },
            headers=headers, timeout=15,
        )
        assert r.status_code == 200, r.text
        doc = r.json()
        assert doc["entry_type"] == "block"
        assert doc["customer_name"] == "Blockzeit"      # Default-Titel
        # Cleanup
        requests.delete(f"{BASE_URL}/api/appointments/{doc['id']}", headers=headers, timeout=15)

    def test_create_appointment_still_requires_name(self, headers):
        r = requests.post(
            f"{BASE_URL}/api/appointments",
            json={
                "start_datetime": "2026-12-15T10:00:00",
                "duration_min": 60,
                "entry_type": "appointment",
                "notes": "no name",
            },
            headers=headers, timeout=15,
        )
        assert r.status_code == 400, r.text
        assert "Kunde" in r.text

    def test_create_block_with_custom_title(self, headers):
        r = requests.post(
            f"{BASE_URL}/api/appointments",
            json={
                "start_datetime": "2026-12-15T10:00:00",
                "duration_min": 60,
                "entry_type": "block",
                "customer_name": "Zahnarzt-Termin",
            },
            headers=headers, timeout=15,
        )
        doc = r.json()
        assert doc["customer_name"] == "Zahnarzt-Termin"
        requests.delete(f"{BASE_URL}/api/appointments/{doc['id']}", headers=headers, timeout=15)


class TestUpcomingEndpoint:
    def test_upcoming_returns_sorted_list(self, headers):
        # Create two future events at different dates
        a = requests.post(
            f"{BASE_URL}/api/appointments",
            json={"customer_name": "Später B", "start_datetime": "2027-06-01T10:00:00", "duration_min": 60},
            headers=headers, timeout=15,
        ).json()
        b = requests.post(
            f"{BASE_URL}/api/appointments",
            json={"customer_name": "Früher A", "start_datetime": "2027-01-01T10:00:00", "duration_min": 60},
            headers=headers, timeout=15,
        ).json()
        try:
            r = requests.get(
                f"{BASE_URL}/api/appointments/upcoming?limit=100",
                headers=headers, timeout=15,
            ).json()
            names = [x.get("customer_name") or "" for x in r["appointments"]]
            # „Früher A" must appear before „Später B"
            i_a = names.index("Früher A")
            i_b = names.index("Später B")
            assert i_a < i_b, f"upcoming not sorted: {names}"
        finally:
            requests.delete(f"{BASE_URL}/api/appointments/{a['id']}", headers=headers, timeout=15)
            requests.delete(f"{BASE_URL}/api/appointments/{b['id']}", headers=headers, timeout=15)


class TestExternalIcalFeeds:
    def test_feed_crud(self, headers):
        # Empty at start (best-effort — clean the list)
        current = requests.get(f"{BASE_URL}/api/calendar/external-feeds", headers=headers, timeout=15).json()
        for _ in range(len(current.get("urls", []))):
            requests.delete(f"{BASE_URL}/api/calendar/external-feeds/0", headers=headers, timeout=15)

        # Add invalid but well-formed URL
        r = requests.post(
            f"{BASE_URL}/api/calendar/external-feeds",
            json={"url": "https://example.com/does-not-exist.ics"},
            headers=headers, timeout=30,
        )
        assert r.status_code == 200
        assert "https://example.com/does-not-exist.ics" in r.json()["urls"]
        # events_found should be 0 (unreachable feed = fail silently)
        assert r.json()["events_found"] == 0

        # Duplicate → 400
        r2 = requests.post(
            f"{BASE_URL}/api/calendar/external-feeds",
            json={"url": "https://example.com/does-not-exist.ics"},
            headers=headers, timeout=15,
        )
        assert r2.status_code == 400

        # Appointments endpoint must include `external` key
        appt = requests.get(
            f"{BASE_URL}/api/appointments",
            params={"start": "2026-01-01T00:00:00", "end": "2027-01-01T00:00:00"},
            headers=headers, timeout=15,
        ).json()
        assert "external" in appt
        assert isinstance(appt["external"], list)

        # Delete feed
        d = requests.delete(f"{BASE_URL}/api/calendar/external-feeds/0", headers=headers, timeout=15)
        assert d.status_code == 200
        assert "https://example.com/does-not-exist.ics" not in d.json()["urls"]
