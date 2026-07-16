"""Iteration 56 — Company (Firma) field, image_url on Diverse Notizen,
Volljährigkeit derives from birthdate (checked in frontend, backend just returns field).
"""
import io
import os
import requests
import pytest

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8001")
ADMIN_EMAIL = "admin@saferide.ch"
ADMIN_PASSWORD = "SafeRide2026!"


@pytest.fixture(scope="module")
def headers():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="module")
def student_id(headers):
    students = requests.get(f"{BASE_URL}/api/students", headers=headers, timeout=15).json()
    return next(s for s in students if s.get("email"))["id"]


class TestCompanyField:
    def test_patch_company(self, headers, student_id):
        r = requests.patch(
            f"{BASE_URL}/api/students/{student_id}",
            json={"company": "ACME AG"},
            headers=headers, timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["company"] == "ACME AG"

        s = requests.get(f"{BASE_URL}/api/students/{student_id}", headers=headers, timeout=15).json()
        assert s["company"] == "ACME AG"

    def test_company_on_list_and_clearable(self, headers, student_id):
        # Update to a specific value first
        requests.patch(
            f"{BASE_URL}/api/students/{student_id}",
            json={"company": "TestFirma GmbH"},
            headers=headers, timeout=15,
        )
        students = requests.get(f"{BASE_URL}/api/students", headers=headers, timeout=15).json()
        target = next(s for s in students if s["id"] == student_id)
        assert target.get("company") == "TestFirma GmbH"

        # Clear
        r = requests.patch(
            f"{BASE_URL}/api/students/{student_id}",
            json={"company": ""},
            headers=headers, timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["company"] == ""


class TestFkNoteImageUrl:
    def test_create_with_image_url(self, headers, student_id):
        r = requests.post(
            f"{BASE_URL}/api/fahrkontrolle/students/{student_id}/notes",
            json={
                "date": "2026-02-15",
                "text": "Notiz mit Bild",
                "image_url": "/api/files/safe-ride/uploads/dummy.jpg",
            },
            headers=headers, timeout=15,
        )
        assert r.status_code == 200
        n = r.json()
        assert n["image_url"] == "/api/files/safe-ride/uploads/dummy.jpg"

        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/fahrkontrolle/students/{student_id}/notes/{n['id']}",
            headers=headers, timeout=15,
        )

    def test_patch_image_url(self, headers, student_id):
        # Create without image
        n = requests.post(
            f"{BASE_URL}/api/fahrkontrolle/students/{student_id}/notes",
            json={"date": "2026-02-15", "text": "no image yet"},
            headers=headers, timeout=15,
        ).json()
        assert n.get("image_url", "") == ""

        # Patch in an image
        p = requests.patch(
            f"{BASE_URL}/api/fahrkontrolle/students/{student_id}/notes/{n['id']}",
            json={"image_url": "/api/files/safe-ride/uploads/added.png"},
            headers=headers, timeout=15,
        )
        assert p.status_code == 200
        assert p.json()["image_url"] == "/api/files/safe-ride/uploads/added.png"
        assert p.json()["text"] == "no image yet"  # unchanged

        # Clear image via patch
        p2 = requests.patch(
            f"{BASE_URL}/api/fahrkontrolle/students/{student_id}/notes/{n['id']}",
            json={"image_url": ""},
            headers=headers, timeout=15,
        )
        assert p2.status_code == 200
        assert p2.json()["image_url"] == ""

        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/fahrkontrolle/students/{student_id}/notes/{n['id']}",
            headers=headers, timeout=15,
        )


class TestUploadForNoteImage:
    """Verify /api/upload accepts an image and returns a /api/files/... URL
    that can be attached to a note. Uses a tiny valid PNG."""

    _PNG_BYTES = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
        b"\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde"
        b"\x00\x00\x00\x0cIDATx\x9cc\xfc\xcf\xc0\x00\x00\x00\x03\x00\x01"
        b"\xe4~\xd0\xd8\x00\x00\x00\x00IEND\xaeB`\x82"
    )

    def test_upload_and_attach_to_note(self, headers, student_id):
        files = {"file": ("dot.png", io.BytesIO(self._PNG_BYTES), "image/png")}
        up = requests.post(
            f"{BASE_URL}/api/upload",
            files=files,
            headers=headers, timeout=30,
        )
        assert up.status_code == 200, up.text
        url = up.json()["url"]
        assert url.startswith("/api/files/"), url

        # Attach the returned URL to a new note.
        n = requests.post(
            f"{BASE_URL}/api/fahrkontrolle/students/{student_id}/notes",
            json={"date": "2026-02-16", "text": "with Hetzner img", "image_url": url},
            headers=headers, timeout=15,
        ).json()
        assert n["image_url"] == url

        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/fahrkontrolle/students/{student_id}/notes/{n['id']}",
            headers=headers, timeout=15,
        )
