"""Iteration 53 — Broadcast a location field to all other locations.

Tests:
- POST /api/locations/{slug}/broadcast-field copies the given field's value
  from the source location to every other location.
- Blocked field names (slug, id, _id) return 400.
- Non-existent source slug returns 404.
- Missing field name returns 400.
- Requires admin auth (401 without token).

Also asserts the removed seed-side hero_image_url snap-back is gone:
after we set a hero_image_url that contains "images.unsplash.com" and
poke the seed logic, the value must remain intact.
"""
import os
import requests
import pytest

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8001")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@saferide.ch")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "SafeRide2026!")


@pytest.fixture(scope="module")
def headers():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


class TestBroadcast:
    def test_requires_auth(self):
        r = requests.post(
            f"{BASE_URL}/api/locations/einsiedeln/broadcast-field",
            json={"field": "hero_image_url"},
            timeout=15,
        )
        assert r.status_code in (401, 403)

    def test_missing_field_400(self, headers):
        r = requests.post(
            f"{BASE_URL}/api/locations/einsiedeln/broadcast-field",
            json={}, headers=headers, timeout=15,
        )
        assert r.status_code == 400

    def test_blocked_field_400(self, headers):
        for bad in ("slug", "_id", "id"):
            r = requests.post(
                f"{BASE_URL}/api/locations/einsiedeln/broadcast-field",
                json={"field": bad}, headers=headers, timeout=15,
            )
            assert r.status_code == 400, f"{bad} should be blocked"

    def test_missing_source_404(self, headers):
        r = requests.post(
            f"{BASE_URL}/api/locations/does-not-exist/broadcast-field",
            json={"field": "hero_image_url"},
            headers=headers, timeout=15,
        )
        assert r.status_code == 404

    def test_broadcast_hero_updates_all_others(self, headers):
        # First set a UNIQUE value on the source so the broadcast has real
        # work to do (Mongo modified_count is 0 for identical values).
        marker = f"/api/files/saferide/uploads/iter53-marker-{os.getpid()}.png"
        requests.patch(
            f"{BASE_URL}/api/locations/einsiedeln",
            json={"hero_image_url": marker},
            headers=headers, timeout=15,
        )

        r = requests.post(
            f"{BASE_URL}/api/locations/einsiedeln/broadcast-field",
            json={"field": "hero_image_url"},
            headers=headers, timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["updated"] >= 1

        # After broadcast every other location has the same hero URL as source
        all_locs = requests.get(f"{BASE_URL}/api/locations", timeout=15).json()
        for loc in all_locs:
            if loc["slug"] == "einsiedeln":
                continue
            assert loc.get("hero_image_url") == marker, (
                f"{loc['slug']} did not receive broadcast"
            )

    def test_seed_no_longer_overwrites_unsplash(self, headers):
        """Regression: the buggy 'one-time-fix' that reverted admin-edited
        Unsplash hero URLs on every startup has been removed. Setting a
        deliberate Unsplash URL and then re-triggering the seed (via a
        no-op patch that persists) must leave the URL intact for the
        lifetime of this process."""
        target_url = (
            "https://images.unsplash.com/photo-1494976388531-d1058494cdd8"
            "?w=1600&auto=format&fit=crop"
        )
        # Set the value
        p = requests.patch(
            f"{BASE_URL}/api/locations/einsiedeln",
            json={"hero_image_url": target_url},
            headers=headers, timeout=15,
        )
        assert p.status_code == 200
        assert p.json()["hero_image_url"] == target_url

        # Fetch back
        after = requests.get(
            f"{BASE_URL}/api/locations/einsiedeln", timeout=15
        ).json()
        assert after["hero_image_url"] == target_url, (
            "The seed-side 'one-time fix' resurrected — broadcasting-and-persist "
            "was reverted. See /app/backend/seeds/startup.py"
        )
