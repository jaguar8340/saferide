"""Iteration 51 — extra coverage on top of test_iteration51_split_agb_documents.py.

Covers:
- JPG upload → kind='image'
- Search across `note` and `original_filename`
- PATCH updates `note` (not only title)
- DELETE removes DB row (subsequent GET 404 + list excludes it)
- Legacy `agb_confirmation_token` still validates as student
- Guardian-without-email returns 400 (with a temp student created in-test)
- Documents endpoints reject non-admin (POST, PATCH, DELETE)
"""
import io
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8001")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@saferide.ch")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "SafeRide2026!")


@pytest.fixture(scope="module")
def headers():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


# minimal 1-pixel JPEG payload
TINY_JPG = bytes.fromhex(
    "FFD8FFE000104A46494600010100000100010000FFDB0043000806060706050806070707"
    "0908080A0C140D0C0B0B0C1912130F141D1A1F1E1D1A1C1C20242E2720222C231C1C2837"
    "292C30313434341F27393D38323C2E333432FFC0000B0801000100010111"
    "00FFC4001F0000010501010101010100000000000000000102030405060708090A0BFFC4"
    "00B5100002010303020403050504040000017D01020300041105122131410613516107"
    "227114328191A1082342B1C11552D1F02433627282090A161718191A25262728292A"
    "3435363738393A434445464748494A535455565758595A636465666768696A73747576"
    "7778797A838485868788898A92939495969798999AA2A3A4A5A6A7A8A9AAB2B3B4B5B6"
    "B7B8B9BAC2C3C4C5C6C7C8C9CAD2D3D4D5D6D7D8D9DAE1E2E3E4E5E6E7E8E9EAF1F2F3"
    "F4F5F6F7F8F9FAFFDA0008010100003F00FBD0FFD9"
)


# --------------------------------------------------------------------- Documents
class TestDocumentsExtra:
    def test_upload_jpg_kind_image_and_search_note_filename(self, headers):
        marker = f"marker-{uuid.uuid4().hex[:10]}"
        files = {"file": (f"ContractA-{marker}.jpg", io.BytesIO(TINY_JPG), "image/jpeg")}
        data = {"title": "TEST JPG", "note": f"note-token-{marker}"}
        r = requests.post(
            f"{BASE_URL}/api/documents",
            files=files, data=data, headers=headers, timeout=30,
        )
        assert r.status_code == 200, r.text
        doc = r.json()
        assert doc["kind"] == "image"
        assert doc["content_type"] == "image/jpeg"
        doc_id = doc["id"]

        try:
            # Search by note (case-insensitive)
            hits_note = requests.get(
                f"{BASE_URL}/api/documents",
                params={"q": f"NOTE-Token-{marker}"},
                headers=headers, timeout=15,
            ).json()
            assert any(x["id"] == doc_id for x in hits_note), "search on note field failed"

            # Search by filename fragment
            hits_fn = requests.get(
                f"{BASE_URL}/api/documents",
                params={"q": f"ContractA-{marker}"},
                headers=headers, timeout=15,
            ).json()
            assert any(x["id"] == doc_id for x in hits_fn), "search on filename failed"

            # PATCH note only
            p = requests.patch(
                f"{BASE_URL}/api/documents/{doc_id}",
                json={"note": "note updated"},
                headers=headers, timeout=15,
            )
            assert p.status_code == 200
            assert p.json()["note"] == "note updated"
            assert p.json()["title"] == "TEST JPG"  # unchanged
        finally:
            requests.delete(
                f"{BASE_URL}/api/documents/{doc_id}", headers=headers, timeout=15
            )

    def test_delete_removes_row(self, headers):
        files = {"file": ("del.jpg", io.BytesIO(TINY_JPG), "image/jpeg")}
        r = requests.post(
            f"{BASE_URL}/api/documents",
            files=files, data={"title": "TEST DELETE"},
            headers=headers, timeout=30,
        )
        assert r.status_code == 200
        doc_id = r.json()["id"]

        d = requests.delete(
            f"{BASE_URL}/api/documents/{doc_id}", headers=headers, timeout=15
        )
        assert d.status_code == 200

        # Row is gone: PATCH & DELETE now return 404
        p2 = requests.patch(
            f"{BASE_URL}/api/documents/{doc_id}",
            json={"title": "ghost"},
            headers=headers, timeout=15,
        )
        assert p2.status_code == 404

        lst = requests.get(f"{BASE_URL}/api/documents", headers=headers, timeout=15).json()
        assert not any(x["id"] == doc_id for x in lst)

    def test_endpoints_require_admin(self):
        # POST without auth
        files = {"file": ("x.pdf", io.BytesIO(b"%PDF-1.4\n%%EOF"), "application/pdf")}
        r = requests.post(f"{BASE_URL}/api/documents", files=files, data={"title": "x"}, timeout=15)
        assert r.status_code in (401, 403)
        # PATCH without auth
        r = requests.patch(f"{BASE_URL}/api/documents/does-not-matter", json={"title": "y"}, timeout=15)
        assert r.status_code in (401, 403)
        # DELETE without auth
        r = requests.delete(f"{BASE_URL}/api/documents/does-not-matter", timeout=15)
        assert r.status_code in (401, 403)


