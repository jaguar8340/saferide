"""Regression tests for iCal-Feed integration into the public slot algorithm.

Serves a fake iCal file over http.server on a free local port, registers it
as an external feed for the admin, then verifies that the affected slots
disappear from `/api/booking/public/slots` and that a `POST /request`
overlapping the private event is rejected with 409.
"""
import contextlib
import os
import socket
import threading
import time
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

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
    d = datetime.now() + timedelta(days=6)
    while d.weekday() >= 5:
        d += timedelta(days=1)
    return d.strftime("%Y-%m-%d")


def _free_port() -> int:
    with contextlib.closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as s:
        s.bind(("", 0))
        return s.getsockname()[1]


def _ical_body(date_iso: str, start_hhmm: str = "1400", end_hhmm: str = "1600") -> bytes:
    """Build a minimal valid VCALENDAR/VEVENT for the given day."""
    d = date_iso.replace("-", "")
    dtstamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    return (
        f"BEGIN:VCALENDAR\r\n"
        f"VERSION:2.0\r\n"
        f"PRODID:-//pytest//iCal Test//DE\r\n"
        f"BEGIN:VEVENT\r\n"
        f"UID:pytest-ical-{d}-{start_hhmm}@example.com\r\n"
        f"DTSTAMP:{dtstamp}\r\n"
        f"DTSTART:{d}T{start_hhmm}00Z\r\n"
        f"DTEND:{d}T{end_hhmm}00Z\r\n"
        f"SUMMARY:Zahnarzttermin (privat)\r\n"
        f"END:VEVENT\r\n"
        f"END:VCALENDAR\r\n"
    ).encode()


@pytest.fixture
def ical_server(future_weekday):
    """Serve a fake iCal file for the future weekday at 14:00-16:00 UTC."""
    body = _ical_body(future_weekday, "1400", "1600")

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):  # noqa: N802 — required signature
            self.send_response(200)
            self.send_header("Content-Type", "text/calendar; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args, **kwargs):
            pass

    port = _free_port()
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    time.sleep(0.2)
    yield f"http://127.0.0.1:{port}/private.ics"
    server.shutdown()


@pytest.fixture
def registered_feed(admin_headers, ical_server):
    """Register the feed with the admin and force a refresh; unregister after."""
    r = requests.post(
        f"{BASE_URL}/api/calendar/external-feeds",
        headers=admin_headers,
        json={"url": ical_server},
        timeout=15,
    )
    assert r.status_code == 200, r.text[:200]
    # Force the cache to refresh so /slots sees the new event immediately
    requests.post(
        f"{BASE_URL}/api/calendar/external-feeds/refresh", headers=admin_headers, timeout=20
    )
    yield ical_server
    # Cleanup — find our URL index and remove
    listing = requests.get(
        f"{BASE_URL}/api/calendar/external-feeds", headers=admin_headers, timeout=15
    ).json()
    urls = listing.get("urls", [])
    if ical_server in urls:
        idx = urls.index(ical_server)
        requests.delete(
            f"{BASE_URL}/api/calendar/external-feeds/{idx}", headers=admin_headers, timeout=15
        )
    requests.post(
        f"{BASE_URL}/api/calendar/external-feeds/refresh", headers=admin_headers, timeout=15
    )


class TestICalIntegration:
    """NOTE: These tests only run when the backend can reach the localhost
    port serving the mock iCal. In hosted preview environments the backend
    resolves 127.0.0.1 to itself, which is exactly what we want because
    tests run on the same host as the backend."""

    def test_slot_blocked_by_ical(self, registered_feed, future_weekday):
        # The iCal event covers 14:00–16:00 UTC. UTC lines up with local time in
        # this codebase because bookings are stored without tz.
        r = requests.get(
            f"{BASE_URL}/api/booking/public/slots",
            params={"date": future_weekday, "duration_min": 45},
            timeout=15,
        )
        assert r.status_code == 200, r.text[:200]
        slots = r.json()["slots"]
        assert "14:00" not in slots, f"14:00 should be blocked by iCal, got {slots}"
        assert "14:30" not in slots, f"14:30 should be blocked by iCal, got {slots}"
        assert "15:30" not in slots, f"15:30 should be blocked by iCal, got {slots}"
        # 16:00 needs default_buffer_min (15) so 16:00 is likely still blocked
        # but 16:15 or later should be fine.

    def test_post_request_rejects_overlap(self, admin_headers, registered_feed, future_weekday):
        vs = requests.get(f"{BASE_URL}/api/booking/public/vehicles", timeout=15).json()
        ps = requests.get(f"{BASE_URL}/api/booking/public/pickup-locations", timeout=15).json()
        r = requests.post(
            f"{BASE_URL}/api/booking/public/request",
            json={
                "first_name": "Pytest",
                "last_name": "Overlap",
                "email": f"pytest-ical-overlap-{int(time.time())}@example.ch",
                "phone": "078 000 00 00",
                "date": future_weekday,
                "time": "14:30",   # right in the middle of the private event
                "duration_min": 45,
                "vehicle_id": vs[0]["id"],
                "pickup_id": ps[0]["id"],
            },
            timeout=15,
        )
        assert r.status_code == 409, r.text[:200]
        assert "belegt" in r.json().get("detail", "").lower()

    def test_post_request_allows_non_overlap(
        self, admin_headers, registered_feed, future_weekday
    ):
        """A slot outside the private event window (e.g. 09:00) must still succeed."""
        vs = requests.get(f"{BASE_URL}/api/booking/public/vehicles", timeout=15).json()
        ps = requests.get(f"{BASE_URL}/api/booking/public/pickup-locations", timeout=15).json()
        # Grab a still-free morning slot
        s = requests.get(
            f"{BASE_URL}/api/booking/public/slots",
            params={"date": future_weekday, "duration_min": 45},
            timeout=15,
        ).json()
        candidate = next((x for x in s["slots"] if x < "12:00"), None)
        assert candidate, f"expected a morning slot, got {s['slots'][:10]}"

        r = requests.post(
            f"{BASE_URL}/api/booking/public/request",
            json={
                "first_name": "Pytest",
                "last_name": "Morning",
                "email": f"pytest-ical-morning-{int(time.time())}@example.ch",
                "phone": "078 000 00 00",
                "date": future_weekday,
                "time": candidate,
                "duration_min": 45,
                "vehicle_id": vs[0]["id"],
                "pickup_id": ps[0]["id"],
            },
            timeout=15,
        )
        assert r.status_code == 200, r.text[:200]
        # cleanup
        requests.delete(
            f"{BASE_URL}/api/bookings/{r.json()['id']}",
            headers=admin_headers,
            timeout=15,
        )
