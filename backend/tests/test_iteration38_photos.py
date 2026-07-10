"""Iteration 38 – Fahrkontrolle assessment photo upload/delete endpoints."""
import base64
import io
import os
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as fh:
        for line in fh:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

ADMIN_EMAIL = "admin@saferide.ch"
ADMIN_PASSWORD = "SafeRide2026!"

# 1x1 transparent PNG
PNG_1PX = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
)


@pytest.fixture(scope="module")
def token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def fixture_data(headers):
    """Create a temporary student, lesson, category+subitem for testing."""
    # Student
    r = requests.post(
        f"{BASE_URL}/api/students",
        headers=headers,
        json={"first_name": "TEST_it38", "last_name": "Photo"},
        timeout=15,
    )
    assert r.status_code in (200, 201), r.text
    student_id = r.json()["id"]

    # Category
    cat_r = requests.post(
        f"{BASE_URL}/api/fahrkontrolle/categories",
        headers=headers,
        json={"title_de": "TEST_it38_cat", "title_en": "", "order": 0},
        timeout=15,
    )
    assert cat_r.status_code == 200, cat_r.text
    cat_id = cat_r.json()["id"]

    # Subitem
    sub_r = requests.post(
        f"{BASE_URL}/api/fahrkontrolle/subitems",
        headers=headers,
        json={
            "category_id": cat_id,
            "title_de": "TEST_it38_sub",
            "title_en": "",
            "description_de": "",
            "description_en": "",
            "order": 0,
        },
        timeout=15,
    )
    assert sub_r.status_code == 200, sub_r.text
    subitem_id = sub_r.json()["id"]

    # Lesson
    les_r = requests.post(
        f"{BASE_URL}/api/fahrkontrolle/students/{student_id}/lessons",
        headers=headers,
        json={"date": "2026-01-15", "duration_min": 45, "routes": [], "notes": ""},
        timeout=15,
    )
    assert les_r.status_code == 200, les_r.text
    lesson_id = les_r.json()["id"]

    yield {
        "student_id": student_id,
        "subitem_id": subitem_id,
        "lesson_id": lesson_id,
        "cat_id": cat_id,
    }

    # Teardown
    try:
        requests.delete(f"{BASE_URL}/api/students/{student_id}", headers=headers, timeout=15)
        requests.delete(f"{BASE_URL}/api/fahrkontrolle/subitems/{subitem_id}", headers=headers, timeout=15)
        requests.delete(f"{BASE_URL}/api/fahrkontrolle/categories/{cat_id}", headers=headers, timeout=15)
    except Exception:
        pass


