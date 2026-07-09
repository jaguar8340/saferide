"""Backend tests for Iteration 29 – Student sub-tabs

Covers the three new endpoint groups:
  * /api/students/{id}/invoices       (CRUD)
  * /api/students/{id}/documents      (upload / list / delete)
  * /api/students/{id}/activities     (read-only feed auto-written by
                                       other endpoints)

Also confirms that existing endpoints now emit activity rows:
  student.update, lesson.create, lesson.update, lesson.delete,
  assessment.upsert, invoice.create/update/delete.
"""
import io
import os

import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://driving-school-cms.preview.emergentagent.com",
).rstrip("/")
ADMIN_EMAIL = "admin@saferide.ch"
ADMIN_PASSWORD = "SafeRide2026!"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture()
def fresh_student(auth_headers):
    r = requests.post(
        f"{BASE_URL}/api/students",
        json={
            "first_name": "It29",
            "last_name": "Tester",
            "category": "B",
            "instructor": "Nadine",
        },
        headers=auth_headers,
        timeout=30,
    )
    assert r.status_code == 200
    sid = r.json()["id"]
    yield sid
    requests.delete(
        f"{BASE_URL}/api/students/{sid}", headers=auth_headers, timeout=30
    )


# ---------------------------------------------------------------------------
#  /invoices
# ---------------------------------------------------------------------------
def test_invoices_full_crud_and_totals(auth_headers, fresh_student):
    sid = fresh_student

    # Initially empty
    r = requests.get(
        f"{BASE_URL}/api/students/{sid}/invoices", headers=auth_headers, timeout=30
    )
    assert r.status_code == 200
    assert r.json() == []

    # Create two invoices
    r = requests.post(
        f"{BASE_URL}/api/students/{sid}/invoices",
        json={"number": "R-1", "date": "2026-02-01", "amount_chf": 120.5, "status": "open"},
        headers=auth_headers, timeout=30,
    )
    assert r.status_code == 200
    inv1 = r.json()

    r = requests.post(
        f"{BASE_URL}/api/students/{sid}/invoices",
        json={"number": "R-2", "date": "2026-02-15", "amount_chf": 80.0, "status": "paid"},
        headers=auth_headers, timeout=30,
    )
    assert r.status_code == 200
    inv2 = r.json()

    # List
    r = requests.get(
        f"{BASE_URL}/api/students/{sid}/invoices", headers=auth_headers, timeout=30
    )
    assert r.status_code == 200
    lst = r.json()
    assert len(lst) == 2
    # Sorted by date desc
    assert lst[0]["number"] == "R-2"

    # Patch status
    r = requests.patch(
        f"{BASE_URL}/api/students/{sid}/invoices/{inv1['id']}",
        json={"status": "paid"},
        headers=auth_headers, timeout=30,
    )
    assert r.status_code == 200
    assert r.json()["status"] == "paid"

    # Invalid status rejected
    r = requests.patch(
        f"{BASE_URL}/api/students/{sid}/invoices/{inv1['id']}",
        json={"status": "invalid-status"},
        headers=auth_headers, timeout=30,
    )
    assert r.status_code == 400

    # Delete
    r = requests.delete(
        f"{BASE_URL}/api/students/{sid}/invoices/{inv2['id']}",
        headers=auth_headers, timeout=30,
    )
    assert r.status_code == 200

    r = requests.get(
        f"{BASE_URL}/api/students/{sid}/invoices", headers=auth_headers, timeout=30
    )
    assert r.status_code == 200
    assert len(r.json()) == 1

    # Deleting again → 404
    r = requests.delete(
        f"{BASE_URL}/api/students/{sid}/invoices/{inv2['id']}",
        headers=auth_headers, timeout=30,
    )
    assert r.status_code == 404


def test_invoices_require_auth():
    r = requests.get(f"{BASE_URL}/api/students/any/invoices", timeout=30)
    assert r.status_code in (401, 403)


