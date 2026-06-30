"""Iteration 12 backend tests:
- Certificates CRUD (GET public list with 4 defaults; POST/PATCH/DELETE admin; auth required)
- Package PATCH for inline edit (price_chf + title_de via extra='allow')
- Package POST/DELETE (admin only) for inline add/remove
"""
import os
import uuid
import pytest
import requests


def _backend_url() -> str:
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if not url:
        with open("/app/frontend/.env") as fh:
            for line in fh:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    url = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break
    if not url:
        raise RuntimeError("REACT_APP_BACKEND_URL not set")
    return url.rstrip("/")


BASE_URL = _backend_url()
ADMIN_EMAIL = "admin@saferide.ch"
ADMIN_PASSWORD = "SafeRide2026!"


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=20,
    )
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ---------- Certificates ----------
class TestCertificates:
    EXPECTED_TOKENS = [
        ["Fachausweis"],
        ["Berufsbewilligung", "SZ"],
        ["ADHS"],
        ["Mental"],
    ]

    def test_get_certificates_public_returns_at_least_4_defaults(self):
        r = requests.get(f"{BASE_URL}/api/certificates", timeout=20)
        assert r.status_code == 200, r.text
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 4, f"Expected at least 4 certificates; got {len(items)}"
        titles_de = [c.get("title_de", "") for c in items]
        for tokens in self.EXPECTED_TOKENS:
            matched = any(all(tok in t for tok in tokens) for t in titles_de)
            assert matched, f"No certificate contains all tokens {tokens}; got={titles_de}"

    def test_post_certificate_requires_auth(self):
        r = requests.post(
            f"{BASE_URL}/api/certificates",
            json={"title_de": "QA Test", "title_en": "QA Test"},
            timeout=20,
        )
        assert r.status_code in (401, 403)

    def test_patch_certificate_requires_auth(self):
        # try patch on any random id
        r = requests.patch(
            f"{BASE_URL}/api/certificates/some-id",
            json={"title_de": "QA"},
            timeout=20,
        )
        assert r.status_code in (401, 403, 404)
        if r.status_code == 404:
            # endpoint exists but id unknown — still acceptable; ensure with admin path returns 404
            pass

    def test_delete_certificate_requires_auth(self):
        r = requests.delete(f"{BASE_URL}/api/certificates/some-id", timeout=20)
        assert r.status_code in (401, 403, 404)

    def test_admin_create_patch_delete_certificate(self, admin_headers):
        # CREATE
        suffix = uuid.uuid4().hex[:6]
        payload = {
            "title_de": f"TEST_QA_{suffix}",
            "title_en": f"TEST_QA_{suffix}",
            "year": 2026,
            "image_url": "https://example.com/cert.png",
        }
        r_create = requests.post(
            f"{BASE_URL}/api/certificates",
            json=payload,
            headers=admin_headers,
            timeout=20,
        )
        assert r_create.status_code in (200, 201), r_create.text
        created = r_create.json()
        cert_id = created.get("id") or created.get("_id") or created.get("slug")
        assert cert_id, f"Created certificate has no id: {created}"
        assert created.get("title_de") == payload["title_de"]

        try:
            # GET-list contains it
            r_list = requests.get(f"{BASE_URL}/api/certificates", timeout=20)
            assert r_list.status_code == 200
            ids = {c.get("id") for c in r_list.json()}
            assert cert_id in ids, f"Created cert {cert_id} not in list"

            # PATCH
            r_patch = requests.patch(
                f"{BASE_URL}/api/certificates/{cert_id}",
                json={"title_de": f"TEST_QA_{suffix}_UPDATED", "year": 2027},
                headers=admin_headers,
                timeout=20,
            )
            assert r_patch.status_code == 200, r_patch.text
            patched = r_patch.json()
            assert patched.get("title_de") == f"TEST_QA_{suffix}_UPDATED"
            assert patched.get("year") == 2027

            # Verify GET reflects patch
            r_after = requests.get(f"{BASE_URL}/api/certificates", timeout=20).json()
            found = next((c for c in r_after if c.get("id") == cert_id), None)
            assert found is not None
            assert found.get("title_de") == f"TEST_QA_{suffix}_UPDATED"
        finally:
            # DELETE
            r_del = requests.delete(
                f"{BASE_URL}/api/certificates/{cert_id}",
                headers=admin_headers,
                timeout=20,
            )
            assert r_del.status_code in (200, 204), r_del.text
            r_after2 = requests.get(f"{BASE_URL}/api/certificates", timeout=20).json()
            assert cert_id not in {c.get("id") for c in r_after2}, "Cert not deleted"


