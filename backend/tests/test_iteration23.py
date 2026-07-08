"""Iteration 23 – VKU permit upload endpoint + wappen SVG assets.

Covers:
1. Static wappen assets ZH/SZ/SG/GR served under /wappen/*.svg.
2. POST /api/vku/permit-upload (PUBLIC): PNG (image), PDF (pdf), rejects text/plain (400), rejects >8MB (413).
3. GET /api/files/<path> returns the uploaded content with correct Content-Type.
4. VKU registration create/list/delete flow persisting permit_file_url.
"""
import io
import os
import struct
import time
import zlib

import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://driving-school-cms.preview.emergentagent.com",
).rstrip("/")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@saferide.ch")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "SafeRide2026!")


# ---------- fixtures ---------- #
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text[:200]}"
    tok = r.json().get("access_token") or r.json().get("token")
    assert tok
    return tok


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ---------- helpers ---------- #
def _make_png(width=20, height=20):
    """Return a small valid PNG (~30KB after padding? Really ~200B; we pad the trailing IDAT if needed)."""
    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)  # RGB
    raw = b""
    for _ in range(height):
        raw += b"\x00" + b"\xff\x88\x00" * width  # orange-ish
    idat = zlib.compress(raw)
    png = sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")
    return png


def _make_pdf():
    """Minimal valid PDF body ~500 bytes."""
    return (
        b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n"
        b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 100 100]>>endobj\n"
        b"xref\n0 4\n0000000000 65535 f \n"
        b"0000000010 00000 n \n0000000060 00000 n \n0000000110 00000 n \n"
        b"trailer<</Size 4/Root 1 0 R>>\nstartxref\n200\n%%EOF\n"
    )


# ---------- Wappen static assets ---------- #
class TestWappenAssets:
    """Verify original Wikimedia Wappen SVGs are served by the preview origin."""

    @pytest.mark.parametrize("code", ["ZH", "SZ", "SG", "GR"])
    def test_wappen_serves_valid_svg(self, code):
        r = requests.get(f"{BASE_URL}/wappen/{code}.svg", timeout=15)
        assert r.status_code == 200, f"{code} wappen not served: {r.status_code}"
        ct = r.headers.get("Content-Type", "").lower()
        assert ("svg" in ct) or ("octet-stream" in ct), f"unexpected ct for {code}: {ct}"
        body = r.text
        assert "<svg" in body, f"{code} body does not contain <svg tag"
        assert len(r.content) > 200, f"{code} unrealistically small: {len(r.content)}"


# ---------- VKU permit upload ---------- #
class TestVkuPermitUpload:
    """POST /api/vku/permit-upload – public, accepts image/pdf, size-limited."""

    def test_upload_png_returns_url_and_serves(self):
        png = _make_png()
        # pad up to ~30KB so it truly looks like a real image
        # (still a valid PNG since we only append trailing bytes after %%EOF -- not the case for png.
        # Instead just keep it as-is; size validity, not padding, is tested elsewhere.)
        files = {"file": ("test_permit.png", png, "image/png")}
        r = requests.post(f"{BASE_URL}/api/vku/permit-upload", files=files, timeout=30)
        assert r.status_code == 200, f"upload failed: {r.status_code} {r.text[:300]}"
        data = r.json()
        assert data["kind"] == "image"
        assert data["filename"] == "test_permit.png"
        assert data["url"].startswith("/api/files/")
        assert data["path"]
        # Fetch the file back through the API
        get_r = requests.get(f"{BASE_URL}{data['url']}", timeout=30)
        assert get_r.status_code == 200
        # content-type may be image/png or application/octet-stream (Emergent objstore)
        ct = get_r.headers.get("Content-Type", "").lower()
        assert "png" in ct or "octet" in ct or "image" in ct, f"got ct={ct}"
        # Content should start with PNG signature
        assert get_r.content[:8] == b"\x89PNG\r\n\x1a\n"

    def test_upload_pdf_returns_url_and_serves(self):
        pdf = _make_pdf()
        files = {"file": ("test_permit.pdf", pdf, "application/pdf")}
        r = requests.post(f"{BASE_URL}/api/vku/permit-upload", files=files, timeout=30)
        assert r.status_code == 200, f"pdf upload failed: {r.status_code} {r.text[:300]}"
        data = r.json()
        assert data["kind"] == "pdf"
        assert data["filename"] == "test_permit.pdf"
        assert data["url"].startswith("/api/files/")
        get_r = requests.get(f"{BASE_URL}{data['url']}", timeout=30)
        assert get_r.status_code == 200
        assert get_r.content.startswith(b"%PDF")

    def test_upload_rejects_text_plain(self):
        files = {"file": ("evil.txt", b"hello world", "text/plain")}
        r = requests.post(f"{BASE_URL}/api/vku/permit-upload", files=files, timeout=15)
        assert r.status_code == 400, f"expected 400 got {r.status_code}: {r.text[:200]}"

    def test_upload_rejects_over_size_limit(self):
        # 9 MB random-ish PNG-ish payload (backend enforces size AFTER MIME check,
        # so use a legal MIME type).
        big = b"\x89PNG\r\n\x1a\n" + os.urandom(9 * 1024 * 1024)
        files = {"file": ("huge.png", big, "image/png")}
        r = requests.post(f"{BASE_URL}/api/vku/permit-upload", files=files, timeout=60)
        assert r.status_code == 413, f"expected 413 got {r.status_code}: {r.text[:200]}"


# ---------- VKU registration lifecycle w/ permit ---------- #
class TestVkuRegistrationWithPermit:
    """POST /api/vku/registrations should accept + persist permit_file_url."""

    def test_create_list_delete_with_permit(self, admin_headers):
        # 1) Upload a PNG to get a permit URL
        png = _make_png()
        files = {"file": ("permit.png", png, "image/png")}
        up = requests.post(f"{BASE_URL}/api/vku/permit-upload", files=files, timeout=30)
        assert up.status_code == 200
        permit_url = up.json()["url"]
        permit_name = up.json()["filename"]

        # 2) Create registration (public – no auth)
        ts = int(time.time())
        payload = {
            "first_name": "TESTIt23",
            "last_name": "Automated",
            "email": f"test-it23-{ts}@saferide.ch",
            "phone": "+41 79 000 00 00",
            "birth_date": "2004-01-15",
            "course_slot": "TEST · Automated slot",
            "notes": "iteration23 pytest",
            "permit_file_url": permit_url,
            "permit_file_name": permit_name,
        }
        r = requests.post(f"{BASE_URL}/api/vku/registrations", json=payload, timeout=15)
        assert r.status_code in (200, 201), f"create failed: {r.status_code} {r.text[:200]}"
        created = r.json()
        assert created["email"] == payload["email"]
        assert created["permit_file_url"] == permit_url
        assert created["permit_file_name"] == permit_name
        reg_id = created["id"]

        # 3) List and find our registration (admin only)
        lst = requests.get(f"{BASE_URL}/api/vku/registrations", headers=admin_headers, timeout=15)
        assert lst.status_code == 200
        rows = lst.json()
        match = [x for x in rows if x["id"] == reg_id]
        assert match, "created registration not present in admin list"
        assert match[0]["permit_file_url"] == permit_url

        # 4) Cleanup
        d = requests.delete(
            f"{BASE_URL}/api/vku/registrations/{reg_id}", headers=admin_headers, timeout=15
        )
        assert d.status_code == 200

    def test_list_requires_admin(self):
        r = requests.get(f"{BASE_URL}/api/vku/registrations", timeout=15)
        assert r.status_code in (401, 403)