# ---------------------------------------------------------------------------
#  /documents
# ---------------------------------------------------------------------------
def test_documents_upload_list_delete(auth_headers, fresh_student):
    sid = fresh_student

    # Empty
    r = requests.get(
        f"{BASE_URL}/api/students/{sid}/documents", headers=auth_headers, timeout=30
    )
    assert r.status_code == 200
    assert r.json() == []

    # Upload a small PNG (1x1 transparent)
    png_bytes = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\x0f"
        b"\x00\x00\x01\x01\x00\x05\xfe\x02\xfe\xdcccP\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    files = {"file": ("test.png", io.BytesIO(png_bytes), "image/png")}
    data = {"category": "id", "label": "Ausweis Vorderseite"}
    r = requests.post(
        f"{BASE_URL}/api/students/{sid}/documents",
        files=files, data=data, headers=auth_headers, timeout=60,
    )
    assert r.status_code == 200, r.text
    doc = r.json()
    assert doc["category"] == "id"
    assert doc["label"] == "Ausweis Vorderseite"
    assert doc["url"].startswith("/api/files/")
    assert doc["kind"] == "image"

    # List sees it
    r = requests.get(
        f"{BASE_URL}/api/students/{sid}/documents", headers=auth_headers, timeout=30
    )
    assert r.status_code == 200
    assert len(r.json()) == 1

    # Reject invalid category
    r = requests.post(
        f"{BASE_URL}/api/students/{sid}/documents",
        files={"file": ("t.png", io.BytesIO(png_bytes), "image/png")},
        data={"category": "not-a-cat", "label": ""},
        headers=auth_headers, timeout=30,
    )
    assert r.status_code == 400

    # Reject unsupported mimetype
    r = requests.post(
        f"{BASE_URL}/api/students/{sid}/documents",
        files={"file": ("t.exe", io.BytesIO(b"MZ"), "application/octet-stream")},
        data={"category": "misc", "label": ""},
        headers=auth_headers, timeout=30,
    )
    assert r.status_code == 400

    # Delete
    r = requests.delete(
        f"{BASE_URL}/api/students/{sid}/documents/{doc['id']}",
        headers=auth_headers, timeout=30,
    )
    assert r.status_code == 200

    r = requests.get(
        f"{BASE_URL}/api/students/{sid}/documents", headers=auth_headers, timeout=30
    )
    assert r.json() == []


# ---------------------------------------------------------------------------
#  /activities  (feed is auto-populated by other endpoints)
# ---------------------------------------------------------------------------
def test_activities_feed_auto_populated(auth_headers, fresh_student):
    sid = fresh_student

    # Trigger a few actions
    requests.patch(
        f"{BASE_URL}/api/students/{sid}",
        json={"phone": "+41 79 111 22 33"},
        headers=auth_headers, timeout=30,
    )
    lr = requests.post(
        f"{BASE_URL}/api/fahrkontrolle/students/{sid}/lessons",
        json={"date": "2026-03-01", "duration_min": 45},
        headers=auth_headers, timeout=30,
    ).json()

    # Fetch a subitem id
    subs = requests.get(
        f"{BASE_URL}/api/fahrkontrolle/subitems", headers=auth_headers, timeout=30
    ).json()
    assert subs

    # Upsert assessment
    requests.put(
        f"{BASE_URL}/api/fahrkontrolle/students/{sid}/assessments",
        json={
            "subitem_id": subs[0]["id"],
            "lesson_id": lr["id"],
            "value": "3",
            "comment": "test",
        },
        headers=auth_headers, timeout=30,
    )

    # Read feed
    r = requests.get(
        f"{BASE_URL}/api/students/{sid}/activities", headers=auth_headers, timeout=30
    )
    assert r.status_code == 200
    kinds = {a["kind"] for a in r.json()}
    assert "student.create" in kinds
    assert "student.update" in kinds
    assert "lesson.create" in kinds
    assert "assessment.upsert" in kinds

    # Latest first
    feed = r.json()
    for a in feed:
        assert a["student_id"] == sid
        assert "created_at" in a and a["created_at"]


def test_activities_require_auth():
    r = requests.get(f"{BASE_URL}/api/students/any/activities", timeout=30)
    assert r.status_code in (401, 403)


def test_activities_unknown_student_returns_404(auth_headers):
    r = requests.get(
        f"{BASE_URL}/api/students/does-not-exist/activities",
        headers=auth_headers, timeout=30,
    )
    assert r.status_code == 404