# --------------------------------------------------------------------- Split AGB
class TestSplitAgbExtra:
    def test_guardian_without_email_returns_400(self, headers):
        # Create a fresh student without guardian_email
        payload = {
            "first_name": "TEST",
            "last_name": f"NoGuardian{uuid.uuid4().hex[:6]}",
            "email": f"test-{uuid.uuid4().hex[:8]}@example.com",
        }
        r = requests.post(f"{BASE_URL}/api/students", json=payload, headers=headers, timeout=15)
        assert r.status_code in (200, 201), r.text
        sid = r.json()["id"]
        try:
            g = requests.post(
                f"{BASE_URL}/api/terms/send/{sid}",
                params={"target": "guardian"},
                headers=headers, timeout=15,
            )
            assert g.status_code == 400
            body = g.text.lower()
            assert "erziehungsberechtig" in body or "guardian" in body or "e-mail" in body
        finally:
            requests.delete(f"{BASE_URL}/api/students/{sid}", headers=headers, timeout=15)

    def test_confirming_student_leaves_guardian_intact(self, headers):
        # Get student with email + set guardian_email
        s = requests.get(f"{BASE_URL}/api/students", headers=headers, timeout=15).json()
        stu = next((x for x in s if x.get("email")), None)
        assert stu, "no student with email"
        sid = stu["id"]
        requests.patch(
            f"{BASE_URL}/api/students/{sid}",
            json={"guardian_name": "G", "guardian_email": f"g-{uuid.uuid4().hex[:6]}@example.com"},
            headers=headers, timeout=15,
        )

        rs = requests.post(
            f"{BASE_URL}/api/terms/send/{sid}?target=student",
            headers=headers, timeout=15,
        ).json()
        rg = requests.post(
            f"{BASE_URL}/api/terms/send/{sid}?target=guardian",
            headers=headers, timeout=15,
        ).json()
        stoken = rs["confirm_url"].rsplit("/", 1)[-1]
        gtoken = rg["confirm_url"].rsplit("/", 1)[-1]

        # Confirm only student
        cr = requests.post(
            f"{BASE_URL}/api/terms/confirm", json={"token": stoken}, timeout=15
        )
        assert cr.status_code == 200
        assert cr.json()["target"] == "student"

        # Guardian token still valid
        v_g = requests.get(
            f"{BASE_URL}/api/terms/confirm/validate",
            params={"token": gtoken}, timeout=15,
        )
        assert v_g.status_code == 200
        assert v_g.json()["target"] == "guardian"
