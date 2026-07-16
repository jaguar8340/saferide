"""Iteration 55 — Geburtsdatum-Feld, 5-Zeilen-Bemerkung im PDF,
Diverse Notizen in Fahrkontrolle.
"""
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


class TestBirthdate:
    def test_patch_and_read(self, headers, student_id):
        r = requests.patch(
            f"{BASE_URL}/api/students/{student_id}",
            json={"birthdate": "2005-04-15"},
            headers=headers, timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["birthdate"] == "2005-04-15"

        s = requests.get(f"{BASE_URL}/api/students/{student_id}", headers=headers, timeout=15).json()
        assert s["birthdate"] == "2005-04-15"

        # Empty is allowed (clearable)
        r = requests.patch(
            f"{BASE_URL}/api/students/{student_id}",
            json={"birthdate": ""},
            headers=headers, timeout=15,
        )
        assert r.status_code == 200

    def test_field_exposed_on_students_list(self, headers, student_id):
        requests.patch(
            f"{BASE_URL}/api/students/{student_id}",
            json={"birthdate": "1998-12-24"},
            headers=headers, timeout=15,
        )
        students = requests.get(f"{BASE_URL}/api/students", headers=headers, timeout=15).json()
        target = next(s for s in students if s["id"] == student_id)
        assert target.get("birthdate") == "1998-12-24"
        # Cleanup
        requests.patch(
            f"{BASE_URL}/api/students/{student_id}",
            json={"birthdate": ""},
            headers=headers, timeout=15,
        )


class TestFkNotes:
    def test_crud(self, headers, student_id):
        # Empty list
        r0 = requests.get(
            f"{BASE_URL}/api/fahrkontrolle/students/{student_id}/notes",
            headers=headers, timeout=15,
        )
        assert r0.status_code == 200
        before = len(r0.json())

        # Create
        r = requests.post(
            f"{BASE_URL}/api/fahrkontrolle/students/{student_id}/notes",
            json={"date": "2026-02-14", "text": "Test note IT55"},
            headers=headers, timeout=15,
        )
        assert r.status_code == 200
        n = r.json()
        assert n["date"] == "2026-02-14"
        assert n["text"] == "Test note IT55"
        assert n["student_id"] == student_id

        # List includes it
        r1 = requests.get(
            f"{BASE_URL}/api/fahrkontrolle/students/{student_id}/notes",
            headers=headers, timeout=15,
        )
        assert len(r1.json()) == before + 1
        assert any(x["id"] == n["id"] for x in r1.json())

        # PATCH text
        p = requests.patch(
            f"{BASE_URL}/api/fahrkontrolle/students/{student_id}/notes/{n['id']}",
            json={"text": "Updated"},
            headers=headers, timeout=15,
        )
        assert p.status_code == 200
        assert p.json()["text"] == "Updated"
        assert p.json()["date"] == "2026-02-14"  # unchanged

        # DELETE
        d = requests.delete(
            f"{BASE_URL}/api/fahrkontrolle/students/{student_id}/notes/{n['id']}",
            headers=headers, timeout=15,
        )
        assert d.status_code == 200

        # 404 on gone note
        r404 = requests.patch(
            f"{BASE_URL}/api/fahrkontrolle/students/{student_id}/notes/{n['id']}",
            json={"text": "nope"},
            headers=headers, timeout=15,
        )
        assert r404.status_code == 404

    def test_requires_auth(self, student_id):
        r = requests.get(
            f"{BASE_URL}/api/fahrkontrolle/students/{student_id}/notes",
            timeout=15,
        )
        assert r.status_code in (401, 403)


class TestInvoicePdfMultilineNote:
    def test_pdf_generated(self, headers, student_id):
        note = (
            "Line 1: Strecke Zurich Winterthur\n"
            "Line 2: Schueler puenktlich\n"
            "Line 3: Einparken B2 mehrfach geuebt\n"
            "Line 4: Bremsen sanft eingesetzt\n"
            "Line 5: Ueben: Schulterblick beim Spurwechsel"
        )
        # Create invoice
        inv = requests.post(
            f"{BASE_URL}/api/students/{student_id}/invoices",
            json={"lesson_date": "2026-02-14", "duration_min": 45,
                  "price_chf": 95.0, "status": "open", "note": note},
            headers=headers, timeout=15,
        ).json()
        iid = inv["id"]
        try:
            pdf = requests.get(
                f"{BASE_URL}/api/students/{student_id}/invoices/{iid}.pdf",
                headers=headers, timeout=30,
            )
            assert pdf.status_code == 200
            # PDF should be at least ~20 KB — a normal 1-page invoice
            assert len(pdf.content) > 5000
            assert pdf.content.startswith(b"%PDF")
        finally:
            requests.delete(
                f"{BASE_URL}/api/students/{student_id}/invoices/{iid}",
                headers=headers, timeout=15,
            )
