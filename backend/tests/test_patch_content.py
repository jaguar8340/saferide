"""
Tests for PATCH /api/content with dot-notation $set updates.
"""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or \
    "https://driving-school-cms.preview.emergentagent.com"
ADMIN_EMAIL = "admin@saferide.ch"
ADMIN_PASSWORD = "SafeRide2026!"


@pytest.fixture(scope="module")
def auth_headers():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}",
            "Content-Type": "application/json"}


class TestPatchContent:
    def test_patch_requires_auth(self):
        r = requests.patch(f"{BASE_URL}/api/content",
                           json={"hero.title_de": "X"}, timeout=30)
        assert r.status_code == 401, r.text

    def test_patch_empty_body_400(self, auth_headers):
        r = requests.patch(f"{BASE_URL}/api/content", json={}, headers=auth_headers, timeout=30)
        assert r.status_code == 400, r.text

    def test_patch_top_level_dot_path_and_revert(self, auth_headers):
        # Get baseline
        original = requests.get(f"{BASE_URL}/api/content", timeout=30).json()
        orig_title = original["hero"]["title_de"]
        orig_sub = original["hero"]["subtitle_de"]
        orig_about_title = original["about"]["title_de"]
        # Patch only hero.title_de — sibling subtitle_de must remain intact
        r = requests.patch(f"{BASE_URL}/api/content",
                           json={"hero.title_de": "TEST_PATCH_TITLE"},
                           headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        doc = r.json()
        assert doc["hero"]["title_de"] == "TEST_PATCH_TITLE"
        # sibling untouched
        assert doc["hero"]["subtitle_de"] == orig_sub
        assert doc["about"]["title_de"] == orig_about_title

        # GET independently to confirm persistence
        v = requests.get(f"{BASE_URL}/api/content", timeout=30).json()
        assert v["hero"]["title_de"] == "TEST_PATCH_TITLE"
        assert v["hero"]["subtitle_de"] == orig_sub

        # revert
        r2 = requests.patch(f"{BASE_URL}/api/content",
                            json={"hero.title_de": orig_title},
                            headers=auth_headers, timeout=30)
        assert r2.status_code == 200
        v2 = requests.get(f"{BASE_URL}/api/content", timeout=30).json()
        assert v2["hero"]["title_de"] == orig_title

    def test_patch_nested_array_index(self, auth_headers):
        """services.0.title_de must update only services[0].title_de without overwriting siblings."""
        original = requests.get(f"{BASE_URL}/api/content", timeout=30).json()
        s0 = original["services"][0]
        s1 = original["services"][1]
        orig_s0_title = s0["title_de"]
        orig_s0_desc = s0["description_de"]
        orig_s1_title = s1["title_de"]

        r = requests.patch(f"{BASE_URL}/api/content",
                           json={"services.0.title_de": "TEST_PATCH_S0"},
                           headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        v = requests.get(f"{BASE_URL}/api/content", timeout=30).json()
        assert v["services"][0]["title_de"] == "TEST_PATCH_S0"
        # description in same item must remain untouched
        assert v["services"][0]["description_de"] == orig_s0_desc
        # sibling services[1] must remain untouched
        assert v["services"][1]["title_de"] == orig_s1_title

        # revert
        rr = requests.patch(f"{BASE_URL}/api/content",
                            json={"services.0.title_de": orig_s0_title},
                            headers=auth_headers, timeout=30)
        assert rr.status_code == 200
        vv = requests.get(f"{BASE_URL}/api/content", timeout=30).json()
        assert vv["services"][0]["title_de"] == orig_s0_title

    def test_patch_multi_keys(self, auth_headers):
        original = requests.get(f"{BASE_URL}/api/content", timeout=30).json()
        orig_phone = original["contact"]["phone"]
        orig_marquee = original["marquee_de"]
        r = requests.patch(
            f"{BASE_URL}/api/content",
            json={"contact.phone": "+41 79 999 99 99", "marquee_de": "TEST · MARQUEE"},
            headers=auth_headers, timeout=30,
        )
        assert r.status_code == 200, r.text
        v = requests.get(f"{BASE_URL}/api/content", timeout=30).json()
        assert v["contact"]["phone"] == "+41 79 999 99 99"
        assert v["marquee_de"] == "TEST · MARQUEE"
        # revert
        requests.patch(
            f"{BASE_URL}/api/content",
            json={"contact.phone": orig_phone, "marquee_de": orig_marquee},
            headers=auth_headers, timeout=30,
        )

    def test_patch_strips_id_keys(self, auth_headers):
        """_id and id keys must be stripped server-side. Valid sibling field still applied."""
        original = requests.get(f"{BASE_URL}/api/content", timeout=30).json()
        orig_overline = original["hero"]["overline_de"]
        r = requests.patch(
            f"{BASE_URL}/api/content",
            json={"_id": "boom", "id": "evil", "hero.overline_de": "TEST_OVERLINE"},
            headers=auth_headers, timeout=30,
        )
        assert r.status_code == 200, r.text
        v = requests.get(f"{BASE_URL}/api/content", timeout=30).json()
        assert v.get("id") == "main"  # untouched
        assert v["hero"]["overline_de"] == "TEST_OVERLINE"
        # revert to captured original
        requests.patch(f"{BASE_URL}/api/content",
                       json={"hero.overline_de": orig_overline},
                       headers=auth_headers, timeout=30)
