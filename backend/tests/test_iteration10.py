"""Iteration 10 tests – BrandLogo + Footer locations + OtherLocations inline upload + canonical + Pexels migration."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback to frontend .env file
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

ADMIN_EMAIL = "admin@saferide.ch"
ADMIN_PASSWORD = "SafeRide2026!"

ALL_SLUGS = {
    "einsiedeln", "siebnen", "lachen", "waedenswil", "horgen",
    "altendorf", "chur", "lenzerheide", "rapperswil", "pfaeffikon-sz", "richterswil",
}
PEXELS_EXPECTED = {"siebnen", "lachen", "waedenswil", "altendorf", "lenzerheide", "rapperswil", "pfaeffikon-sz", "richterswil"}
ADMIN_UPLOAD_PRESERVED = {"einsiedeln", "horgen", "chur"}


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# --- Content / logo ---

def test_content_has_logo_url():
    r = requests.get(f"{BASE_URL}/api/content", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "logo_url" in data, "content.logo_url missing"
    assert isinstance(data["logo_url"], str) and len(data["logo_url"]) > 0, "logo_url empty"
    # Could be customer-assets emergentagent URL OR /api/files/ (admin uploaded)
    assert data["logo_url"].startswith(("http://", "https://", "/api/files/")), f"unexpected logo_url: {data['logo_url']}"


# --- Locations: count + migration ---

def test_locations_count_eleven():
    r = requests.get(f"{BASE_URL}/api/locations", timeout=15)
    assert r.status_code == 200
    locs = r.json()
    assert isinstance(locs, list)
    slugs = {l["slug"] for l in locs}
    assert slugs == ALL_SLUGS, f"slugs mismatch: missing={ALL_SLUGS - slugs}, extra={slugs - ALL_SLUGS}"
    assert len(locs) == 11


def test_locations_pexels_migration():
    r = requests.get(f"{BASE_URL}/api/locations", timeout=15)
    assert r.status_code == 200
    locs = {l["slug"]: l for l in r.json()}
    for slug in PEXELS_EXPECTED:
        url = locs[slug].get("hero_image_url", "")
        assert url.startswith("https://images.pexels.com/"), f"{slug} hero_image_url not Pexels: {url}"


def test_locations_admin_uploads_preserved():
    r = requests.get(f"{BASE_URL}/api/locations", timeout=15)
    assert r.status_code == 200
    locs = {l["slug"]: l for l in r.json()}
    for slug in ADMIN_UPLOAD_PRESERVED:
        url = locs[slug].get("hero_image_url", "")
        # Should be either /api/files/* admin upload OR a Pexels (if not yet uploaded). We
        # assert it's NOT a broken Unsplash URL.
        assert "unsplash.com" not in url, f"{slug} still on Unsplash: {url}"
        assert url, f"{slug} hero_image_url empty"


# --- Admin inline upload (OtherLocations -> PATCH /locations/{slug}) ---

def test_admin_patch_location_hero_image(auth_headers):
    # Save current value to restore
    orig = requests.get(f"{BASE_URL}/api/locations/siebnen", timeout=15)
    assert orig.status_code == 200
    original_url = orig.json().get("hero_image_url")

    new_url = "https://example.com/test-iteration10.jpg"
    r = requests.patch(
        f"{BASE_URL}/api/locations/siebnen",
        json={"hero_image_url": new_url},
        headers=auth_headers,
        timeout=15,
    )
    assert r.status_code == 200, f"PATCH failed: {r.status_code} {r.text}"
    assert r.json().get("hero_image_url") == new_url

    # Verify persisted
    g = requests.get(f"{BASE_URL}/api/locations/siebnen", timeout=15)
    assert g.status_code == 200
    assert g.json().get("hero_image_url") == new_url

    # Restore
    rs = requests.patch(
        f"{BASE_URL}/api/locations/siebnen",
        json={"hero_image_url": original_url},
        headers=auth_headers,
        timeout=15,
    )
    assert rs.status_code == 200
    assert rs.json().get("hero_image_url") == original_url


def test_admin_patch_requires_auth():
    r = requests.patch(
        f"{BASE_URL}/api/locations/siebnen",
        json={"hero_image_url": "https://example.com/nope.jpg"},
        timeout=15,
    )
    assert r.status_code in (401, 403)


# --- Frontend SPA route serving (canonical paths) ---

@pytest.mark.parametrize("path", [
    "/", "/ablauf", "/ablauf-zum-fuehrerschein", "/vku", "/vku-unterricht",
    "/fahrschule-einsiedeln", "/impressum", "/datenschutz",
])
def test_spa_routes_return_200(path):
    r = requests.get(f"{BASE_URL}{path}", timeout=15)
    assert r.status_code == 200
    # SPA shell
    assert "<div id=\"root\">" in r.text or "<div id='root'>" in r.text


# --- Contact form regression ---

def test_contact_post_regression():
    r = requests.post(
        f"{BASE_URL}/api/contact",
        json={
            "first_name": "TEST",
            "last_name": "Iter10",
            "email": "test_iter10@example.com",
            "phone": "+41 79 000 00 00",
            "message": "Iteration 10 regression test",
        },
        timeout=15,
    )
    assert r.status_code in (200, 201), f"contact POST failed: {r.status_code} {r.text}"
