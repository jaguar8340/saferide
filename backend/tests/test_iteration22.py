"""Iteration 22 (Feb 7 UX batch) regression:
- why_safe_ride.pillars[*].body_de/en length < 200 (migration ran)
- 5th pillar (icon=MapPin) title mentions 4 cantons
- about.stat*_value + about.stat*_label_de present (editable inline)
- PATCH about.stat1_label_de persists via API
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://driving-school-cms.preview.emergentagent.com",
).rstrip("/")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@saferide.ch")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "SafeRide2026!")


@pytest.fixture(scope="module")
def admin_headers():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, f"login failed: {r.status_code}"
    token = r.json().get("access_token") or r.json().get("token")
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def content():
    r = requests.get(f"{BASE_URL}/api/content", timeout=15)
    assert r.status_code == 200
    return r.json()


# ---------- WhySafeRide pillar bodies must be short (< 200 chars) ----------
class TestPillarBodiesShort:
    def test_six_pillars_exist(self, content):
        pillars = (content.get("why_safe_ride") or {}).get("pillars") or []
        assert len(pillars) >= 6, f"expected 6 pillars, got {len(pillars)}"

    @pytest.mark.parametrize("idx", [0, 1, 2, 3, 4, 5])
    def test_pillar_body_de_short(self, content, idx):
        pillars = content["why_safe_ride"]["pillars"]
        body_de = pillars[idx].get("body_de", "") or ""
        assert len(body_de) > 0, f"pillar[{idx}].body_de empty"
        assert len(body_de) < 200, (
            f"pillar[{idx}].body_de too long: {len(body_de)} chars: {body_de[:220]!r}"
        )

    @pytest.mark.parametrize("idx", [0, 1, 2, 3, 4, 5])
    def test_pillar_body_en_short(self, content, idx):
        pillars = content["why_safe_ride"]["pillars"]
        body_en = pillars[idx].get("body_en", "") or ""
        assert len(body_en) > 0
        assert len(body_en) < 200


class TestLocationsPillar:
    def test_pillar5_is_mappin_with_4_cantons(self, content):
        pillars = content["why_safe_ride"]["pillars"]
        p5 = pillars[4]
        assert p5.get("icon") == "MapPin", f"pillar[4].icon expected MapPin, got {p5.get('icon')}"
        title = (p5.get("title_de") or "") + " " + (p5.get("body_de") or "")
        # Kantons mentioned somewhere in title or body
        assert "4" in title or "vier" in title.lower(), "pillar[4] title/body should mention 4 cantons"


# ---------- About stats: values + labels editable ----------
class TestAboutStats:
    def test_stat_fields_exist(self, content):
        about = content.get("about") or {}
        for k in ["stat1_value", "stat2_value", "stat3_value",
                  "stat1_label_de", "stat2_label_de", "stat3_label_de",
                  "stat1_label_en", "stat2_label_en", "stat3_label_en"]:
            assert k in about, f"about.{k} missing from content"
            assert about[k], f"about.{k} empty"

    def test_patch_stat1_label_de_persists(self, admin_headers, content):
        about = content["about"]
        original = about["stat1_label_de"]
        marker = f" TESTLABEL{int(time.time())}"
        new_val = original + marker
        try:
            r = requests.patch(
                f"{BASE_URL}/api/content",
                headers=admin_headers,
                json={"about.stat1_label_de": new_val},
                timeout=15,
            )
            assert r.status_code == 200, f"patch failed: {r.status_code} {r.text[:200]}"
            # verify via GET
            r2 = requests.get(f"{BASE_URL}/api/content", timeout=15)
            fetched = r2.json()["about"]["stat1_label_de"]
            assert fetched == new_val, f"expected {new_val!r}, got {fetched!r}"
        finally:
            requests.patch(
                f"{BASE_URL}/api/content",
                headers=admin_headers,
                json={"about.stat1_label_de": original},
                timeout=15,
            )

    def test_patch_stat1_value_persists(self, admin_headers, content):
        about = content["about"]
        original = about["stat1_value"]
        new_val = f"{original} 999+"
        try:
            r = requests.patch(
                f"{BASE_URL}/api/content",
                headers=admin_headers,
                json={"about.stat1_value": new_val},
                timeout=15,
            )
            assert r.status_code == 200
            r2 = requests.get(f"{BASE_URL}/api/content", timeout=15)
            assert r2.json()["about"]["stat1_value"] == new_val
        finally:
            requests.patch(
                f"{BASE_URL}/api/content",
                headers=admin_headers,
                json={"about.stat1_value": original},
                timeout=15,
            )
