"""Iteration 15 — full backend regression after server.py refactor into routers/.

Covers every endpoint mentioned in the review request:
 - health, auth (login/me)
 - content GET/PATCH (with restore)
 - testimonials, gallery (GET + admin POST/PUT/DELETE + auth enforcement)
 - contact (public POST, admin list/read/delete)
 - upload + serve file (admin)
 - locations (GET list, GET one, POST/PATCH/DELETE admin, 409 dup)
 - blog (public list + single, admin list, POST/PATCH/DELETE, 409 dup)
 - packages (public + admin list, POST/PATCH/DELETE, 409 dup)
 - bookings (public POST, admin GET/PATCH/DELETE, invalid pkg 404)
 - certificates, partners (GET + admin CRUD + 409 dup for partners)
 - sitemap.xml (urlset + key urls + 11 fahrschule-*)
"""
import base64
import io
import os
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://driving-school-cms.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@saferide.ch"
ADMIN_PASSWORD = "SafeRide2026!"

# Tiny valid 1x1 PNG
PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
)


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=20,
    )
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    assert token
    return token


@pytest.fixture(scope="session")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ---------------- Health ----------------
class TestHealth:
    def test_root(self):
        r = requests.get(f"{BASE_URL}/api/", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"


# ---------------- Auth ----------------
class TestAuth:
    def test_login_success(self):
        r = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=15,
        )
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data and isinstance(data["access_token"], str)
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"].lower() == ADMIN_EMAIL

    def test_login_wrong_password(self):
        r = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": "definitely-wrong"},
            timeout=15,
        )
        assert r.status_code == 401

    def test_me_with_token(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers, timeout=10)
        assert r.status_code == 200
        assert r.json().get("email", "").lower() == ADMIN_EMAIL

    def test_me_without_token(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", timeout=10)
        assert r.status_code in (401, 403)


# ---------------- Content ----------------
class TestContent:
    def test_get_content_shape(self):
        r = requests.get(f"{BASE_URL}/api/content", timeout=10)
        assert r.status_code == 200
        data = r.json()
        for key in ("hero", "about", "services", "pricing", "why_safe_ride"):
            assert key in data, f"missing top-level key: {key}"

    def test_patch_requires_auth(self):
        r = requests.patch(f"{BASE_URL}/api/content", json={"hero.title_de": "Hack"}, timeout=10)
        assert r.status_code in (401, 403)

    def test_patch_and_restore(self, auth_headers):
        # Read original
        original = requests.get(f"{BASE_URL}/api/content", timeout=10).json()
        original_title = original.get("hero", {}).get("title_de")
        assert original_title is not None

        test_value = f"Test Title {uuid.uuid4().hex[:6]}"
        r = requests.patch(
            f"{BASE_URL}/api/content",
            json={"hero.title_de": test_value},
            headers=auth_headers,
            timeout=15,
        )
        assert r.status_code == 200

        # Verify change persisted
        r2 = requests.get(f"{BASE_URL}/api/content", timeout=10)
        assert r2.status_code == 200
        assert r2.json()["hero"]["title_de"] == test_value

        # Restore
        r3 = requests.patch(
            f"{BASE_URL}/api/content",
            json={"hero.title_de": original_title},
            headers=auth_headers,
            timeout=15,
        )
        assert r3.status_code == 200
        assert requests.get(f"{BASE_URL}/api/content", timeout=10).json()["hero"]["title_de"] == original_title


# ---------------- Testimonials ----------------
class TestTestimonials:
    def test_list_returns_6_plus(self):
        r = requests.get(f"{BASE_URL}/api/testimonials", timeout=10)
        assert r.status_code == 200
        assert len(r.json()) >= 6

    def test_create_without_auth_fails(self):
        r = requests.post(
            f"{BASE_URL}/api/testimonials",
            json={"name": "TEST_x", "rating": 5, "date": "2026-01", "text_de": "x"},
            timeout=10,
        )
        assert r.status_code in (401, 403)

    def test_full_crud(self, auth_headers):
        create = requests.post(
            f"{BASE_URL}/api/testimonials",
            json={"name": "TEST_QA15", "rating": 5, "date": "2026-01", "text_de": "Top", "text_en": "Great"},
            headers=auth_headers,
            timeout=15,
        )
        assert create.status_code == 200
        item_id = create.json()["id"]

        upd = requests.put(
            f"{BASE_URL}/api/testimonials/{item_id}",
            json={"name": "TEST_QA15b", "rating": 4, "date": "2026-02", "text_de": "OK", "text_en": "OK"},
            headers=auth_headers,
            timeout=15,
        )
        assert upd.status_code == 200
        assert upd.json()["name"] == "TEST_QA15b"
        assert upd.json()["rating"] == 4

        d = requests.delete(f"{BASE_URL}/api/testimonials/{item_id}", headers=auth_headers, timeout=10)
        assert d.status_code == 200


# ---------------- Gallery ----------------
class TestGallery:
    def test_list_returns_6_plus(self):
        r = requests.get(f"{BASE_URL}/api/gallery", timeout=10)
        assert r.status_code == 200
        assert len(r.json()) >= 6

    def test_create_without_auth_fails(self):
        r = requests.post(f"{BASE_URL}/api/gallery", json={"image_url": "x"}, timeout=10)
        assert r.status_code in (401, 403)

    def test_full_crud(self, auth_headers):
        create = requests.post(
            f"{BASE_URL}/api/gallery",
            json={"image_url": "https://example.com/test.jpg", "caption_de": "TEST_QA15", "caption_en": "TEST_QA15"},
            headers=auth_headers,
            timeout=15,
        )
        assert create.status_code == 200
        gid = create.json()["id"]

        upd = requests.put(
            f"{BASE_URL}/api/gallery/{gid}",
            json={"image_url": "https://example.com/test2.jpg", "caption_de": "TEST_QA15b", "caption_en": "x"},
            headers=auth_headers,
            timeout=10,
        )
        assert upd.status_code == 200
        assert upd.json()["caption_de"] == "TEST_QA15b"

        d = requests.delete(f"{BASE_URL}/api/gallery/{gid}", headers=auth_headers, timeout=10)
        assert d.status_code == 200


# ---------------- Contact ----------------
class TestContact:
    def test_public_submit_and_admin_lifecycle(self, auth_headers):
        payload = {
            "first_name": "TEST",
            "last_name": "QA15",
            "email": "qa15@example.com",
            "phone": "+41 79 000 00 00",
            "message": "regression test",
        }
        r = requests.post(f"{BASE_URL}/api/contact", json=payload, timeout=15)
        assert r.status_code == 200
        sub = r.json()
        assert sub["first_name"] == "TEST"
        assert sub["read"] is False
        sid = sub["id"]

        # List requires admin
        anon = requests.get(f"{BASE_URL}/api/contact/submissions", timeout=10)
        assert anon.status_code in (401, 403)

        listed = requests.get(f"{BASE_URL}/api/contact/submissions", headers=auth_headers, timeout=10)
        assert listed.status_code == 200
        ids = [s["id"] for s in listed.json()]
        assert sid in ids

        # Mark read
        read_r = requests.patch(
            f"{BASE_URL}/api/contact/submissions/{sid}/read", headers=auth_headers, timeout=10
        )
        assert read_r.status_code == 200

        # Delete
        d = requests.delete(f"{BASE_URL}/api/contact/submissions/{sid}", headers=auth_headers, timeout=10)
        assert d.status_code == 200


# ---------------- Upload ----------------
class TestUpload:
    def test_upload_requires_auth(self):
        files = {"file": ("test.png", io.BytesIO(PNG_BYTES), "image/png")}
        r = requests.post(f"{BASE_URL}/api/upload", files=files, timeout=15)
        assert r.status_code in (401, 403)

    def test_upload_and_serve(self, auth_headers):
        files = {"file": ("test.png", io.BytesIO(PNG_BYTES), "image/png")}
        r = requests.post(f"{BASE_URL}/api/upload", files=files, headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["kind"] == "image"
        assert "path" in data and "url" in data
        assert data["url"].startswith("/api/files/")

        # Fetch via URL
        fetch = requests.get(f"{BASE_URL}{data['url']}", timeout=20)
        assert fetch.status_code == 200
        assert fetch.headers.get("content-type", "").startswith("image/")

    def test_serve_nonexistent_404(self):
        r = requests.get(f"{BASE_URL}/api/files/saferide/uploads/does-not-exist-{uuid.uuid4()}.png", timeout=10)
        assert r.status_code == 404


# ---------------- Locations ----------------
class TestLocations:
    def test_list_11(self):
        r = requests.get(f"{BASE_URL}/api/locations", timeout=10)
        assert r.status_code == 200
        items = r.json()
        assert len(items) == 11, f"expected 11 locations, got {len(items)}"

    def test_get_einsiedeln_full(self):
        r = requests.get(f"{BASE_URL}/api/locations/einsiedeln", timeout=10)
        assert r.status_code == 200
        doc = r.json()
        assert "hero_title_de" in doc
        faqs = doc.get("faqs") or []
        assert len(faqs) >= 15, f"expected >=15 faqs, got {len(faqs)}"
        assert "exam_routes" in doc

    def test_post_patch_delete_and_dup_409(self, auth_headers):
        slug = f"test-loc-{uuid.uuid4().hex[:8]}"
        body = {"slug": slug, "name": "TEST Location", "hero_title_de": "x"}

        r = requests.post(f"{BASE_URL}/api/locations", json=body, timeout=15)
        assert r.status_code in (401, 403)

        r = requests.post(f"{BASE_URL}/api/locations", json=body, headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text

        dup = requests.post(f"{BASE_URL}/api/locations", json=body, headers=auth_headers, timeout=15)
        assert dup.status_code == 409

        patch = requests.patch(
            f"{BASE_URL}/api/locations/{slug}",
            json={"hero_title_de": "Updated"},
            headers=auth_headers,
            timeout=15,
        )
        assert patch.status_code == 200
        assert patch.json()["hero_title_de"] == "Updated"

        d = requests.delete(f"{BASE_URL}/api/locations/{slug}", headers=auth_headers, timeout=10)
        assert d.status_code == 200


# ---------------- Blog ----------------
class TestBlog:
    def test_public_list(self):
        r = requests.get(f"{BASE_URL}/api/blog", timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_list_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/blog/admin", timeout=10)
        assert r.status_code in (401, 403)

    def test_admin_list_ok(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/blog/admin", headers=auth_headers, timeout=10)
        assert r.status_code == 200

    def test_crud_and_dup_409(self, auth_headers):
        slug = f"test-post-{uuid.uuid4().hex[:8]}"
        payload = {"slug": slug, "title_de": "TEST DE", "title_en": "TEST EN", "status": "published"}

        # No auth
        r = requests.post(f"{BASE_URL}/api/blog", json=payload, timeout=15)
        assert r.status_code in (401, 403)

        r = requests.post(f"{BASE_URL}/api/blog", json=payload, headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text

        # Public GET single
        single = requests.get(f"{BASE_URL}/api/blog/{slug}", timeout=10)
        assert single.status_code == 200
        assert single.json()["slug"] == slug

        # Duplicate
        dup = requests.post(f"{BASE_URL}/api/blog", json=payload, headers=auth_headers, timeout=15)
        assert dup.status_code == 409

        patch = requests.patch(
            f"{BASE_URL}/api/blog/{slug}",
            json={"title_de": "TEST DE Updated"},
            headers=auth_headers,
            timeout=15,
        )
        assert patch.status_code == 200
        assert patch.json()["title_de"] == "TEST DE Updated"

        d = requests.delete(f"{BASE_URL}/api/blog/{slug}", headers=auth_headers, timeout=10)
        assert d.status_code == 200


# ---------------- Packages ----------------
class TestPackages:
    def test_public_list(self):
        r = requests.get(f"{BASE_URL}/api/packages", timeout=10)
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_admin_list_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/packages/admin", timeout=10)
        assert r.status_code in (401, 403)

    def test_crud_and_dup_409(self, auth_headers):
        slug = f"test-pkg-{uuid.uuid4().hex[:8]}"
        payload = {"slug": slug, "title_de": "TEST", "title_en": "TEST", "price_chf": 100}

        r = requests.post(f"{BASE_URL}/api/packages", json=payload, timeout=15)
        assert r.status_code in (401, 403)

        r = requests.post(f"{BASE_URL}/api/packages", json=payload, headers=auth_headers, timeout=15)
        assert r.status_code == 200

        dup = requests.post(f"{BASE_URL}/api/packages", json=payload, headers=auth_headers, timeout=15)
        assert dup.status_code == 409

        patch = requests.patch(
            f"{BASE_URL}/api/packages/{slug}",
            json={"price_chf": 120},
            headers=auth_headers,
            timeout=15,
        )
        assert patch.status_code == 200
        assert patch.json()["price_chf"] == 120

        d = requests.delete(f"{BASE_URL}/api/packages/{slug}", headers=auth_headers, timeout=10)
        assert d.status_code == 200


# ---------------- Bookings ----------------
class TestBookings:
    def _first_active_package_slug(self):
        items = requests.get(f"{BASE_URL}/api/packages", timeout=10).json()
        assert items, "no packages seeded"
        return items[0]["slug"]

    def test_public_create_invalid_package_404(self):
        payload = {
            "first_name": "TEST",
            "last_name": "QA15",
            "email": "b@example.com",
            "phone": "+41 79 000 00 00",
            "package_slug": "does-not-exist-xyz",
            "preferred_date": "2027-08-10",
        }
        r = requests.post(f"{BASE_URL}/api/bookings", json=payload, timeout=15)
        assert r.status_code == 404

    def test_list_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/bookings", timeout=10)
        assert r.status_code in (401, 403)

    def test_create_patch_delete(self, auth_headers):
        slug = self._first_active_package_slug()
        payload = {
            "first_name": "TEST",
            "last_name": "QA15",
            "email": "b@example.com",
            "phone": "+41 79 000 00 00",
            "package_slug": slug,
            "preferred_date": "2027-09-15",
        }
        r = requests.post(f"{BASE_URL}/api/bookings", json=payload, timeout=15)
        assert r.status_code == 200
        bid = r.json()["id"]
        assert r.json().get("ok") is True

        # Patch status
        patch = requests.patch(
            f"{BASE_URL}/api/bookings/{bid}",
            json={"status": "confirmed"},
            headers=auth_headers,
            timeout=15,
        )
        assert patch.status_code == 200
        assert patch.json()["status"] == "confirmed"

        # Delete cleanup
        d = requests.delete(f"{BASE_URL}/api/bookings/{bid}", headers=auth_headers, timeout=10)
        assert d.status_code == 200


# ---------------- Certificates ----------------
class TestCertificates:
    def test_list(self):
        r = requests.get(f"{BASE_URL}/api/certificates", timeout=10)
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_crud(self, auth_headers):
        payload = {"title_de": "TEST_QA15", "title_en": "TEST_QA15", "image_url": "https://e.com/c.png"}
        r = requests.post(f"{BASE_URL}/api/certificates", json=payload, timeout=15)
        assert r.status_code in (401, 403)

        r = requests.post(f"{BASE_URL}/api/certificates", json=payload, headers=auth_headers, timeout=15)
        assert r.status_code == 200
        cid = r.json()["id"]

        patch = requests.patch(
            f"{BASE_URL}/api/certificates/{cid}",
            json={"title_de": "TEST_QA15 Updated"},
            headers=auth_headers,
            timeout=15,
        )
        assert patch.status_code == 200
        assert patch.json()["title_de"] == "TEST_QA15 Updated"

        d = requests.delete(f"{BASE_URL}/api/certificates/{cid}", headers=auth_headers, timeout=10)
        assert d.status_code == 200


# ---------------- Partners ----------------
class TestPartners:
    def test_list_6(self):
        r = requests.get(f"{BASE_URL}/api/partners", timeout=10)
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 6, f"expected >=6 partners, got {len(items)}"

    def test_crud_and_dup_409(self, auth_headers):
        slug = f"test-partner-{uuid.uuid4().hex[:8]}"
        payload = {"slug": slug, "name": "TEST Partner"}

        r = requests.post(f"{BASE_URL}/api/partners", json=payload, timeout=15)
        assert r.status_code in (401, 403)

        r = requests.post(f"{BASE_URL}/api/partners", json=payload, headers=auth_headers, timeout=15)
        assert r.status_code == 200

        dup = requests.post(f"{BASE_URL}/api/partners", json=payload, headers=auth_headers, timeout=15)
        assert dup.status_code == 409

        patch = requests.patch(
            f"{BASE_URL}/api/partners/{slug}",
            json={"name": "TEST Partner Updated"},
            headers=auth_headers,
            timeout=15,
        )
        assert patch.status_code == 200
        assert patch.json()["name"] == "TEST Partner Updated"

        d = requests.delete(f"{BASE_URL}/api/partners/{slug}", headers=auth_headers, timeout=10)
        assert d.status_code == 200


# ---------------- Sitemap ----------------
class TestSitemap:
    def test_sitemap_structure(self):
        r = requests.get(f"{BASE_URL}/api/sitemap.xml", timeout=10)
        assert r.status_code == 200
        ctype = r.headers.get("content-type", "")
        assert "xml" in ctype.lower()
        body = r.text
        assert body.startswith("<?xml")
        assert "<urlset" in body and "</urlset>" in body

        # required static urls
        for must in (
            "/ablauf-zum-fuehrerschein",
            "/vku-unterricht",
            "/impressum",
            "/datenschutz",
            "/blog",
            "/buchung",
            "/partner",
        ):
            assert must in body, f"missing {must} in sitemap"

        # Homepage entry — base ends with '/'
        assert "<loc>" in body

        # 11 fahrschule- urls
        loc_count = body.count("/fahrschule-")
        assert loc_count == 11, f"expected 11 /fahrschule-* entries, got {loc_count}"