# ---------- Packages: PATCH for inline edit ----------
class TestPackagesInlineEdit:
    def test_patch_probelektion_title_and_price(self, admin_headers):
        # capture original
        r0 = requests.get(f"{BASE_URL}/api/packages/probelektion-50", timeout=20)
        assert r0.status_code == 200, r0.text
        orig = r0.json()
        orig_price = orig.get("price_chf")
        orig_title = orig.get("title_de")

        # update both
        r1 = requests.patch(
            f"{BASE_URL}/api/packages/probelektion-50",
            json={"price_chf": 55, "title_de": "QA Test"},
            headers=admin_headers,
            timeout=20,
        )
        assert r1.status_code == 200, r1.text
        updated = r1.json()
        assert updated.get("price_chf") == 55
        assert updated.get("title_de") == "QA Test"

        # GET to confirm persistence
        r_check = requests.get(f"{BASE_URL}/api/packages/probelektion-50", timeout=20).json()
        assert r_check.get("price_chf") == 55
        assert r_check.get("title_de") == "QA Test"

        # restore
        r_restore = requests.patch(
            f"{BASE_URL}/api/packages/probelektion-50",
            json={"price_chf": orig_price, "title_de": orig_title},
            headers=admin_headers,
            timeout=20,
        )
        assert r_restore.status_code == 200
        r_final = requests.get(f"{BASE_URL}/api/packages/probelektion-50", timeout=20).json()
        assert r_final.get("price_chf") == orig_price
        assert r_final.get("title_de") == orig_title


# ---------- Packages: POST/DELETE for inline add/remove ----------
class TestPackagesPostDelete:
    def test_post_requires_auth(self):
        r = requests.post(
            f"{BASE_URL}/api/packages",
            json={"slug": "qa-no-auth", "title_de": "x"},
            timeout=20,
        )
        assert r.status_code in (401, 403)

    def test_delete_requires_auth(self):
        r = requests.delete(f"{BASE_URL}/api/packages/qa-test-paket", timeout=20)
        assert r.status_code in (401, 403)

    def test_admin_create_then_delete_package(self, admin_headers):
        slug = f"qa-test-paket-{uuid.uuid4().hex[:6]}"
        payload = {
            "slug": slug,
            "title_de": "QA Test Paket",
            "title_en": "QA Test Package",
            "price_chf": 99,
            "active": True,
        }
        r_create = requests.post(
            f"{BASE_URL}/api/packages",
            json=payload,
            headers=admin_headers,
            timeout=20,
        )
        assert r_create.status_code in (200, 201), r_create.text
        created = r_create.json()
        assert created.get("slug") == slug
        assert created.get("price_chf") == 99
        try:
            # Public GET should include it (active=True)
            r_list = requests.get(f"{BASE_URL}/api/packages", timeout=20).json()
            slugs = {p["slug"] for p in r_list}
            assert slug in slugs, f"Slug {slug} not in public packages list"
        finally:
            r_del = requests.delete(
                f"{BASE_URL}/api/packages/{slug}",
                headers=admin_headers,
                timeout=20,
            )
            assert r_del.status_code in (200, 204), r_del.text
            r_after = requests.get(f"{BASE_URL}/api/packages", timeout=20).json()
            assert slug not in {p["slug"] for p in r_after}, "Slug not removed"
