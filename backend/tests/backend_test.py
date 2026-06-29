"""
Backend API tests for Fahrschule Safe Ride.
Run: pytest /app/backend/tests/backend_test.py -v --junitxml=/app/test_reports/pytest/pytest_results.xml
"""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or \
    "https://driving-school-cms.preview.emergentagent.com"

ADMIN_EMAIL = "admin@saferide.ch"
ADMIN_PASSWORD = "SafeRide2026!"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def token(client):
    r = client.post(f"{BASE_URL}/api/auth/login",
                    json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data
    return data["access_token"]


@pytest.fixture(scope="session")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------- Health ----------
class TestHealth:
    def test_root(self, client):
        r = client.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"


# ---------- Public Content ----------
class TestPublicContent:
    def test_content_shape(self, client):
        r = client.get(f"{BASE_URL}/api/content")
        assert r.status_code == 200
        d = r.json()
        for key in ["hero", "about", "services", "fleet", "pricing", "contact",
                    "marquee_de", "marquee_en"]:
            assert key in d, f"missing key {key}"
        assert isinstance(d["services"], list) and len(d["services"]) >= 1
        assert isinstance(d["fleet"], list) and len(d["fleet"]) >= 1
        assert "title_de" in d["hero"]

    def test_testimonials(self, client):
        r = client.get(f"{BASE_URL}/api/testimonials")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) >= 6
        for it in items:
            assert "id" in it and "name" in it and "rating" in it and "text_de" in it

    def test_gallery(self, client):
        r = client.get(f"{BASE_URL}/api/gallery")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) >= 6
        for it in items:
            assert "id" in it and "image_url" in it


