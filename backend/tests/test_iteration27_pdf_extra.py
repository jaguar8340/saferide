"""Extra assertions for Fahrkontrolle PDF export (Iteration 27 – Phase 2).

Focuses on the requirements not covered by the base test_iteration27
file:
  * Filename convention: Fahrkontrolle_{LastName}_{FirstName}.pdf
  * 1 page when the student has lessons but NO comments
  * 2 pages when the student has at least one commented rating
  * PDF magic header + EOF marker still valid
  * Autosave (upsert-by-key) via PUT /assessments already covered in
    iteration26 – we just re-verify the endpoint semantics here.
"""
import os
from io import BytesIO

import pytest
import requests
from pypdf import PdfReader

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://driving-school-cms.preview.emergentagent.com",
).rstrip("/")
ADMIN_EMAIL = "admin@saferide.ch"
ADMIN_PASSWORD = "SafeRide2026!"


@pytest.fixture(scope="module")
def auth_headers():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _count_pages(pdf: bytes) -> int:
    return len(PdfReader(BytesIO(pdf)).pages)


def _create_student(auth_headers, last="Zeta", first="Alpha"):
    r = requests.post(
        f"{BASE_URL}/api/students",
        json={
            "first_name": first,
            "last_name": last,
            "category": "B",
            "instructor": "Nadine",
            "start_date": "2026-01-15",
            "prep_exam_date": "2026-05-10",
            "exam_date": "2026-06-20",
        },
        headers=auth_headers,
        timeout=30,
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]


def test_pdf_single_page_when_no_comments(auth_headers):
    """A student with lessons but no comments must produce exactly 1 page."""
    sid = _create_student(auth_headers, last="TESTNoComm", first="Karin")
    try:
        # Add a lesson but NO assessment/comment
        lr = requests.post(
            f"{BASE_URL}/api/fahrkontrolle/students/{sid}/lessons",
            json={"date": "2026-03-01"},
            headers=auth_headers,
            timeout=30,
        )
        assert lr.status_code == 200
        lesson_id = lr.json()["id"]

        # Add an assessment without a comment
        subs = requests.get(
            f"{BASE_URL}/api/fahrkontrolle/subitems",
            headers=auth_headers,
            timeout=30,
        ).json()
        r = requests.put(
            f"{BASE_URL}/api/fahrkontrolle/students/{sid}/assessments",
            json={
                "subitem_id": subs[0]["id"],
                "lesson_id": lesson_id,
                "value": "3",
                "comment": "",
            },
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 200

        # PDF – expected exactly ONE page (no journal)
        r = requests.get(
            f"{BASE_URL}/api/students/{sid}/fahrkontrolle.pdf",
            headers=auth_headers,
            timeout=60,
        )
        assert r.status_code == 200
        assert r.content[:4] == b"%PDF"
        pages = _count_pages(r.content)
        assert pages == 1, f"expected 1 page for no-comments student, got {pages}"
    finally:
        requests.delete(
            f"{BASE_URL}/api/students/{sid}", headers=auth_headers, timeout=15
        )


def test_pdf_filename_convention(auth_headers):
    """Content-Disposition must include Fahrkontrolle_{LastName}_{FirstName}.pdf."""
    sid = _create_student(auth_headers, last="TESTMustermann", first="Erika")
    try:
        r = requests.get(
            f"{BASE_URL}/api/students/{sid}/fahrkontrolle.pdf",
            headers=auth_headers,
            timeout=60,
        )
        assert r.status_code == 200
        cd = r.headers.get("content-disposition", "")
        assert "Fahrkontrolle_TESTMustermann_Erika.pdf" in cd, cd
    finally:
        requests.delete(
            f"{BASE_URL}/api/students/{sid}", headers=auth_headers, timeout=15
        )


def test_pdf_two_pages_when_a_comment_exists(auth_headers):
    """A single commented rating must trigger the Ausbildungsjournal (page 2)."""
    sid = _create_student(auth_headers, last="TESTJournal", first="Tim")
    try:
        lr = requests.post(
            f"{BASE_URL}/api/fahrkontrolle/students/{sid}/lessons",
            json={"date": "2026-04-04"},
            headers=auth_headers,
            timeout=30,
        )
        lesson_id = lr.json()["id"]
        subs = requests.get(
            f"{BASE_URL}/api/fahrkontrolle/subitems", headers=auth_headers, timeout=30
        ).json()
        r = requests.put(
            f"{BASE_URL}/api/fahrkontrolle/students/{sid}/assessments",
            json={
                "subitem_id": subs[0]["id"],
                "lesson_id": lesson_id,
                "value": "2",
                "comment": "Spiegelblick verbessern.",
            },
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 200

        r = requests.get(
            f"{BASE_URL}/api/students/{sid}/fahrkontrolle.pdf",
            headers=auth_headers,
            timeout=60,
        )
        assert r.status_code == 200
        pages = _count_pages(r.content)
        assert pages >= 2, f"expected >=2 pages, got {pages}"
        # PDF end marker
        assert r.content.rstrip().endswith(b"%%EOF")
    finally:
        requests.delete(
            f"{BASE_URL}/api/students/{sid}", headers=auth_headers, timeout=15
        )


def test_pdf_content_type_and_disposition_headers(auth_headers):
    sid = _create_student(auth_headers, last="TESTHeaders", first="H")
    try:
        r = requests.get(
            f"{BASE_URL}/api/students/{sid}/fahrkontrolle.pdf",
            headers=auth_headers,
            timeout=60,
        )
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("application/pdf")
        assert 'filename="Fahrkontrolle_' in r.headers.get("content-disposition", "")
    finally:
        requests.delete(
            f"{BASE_URL}/api/students/{sid}", headers=auth_headers, timeout=15
        )
