"""
Tests for the new file upload endpoints:
- POST /api/upload (JWT-protected, multipart)
- GET  /api/files/{path} (public, returns image bytes)
"""
import io
import os
import struct
import zlib
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or \
    "https://driving-school-cms.preview.emergentagent.com"
ADMIN_EMAIL = "admin@saferide.ch"
ADMIN_PASSWORD = "SafeRide2026!"


def _minimal_png_bytes() -> bytes:
    """Create a 1x1 transparent PNG without external libs."""
    sig = b"\x89PNG\r\n\x1a\n"

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", 1, 1, 8, 6, 0, 0, 0)
    raw = b"\x00\x00\x00\x00\x00"  # filter byte + RGBA pixel
    idat = zlib.compress(raw)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


@pytest.fixture(scope="module")
def token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def png_bytes():
    return _minimal_png_bytes()


class TestUpload:
    def test_upload_requires_auth(self, png_bytes):
        files = {"file": ("a.png", io.BytesIO(png_bytes), "image/png")}
        r = requests.post(f"{BASE_URL}/api/upload", files=files, timeout=60)
        assert r.status_code == 401, r.text

    def test_upload_rejects_non_image(self, token):
        headers = {"Authorization": f"Bearer {token}"}
        files = {"file": ("a.txt", io.BytesIO(b"hello world"), "text/plain")}
        r = requests.post(f"{BASE_URL}/api/upload", files=files, headers=headers, timeout=60)
        assert r.status_code in (400, 415), r.text

    def test_upload_image_and_fetch(self, token, png_bytes):
        headers = {"Authorization": f"Bearer {token}"}
        files = {"file": ("pixel.png", io.BytesIO(png_bytes), "image/png")}
        r = requests.post(f"{BASE_URL}/api/upload", files=files, headers=headers, timeout=120)
        if r.status_code == 503:
            pytest.skip(f"Storage unavailable: {r.text}")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "path" in data and "url" in data
        assert data["path"].startswith("saferide/uploads/"), data
        assert data["url"].startswith("/api/files/"), data
        assert data["url"].endswith(data["path"])

        # Public GET via /api/files/{path}
        full_url = f"{BASE_URL}{data['url']}"
        g = requests.get(full_url, timeout=60)
        assert g.status_code == 200, f"{g.status_code} {g.text[:200]}"
        assert g.headers.get("Content-Type", "").startswith("image/")
        assert g.content[:8] == b"\x89PNG\r\n\x1a\n", "Returned bytes are not a PNG"

        # Save url for downstream gallery test
        TestUpload._uploaded_url = data["url"]
        TestUpload._uploaded_path = data["path"]

    def test_uploaded_image_usable_in_gallery(self, token):
        if not getattr(TestUpload, "_uploaded_url", None):
            pytest.skip("Upload did not produce a url")
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        payload = {
            "image_url": TestUpload._uploaded_url,
            "caption_de": "TEST_UPLOAD_DE",
            "caption_en": "TEST_UPLOAD_EN",
        }
        r = requests.post(f"{BASE_URL}/api/gallery", json=payload, headers=headers, timeout=30)
        assert r.status_code == 200, r.text
        gid = r.json()["id"]
        assert r.json()["image_url"] == TestUpload._uploaded_url

        # public visible
        pub = requests.get(f"{BASE_URL}/api/gallery", timeout=30).json()
        assert any(x["id"] == gid for x in pub)

        # cleanup
        rd = requests.delete(f"{BASE_URL}/api/gallery/{gid}", headers=headers, timeout=30)
        assert rd.status_code == 200


class TestServeFile:
    def test_missing_file_returns_404(self):
        r = requests.get(f"{BASE_URL}/api/files/saferide/uploads/does-not-exist.png", timeout=30)
        # Storage may return 404 or service may be unavailable
        assert r.status_code in (404, 503), r.text
