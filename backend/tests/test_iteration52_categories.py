"""Iteration 52 — Kategorien für Admin-Dateien.

Testet:
- Default-Kategorien werden ausgeliefert (auch ohne Dokumente)
- Neue Kategorie kann angelegt werden und erscheint mit count=0
- Upload mit Kategorie speichert das Feld und erhöht den Count
- Filter ?category=X funktioniert
- PATCH kann die Kategorie eines Dokuments ändern
- Leere Kategorie kann gelöscht werden
- Volle Kategorie kann NICHT gelöscht werden (HTTP 400)
- Ohne Auth: alle Kategorie-Endpoints → 401/403
"""
import io
import os
import requests
import pytest

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8001")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@saferide.ch")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "SafeRide2026!")

TINY_PDF = b"%PDF-1.4\ntest\n%%EOF"


@pytest.fixture(scope="module")
def headers():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


class TestCategories:
    def test_defaults_visible_even_when_empty(self, headers):
        r = requests.get(f"{BASE_URL}/api/documents/categories", headers=headers, timeout=15)
        assert r.status_code == 200
        names = [c["name"] for c in r.json()]
        for expected in ("Verträge", "Steuer", "Versicherung", "Buchhaltung", "Allgemein"):
            assert expected in names

    def test_create_and_delete_empty_category(self, headers):
        name = "IT52-Temp"
        r = requests.post(
            f"{BASE_URL}/api/documents/categories",
            json={"name": name}, headers=headers, timeout=15,
        )
        assert r.status_code == 200
        # Listed
        cats = requests.get(f"{BASE_URL}/api/documents/categories", headers=headers, timeout=15).json()
        found = next((c for c in cats if c["name"] == name), None)
        assert found and found["count"] == 0
        # Delete
        d = requests.delete(
            f"{BASE_URL}/api/documents/categories/{name}",
            headers=headers, timeout=15,
        )
        assert d.status_code == 200
        cats2 = requests.get(f"{BASE_URL}/api/documents/categories", headers=headers, timeout=15).json()
        assert not any(c["name"] == name for c in cats2)

    def test_upload_with_category_and_filter(self, headers):
        files = {"file": ("t.pdf", io.BytesIO(TINY_PDF), "application/pdf")}
        data = {"title": "IT52-cat-file", "category": "Verträge"}
        r = requests.post(
            f"{BASE_URL}/api/documents",
            files=files, data=data, headers=headers, timeout=30,
        )
        assert r.status_code == 200
        doc = r.json()
        assert doc["category"] == "Verträge"

        # Filter matches
        matched = requests.get(
            f"{BASE_URL}/api/documents",
            params={"category": "Verträge"}, headers=headers, timeout=15,
        ).json()
        assert any(x["id"] == doc["id"] for x in matched)

        # Filter non-matching
        missed = requests.get(
            f"{BASE_URL}/api/documents",
            params={"category": "Steuer"}, headers=headers, timeout=15,
        ).json()
        assert not any(x["id"] == doc["id"] for x in missed)

        # Category count reflects it
        cats = requests.get(f"{BASE_URL}/api/documents/categories", headers=headers, timeout=15).json()
        vertrag = next(c for c in cats if c["name"] == "Verträge")
        assert vertrag["count"] >= 1

        # Cannot delete non-empty category
        d = requests.delete(
            f"{BASE_URL}/api/documents/categories/Verträge",
            headers=headers, timeout=15,
        )
        assert d.status_code == 400
        assert "enthält noch" in d.text or "leeren" in d.text

        # PATCH category
        p = requests.patch(
            f"{BASE_URL}/api/documents/{doc['id']}",
            json={"category": "Steuer"}, headers=headers, timeout=15,
        )
        assert p.status_code == 200
        assert p.json()["category"] == "Steuer"

        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/documents/{doc['id']}",
            headers=headers, timeout=15,
        )

    def test_categories_require_auth(self):
        r1 = requests.get(f"{BASE_URL}/api/documents/categories", timeout=15)
        assert r1.status_code in (401, 403)
        r2 = requests.post(
            f"{BASE_URL}/api/documents/categories", json={"name": "x"}, timeout=15,
        )
        assert r2.status_code in (401, 403)
        r3 = requests.delete(f"{BASE_URL}/api/documents/categories/x", timeout=15)
        assert r3.status_code in (401, 403)

    def test_empty_name_rejected(self, headers):
        r = requests.post(
            f"{BASE_URL}/api/documents/categories",
            json={"name": "   "}, headers=headers, timeout=15,
        )
        assert r.status_code == 400
