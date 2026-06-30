"""Iteration 9 tests – SEO route aliases + editable Impressum/Datenschutz legal pages.

Covers:
 - GET /api/sitemap.xml contains required URLs
 - GET /api/content has impressum (5 sections) and datenschutz (6 sections)
 - PATCH /api/content updates impressum.title_de globally (then restored)
 - Frontend route aliases /ablauf-zum-fuehrerschein and /vku-unterricht render
   (HTTP 200 from the frontend host – SPA returns index.html so we just assert OK)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or \
    os.environ.get("PUBLIC_SITE_URL", "https://driving-school-cms.preview.emergentagent.com").rstrip("/")

ADMIN_EMAIL = "admin@saferide.ch"
ADMIN_PASSWORD = "SafeRide2026!"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


# ---------- Sitemap ----------
class TestSitemap:
    def test_sitemap_contains_required_urls(self):
        r = requests.get(f"{BASE_URL}/api/sitemap.xml", timeout=15)
        assert r.status_code == 200
        body = r.text
        assert "<?xml" in body
        # Required static SEO paths
        for path in [
            "/ablauf-zum-fuehrerschein",
            "/vku-unterricht",
            "/impressum",
            "/datenschutz",
        ]:
            assert path in body, f"sitemap missing {path}"
        # Homepage URL (ends with /)
        assert "<loc>" in body
        # 11 location pages
        loc_slugs = [
            "einsiedeln", "siebnen", "lachen", "waedenswil", "horgen",
            "altendorf", "chur", "lenzerheide", "rapperswil",
            "pfaeffikon-sz", "richterswil",
        ]
        for slug in loc_slugs:
            assert f"/fahrschule-{slug}" in body, f"sitemap missing /fahrschule-{slug}"


# ---------- Content defaults ----------
class TestLegalContentDefaults:
    def test_impressum_keys(self):
        r = requests.get(f"{BASE_URL}/api/content", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "impressum" in data, "content missing top-level 'impressum'"
        imp = data["impressum"]
        assert imp.get("title_de") == "Impressum"
        assert imp.get("title_en") == "Imprint"
        assert isinstance(imp.get("sections"), list)
        assert len(imp["sections"]) == 5, f"expected 5 sections, got {len(imp['sections'])}"
        # Each section has bilingual fields
        for s in imp["sections"]:
            for key in ("id", "title_de", "title_en", "body_de", "body_en"):
                assert key in s

    def test_datenschutz_keys(self):
        r = requests.get(f"{BASE_URL}/api/content", timeout=15)
        data = r.json()
        assert "datenschutz" in data
        ds = data["datenschutz"]
        assert ds.get("title_de") == "Datenschutzerklärung"
        assert ds.get("title_en") == "Privacy policy"
        assert isinstance(ds.get("sections"), list)
        assert len(ds["sections"]) == 6


# ---------- PATCH /api/content with dot path ----------
class TestPatchContent:
    def test_patch_impressum_title_de_and_restore(self, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        # Read original
        orig = requests.get(f"{BASE_URL}/api/content", timeout=15).json()
        original_title = orig["impressum"]["title_de"]
        assert original_title == "Impressum"

        sentinel = "TEST_Impressum_PATCH"
        try:
            r = requests.patch(
                f"{BASE_URL}/api/content",
                json={"impressum.title_de": sentinel},
                headers=headers,
                timeout=15,
            )
            assert r.status_code in (200, 204), f"PATCH failed: {r.status_code} {r.text}"
            # Verify persisted
            after = requests.get(f"{BASE_URL}/api/content", timeout=15).json()
            assert after["impressum"]["title_de"] == sentinel
            # Sections must remain intact
            assert len(after["impressum"]["sections"]) == 5
        finally:
            # Restore
            requests.patch(
                f"{BASE_URL}/api/content",
                json={"impressum.title_de": original_title},
                headers=headers,
                timeout=15,
            )
            restored = requests.get(f"{BASE_URL}/api/content", timeout=15).json()
            assert restored["impressum"]["title_de"] == original_title

    def test_patch_requires_auth(self):
        r = requests.patch(
            f"{BASE_URL}/api/content",
            json={"impressum.title_de": "SHOULD_FAIL"},
            timeout=15,
        )
        assert r.status_code in (401, 403)


# ---------- Frontend route aliases (HTML reachability) ----------
class TestRouteAliases:
    @pytest.mark.parametrize("path", [
        "/", "/ablauf", "/ablauf-zum-fuehrerschein",
        "/vku", "/vku-unterricht",
        "/impressum", "/datenschutz",
        "/fahrschule-einsiedeln",
    ])
    def test_path_returns_200(self, path):
        # SPA – frontend host returns index.html with HTTP 200 for any client route.
        r = requests.get(f"{BASE_URL}{path}", timeout=15, allow_redirects=True)
        assert r.status_code == 200, f"{path} returned {r.status_code}"
        # All SPA HTML should contain the React root div
        assert "<div id=\"root\"" in r.text or "<div id='root'" in r.text
