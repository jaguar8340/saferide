"""Iteration 8 backend tests – Verify:
- All 11 location pages return 200
- Nadine block is GLOBAL (in /api/content, NOT in /api/locations/{slug})
- PATCH /api/content updates nadine.* keys end-to-end
- PATCH /api/locations/{slug} for location-specific fields persists
- Contact form POST, auth, content GET
"""
import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else "https://driving-school-cms.preview.emergentagent.com"
ADMIN_EMAIL = "admin@saferide.ch"
ADMIN_PASSWORD = "SafeRide2026!"

# 11 dynamic slugs (no fahrschule- prefix in slug field)
EXPECTED_SLUGS = [
    "einsiedeln", "siebnen", "lachen", "waedenswil", "horgen",
    "altendorf", "chur", "lenzerheide", "rapperswil",
    "pfaeffikon-sz", "richterswil",
]


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="session")
def token(s):
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# === health / public endpoints ===
class TestPublic:
    def test_content_returns_nadine(self, s):
        r = s.get(f"{BASE_URL}/api/content")
        assert r.status_code == 200
        data = r.json()
        assert "nadine" in data, "nadine block must exist in /api/content"
        assert "intro_title_de" in data["nadine"]
        assert "intro_title_en" in data["nadine"]

    def test_locations_list_has_11(self, s):
        r = s.get(f"{BASE_URL}/api/locations")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 11, f"expected 11 locations got {len(data)}"
        slugs = sorted([l["slug"] for l in data])
        assert slugs == sorted(EXPECTED_SLUGS), f"slug mismatch: {slugs}"

    @pytest.mark.parametrize("slug", EXPECTED_SLUGS)
    def test_each_location_200(self, s, slug):
        r = s.get(f"{BASE_URL}/api/locations/{slug}")
        assert r.status_code == 200, f"{slug} -> {r.status_code}"
        data = r.json()
        # Must have core required fields
        for f in ["slug", "name", "hero_title_de", "ideal_for_points_de", "exam_routes", "faqs"]:
            assert f in data, f"{slug} missing {f}"
        # Must NOT contain a nadine sub-block (it's global)
        assert "nadine" not in data, f"{slug} should NOT contain nadine block (it is global)"


# === auth ===
class TestAuth:
    def test_login_success(self, s):
        r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        body = r.json()
        assert "access_token" in body
        assert isinstance(body["access_token"], str) and len(body["access_token"]) > 10

    def test_login_invalid(self, s):
        r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": "WRONG"})
        assert r.status_code in (400, 401)

    def test_me(self, s, auth_headers):
        r = s.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert r.status_code == 200
        assert r.json().get("email") == ADMIN_EMAIL


# === Nadine GLOBAL persistence ===
class TestNadineGlobal:
    def test_patch_content_nadine_global(self, s, auth_headers):
        # Save original
        original = s.get(f"{BASE_URL}/api/content").json().get("nadine", {})
        original_title_de = original.get("intro_title_de", "Ich bin Nadine")
        try:
            sentinel = "GLOBAL TEST iteration 8"
            r = s.patch(
                f"{BASE_URL}/api/content",
                json={"nadine.intro_title_de": sentinel},
                headers=auth_headers,
            )
            assert r.status_code == 200, f"patch nadine failed: {r.status_code} {r.text}"
            # GET /api/content should reflect new value
            data = s.get(f"{BASE_URL}/api/content").json()
            assert data["nadine"]["intro_title_de"] == sentinel
            # GET location pages should NOT contain nadine sub-block
            for slug in ("einsiedeln", "siebnen"):
                loc = s.get(f"{BASE_URL}/api/locations/{slug}").json()
                assert "nadine" not in loc, f"{slug} should NOT have a nadine field; it's global"
        finally:
            # Restore
            s.patch(
                f"{BASE_URL}/api/content",
                json={"nadine.intro_title_de": original_title_de},
                headers=auth_headers,
            )
        # Verify restore
        restored = s.get(f"{BASE_URL}/api/content").json()["nadine"]["intro_title_de"]
        assert restored == original_title_de


# === Location PATCH persistence ===
class TestLocationPatch:
    def test_patch_einsiedeln_hero_title(self, s, auth_headers):
        slug = "einsiedeln"
        loc = s.get(f"{BASE_URL}/api/locations/{slug}").json()
        original = loc["hero_title_de"]
        sentinel = original + " ✓"
        try:
            r = s.patch(
                f"{BASE_URL}/api/locations/{slug}",
                json={"hero_title_de": sentinel},
                headers=auth_headers,
            )
            assert r.status_code == 200, f"patch failed {r.status_code} {r.text}"
            after = s.get(f"{BASE_URL}/api/locations/{slug}").json()
            assert after["hero_title_de"] == sentinel
        finally:
            s.patch(
                f"{BASE_URL}/api/locations/{slug}",
                json={"hero_title_de": original},
                headers=auth_headers,
            )

    def test_patch_einsiedeln_ideal_for_points(self, s, auth_headers):
        slug = "einsiedeln"
        loc = s.get(f"{BASE_URL}/api/locations/{slug}").json()
        original = loc.get("ideal_for_points_de", [])
        modified = list(original)
        if modified:
            modified[0] = "TEST_BULLET_ITER8"
        else:
            modified = ["TEST_BULLET_ITER8"]
        try:
            r = s.patch(
                f"{BASE_URL}/api/locations/{slug}",
                json={"ideal_for_points_de": modified},
                headers=auth_headers,
            )
            assert r.status_code == 200
            after = s.get(f"{BASE_URL}/api/locations/{slug}").json()
            assert after["ideal_for_points_de"][0] == "TEST_BULLET_ITER8"
        finally:
            s.patch(
                f"{BASE_URL}/api/locations/{slug}",
                json={"ideal_for_points_de": original},
                headers=auth_headers,
            )

    def test_patch_unauth_rejected(self, s):
        r = s.patch(
            f"{BASE_URL}/api/locations/einsiedeln",
            json={"hero_title_de": "HACKED"},
        )
        assert r.status_code in (401, 403)


# === contact form ===
class TestContact:
    def test_contact_submit(self, s):
        payload = {
            "first_name": "TEST_Iter8",
            "last_name": "User",
            "email": "test_iter8@example.com",
            "phone": "+41 79 000 00 00",
            "message": "TEST submission from iteration 8 backend tests",
        }
        r = s.post(f"{BASE_URL}/api/contact", json=payload)
        assert r.status_code in (200, 201), f"contact failed: {r.status_code} {r.text}"
