"""
Iteration 5: tests for new locations (pfaeffikon-sz, richterswil), 15 FAQs migration,
google_reviews_* fields on content + locations, why_*2 fields with 6 points,
sitemap.xml endpoint, and PATCH for new fields.
"""
import os
import requests
import pytest

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
            or "https://driving-school-cms.preview.emergentagent.com")
ADMIN_EMAIL = "admin@saferide.ch"
ADMIN_PASSWORD = "SafeRide2026!"

EXPECTED_SLUGS_11 = [
    "einsiedeln", "siebnen", "lachen", "waedenswil", "horgen",
    "altendorf", "chur", "lenzerheide", "rapperswil",
    "pfaeffikon-sz", "richterswil",
]


@pytest.fixture(scope="module")
def auth_headers():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}",
            "Content-Type": "application/json"}


# ---------- Locations: 11 entries with new fields ----------
class TestLocations11:
    def test_list_returns_11(self):
        r = requests.get(f"{BASE_URL}/api/locations")
        assert r.status_code == 200
        items = r.json()
        slugs = [it["slug"] for it in items]
        assert len(items) == 11, f"expected 11 locations got {len(items)} ({slugs})"
        for s in EXPECTED_SLUGS_11:
            assert s in slugs, f"missing slug {s}"
        for it in items:
            assert "_id" not in it

    @pytest.mark.parametrize("slug", EXPECTED_SLUGS_11)
    def test_each_slug_has_new_fields(self, slug):
        r = requests.get(f"{BASE_URL}/api/locations/{slug}")
        assert r.status_code == 200, f"{slug} -> {r.status_code}"
        d = r.json()
        # new why_*2 fields (6 points)
        for k in ["why_overline2_de", "why_title2_de", "why_body2_de",
                  "why_overline2_en", "why_title2_en", "why_body2_en"]:
            assert k in d, f"{slug} missing {k}"
        assert "why_points2" in d, f"{slug} missing why_points2"
        assert isinstance(d["why_points2"], list)
        assert len(d["why_points2"]) == 6, f"{slug} why_points2 len={len(d['why_points2'])}"
        # google_reviews fields
        for k in ["google_reviews_overline_de", "google_reviews_title_de",
                  "google_reviews_cta_de", "google_reviews_url"]:
            assert k in d, f"{slug} missing {k}"
        # faq intro
        assert "faq_intro_de" in d, f"{slug} missing faq_intro_de"
        assert "faq_intro_en" in d, f"{slug} missing faq_intro_en"
        # 15 FAQs
        assert isinstance(d["faqs"], list)
        assert len(d["faqs"]) == 15, f"{slug} faqs len={len(d['faqs'])}"

    def test_einsiedeln_has_15_faqs_migrated(self):
        d = requests.get(f"{BASE_URL}/api/locations/einsiedeln").json()
        assert len(d["faqs"]) == 15

    def test_new_slug_pfaeffikon(self):
        r = requests.get(f"{BASE_URL}/api/locations/pfaeffikon-sz")
        assert r.status_code == 200
        d = r.json()
        assert d["slug"] == "pfaeffikon-sz"
        assert "Pfäffikon" in d.get("name", "") or "Pfaeffikon" in d.get("name", "")

    def test_new_slug_richterswil(self):
        r = requests.get(f"{BASE_URL}/api/locations/richterswil")
        assert r.status_code == 200
        d = r.json()
        assert d["slug"] == "richterswil"


# ---------- Content google_reviews_* keys ----------
class TestContentGoogleReviews:
    def test_top_level_google_reviews_keys(self):
        d = requests.get(f"{BASE_URL}/api/content").json()
        for k in ["google_reviews_url", "google_reviews_count",
                  "google_reviews_label_de", "google_reviews_label_en"]:
            assert k in d, f"content missing {k}"


# ---------- Sitemap ----------
class TestSitemap:
    def test_sitemap_xml_valid(self):
        r = requests.get(f"{BASE_URL}/api/sitemap.xml")
        assert r.status_code == 200
        ct = r.headers.get("content-type", "")
        assert "xml" in ct.lower(), f"content-type {ct}"
        body = r.text
        assert "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">" in body \
            or "<urlset xmlns='http://www.sitemaps.org/schemas/sitemap/0.9'>" in body
        # exactly 14 urls (1 home + 1 ablauf + 1 vku + 11 locations)
        n = body.count("<url>")
        assert n == 14, f"expected 14 <url> entries got {n}"

    def test_sitemap_includes_all_locations(self):
        body = requests.get(f"{BASE_URL}/api/sitemap.xml").text
        for s in EXPECTED_SLUGS_11:
            assert f"/fahrschule-{s}" in body, f"sitemap missing /fahrschule-{s}"
        assert "/ablauf" in body
        assert "/vku" in body

    def test_sitemap_uses_public_base_url(self):
        body = requests.get(f"{BASE_URL}/api/sitemap.xml").text
        # should NOT contain internal k8s hostname
        assert "localhost" not in body
        assert "8001" not in body
        # should contain the public base URL host
        from urllib.parse import urlparse
        host = urlparse(BASE_URL).netloc
        assert host in body, f"public host {host} missing from sitemap"


# ---------- PATCH new fields ----------
class TestPatchNewFields:
    SLUG = "einsiedeln"

    def test_patch_why_title2_and_google_reviews_url(self, auth_headers):
        orig = requests.get(f"{BASE_URL}/api/locations/{self.SLUG}").json()
        orig_why2 = orig.get("why_title2_de")
        orig_grurl = orig.get("google_reviews_url")
        body = {
            "why_title2_de": "TEST_PYTEST_WHY2",
            "google_reviews_url": "https://test.example.com/reviews",
        }
        r = requests.patch(f"{BASE_URL}/api/locations/{self.SLUG}",
                           json=body, headers=auth_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["why_title2_de"] == "TEST_PYTEST_WHY2"
        assert d["google_reviews_url"] == "https://test.example.com/reviews"
        # other fields preserved
        assert len(d["faqs"]) == 15

        # GET verifies persistence
        v = requests.get(f"{BASE_URL}/api/locations/{self.SLUG}").json()
        assert v["why_title2_de"] == "TEST_PYTEST_WHY2"
        assert v["google_reviews_url"] == "https://test.example.com/reviews"

        # revert
        rev = {"why_title2_de": orig_why2, "google_reviews_url": orig_grurl or ""}
        r2 = requests.patch(f"{BASE_URL}/api/locations/{self.SLUG}",
                            json=rev, headers=auth_headers)
        assert r2.status_code == 200
        v2 = requests.get(f"{BASE_URL}/api/locations/{self.SLUG}").json()
        assert v2.get("why_title2_de") == orig_why2

    def test_patch_why_points2_dot_notation(self, auth_headers):
        orig = requests.get(f"{BASE_URL}/api/locations/{self.SLUG}").json()
        orig_text = orig["why_points2"][0].get("text_de")
        r = requests.patch(f"{BASE_URL}/api/locations/{self.SLUG}",
                           json={"why_points2.0.text_de": "TEST_PYTEST_P0"},
                           headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert d["why_points2"][0]["text_de"] == "TEST_PYTEST_P0"
        # revert
        rr = requests.patch(f"{BASE_URL}/api/locations/{self.SLUG}",
                            json={"why_points2.0.text_de": orig_text},
                            headers=auth_headers)
        assert rr.status_code == 200
