"""
Iteration 7 tests:
- All 11 location slugs return HTTP 200
- Admin can PATCH content.nadine.intro_text_de (persistence + restore)
- Admin can PATCH location exam_routes_outro_de (persistence + restore)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://driving-school-cms.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@saferide.ch"
ADMIN_PASS = "SafeRide2026!"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    token = r.json().get("access_token")
    if token:
        s.headers.update({"Authorization": f"Bearer {token}"})
    return s


@pytest.fixture(scope="module")
def all_slugs(session):
    r = session.get(f"{API}/locations")
    assert r.status_code == 200
    data = r.json()
    return [l["slug"] for l in data]


def test_all_11_locations_return_200(all_slugs, session):
    assert len(all_slugs) == 11, f"Expected 11 location slugs, got {len(all_slugs)}: {all_slugs}"
    failures = []
    for slug in all_slugs:
        r = session.get(f"{API}/locations/{slug}")
        if r.status_code != 200:
            failures.append((slug, r.status_code))
    assert not failures, f"Some locations did not return 200: {failures}"


def test_nadine_intro_text_patch_and_restore(session):
    # Get current content
    r = session.get(f"{API}/content")
    assert r.status_code == 200
    content = r.json()
    original = (content.get("nadine") or {}).get("intro_text_de", "")
    assert isinstance(original, str)

    test_val = original + " [TEST_IT7]"
    try:
        p = session.patch(f"{API}/content", json={"nadine.intro_text_de": test_val})
        assert p.status_code == 200, f"PATCH failed: {p.status_code} {p.text}"

        # Verify persisted via fresh GET
        r2 = session.get(f"{API}/content")
        assert r2.status_code == 200
        new_val = (r2.json().get("nadine") or {}).get("intro_text_de")
        assert new_val == test_val, f"Expected {test_val!r}, got {new_val!r}"
    finally:
        # Restore
        session.patch(f"{API}/content", json={"nadine.intro_text_de": original})
        r3 = session.get(f"{API}/content")
        assert (r3.json().get("nadine") or {}).get("intro_text_de") == original


def test_routes_outro_patch_and_restore(session):
    slug = "einsiedeln"
    r = session.get(f"{API}/locations/{slug}")
    assert r.status_code == 200
    loc = r.json()
    original = loc.get("exam_routes_outro_de", "")
    test_val = (original or "") + " [TEST_IT7]"
    try:
        p = session.patch(f"{API}/locations/{slug}", json={"exam_routes_outro_de": test_val})
        assert p.status_code == 200, f"PATCH failed: {p.status_code} {p.text}"
        r2 = session.get(f"{API}/locations/{slug}")
        assert r2.status_code == 200
        assert r2.json().get("exam_routes_outro_de") == test_val
    finally:
        session.patch(f"{API}/locations/{slug}", json={"exam_routes_outro_de": original})
        r3 = session.get(f"{API}/locations/{slug}")
        assert r3.json().get("exam_routes_outro_de") == original
