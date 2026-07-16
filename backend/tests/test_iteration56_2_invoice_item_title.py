"""Iteration 56.2 — Custom item_title on invoice; „Hallo Name" removed."""
import io
import os
import requests
import pytest
from datetime import date, timedelta
from pypdf import PdfReader

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
    return next(s for s in students if s.get("zip") and s.get("city"))["id"]


def _extract(pdf_bytes: bytes) -> str:
    return "\n".join(p.extract_text() for p in PdfReader(io.BytesIO(pdf_bytes)).pages)


class TestInvoiceItemTitleAndSalutation:
    def test_default_invoice_has_no_hallo_line_and_uses_fahrstunde(self, headers, student_id):
        inv = requests.post(
            f"{BASE_URL}/api/students/{student_id}/invoices",
            json={"lesson_date": "2026-02-16", "duration_min": 45, "price_chf": 95.0},
            headers=headers, timeout=15,
        ).json()
        try:
            pdf = requests.get(
                f"{BASE_URL}/api/students/{student_id}/invoices/{inv['id']}.pdf",
                headers=headers, timeout=30,
            )
            assert pdf.status_code == 200
            text = _extract(pdf.content)
            assert "Hallo " not in text, "Salutation 'Hallo ...' should be gone"
            assert "wir erlauben uns" in text
            # Default line item + subtitle mention "Fahrstunde"
            assert "Fahrstunde (45 min) am 16/02/2026" in text
            assert "Fahrstunde vom 16/02/2026" in text
        finally:
            requests.delete(
                f"{BASE_URL}/api/students/{student_id}/invoices/{inv['id']}",
                headers=headers, timeout=15,
            )

    def test_custom_item_title_replaces_fahrstunde(self, headers, student_id):
        title = "Kurs «Fahren mit Blinden»"
        inv = requests.post(
            f"{BASE_URL}/api/students/{student_id}/invoices",
            json={
                "lesson_date": "2026-06-12", "duration_min": 0, "price_chf": 600.0,
                "item_title": title,
            },
            headers=headers, timeout=15,
        ).json()
        try:
            pdf = requests.get(
                f"{BASE_URL}/api/students/{student_id}/invoices/{inv['id']}.pdf",
                headers=headers, timeout=30,
            )
            text = _extract(pdf.content)
            # Line item and subtitle both use the custom title
            assert f"{title} am 12/06/2026" in text
            assert f"{title} vom 12/06/2026" in text
            # "(0 min)" is NOT printed
            assert "(0 min)" not in text
            # Original "Fahrstunde" line should NOT appear
            assert "Fahrstunde (0 min)" not in text
            assert "Fahrstunde vom 12/06/2026" not in text
        finally:
            requests.delete(
                f"{BASE_URL}/api/students/{student_id}/invoices/{inv['id']}",
                headers=headers, timeout=15,
            )

    def test_patch_item_title(self, headers, student_id):
        inv = requests.post(
            f"{BASE_URL}/api/students/{student_id}/invoices",
            json={"lesson_date": "2026-06-12", "duration_min": 60, "price_chf": 120.0},
            headers=headers, timeout=15,
        ).json()
        try:
            # Patch title after creation
            p = requests.patch(
                f"{BASE_URL}/api/students/{student_id}/invoices/{inv['id']}",
                json={"item_title": "Nothilfekurs"},
                headers=headers, timeout=15,
            )
            assert p.status_code == 200
            assert p.json()["item_title"] == "Nothilfekurs"

            text = _extract(requests.get(
                f"{BASE_URL}/api/students/{student_id}/invoices/{inv['id']}.pdf",
                headers=headers, timeout=30,
            ).content)
            assert "Nothilfekurs am 12/06/2026" in text
            assert "Fahrstunde (60 min)" not in text

            # Clear the title -> Fallback zu "Fahrstunde"
            requests.patch(
                f"{BASE_URL}/api/students/{student_id}/invoices/{inv['id']}",
                json={"item_title": ""},
                headers=headers, timeout=15,
            )
            text2 = _extract(requests.get(
                f"{BASE_URL}/api/students/{student_id}/invoices/{inv['id']}.pdf",
                headers=headers, timeout=30,
            ).content)
            assert "Fahrstunde (60 min) am 12/06/2026" in text2
        finally:
            requests.delete(
                f"{BASE_URL}/api/students/{student_id}/invoices/{inv['id']}",
                headers=headers, timeout=15,
            )