# ---------- Contact ----------
class TestContact:
    def test_submit_valid(self, client):
        payload = {
            "first_name": "TEST_Pytest",
            "last_name": "User",
            "email": "test_pytest@example.com",
            "phone": "+41 79 000 00 00",
            "message": "Automated test message",
        }
        r = client.post(f"{BASE_URL}/api/contact", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "id" in d
        assert d["email"] == payload["email"]
        assert d.get("read") is False
        TestContact.created_id = d["id"]

    def test_submit_missing_field(self, client):
        r = client.post(f"{BASE_URL}/api/contact", json={"first_name": "X"})
        assert r.status_code == 422

    def test_submit_invalid_email(self, client):
        r = client.post(f"{BASE_URL}/api/contact", json={
            "first_name": "X", "last_name": "Y",
            "email": "not-an-email", "phone": "123", "message": "hi"
        })
        assert r.status_code == 422


# ---------- Auth ----------
class TestAuth:
    def test_login_success(self, client):
        r = client.post(f"{BASE_URL}/api/auth/login",
                        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        d = r.json()
        assert d.get("token_type") == "bearer"
        assert d["user"]["email"] == ADMIN_EMAIL
        assert d["user"]["role"] == "admin"

    def test_login_wrong_password(self, client):
        r = client.post(f"{BASE_URL}/api/auth/login",
                        json={"email": ADMIN_EMAIL, "password": "wrongpass"})
        assert r.status_code == 401

    def test_me_with_token(self, client, auth_headers):
        r = client.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == ADMIN_EMAIL
        assert "password_hash" not in d

    def test_me_without_token(self, client):
        # Use a separate session to avoid leaking auth header
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401


# ---------- Admin: Content ----------
class TestAdminContent:
    def test_put_content_unauthorized(self, client):
        r = requests.put(f"{BASE_URL}/api/content", json={"hero": {"title_de": "X"}})
        assert r.status_code == 401

    def test_put_content_persist_and_revert(self, client, auth_headers):
        # Get original
        original = client.get(f"{BASE_URL}/api/content").json()
        orig_title = original.get("hero", {}).get("title_de")
        # Modify
        modified = dict(original)
        modified["hero"] = dict(original["hero"], title_de="TEST_PYTEST_TITLE")
        r = client.put(f"{BASE_URL}/api/content", json=modified, headers=auth_headers)
        assert r.status_code == 200, r.text
        # Verify
        v = client.get(f"{BASE_URL}/api/content").json()
        assert v["hero"]["title_de"] == "TEST_PYTEST_TITLE"
        # Revert
        modified["hero"]["title_de"] = orig_title
        r2 = client.put(f"{BASE_URL}/api/content", json=modified, headers=auth_headers)
        assert r2.status_code == 200
        v2 = client.get(f"{BASE_URL}/api/content").json()
        assert v2["hero"]["title_de"] == orig_title


# ---------- Admin: Testimonials ----------
class TestAdminTestimonials:
    def test_crud(self, client, auth_headers):
        # unauthorized create
        r0 = requests.post(f"{BASE_URL}/api/testimonials",
                           json={"name": "X", "rating": 5, "date": "2026", "text_de": "hi"})
        assert r0.status_code == 401

        # create
        payload = {"name": "TEST_PYTEST", "rating": 5, "date": "Jan 2026",
                   "text_de": "Pytest entry", "text_en": "Pytest entry EN"}
        r = client.post(f"{BASE_URL}/api/testimonials", json=payload, headers=auth_headers)
        assert r.status_code == 200, r.text
        item = r.json()
        tid = item["id"]
        assert item["name"] == "TEST_PYTEST"

        # update
        upd = dict(payload, name="TEST_PYTEST_UPDATED")
        r2 = client.put(f"{BASE_URL}/api/testimonials/{tid}", json=upd, headers=auth_headers)
        assert r2.status_code == 200
        assert r2.json()["name"] == "TEST_PYTEST_UPDATED"

        # verify list contains it
        r3 = client.get(f"{BASE_URL}/api/testimonials")
        assert any(x["id"] == tid for x in r3.json())

        # delete
        r4 = client.delete(f"{BASE_URL}/api/testimonials/{tid}", headers=auth_headers)
        assert r4.status_code == 200

        # verify removed
        r5 = client.get(f"{BASE_URL}/api/testimonials")
        assert not any(x["id"] == tid for x in r5.json())


# ---------- Admin: Gallery ----------
class TestAdminGallery:
    def test_crud(self, client, auth_headers):
        r0 = requests.post(f"{BASE_URL}/api/gallery", json={"image_url": "x"})
        assert r0.status_code == 401

        payload = {"image_url": "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800",
                   "caption_de": "TEST_DE", "caption_en": "TEST_EN"}
        r = client.post(f"{BASE_URL}/api/gallery", json=payload, headers=auth_headers)
        assert r.status_code == 200, r.text
        gid = r.json()["id"]

        # update
        r2 = client.put(f"{BASE_URL}/api/gallery/{gid}",
                        json=dict(payload, caption_de="TEST_DE_UPD"),
                        headers=auth_headers)
        assert r2.status_code == 200
        assert r2.json()["caption_de"] == "TEST_DE_UPD"

        # delete
        r3 = client.delete(f"{BASE_URL}/api/gallery/{gid}", headers=auth_headers)
        assert r3.status_code == 200
        r4 = client.get(f"{BASE_URL}/api/gallery")
        assert not any(x["id"] == gid for x in r4.json())


# ---------- Admin: Submissions ----------
class TestAdminSubmissions:
    def test_list_and_lifecycle(self, client, auth_headers):
        # unauthorized
        r0 = requests.get(f"{BASE_URL}/api/contact/submissions")
        assert r0.status_code == 401

        # create one submission via public endpoint
        payload = {
            "first_name": "TEST_SubFlow", "last_name": "Y",
            "email": "subflow@example.com", "phone": "+41 79 1", "message": "flow"
        }
        rc = client.post(f"{BASE_URL}/api/contact", json=payload)
        assert rc.status_code == 200
        sid = rc.json()["id"]

        # list
        r = client.get(f"{BASE_URL}/api/contact/submissions", headers=auth_headers)
        assert r.status_code == 200
        items = r.json()
        assert any(x["id"] == sid for x in items)

        # Descending order check
        dates = [x.get("created_at", "") for x in items]
        assert dates == sorted(dates, reverse=True), "submissions not in desc order"

        # mark read
        rr = client.patch(f"{BASE_URL}/api/contact/submissions/{sid}/read",
                          headers=auth_headers)
        assert rr.status_code == 200
        items2 = client.get(f"{BASE_URL}/api/contact/submissions",
                            headers=auth_headers).json()
        match = [x for x in items2 if x["id"] == sid][0]
        assert match["read"] is True

        # delete
        rd = client.delete(f"{BASE_URL}/api/contact/submissions/{sid}",
                           headers=auth_headers)
        assert rd.status_code == 200
        items3 = client.get(f"{BASE_URL}/api/contact/submissions",
                            headers=auth_headers).json()
        assert not any(x["id"] == sid for x in items3)


# ---------- Cleanup ----------
@pytest.fixture(scope="session", autouse=True)
def cleanup_at_end(client):
    yield
    # Best-effort cleanup of leftover TEST_ submissions
    try:
        r = client.post(f"{BASE_URL}/api/auth/login",
                        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        if r.status_code == 200:
            h = {"Authorization": f"Bearer {r.json()['access_token']}"}
            subs = client.get(f"{BASE_URL}/api/contact/submissions", headers=h).json()
            for s in subs:
                if s.get("first_name", "").startswith("TEST_"):
                    client.delete(f"{BASE_URL}/api/contact/submissions/{s['id']}", headers=h)
    except Exception:
        pass
