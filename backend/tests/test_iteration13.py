"""Backend tests for Iteration 13: Partners CRUD + Sitemap /partner inclusion."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback to .env
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
def admin_token(api):
    r = api.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    token = data.get("access_token") or data.get("token")
    assert token, f"No token in {data}"
    return token


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ---------- Partners ----------

EXPECTED_SLUGS = {"driveswiss-ag", "asa", "samariter-lachen", "audi-zentrum", "sfv", "sgs"}


class TestPartnersGet:
    def test_list_partners_default_seeded(self, api):
        r = api.get(f"{BASE_URL}/api/partners")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        slugs = {p["slug"] for p in data}
        # at least the 6 default slugs present
        missing = EXPECTED_SLUGS - slugs
        assert not missing, f"Missing default partner slugs: {missing}"
        # validate fields on driveswiss-ag
        ds = next(p for p in data if p["slug"] == "driveswiss-ag")
        assert ds["name"] == "DRIVESWISS AG"
        assert ds["website_url"] == "https://www.driveswiss.ch/"
        assert ds.get("category_de")
        assert ds.get("description_de")

    def test_list_partners_no_mongo_id(self, api):
        r = api.get(f"{BASE_URL}/api/partners")
        assert r.status_code == 200
        for p in r.json():
            assert "_id" not in p


class TestPartnersAuthGates:
    def test_post_requires_auth(self, api):
        r = api.post(f"{BASE_URL}/api/partners", json={"slug": "qa-noauth", "name": "X"})
        assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}"

    def test_patch_requires_auth(self, api):
        r = api.patch(f"{BASE_URL}/api/partners/driveswiss-ag", json={"name": "Hack"})
        assert r.status_code in (401, 403)

    def test_delete_requires_auth(self, api):
        r = api.delete(f"{BASE_URL}/api/partners/driveswiss-ag")
        assert r.status_code in (401, 403)


class TestPartnersCRUD:
    QA_SLUG = "qa-test"

    def test_create_partner(self, api, admin_headers):
        # ensure cleanup if a leftover exists
        api.delete(f"{BASE_URL}/api/partners/{self.QA_SLUG}", headers=admin_headers)
        payload = {
            "slug": self.QA_SLUG,
            "name": "QA Test Partner",
            "category_de": "QA Kategorie",
            "category_en": "QA Category",
            "description_de": "Testbeschreibung",
            "description_en": "Test description",
            "logo_url": "",
            "website_url": "https://example.com",
        }
        r = api.post(f"{BASE_URL}/api/partners", json=payload, headers=admin_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["slug"] == self.QA_SLUG
        assert data["name"] == "QA Test Partner"
        assert "id" in data
        assert "_id" not in data

        # Verify persistence via GET list
        list_r = api.get(f"{BASE_URL}/api/partners")
        slugs = {p["slug"] for p in list_r.json()}
        assert self.QA_SLUG in slugs

    def test_patch_partner(self, api, admin_headers):
        r = api.patch(
            f"{BASE_URL}/api/partners/{self.QA_SLUG}",
            json={"name": "Updated"},
            headers=admin_headers,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["name"] == "Updated"
        assert data["slug"] == self.QA_SLUG

        # Verify persisted
        list_r = api.get(f"{BASE_URL}/api/partners")
        item = next(p for p in list_r.json() if p["slug"] == self.QA_SLUG)
        assert item["name"] == "Updated"

    def test_patch_unknown_404(self, api, admin_headers):
        r = api.patch(
            f"{BASE_URL}/api/partners/does-not-exist-xyz",
            json={"name": "X"},
            headers=admin_headers,
        )
        assert r.status_code == 404

    def test_delete_partner(self, api, admin_headers):
        r = api.delete(f"{BASE_URL}/api/partners/{self.QA_SLUG}", headers=admin_headers)
        assert r.status_code == 200, r.text
        # Verify gone
        list_r = api.get(f"{BASE_URL}/api/partners")
        slugs = {p["slug"] for p in list_r.json()}
        assert self.QA_SLUG not in slugs


# ---------- Sitemap ----------

class TestSitemap:
    def test_sitemap_includes_partner(self, api):
        r = api.get(f"{BASE_URL}/api/sitemap.xml")
        assert r.status_code == 200
        body = r.text
        assert "/partner" in body, "Sitemap missing /partner URL"

    def test_sitemap_xml_content_type(self, api):
        r = api.get(f"{BASE_URL}/api/sitemap.xml")
        assert r.status_code == 200
        ct = r.headers.get("content-type", "")
        assert "xml" in ct.lower()