# All tests in one class so loadscope pins them to a single xdist worker
# (they share the fixture_data module fixture + _uploaded_url handoff).
class TestFahrkontrollePhotos:
    def test_upload_creates_row_and_returns_photo_urls(self, headers, fixture_data):
        params = {
            "subitem_id": fixture_data["subitem_id"],
            "lesson_id": fixture_data["lesson_id"],
        }
        files = {"file": (f"test_{uuid.uuid4()}.png", io.BytesIO(PNG_1PX), "image/png")}
        r = requests.post(
            f"{BASE_URL}/api/fahrkontrolle/students/{fixture_data['student_id']}/assessments/photo",
            headers=headers,
            params=params,
            files=files,
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "photo_urls" in data
        assert isinstance(data["photo_urls"], list)
        assert len(data["photo_urls"]) == 1
        assert data["photo_urls"][0].startswith("/api/files/")
        assert data["value"] == ""
        assert data["comment"] == ""
        # persist URL to next test
        fixture_data["_uploaded_url"] = data["photo_urls"][0]

        # Verify GET returns the photo
        list_r = requests.get(
            f"{BASE_URL}/api/fahrkontrolle/students/{fixture_data['student_id']}/assessments",
            headers=headers,
            timeout=15,
        )
        assert list_r.status_code == 200
        found = [a for a in list_r.json() if a["subitem_id"] == params["subitem_id"] and a["lesson_id"] == params["lesson_id"]]
        assert len(found) == 1
        assert data["photo_urls"][0] in found[0]["photo_urls"]

    def test_upload_rejects_non_image_content_type(self, headers, fixture_data):
        params = {
            "subitem_id": fixture_data["subitem_id"],
            "lesson_id": fixture_data["lesson_id"],
        }
        files = {"file": ("bad.txt", io.BytesIO(b"hello world"), "text/plain")}
        r = requests.post(
            f"{BASE_URL}/api/fahrkontrolle/students/{fixture_data['student_id']}/assessments/photo",
            headers=headers,
            params=params,
            files=files,
            timeout=15,
        )
        assert r.status_code == 400, r.text

    def test_upload_rejects_oversize(self, headers, fixture_data):
        params = {
            "subitem_id": fixture_data["subitem_id"],
            "lesson_id": fixture_data["lesson_id"],
        }
        # 11 MB (limit is 10 MB per storage.py MAX_UPLOAD_BYTES)
        big = b"\x00" * (11 * 1024 * 1024)
        files = {"file": ("big.png", io.BytesIO(big), "image/png")}
        r = requests.post(
            f"{BASE_URL}/api/fahrkontrolle/students/{fixture_data['student_id']}/assessments/photo",
            headers=headers,
            params=params,
            files=files,
            timeout=60,
        )
        assert r.status_code == 413, r.text


# ------------------------------------------------------------------
# PUT /assessments – preserve photo_urls
# ------------------------------------------------------------------
# --- Upsert preserves photos ---
    def test_setting_rating_preserves_photo_urls(self, headers, fixture_data):
        # Rating='3', comment='' — must NOT wipe photo_urls
        r = requests.put(
            f"{BASE_URL}/api/fahrkontrolle/students/{fixture_data['student_id']}/assessments",
            headers=headers,
            json={
                "subitem_id": fixture_data["subitem_id"],
                "lesson_id": fixture_data["lesson_id"],
                "value": "3",
                "comment": "TEST_it38 comment",
            },
            timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["value"] == "3"
        assert data["comment"] == "TEST_it38 comment"
        assert isinstance(data["photo_urls"], list)
        assert len(data["photo_urls"]) >= 1, "photo_urls must be preserved during upsert"

    def test_empty_value_and_comment_with_photos_keeps_row(self, headers, fixture_data):
        r = requests.put(
            f"{BASE_URL}/api/fahrkontrolle/students/{fixture_data['student_id']}/assessments",
            headers=headers,
            json={
                "subitem_id": fixture_data["subitem_id"],
                "lesson_id": fixture_data["lesson_id"],
                "value": "",
                "comment": "",
            },
            timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        # Row must still exist with photos (per iteration 38 requirement)
        assert data["value"] == ""
        assert data["comment"] == ""
        assert len(data["photo_urls"]) >= 1

        # Verify persisted
        list_r = requests.get(
            f"{BASE_URL}/api/fahrkontrolle/students/{fixture_data['student_id']}/assessments",
            headers=headers,
            timeout=15,
        )
        found = [a for a in list_r.json() if a["subitem_id"] == fixture_data["subitem_id"] and a["lesson_id"] == fixture_data["lesson_id"]]
        assert len(found) == 1
        assert len(found[0]["photo_urls"]) >= 1


# ------------------------------------------------------------------
# DELETE /photo
# ------------------------------------------------------------------
# --- Delete photo ---
    def test_delete_removes_photo_and_returns_empty_when_last(self, headers, fixture_data):
        url = fixture_data.get("_uploaded_url")
        assert url, "prev test must have set _uploaded_url"

        r = requests.delete(
            f"{BASE_URL}/api/fahrkontrolle/students/{fixture_data['student_id']}/assessments/photo",
            headers=headers,
            params={
                "subitem_id": fixture_data["subitem_id"],
                "lesson_id": fixture_data["lesson_id"],
                "url": url,
            },
            timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        # After deleting last photo — value/comment are "" so row should be deleted;
        # response is an empty assessment.
        assert data["photo_urls"] == []
        assert data["value"] == ""
        assert data["comment"] == ""

        # Verify row is gone
        list_r = requests.get(
            f"{BASE_URL}/api/fahrkontrolle/students/{fixture_data['student_id']}/assessments",
            headers=headers,
            timeout=15,
        )
        remaining = [
            a for a in list_r.json()
            if a["subitem_id"] == fixture_data["subitem_id"]
            and a["lesson_id"] == fixture_data["lesson_id"]
        ]
        assert remaining == [], f"row must be deleted when everything empty, got: {remaining}"

    def test_delete_404_when_no_cell(self, headers, fixture_data):
        r = requests.delete(
            f"{BASE_URL}/api/fahrkontrolle/students/{fixture_data['student_id']}/assessments/photo",
            headers=headers,
            params={
                "subitem_id": fixture_data["subitem_id"],
                "lesson_id": fixture_data["lesson_id"],
                "url": "/api/files/saferide/fahrkontrolle/does-not-exist.png",
            },
            timeout=15,
        )
        assert r.status_code == 404, r.text


# ------------------------------------------------------------------
# GET returns photo_urls field
# ------------------------------------------------------------------
# --- Schema check ---
    def test_list_assessments_response_shape(self, headers, fixture_data):
        # Upload one photo + set rating
        files = {"file": ("t.png", io.BytesIO(PNG_1PX), "image/png")}
        up = requests.post(
            f"{BASE_URL}/api/fahrkontrolle/students/{fixture_data['student_id']}/assessments/photo",
            headers=headers,
            params={
                "subitem_id": fixture_data["subitem_id"],
                "lesson_id": fixture_data["lesson_id"],
            },
            files=files,
            timeout=30,
        )
        assert up.status_code == 200
        uploaded = up.json()["photo_urls"][-1]

        r = requests.get(
            f"{BASE_URL}/api/fahrkontrolle/students/{fixture_data['student_id']}/assessments",
            headers=headers,
            timeout=15,
        )
        assert r.status_code == 200
        rows = r.json()
        assert len(rows) >= 1
        for row in rows:
            assert "photo_urls" in row
            assert isinstance(row["photo_urls"], list)

        # cleanup
        requests.delete(
            f"{BASE_URL}/api/fahrkontrolle/students/{fixture_data['student_id']}/assessments/photo",
            headers=headers,
            params={
                "subitem_id": fixture_data["subitem_id"],
                "lesson_id": fixture_data["lesson_id"],
                "url": uploaded,
            },
            timeout=15,
        )
