"""Iteration 51 — Split AGB per Empfänger (student vs. guardian) + Admin Documents.

- `POST /api/terms/send/{sid}?target=student|guardian` sends to only one recipient
- Each recipient has its own token; confirming one does NOT affect the other
- New `/api/documents` module: PDF/JPG upload to Hetzner S3 with title + note + search
"""
import io
import os
import requests
import pytest

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8001")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@saferide.ch")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "SafeRide2026!")


@pytest.fixture(scope="module")
def token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def student_id(headers):
    r = requests.get(f"{BASE_URL}/api/students", headers=headers, timeout=15)
    assert r.status_code == 200
    students = [s for s in r.json() if s.get("email")]
    assert students
    sid = students[0]["id"]
    # Ensure the fixture student has a guardian email for the split tests
    requests.patch(
        f"{BASE_URL}/api/students/{sid}",
        json={"guardian_name": "Test Guardian", "guardian_email": "guardian-it51@example.com"},
        headers=headers,
        timeout=15,
    )
    return sid


TINY_PDF = (
    b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 72 72]>>endobj\n"
    b"xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n"
    b"0000000053 00000 n\n0000000099 00000 n\n"
    b"trailer<</Root 1 0 R/Size 4>>\nstartxref\n148\n%%EOF"
)


class TestSplitAgb:
    def test_send_to_student_without_target_defaults_to_student(self, headers, student_id):
        r = requests.post(
            f"{BASE_URL}/api/terms/send/{student_id}",
            headers=headers, timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["target"] == "student"

    def test_send_target_guardian_uses_guardian_email(self, headers, student_id):
        r = requests.post(
            f"{BASE_URL}/api/terms/send/{student_id}",
            params={"target": "guardian"},
            headers=headers, timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["target"] == "guardian"
        assert r.json()["email"] == "guardian-it51@example.com"

    def test_send_guardian_fails_without_guardian_email(self, headers):
        # Find a student *without* a guardian email
        students = requests.get(f"{BASE_URL}/api/students", headers=headers, timeout=15).json()
        # Pick one that has no guardian_email
        target = next((s for s in students if s.get("email") and not s.get("guardian_email")), None)
        if not target:
            pytest.skip("no student without guardian_email in fixture")
        r = requests.post(
            f"{BASE_URL}/api/terms/send/{target['id']}?target=guardian",
            headers=headers, timeout=15,
        )
        assert r.status_code == 400

    def test_two_tokens_independent(self, headers, student_id):
        # Reset guardian-confirmed state by sending fresh guardian invite
        rg = requests.post(
            f"{BASE_URL}/api/terms/send/{student_id}?target=guardian",
            headers=headers, timeout=15,
        ).json()
        gtoken = rg["confirm_url"].rsplit("/", 1)[-1]

        rs = requests.post(
            f"{BASE_URL}/api/terms/send/{student_id}?target=student",
            headers=headers, timeout=15,
        ).json()
        stoken = rs["confirm_url"].rsplit("/", 1)[-1]

        # Validate both tokens declare correct targets
        v_s = requests.get(
            f"{BASE_URL}/api/terms/confirm/validate?token={stoken}", timeout=15
        ).json()
        v_g = requests.get(
            f"{BASE_URL}/api/terms/confirm/validate?token={gtoken}", timeout=15
        ).json()
        assert v_s["target"] == "student"
        assert v_g["target"] == "guardian"

        # Confirm only guardian
        cr = requests.post(
            f"{BASE_URL}/api/terms/confirm",
            json={"token": gtoken},
            timeout=15,
        )
        assert cr.status_code == 200
        assert cr.json()["target"] == "guardian"

        # Student token still valid → guardian side already confirmed
        v_s2 = requests.get(
            f"{BASE_URL}/api/terms/confirm/validate?token={stoken}", timeout=15
        )
        assert v_s2.status_code == 200
        v_g2 = requests.get(
            f"{BASE_URL}/api/terms/confirm/validate?token={gtoken}", timeout=15
        )
        assert v_g2.status_code == 404, "guardian token must be consumed after confirm"


class TestAdminDocuments:
    def test_upload_pdf_and_list(self, headers):
        files = {"file": ("test.pdf", io.BytesIO(TINY_PDF), "application/pdf")}
        data = {"title": "IT51 Testdatei", "note": "Regressionstest"}
        r = requests.post(
            f"{BASE_URL}/api/documents",
            files=files, data=data, headers=headers, timeout=30,
        )
        assert r.status_code == 200, r.text
        doc = r.json()
        assert doc["kind"] == "pdf"
        assert doc["title"] == "IT51 Testdatei"

        # List includes it
        lst = requests.get(f"{BASE_URL}/api/documents", headers=headers, timeout=15).json()
        assert any(x["id"] == doc["id"] for x in lst)

        # Search hits
        hits = requests.get(
            f"{BASE_URL}/api/documents?q=IT51",
            headers=headers, timeout=15,
        ).json()
        assert any(x["id"] == doc["id"] for x in hits)

        # No hits for junk
        miss = requests.get(
            f"{BASE_URL}/api/documents?q=xxNoSuchToken",
            headers=headers, timeout=15,
        ).json()
        assert not any(x["id"] == doc["id"] for x in miss)

        # PATCH title
        p = requests.patch(
            f"{BASE_URL}/api/documents/{doc['id']}",
            json={"title": "IT51 Testdatei umbenannt"},
            headers=headers, timeout=15,
        )
        assert p.status_code == 200
        assert p.json()["title"] == "IT51 Testdatei umbenannt"

        # DELETE
        d = requests.delete(
            f"{BASE_URL}/api/documents/{doc['id']}",
            headers=headers, timeout=15,
        )
        assert d.status_code == 200

    def test_reject_unsupported_type(self, headers):
        files = {"file": ("tiny.png", io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"x" * 50), "image/png")}
        data = {"title": "PNG"}
        r = requests.post(
            f"{BASE_URL}/api/documents",
            files=files, data=data, headers=headers, timeout=30,
        )
        assert r.status_code == 400
        assert "PDF" in r.text or "JPG" in r.text

    def test_list_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/documents", timeout=15)
        assert r.status_code in (401, 403)
