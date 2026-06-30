"""Iteration 11 backend tests: Why section, Home FAQs, Blog (CRUD + filters + scheduling),
Booking Packages, Bookings public POST + admin CRUD, Sitemap includes /blog, /buchung,
and per-post URLs."""
import os
import uuid
from datetime import datetime, timezone, timedelta

import pytest
import requests

def _load_backend_url() -> str:
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if not url:
        env_path = "/app/frontend/.env"
        if os.path.exists(env_path):
            with open(env_path) as fh:
                for line in fh:
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        url = line.split("=", 1)[1].strip().strip('"').strip("'")
                        break
    if not url:
        raise RuntimeError("REACT_APP_BACKEND_URL not set")
    return url.rstrip("/")


BASE_URL = _load_backend_url()
ADMIN_EMAIL = "admin@saferide.ch"
ADMIN_PASSWORD = "SafeRide2026!"


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=20,
    )
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ---------- Content (Why + Home FAQs) ----------
class TestContent:
    def test_content_has_why_safe_ride_with_6_pillars(self):
        r = requests.get(f"{BASE_URL}/api/content", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert "why_safe_ride" in data, "Missing why_safe_ride section"
        pillars = data["why_safe_ride"].get("pillars")
        assert isinstance(pillars, list)
        assert len(pillars) == 6, f"Expected 6 pillars, got {len(pillars)}"
        for p in pillars:
            assert p.get("title_de"), "Pillar missing title_de"
            assert p.get("body_de"), "Pillar missing body_de"

    def test_content_has_homepage_faqs_with_8_items(self):
        r = requests.get(f"{BASE_URL}/api/content", timeout=20)
        assert r.status_code == 200
        data = r.json()
        faqs = data.get("homepage_faqs")
        assert isinstance(faqs, list)
        assert len(faqs) == 8, f"Expected 8 homepage_faqs, got {len(faqs)}"
        for f in faqs:
            assert f.get("question_de")
            assert f.get("answer_de")


# ---------- Blog public list & filters ----------
class TestBlogPublic:
    def test_list_default_three_posts(self):
        r = requests.get(f"{BASE_URL}/api/blog", timeout=20)
        assert r.status_code == 200
        items = r.json()
        slugs = {p["slug"] for p in items}
        expected = {
            "5-tipps-fuehrerpruefung-bestehen",
            "warum-mental-coaching-fahrschule",
            "fahrstunden-mit-adhs",
        }
        assert expected.issubset(slugs), f"Missing default posts; got slugs={slugs}"

    def test_filter_by_category_pruefung(self):
        r = requests.get(f"{BASE_URL}/api/blog", params={"category": "Pruefung"}, timeout=20)
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 1
        # Only Pruefung-category posts allowed
        for p in items:
            assert "Pruefung" in (p.get("categories") or [])
        slugs = [p["slug"] for p in items]
        assert "5-tipps-fuehrerpruefung-bestehen" in slugs

    def test_filter_by_tag_adhs(self):
        r = requests.get(f"{BASE_URL}/api/blog", params={"tag": "ADHS"}, timeout=20)
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 1
        for p in items:
            assert "ADHS" in (p.get("tags") or [])
        slugs = [p["slug"] for p in items]
        assert "fahrstunden-mit-adhs" in slugs

    def test_blog_detail_5_tipps(self):
        r = requests.get(f"{BASE_URL}/api/blog/5-tipps-fuehrerpruefung-bestehen", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert data["slug"] == "5-tipps-fuehrerpruefung-bestehen"
        body_de = data.get("body_de", "")
        assert body_de.startswith("Die praktische Führerprüfung"), (
            f"body_de prefix mismatch: {body_de[:60]!r}"
        )

    def test_blog_detail_404(self):
        r = requests.get(f"{BASE_URL}/api/blog/does-not-exist-xyz", timeout=20)
        assert r.status_code == 404


# ---------- Blog admin: drafts / scheduled visibility ----------
class TestBlogAdminAndScheduling:
    def test_patch_requires_auth(self):
        r = requests.patch(
            f"{BASE_URL}/api/blog/5-tipps-fuehrerpruefung-bestehen",
            json={"reading_time_min": 5},
            timeout=20,
        )
        assert r.status_code in (401, 403)

    def test_patch_updates_and_updated_at_changes(self, admin_headers):
        # capture original
        r0 = requests.get(f"{BASE_URL}/api/blog/5-tipps-fuehrerpruefung-bestehen", timeout=20)
        assert r0.status_code == 200
        original = r0.json()
        original_updated_at = original.get("updated_at")
        original_reading = original.get("reading_time_min")
        # patch
        r1 = requests.patch(
            f"{BASE_URL}/api/blog/5-tipps-fuehrerpruefung-bestehen",
            json={"reading_time_min": (original_reading or 3) + 1},
            headers=admin_headers,
            timeout=20,
        )
        assert r1.status_code == 200, r1.text
        new_doc = r1.json()
        assert new_doc["reading_time_min"] == (original_reading or 3) + 1
        assert new_doc.get("updated_at") and new_doc["updated_at"] != original_updated_at
        # restore
        r2 = requests.patch(
            f"{BASE_URL}/api/blog/5-tipps-fuehrerpruefung-bestehen",
            json={"reading_time_min": original_reading},
            headers=admin_headers,
            timeout=20,
        )
        assert r2.status_code == 200

    def test_draft_hidden_from_public_listing(self, admin_headers):
        slug = f"qa-draft-{uuid.uuid4().hex[:8]}"
        payload = {
            "slug": slug,
            "title_de": "QA Draft",
            "title_en": "QA Draft",
            "excerpt_de": "x",
            "excerpt_en": "x",
            "body_de": "x",
            "body_en": "x",
            "status": "draft",
        }
        r_create = requests.post(
            f"{BASE_URL}/api/blog", json=payload, headers=admin_headers, timeout=20
        )
        assert r_create.status_code == 200, r_create.text
        try:
            # Public list MUST NOT include the draft
            pub = requests.get(f"{BASE_URL}/api/blog", timeout=20).json()
            assert slug not in {p["slug"] for p in pub}, "Draft leaked into public listing"
            # Admin list MUST include the draft
            adm = requests.get(
                f"{BASE_URL}/api/blog/admin", headers=admin_headers, timeout=20
            ).json()
            assert slug in {p["slug"] for p in adm}, "Draft missing from admin listing"
        finally:
            requests.delete(f"{BASE_URL}/api/blog/{slug}", headers=admin_headers, timeout=20)

    def test_scheduled_future_hidden_past_visible(self, admin_headers):
        slug = f"qa-sched-{uuid.uuid4().hex[:8]}"
        future_iso = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        past_iso = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        payload = {
            "slug": slug,
            "title_de": "QA Scheduled",
            "title_en": "QA Scheduled",
            "excerpt_de": "x",
            "excerpt_en": "x",
            "body_de": "x",
            "body_en": "x",
            "status": "scheduled",
            "scheduled_publish_at": future_iso,
        }
        r_create = requests.post(
            f"{BASE_URL}/api/blog", json=payload, headers=admin_headers, timeout=20
        )
        assert r_create.status_code == 200, r_create.text
        try:
            pub = requests.get(f"{BASE_URL}/api/blog", timeout=20).json()
            assert slug not in {p["slug"] for p in pub}, "Future-scheduled post leaked publicly"
            # Now move scheduled_publish_at into the past
            r_patch = requests.patch(
                f"{BASE_URL}/api/blog/{slug}",
                json={"scheduled_publish_at": past_iso},
                headers=admin_headers,
                timeout=20,
            )
            assert r_patch.status_code == 200, r_patch.text
            pub2 = requests.get(f"{BASE_URL}/api/blog", timeout=20).json()
            assert slug in {p["slug"] for p in pub2}, (
                "Past-scheduled post NOT visible publicly"
            )
        finally:
            requests.delete(f"{BASE_URL}/api/blog/{slug}", headers=admin_headers, timeout=20)


# ---------- Packages ----------
class TestPackages:
    EXPECTED = {"probelektion-50", "5er-karte", "10er-karte", "vku-8h"}

    def test_public_list_has_4_active(self):
        r = requests.get(f"{BASE_URL}/api/packages", timeout=20)
        assert r.status_code == 200
        items = r.json()
        slugs = {p["slug"] for p in items}
        assert self.EXPECTED.issubset(slugs), f"Missing packages; got {slugs}"
        for p in items:
            if p["slug"] in self.EXPECTED:
                assert p.get("active", True) is True

    def test_admin_list_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/packages/admin", timeout=20)
        assert r.status_code in (401, 403)

    def test_admin_list_includes_all(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/packages/admin", headers=admin_headers, timeout=20)
        assert r.status_code == 200
        slugs = {p["slug"] for p in r.json()}
        assert self.EXPECTED.issubset(slugs)

    def test_post_packages_without_auth_forbidden(self):
        r = requests.post(f"{BASE_URL}/api/packages", json={"slug": "x"}, timeout=20)
        assert r.status_code in (401, 403, 422)

    def test_patch_probelektion_price_and_restore(self, admin_headers):
        r0 = requests.get(f"{BASE_URL}/api/packages/probelektion-50", timeout=20)
        assert r0.status_code == 200
        original_price = r0.json().get("price_chf")
        # update
        r1 = requests.patch(
            f"{BASE_URL}/api/packages/probelektion-50",
            json={"price_chf": 55},
            headers=admin_headers,
            timeout=20,
        )
        assert r1.status_code == 200, r1.text
        assert r1.json().get("price_chf") == 55
        # confirm via GET
        r_check = requests.get(f"{BASE_URL}/api/packages/probelektion-50", timeout=20)
        assert r_check.json().get("price_chf") == 55
        # restore
        r2 = requests.patch(
            f"{BASE_URL}/api/packages/probelektion-50",
            json={"price_chf": original_price},
            headers=admin_headers,
            timeout=20,
        )
        assert r2.status_code == 200
        assert r2.json().get("price_chf") == original_price


# ---------- Bookings ----------
class TestBookings:
    def _payload(self):
        return {
            "first_name": "TestQA",
            "last_name": "Booker",
            "email": "qa@test.ch",
            "phone": "+41790000000",
            "package_slug": "probelektion-50",
            "preferred_date": "2026-04-15",
            "preferred_time": "14:00",
            "location_slug": "einsiedeln",
            "message": "QA test",
        }

    def test_create_and_admin_flow(self, admin_headers):
        # GET bookings without auth → 401/403
        r_no = requests.get(f"{BASE_URL}/api/bookings", timeout=20)
        assert r_no.status_code in (401, 403)

        # Public POST
        r = requests.post(f"{BASE_URL}/api/bookings", json=self._payload(), timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        booking_id = body.get("id")
        assert booking_id

        try:
            # Admin sees it
            r_list = requests.get(
                f"{BASE_URL}/api/bookings", headers=admin_headers, timeout=20
            )
            assert r_list.status_code == 200
            items = r_list.json()
            mine = next((x for x in items if x.get("id") == booking_id), None)
            assert mine is not None
            assert mine.get("status") == "pending"
            snap = mine.get("package_snapshot") or {}
            assert snap.get("title_de") == "Probelektion"
            assert snap.get("price_chf") == 50
            assert mine.get("first_name") == "TestQA"

            # PATCH status → confirmed
            r_patch = requests.patch(
                f"{BASE_URL}/api/bookings/{booking_id}",
                json={"status": "confirmed"},
                headers=admin_headers,
                timeout=20,
            )
            assert r_patch.status_code == 200
            assert r_patch.json().get("status") == "confirmed"
        finally:
            # cleanup
            r_del = requests.delete(
                f"{BASE_URL}/api/bookings/{booking_id}",
                headers=admin_headers,
                timeout=20,
            )
            assert r_del.status_code == 200

    def test_create_unknown_package_404(self):
        p = self._payload()
        p["package_slug"] = "nonexistent-xyz"
        r = requests.post(f"{BASE_URL}/api/bookings", json=p, timeout=20)
        assert r.status_code == 404, r.text

    def test_create_missing_required_422(self):
        # remove required field
        p = self._payload()
        del p["email"]
        r = requests.post(f"{BASE_URL}/api/bookings", json=p, timeout=20)
        assert r.status_code == 422


# ---------- Sitemap ----------
class TestSitemap:
    def test_sitemap_contains_new_urls(self):
        r = requests.get(f"{BASE_URL}/api/sitemap.xml", timeout=20)
        assert r.status_code == 200
        body = r.text
        assert "/blog</loc>" in body or "/blog<" in body, "Missing /blog"
        assert "/buchung" in body, "Missing /buchung"
        # Each published blog post URL must be present
        for slug in (
            "5-tipps-fuehrerpruefung-bestehen",
            "warum-mental-coaching-fahrschule",
            "fahrstunden-mit-adhs",
        ):
            assert f"/blog/{slug}" in body, f"Sitemap missing /blog/{slug}"
