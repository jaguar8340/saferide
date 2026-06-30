"""Backend tests for Iteration 14:
- POST /api/bookings persists `location_slug` correctly (incl. empty string)
- DELETE /api/bookings/{id} cleans up
- Sentinel '__any' from the UI MUST be mapped to '' on the client (verified via UI test).
  Defensive check here: ensure the API accepts location_slug='' and stores it as falsy.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    from pathlib import Path
    fe_env = Path("/app/frontend/.env").read_text()
    for line in fe_env.splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

ADMIN_EMAIL = "admin@saferide.ch"
ADMIN_PASS = "SafeRide2026!"


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_headers(api):
    r = api.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    token = r.json().get("access_token") or r.json().get("token")
    assert token
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------- Bookings: location_slug persistence ----------

class TestBookingLocationSlug:
    """Verifies that the new Shadcn-Select Standort dropdown maps to a server-stored
    location_slug correctly. Tests three shapes: specific slug, empty (= '__any'
    mapped client-side), and absent field."""

    def _make_payload(self, **overrides):
        base = {
            "first_name": "TESTQA14",
            "last_name": "Iteration",
            "email": "qa14@example.com",
            "phone": "+41 79 000 00 00",
            "preferred_date": "2027-07-20",
            "preferred_time": "10:00",
            "message": "iter14 location_slug test",
            "package_slug": "probelektion-50",
        }
        base.update(overrides)
        return base

    def test_booking_with_specific_location(self, api, admin_headers):
        payload = self._make_payload(location_slug="einsiedeln")
        r = api.post(f"{BASE_URL}/api/bookings", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        booking_id = data["id"]
        # verify via admin GET
        lst = api.get(f"{BASE_URL}/api/bookings", headers=admin_headers)
        assert lst.status_code == 200
        match = next((b for b in lst.json() if b["id"] == booking_id), None)
        assert match is not None
        assert match["location_slug"] == "einsiedeln"
        # cleanup
        d = api.delete(f"{BASE_URL}/api/bookings/{booking_id}", headers=admin_headers)
        assert d.status_code == 200

    def test_booking_with_empty_location(self, api, admin_headers):
        """When the UI Select is on 'Beliebig / keine Präferenz' (sentinel '__any'),
        the BuchungPage submits location_slug=''. Server should NOT receive '__any'."""
        payload = self._make_payload(location_slug="")
        r = api.post(f"{BASE_URL}/api/bookings", json=payload)
        assert r.status_code == 200, r.text
        booking_id = r.json()["id"]
        lst = api.get(f"{BASE_URL}/api/bookings", headers=admin_headers)
        match = next((b for b in lst.json() if b["id"] == booking_id), None)
        assert match is not None
        assert match.get("location_slug", "") in ("", None)
        assert match.get("location_slug") != "__any"
        api.delete(f"{BASE_URL}/api/bookings/{booking_id}", headers=admin_headers)

    def test_booking_without_location_field(self, api, admin_headers):
        payload = self._make_payload()
        payload.pop("location_slug", None)
        r = api.post(f"{BASE_URL}/api/bookings", json=payload)
        assert r.status_code == 200, r.text
        booking_id = r.json()["id"]
        lst = api.get(f"{BASE_URL}/api/bookings", headers=admin_headers)
        match = next((b for b in lst.json() if b["id"] == booking_id), None)
        assert match is not None
        assert match.get("location_slug", "") in ("", None)
        api.delete(f"{BASE_URL}/api/bookings/{booking_id}", headers=admin_headers)


# ---------- Contact phone (used by WhatsAppFab) ----------

class TestContactPhoneForWhatsApp:
    """The WhatsAppFab sources phone digits from content.contact.phone (or .whatsapp).
    Validate the field exists and sanitizes to digits."""

    def test_content_has_contact_phone(self, api):
        r = api.get(f"{BASE_URL}/api/content")
        assert r.status_code == 200
        data = r.json()
        contact = data.get("contact") or {}
        phone = contact.get("phone") or contact.get("whatsapp")
        assert phone, f"No phone in content.contact: {contact}"
        digits = "".join(ch for ch in phone if ch.isdigit())
        assert len(digits) >= 9, f"Phone digits too short for wa.me URL: {phone}"

    def test_locations_endpoint_for_buchung(self, api):
        """BuchungPage Standort dropdown sources from /api/locations or /api/content.locations."""
        # Try /api/locations first
        r = api.get(f"{BASE_URL}/api/locations")
        if r.status_code == 200:
            data = r.json()
            assert isinstance(data, list)
            slugs = {l.get("slug") for l in data}
            assert "einsiedeln" in slugs, f"einsiedeln not in locations: {slugs}"
        else:
            # fallback: locations may be embedded in content
            r2 = api.get(f"{BASE_URL}/api/content")
            assert r2.status_code == 200
            locs = (r2.json() or {}).get("locations") or []
            slugs = {l.get("slug") for l in locs}
            assert "einsiedeln" in slugs, f"einsiedeln not in content.locations: {slugs}"
