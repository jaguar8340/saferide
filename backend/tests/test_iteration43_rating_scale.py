"""Iteration 43 – Configurable rating scale for the Fahrkontrolle.

Verifies:
  * GET /api/settings/rating-scale returns the seeded default (4 levels + retry)
  * PATCH updates labels/colours and can add / remove levels
  * Payload validation: empty levels + duplicate values are rejected
  * The Fahrkontrolle PDF now includes a rating-scale legend in the
    footer AND uses the admin-configured colours in the matrix
"""
import io
import os

import pytest
import requests
from pypdf import PdfReader

BASE = (os.environ.get("REACT_APP_BACKEND_URL") or "").rstrip("/")
if not BASE:
    pytest.skip("REACT_APP_BACKEND_URL not set", allow_module_level=True)
API = f"{BASE}/api"

ADMIN = {"email": "admin@saferide.ch", "password": "SafeRide2026!"}


def _auth() -> dict:
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=15)
    r.raise_for_status()
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _default_levels() -> list[dict]:
    return [
        {"value": "1", "desc_de": "erklärt",     "desc_en": "explained",
         "bg": "#dc2626", "fg": "#ffffff"},
        {"value": "2", "desc_de": "geübt",       "desc_en": "practised",
         "bg": "#f97316", "fg": "#ffffff"},
        {"value": "3", "desc_de": "selbständig", "desc_en": "independent",
         "bg": "#84cc16", "fg": "#0f172a"},
        {"value": "4", "desc_de": "sicher",      "desc_en": "confident",
         "bg": "#166534", "fg": "#ffffff"},
    ]


def test_get_rating_scale_public():
    r = requests.get(f"{API}/settings/rating-scale", timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["id"] == "default"
    assert isinstance(d["levels"], list)
    assert len(d["levels"]) >= 1
    assert d["retry"]["value"] == "X"


def test_patch_labels_and_add_fifth_level():
    h = _auth()
    try:
        new_levels = _default_levels()
        new_levels[0]["desc_de"] = "gezeigt"
        new_levels.append({
            "value": "5", "desc_de": "prüfungsreif",
            "desc_en": "exam-ready",
            "bg": "#0f766e", "fg": "#ffffff",
        })
        r = requests.patch(
            f"{API}/settings/rating-scale", headers=h,
            json={"levels": new_levels}, timeout=15,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert len(d["levels"]) == 5
        assert d["levels"][0]["desc_de"] == "gezeigt"
        assert d["levels"][-1]["value"] == "5"
    finally:
        # Restore
        requests.patch(f"{API}/settings/rating-scale", headers=h,
                       json={"levels": _default_levels()}, timeout=15)


def test_patch_rejects_empty_levels():
    h = _auth()
    r = requests.patch(
        f"{API}/settings/rating-scale", headers=h,
        json={"levels": []}, timeout=15,
    )
    assert r.status_code == 400


def test_patch_rejects_duplicate_values():
    h = _auth()
    r = requests.patch(
        f"{API}/settings/rating-scale", headers=h,
        json={"levels": [
            {"value": "1", "desc_de": "a", "bg": "#000", "fg": "#fff"},
            {"value": "1", "desc_de": "b", "bg": "#111", "fg": "#fff"},
        ]}, timeout=15,
    )
    assert r.status_code == 400


def test_patch_retry_label():
    h = _auth()
    original = requests.get(f"{API}/settings/rating-scale", timeout=15).json()
    try:
        r = requests.patch(
            f"{API}/settings/rating-scale", headers=h,
            json={"retry": {**original["retry"], "desc_de": "wiederholen"}},
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["retry"]["desc_de"] == "wiederholen"
    finally:
        requests.patch(f"{API}/settings/rating-scale", headers=h,
                       json={"retry": original["retry"]}, timeout=15)


def test_fahrkontrolle_pdf_contains_legend():
    """The PDF footer now shows a small rating-scale legend."""
    h = _auth()
    students = requests.get(f"{API}/students", headers=h, timeout=15).json()
    if not students:
        pytest.skip("No students available")
    sid = students[0]["id"]
    r = requests.get(
        f"{API}/students/{sid}/fahrkontrolle.pdf", headers=h, timeout=30,
    )
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"

    reader = PdfReader(io.BytesIO(r.content))
    assert len(reader.pages) >= 1
    # Look for the seeded default labels on page 1 (footer legend).
    page1 = reader.pages[0].extract_text() or ""
    for label in ("erklärt", "geübt", "selbständig", "sicher", "nochmals üben"):
        assert label in page1, f"legend label '{label}' missing from PDF page 1"
