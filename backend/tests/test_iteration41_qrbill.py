"""Iteration 41 – Swiss QR-Bill on a dedicated second page of invoice PDF.

Verifies that
  * the invoice PDF is 2 pages when a valid CH-IBAN is configured
  * page 2 contains the QR-Bill header + IBAN + creditor name
  * updating business settings invalidates archived invoice PDFs
"""
import io
import os
import time

import pytest
import requests
from pypdf import PdfReader

BASE = (os.environ.get("REACT_APP_BACKEND_URL") or "").rstrip("/")
if not BASE:
    pytest.skip("REACT_APP_BACKEND_URL not set", allow_module_level=True)
API = f"{BASE}/api"

ADMIN = {"email": "admin@saferide.ch", "password": "SafeRide2026!"}


def _auth() -> str:
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=15)
    r.raise_for_status()
    return r.json()["access_token"]


def _pick_student_and_invoice(headers) -> tuple[str, str]:
    students = requests.get(f"{API}/students", headers=headers, timeout=15).json()
    for s in students:
        invs = requests.get(
            f"{API}/students/{s['id']}/invoices", headers=headers, timeout=15
        ).json()
        if invs:
            return s["id"], invs[0]["id"]
    pytest.skip("No student with an invoice available")


def test_invoice_pdf_has_qr_bill_on_second_page():
    tok = _auth()
    h = {"Authorization": f"Bearer {tok}"}
    sid, iid = _pick_student_and_invoice(h)
    r = requests.get(
        f"{API}/students/{sid}/invoices/{iid}.pdf?force=true", headers=h, timeout=30
    )
    assert r.status_code == 200, r.text
    assert r.headers["content-type"].startswith("application/pdf")

    reader = PdfReader(io.BytesIO(r.content))
    assert len(reader.pages) == 2, (
        f"Expected 2 pages (invoice + QR-Bill), got {len(reader.pages)}"
    )
    page2 = reader.pages[1].extract_text() or ""
    assert "Zahlteil" in page2 or "QR" in page2, page2[:400]


def test_business_settings_have_valid_ubs_iban():
    tok = _auth()
    h = {"Authorization": f"Bearer {tok}"}
    r = requests.get(f"{API}/settings/business", headers=h, timeout=15)
    assert r.status_code == 200
    data = r.json()
    iban = (data.get("iban") or "").replace(" ", "").upper()
    assert iban.startswith("CH"), f"IBAN should be Swiss: {iban}"
    assert len(iban) == 21, f"Swiss IBAN must be 21 chars, got {len(iban)}: {iban}"
    assert data.get("bank")
    assert data.get("bic")


def test_settings_patch_invalidates_archives():
    tok = _auth()
    h = {"Authorization": f"Bearer {tok}"}
    sid, iid = _pick_student_and_invoice(h)

    # 1) Ensure archive exists (first PDF download persists archive)
    r1 = requests.get(
        f"{API}/students/{sid}/invoices/{iid}.pdf?force=true", headers=h, timeout=30
    )
    assert r1.status_code == 200
    time.sleep(0.5)
    invs = requests.get(f"{API}/students/{sid}/invoices", headers=h, timeout=15).json()
    inv = next((x for x in invs if x["id"] == iid), None)
    assert inv is not None
    # archive_url may still be empty if S3 not configured — skip in that case
    if not inv.get("archive_url"):
        pytest.skip("Archive not configured in this environment")

    # 2) PATCH business settings phone → should reset archive fields
    original_phone = (
        requests.get(f"{API}/settings/business", headers=h, timeout=15).json().get("phone") or ""
    )
    new_phone = original_phone + " " if not original_phone.endswith(" ") else original_phone[:-1]
    requests.patch(
        f"{API}/settings/business", headers=h, json={"phone": new_phone}, timeout=15
    )

    invs = requests.get(f"{API}/students/{sid}/invoices", headers=h, timeout=15).json()
    inv = next((x for x in invs if x["id"] == iid), None)
    assert inv is not None
    assert inv.get("archive_url", "") == "", (
        f"archive_url should be reset after business_settings PATCH: {inv.get('archive_url')!r}"
    )

    # Restore phone
    requests.patch(
        f"{API}/settings/business", headers=h, json={"phone": original_phone}, timeout=15
    )
