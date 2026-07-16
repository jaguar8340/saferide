"""Iteration 56.1 — Company on invoice PDF + QR-Bill, Zahlbar bis = +10 Tage."""
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
    return next(s for s in students if s.get("email") and s.get("zip") and s.get("city"))["id"]


class TestInvoicePdfCompany:
    def test_pdf_with_company_generates(self, headers, student_id):
        # Set a company on the student
        requests.patch(
            f"{BASE_URL}/api/students/{student_id}",
            json={"company": "Testfirma AG"},
            headers=headers, timeout=15,
        )
        try:
            inv = requests.post(
                f"{BASE_URL}/api/students/{student_id}/invoices",
                json={"lesson_date": "2026-02-16", "duration_min": 45,
                      "price_chf": 95.0, "status": "open", "note": "with company"},
                headers=headers, timeout=15,
            ).json()
            iid = inv["id"]
            try:
                pdf = requests.get(
                    f"{BASE_URL}/api/students/{student_id}/invoices/{iid}.pdf",
                    headers=headers, timeout=30,
                )
                assert pdf.status_code == 200
                assert pdf.content.startswith(b"%PDF")
                # Basic size check — QR + full letter
                assert len(pdf.content) > 5000
            finally:
                requests.delete(
                    f"{BASE_URL}/api/students/{student_id}/invoices/{iid}",
                    headers=headers, timeout=15,
                )
        finally:
            # Reset company
            requests.patch(
                f"{BASE_URL}/api/students/{student_id}",
                json={"company": ""},
                headers=headers, timeout=15,
            )

    def test_pdf_without_company_still_ok(self, headers, student_id):
        """Regression: no company set → PDF still generates without errors."""
        requests.patch(
            f"{BASE_URL}/api/students/{student_id}",
            json={"company": ""},
            headers=headers, timeout=15,
        )
        inv = requests.post(
            f"{BASE_URL}/api/students/{student_id}/invoices",
            json={"lesson_date": "2026-02-16", "duration_min": 45,
                  "price_chf": 95.0, "status": "open", "note": "no company"},
            headers=headers, timeout=15,
        ).json()
        iid = inv["id"]
        try:
            pdf = requests.get(
                f"{BASE_URL}/api/students/{student_id}/invoices/{iid}.pdf",
                headers=headers, timeout=30,
            )
            assert pdf.status_code == 200
            assert pdf.content.startswith(b"%PDF")
        finally:
            requests.delete(
                f"{BASE_URL}/api/students/{student_id}/invoices/{iid}",
                headers=headers, timeout=15,
            )
