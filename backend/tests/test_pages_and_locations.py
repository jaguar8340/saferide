"""
Tests for new sub-pages (ablauf/vku) seed and /api/locations endpoints.
Run: pytest /app/backend/tests/test_pages_and_locations.py -v
"""
import os
import requests
import pytest

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
            or "https://driving-school-cms.preview.emergentagent.com")
ADMIN_EMAIL = "admin@saferide.ch"
ADMIN_PASSWORD = "SafeRide2026!"

EXPECTED_SLUGS = ["einsiedeln", "siebnen", "lachen", "waedenswil", "horgen",
                  "altendorf", "chur", "lenzerheide", "rapperswil"]


@pytest.fixture(scope="module")
def auth_headers():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}",
            "Content-Type": "application/json"}


# ---------- Content idempotent seed ----------
class TestContentSeedKeys:
    def test_top_level_new_keys(self):
        d = requests.get(f"{BASE_URL}/api/content").json()
        for k in ["services_title_de", "fleet_title_de", "gallery_title_de",
                  "reviews_title_de", "footer_tagline_de", "nav_cta_de"]:
            assert k in d, f"missing top key {k}"

    def test_hero_extra_keys(self):
        d = requests.get(f"{BASE_URL}/api/content").json()
        h = d.get("hero", {})
        for k in ["tag1_de", "call_label_de", "regions"]:
            assert k in h, f"missing hero key {k}"

    def test_about_pricing_contact_keys(self):
        d = requests.get(f"{BASE_URL}/api/content").json()
        assert "badge_name" in d.get("about", {})
        assert "badge_role_de" in d.get("about", {})
        assert "popular_label_de" in d.get("pricing", {})
        assert "cta_text_de" in d.get("pricing", {})
        assert "title_de" in d.get("contact", {})

    def test_ablauf_and_vku_present(self):
        d = requests.get(f"{BASE_URL}/api/content").json()
        ablauf = d.get("ablauf")
        assert ablauf is not None, "ablauf missing"
        assert isinstance(ablauf.get("steps"), list) and len(ablauf["steps"]) >= 4
        vku = d.get("vku")
        assert vku is not None, "vku missing"
        assert isinstance(vku.get("months"), list) and len(vku["months"]) >= 4
        assert isinstance(vku.get("info_items"), list) and len(vku["info_items"]) >= 4


# ---------- Locations: GET ----------
class TestLocationsList:
    def test_list_returns_9_sorted(self):
        r = requests.get(f"{BASE_URL}/api/locations")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 9, f"expected >=9 locations, got {len(items)}"
        slugs = [it["slug"] for it in items]
        for s in EXPECTED_SLUGS:
            assert s in slugs, f"missing slug {s}"
        # sorted by 'order' ascending
        orders = [it.get("order", 0) for it in items]
        assert orders == sorted(orders), "not sorted by order"
        # no mongodb _id leak
        for it in items:
            assert "_id" not in it

    @pytest.mark.parametrize("slug", EXPECTED_SLUGS)
    def test_get_each_slug(self, slug):
        r = requests.get(f"{BASE_URL}/api/locations/{slug}")
        assert r.status_code == 200, f"{slug} -> {r.status_code}"
        d = r.json()
        for k in ["slug", "name", "hero_title_de", "hero_subtitle_de",
                  "faqs", "exam_routes", "price_items", "gallery",
                  "map_embed_url", "seo_title_de", "seo_description_de"]:
            assert k in d, f"{slug} missing {k}"
        assert d["slug"] == slug
        assert isinstance(d["faqs"], list) and len(d["faqs"]) >= 1
        assert isinstance(d["exam_routes"], list)
        assert isinstance(d["price_items"], list)
        assert isinstance(d["gallery"], list)

    def test_unknown_slug_404(self):
        r = requests.get(f"{BASE_URL}/api/locations/does-not-exist-xyz")
        assert r.status_code == 404


# ---------- Locations: PATCH dot-notation ----------
class TestLocationsPatch:
    SLUG = "einsiedeln"

    def test_patch_unauth(self):
        r = requests.patch(f"{BASE_URL}/api/locations/{self.SLUG}",
                           json={"why_title_de": "X"})
        assert r.status_code == 401

    def test_patch_empty_body_400(self, auth_headers):
        r = requests.patch(f"{BASE_URL}/api/locations/{self.SLUG}",
                           json={}, headers=auth_headers)
        assert r.status_code == 400

    def test_patch_only_protected_keys_400(self, auth_headers):
        r = requests.patch(f"{BASE_URL}/api/locations/{self.SLUG}",
                           json={"_id": "x", "id": "y", "slug": "z"},
                           headers=auth_headers)
        assert r.status_code == 400

    def test_patch_unknown_slug_404(self, auth_headers):
        r = requests.patch(f"{BASE_URL}/api/locations/no-such-slug-zzz",
                           json={"why_title_de": "X"}, headers=auth_headers)
        assert r.status_code == 404

    def test_patch_dot_notation_and_revert(self, auth_headers):
        orig = requests.get(f"{BASE_URL}/api/locations/{self.SLUG}").json()
        orig_why = orig.get("why_title_de")
        orig_route0 = orig["exam_routes"][0]["text_de"]

        # patch two fields (one top-level, one dot-notation array index)
        body = {
            "why_title_de": "TEST_PYTEST_WHY",
            "exam_routes.0.text_de": "TEST_PYTEST_ROUTE0",
        }
        r = requests.patch(f"{BASE_URL}/api/locations/{self.SLUG}",
                           json=body, headers=auth_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["why_title_de"] == "TEST_PYTEST_WHY"
        assert d["exam_routes"][0]["text_de"] == "TEST_PYTEST_ROUTE0"
        # other fields preserved
        assert d["slug"] == self.SLUG
        assert isinstance(d["faqs"], list) and len(d["faqs"]) >= 1

        # GET to verify persistence
        v = requests.get(f"{BASE_URL}/api/locations/{self.SLUG}").json()
        assert v["why_title_de"] == "TEST_PYTEST_WHY"
        assert v["exam_routes"][0]["text_de"] == "TEST_PYTEST_ROUTE0"

        # revert
        rev = {
            "why_title_de": orig_why,
            "exam_routes.0.text_de": orig_route0,
        }
        r2 = requests.patch(f"{BASE_URL}/api/locations/{self.SLUG}",
                            json=rev, headers=auth_headers)
        assert r2.status_code == 200
        v2 = requests.get(f"{BASE_URL}/api/locations/{self.SLUG}").json()
        assert v2["why_title_de"] == orig_why
        assert v2["exam_routes"][0]["text_de"] == orig_route0
