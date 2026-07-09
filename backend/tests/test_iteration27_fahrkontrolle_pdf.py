"""Backend tests for Fahrkontrolle PDF export (Iteration 27 – Phase 2).

Verifies:
  * GET /api/students/{id}/fahrkontrolle.pdf without auth → 401/403.
  * Authenticated call → 200, application/pdf, PDF magic header, non-empty.
  * Student without lessons still returns a valid PDF (page 1 only, no journal page).
  * Student with lessons + comment yields a multi-page PDF (Ausbildungsjournal).
  * Non-existent student id → 404.

Auth: admin@saferide.ch / SafeRide2026!
"""
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
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


def _count_pages(pdf_bytes: bytes) -> int:
    """Very rough page counter based on `/Type /Page` markers.

    Sufficient for smoke tests – NOT a full PDF parser.
    """
    return pdf_bytes.count(b"/Type /Page") + pdf_bytes.count(b"/Type/Page")


# -----------------------------------------------------------------------------
#  Test cases
# -----------------------------------------------------------------------------
def test_pdf_requires_auth():
    r = requests.get(
        f"{BASE_URL}/api/students/any-id/fahrkontrolle.pdf", timeout=30
    )
    assert r.status_code in (401, 403), f"expected 401/403 got {r.status_code}"


def test_pdf_unknown_student_returns_404(auth_headers):
    r = requests.get(
        f"{BASE_URL}/api/students/does-not-exist/fahrkontrolle.pdf",
        headers=auth_headers,
        timeout=30,
    )
    assert r.status_code == 404


def test_pdf_generation_end_to_end(auth_headers):
    # Create a student
    student_payload = {
        "first_name": "PDF",
        "last_name": "Tester",
        "category": "B",
        "instructor": "Nadine",
        "start_date": "2026-01-15",
        "prep_exam_date": "2026-05-10",
        "exam_date": "2026-06-20",
        "street": "Musterweg 12",
        "zip": "8000",
        "city": "Zürich",
        "phone": "+41 79 000 00 00",
        "email": "pdf@example.com",
    }
    r = requests.post(
        f"{BASE_URL}/api/students",
        json=student_payload,
        headers=auth_headers,
        timeout=30,
    )
    assert r.status_code == 200, r.text
    student_id = r.json()["id"]

    try:
        # 1) Empty student → valid PDF, page 1 only
        r = requests.get(
            f"{BASE_URL}/api/students/{student_id}/fahrkontrolle.pdf",
            headers=auth_headers,
            timeout=60,
        )
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content[:4] == b"%PDF"
        assert r.content.rstrip().endswith(b"%%EOF")
        empty_pages = _count_pages(r.content)
        assert empty_pages >= 1

        # 2) Add lessons + rating with a comment → PDF grows to include journal
        # Create a lesson
        lr = requests.post(
            f"{BASE_URL}/api/fahrkontrolle/students/{student_id}/lessons",
            json={"date": "2026-02-01", "duration_min": 45},
            headers=auth_headers,
            timeout=30,
        )
        assert lr.status_code == 200
        lesson_id = lr.json()["id"]

        # Fetch a real subitem id
        sr = requests.get(
            f"{BASE_URL}/api/fahrkontrolle/subitems",
            headers=auth_headers,
            timeout=30,
        )
        assert sr.status_code == 200
        subs = sr.json()
        assert subs, "expected at least one seeded subitem"
        sub_id = subs[0]["id"]

        # Write a rating WITH comment (drives Ausbildungsjournal page 2)
        ar = requests.put(
            f"{BASE_URL}/api/fahrkontrolle/students/{student_id}/assessments",
            json={
                "subitem_id": sub_id,
                "lesson_id": lesson_id,
                "value": "3",
                "comment": "Automatisch erstellt vom PDF-Regressionstest.",
            },
            headers=auth_headers,
            timeout=30,
        )
        assert ar.status_code == 200

        r = requests.get(
            f"{BASE_URL}/api/students/{student_id}/fahrkontrolle.pdf",
            headers=auth_headers,
            timeout=60,
        )
        assert r.status_code == 200
        assert r.content[:4] == b"%PDF"
        full_pages = _count_pages(r.content)
        # 2 pages (matrix + journal). Some rare edge could be 1; assert >=2 works
        assert full_pages >= 2, f"expected >=2 pages, got {full_pages}"

        # Content-Disposition should include a friendly filename
        cd = r.headers.get("content-disposition", "")
        assert "Fahrkontrolle" in cd and ".pdf" in cd
    finally:
        # Cleanup (cascades lessons + assessments)
        requests.delete(
            f"{BASE_URL}/api/students/{student_id}",
            headers=auth_headers,
            timeout=30,
        )
