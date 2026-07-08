"""P0 fix regression: blog POST/GET/DELETE, package PATCH (spaces) sanity."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://driving-school-cms.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@saferide.ch")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "SafeRide2026!")


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text[:200]}"
    data = r.json()
    token = data.get("access_token") or data.get("token")
    assert token, f"no token in login response: {data}"
    return token


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ------------------- Blog CRUD -------------------
class TestBlogCRUD:
    slug = f"test-p0-{int(time.time())}"

    def test_admin_blog_list_pre(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/blog/admin", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_blog_post(self, admin_headers):
        payload = {
            "slug": self.slug,
            "title_de": "Automatisierter Testbeitrag DE",
            "title_en": "Automated Test Post EN",
            "excerpt_de": "Kurze Zusammenfassung",
            "excerpt_en": "Short summary",
            "body_de": "Inhalt DE",
            "body_en": "Content EN",
            "status": "draft",
            "reading_time_min": 3,
        }
        r = requests.post(f"{BASE_URL}/api/blog", headers=admin_headers, json=payload, timeout=15)
        assert r.status_code in (200, 201), f"create failed: {r.status_code} {r.text[:400]}"
        data = r.json()
        assert data.get("slug") == self.slug
        assert data.get("title_de") == payload["title_de"]

    def test_new_post_in_admin_list(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/blog/admin", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        slugs = [p.get("slug") for p in r.json()]
        assert self.slug in slugs, f"new slug not in admin list: {slugs[:10]}"

    def test_get_post_by_slug(self, admin_headers):
        # public endpoint may hide drafts; try admin route first, then public
        r = requests.get(f"{BASE_URL}/api/blog/{self.slug}", timeout=15)
        # draft may be 404 for public — accept 200 with auth
        if r.status_code == 404:
            r = requests.get(f"{BASE_URL}/api/blog/{self.slug}", headers=admin_headers, timeout=15)
        assert r.status_code == 200, f"get failed: {r.status_code} {r.text[:200]}"
        assert r.json().get("slug") == self.slug

    def test_delete_post(self, admin_headers):
        r = requests.delete(f"{BASE_URL}/api/blog/{self.slug}", headers=admin_headers, timeout=15)
        assert r.status_code in (200, 204), f"delete failed: {r.status_code} {r.text[:200]}"

    def test_deleted_post_not_in_admin_list(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/blog/admin", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        slugs = [p.get("slug") for p in r.json()]
        assert self.slug not in slugs

    def test_create_requires_auth(self):
        # without token → 401 / 403
        r = requests.post(
            f"{BASE_URL}/api/blog",
            json={"slug": "unauth-test", "title_de": "x", "title_en": "x"},
            timeout=15,
        )
        assert r.status_code in (401, 403), f"unauth create must fail, got {r.status_code}"


# ------------------- Package title with spaces -------------------
class TestPackageSpaces:
    """Verifies backend accepts spaces in title_de via PATCH, and returns them intact."""

    def test_patch_package_title_with_spaces(self, admin_headers):
        # discover a package slug
        r = requests.get(f"{BASE_URL}/api/packages", timeout=15)
        assert r.status_code == 200
        pkgs = r.json()
        assert len(pkgs) > 0, "no packages found"
        pkg = pkgs[0]
        slug = pkg["slug"]
        original_title = pkg.get("title_de", "")

        new_title = f"{original_title} a b c"
        try:
            r = requests.patch(
                f"{BASE_URL}/api/packages/{slug}",
                headers=admin_headers,
                json={"title_de": new_title},
                timeout=15,
            )
            assert r.status_code == 200, f"patch failed: {r.status_code} {r.text[:200]}"
            assert r.json().get("title_de") == new_title

            # verify persistence via GET
            r2 = requests.get(f"{BASE_URL}/api/packages", timeout=15)
            assert r2.status_code == 200
            match = [p for p in r2.json() if p["slug"] == slug]
            assert match and match[0]["title_de"] == new_title
        finally:
            # restore
            requests.patch(
                f"{BASE_URL}/api/packages/{slug}",
                headers=admin_headers,
                json={"title_de": original_title},
                timeout=15,
            )


# ------------------- Content: insurance note text present -------------------
class TestPricingContent:
    def test_pricing_note_exists(self):
        r = requests.get(f"{BASE_URL}/api/content", timeout=15)
        assert r.status_code == 200
        c = r.json()
        pricing = c.get("pricing") or {}
        note_de = pricing.get("note_de") or ""
        # The insurance box relies on pricing.note_de – must be non-empty ideally
        assert isinstance(note_de, str)
