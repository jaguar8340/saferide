"""Iteration 6 backend feature tests:
- Location: exam_routes[].description_de/en, exam_routes_outro_de/en, other_regions_*
- Content: nadine.* object with media_type/media_url and stats
- Upload: image + video (mp4/mov/webm) with kind in response, size limits, served file
- PATCH /api/locations/{slug} dot-notation for new keys
- Sitemap still has 14 URLs
"""
import os, io, uuid, requests, pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://driving-school-cms.preview.emergentagent.com").rstrip("/")
ADMIN = {"email": "admin@saferide.ch", "password": "SafeRide2026!"}

TINY_MP4 = b"\x00\x00\x00\x14ftypmp42\x00\x00\x00\x00mp42isom\x00\x00\x00\x08moov"
TINY_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\x00\x01"
    b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# --- GET /api/locations/{slug} new keys ---
@pytest.mark.parametrize("slug", ["einsiedeln", "horgen", "pfaeffikon-sz"])
def test_location_has_iteration6_keys(slug):
    r = requests.get(f"{BASE_URL}/api/locations/{slug}", timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    # exam_routes have description fields
    assert "exam_routes" in data and len(data["exam_routes"]) > 0
    for route in data["exam_routes"]:
        assert "description_de" in route
        assert "description_en" in route
    # outro keys
    assert "exam_routes_outro_de" in data and data["exam_routes_outro_de"]
    assert "exam_routes_outro_en" in data and data["exam_routes_outro_en"]
    # other regions keys
    assert "other_regions_overline_de" in data
    assert "other_regions_overline_en" in data
    assert "other_regions_intro_de" in data
    assert "other_regions_intro_en" in data
    assert data["other_regions_title_de"] == "Ausserdem in folgenden Regionen für dich da"
    assert "other_regions_title_en" in data


# --- GET /api/content nadine object ---
def test_content_has_nadine_object():
    r = requests.get(f"{BASE_URL}/api/content", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert "nadine" in data
    n = data["nadine"]
    for k in ["intro_title_de", "intro_title_en", "intro_text_de", "intro_text_en",
              "media_type", "media_url", "stat1_value", "stat1_label_de",
              "stat1_label_en", "stat2_value", "stat2_label_de", "stat2_label_en"]:
        assert k in n, f"missing {k}"
    assert n["media_type"] in ("image", "video")


# --- Upload tests ---
def test_upload_image_ok(auth_headers):
    files = {"file": ("t.png", io.BytesIO(TINY_PNG), "image/png")}
    r = requests.post(f"{BASE_URL}/api/upload", headers=auth_headers, files=files, timeout=60)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["kind"] == "image"
    assert d["url"].startswith("/api/files/")


def test_upload_video_mp4_ok(auth_headers):
    files = {"file": ("t.mp4", io.BytesIO(TINY_MP4), "video/mp4")}
    r = requests.post(f"{BASE_URL}/api/upload", headers=auth_headers, files=files, timeout=60)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["kind"] == "video"
    assert d["url"].endswith(".mp4")
    # serve back and check content-type
    serve = requests.get(f"{BASE_URL}{d['url']}", timeout=60)
    assert serve.status_code == 200
    assert "video/mp4" in serve.headers.get("Content-Type", "")


def test_upload_rejects_unknown_mime(auth_headers):
    files = {"file": ("t.txt", io.BytesIO(b"hello"), "text/plain")}
    r = requests.post(f"{BASE_URL}/api/upload", headers=auth_headers, files=files, timeout=60)
    assert r.status_code == 400


def test_upload_rejects_oversize_image(auth_headers):
    # 11 MB png-ish bytes (still labeled image/png) -> should 413
    big = b"\x00" * (11 * 1024 * 1024)
    files = {"file": ("big.png", io.BytesIO(big), "image/png")}
    r = requests.post(f"{BASE_URL}/api/upload", headers=auth_headers, files=files, timeout=120)
    assert r.status_code == 413


# Skipping the >60MB video oversize test on purpose: too heavy for network.


# --- PATCH /api/locations/einsiedeln dot-notation new keys + restore ---
def test_patch_location_new_keys_and_restore(auth_headers):
    slug = "einsiedeln"
    snap = requests.get(f"{BASE_URL}/api/locations/{slug}", timeout=30).json()
    orig_desc = snap["exam_routes"][0].get("description_de", "")
    orig_outro = snap.get("exam_routes_outro_de", "")
    orig_title = snap.get("other_regions_title_de", "")
    marker = f"TEST_{uuid.uuid4().hex[:6]}"
    body = {
        "exam_routes.0.description_de": f"X-{marker}",
        "exam_routes_outro_de": f"Y-{marker}",
        "other_regions_title_de": f"Z-{marker}",
    }
    r = requests.patch(f"{BASE_URL}/api/locations/{slug}", headers=auth_headers, json=body, timeout=30)
    assert r.status_code == 200, r.text
    after = requests.get(f"{BASE_URL}/api/locations/{slug}", timeout=30).json()
    assert after["exam_routes"][0]["description_de"] == f"X-{marker}"
    assert after["exam_routes_outro_de"] == f"Y-{marker}"
    assert after["other_regions_title_de"] == f"Z-{marker}"
    # restore
    restore = {
        "exam_routes.0.description_de": orig_desc,
        "exam_routes_outro_de": orig_outro,
        "other_regions_title_de": orig_title,
    }
    rr = requests.patch(f"{BASE_URL}/api/locations/{slug}", headers=auth_headers, json=restore, timeout=30)
    assert rr.status_code == 200


# --- Sitemap still 14 URLs ---
def test_sitemap_14_urls():
    r = requests.get(f"{BASE_URL}/api/sitemap.xml", timeout=30)
    assert r.status_code == 200
    assert r.text.count("<url>") == 14
