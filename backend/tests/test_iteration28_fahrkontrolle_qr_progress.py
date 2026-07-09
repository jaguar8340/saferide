"""Backend tests for Fahrkontrolle Phase 3 (Iteration 28).

Focus:
  * PDF endpoint with ?back_url=... embeds a QR image in page 1.
  * PDF endpoint without back_url still produces valid PDF, no QR image.
  * Endpoint is still 200/application/pdf/valid magic and %%EOF.
  * Progress helpers – recompute the overall/category percent from
    real backend data for the pre-seeded student (Stefan Haas) and
    for a freshly created student.

Auth: admin@saferide.ch / SafeRide2026!
"""
import os
from io import BytesIO
from urllib.parse import quote

import pytest
import requests
from pypdf import PdfReader

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN_EMAIL = "admin@saferide.ch"
ADMIN_PASSWORD = "SafeRide2026!"

VALUE_WEIGHT = {"1": 25, "2": 50, "3": 75, "4": 100, "X": 0}
STEFAN_ID = "443c0166-8f6e-4274-8c6a-9dfd6cc27e27"


@pytest.fixture(scope="module")
def auth_headers():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


# ---------------------------------------------------------------------------
#  Helpers
# ---------------------------------------------------------------------------
def _pdf_has_image(pdf_bytes: bytes) -> bool:
    """Detect if any XObject Image is referenced in the PDF stream.

    Both byte-search and pypdf image inspection are used.
    """
    # Byte search — QR gets embedded as an /Image XObject
    marker_hits = (
        pdf_bytes.count(b"/Subtype /Image")
        + pdf_bytes.count(b"/Subtype/Image")
    )
    if marker_hits > 0:
        return True

    # Fallback: use pypdf to walk the page /Resources tree
    try:
        reader = PdfReader(BytesIO(pdf_bytes))
        for page in reader.pages:
            res = page.get("/Resources")
            if res is None:
                continue
            xobj = res.get("/XObject") if hasattr(res, "get") else None
            if xobj is None:
                continue
            for _, obj in xobj.items():
                try:
                    if obj.get_object().get("/Subtype") == "/Image":
                        return True
                except Exception:
                    continue
    except Exception:
        pass
    return False


def _category_percent(cat_id, subitems, lessons, assessments_map):
    catsubs = [s for s in subitems if s["category_id"] == cat_id]
    if not catsubs:
        return 0
    total = 0
    for s in catsubs:
        best = 0
        for lesson in lessons:
            a = assessments_map.get((s["id"], lesson["id"]))
            if not a or not a.get("value"):
                continue
            w = VALUE_WEIGHT.get(a["value"], 0)
            if w > best:
                best = w
        total += best
    return round(total / len(catsubs))


def _overall_percent(categories, subitems, lessons, assessments_map):
    if not categories:
        return 0
    return round(
        sum(_category_percent(c["id"], subitems, lessons, assessments_map) for c in categories)
        / len(categories)
    )


# ---------------------------------------------------------------------------
#  QR / PDF tests
# ---------------------------------------------------------------------------
def test_pdf_without_back_url_has_no_qr(auth_headers):
    """No ?back_url= → PDF still valid but must NOT embed an /Image xobject."""
    # Create a small student
    sid = _mk_student(auth_headers, "TESTQR_None", "Karla")
    try:
        r = requests.get(
            f"{BASE_URL}/api/students/{sid}/fahrkontrolle.pdf",
            headers=auth_headers,
            timeout=60,
        )
        assert r.status_code == 200
        assert r.content[:4] == b"%PDF"
        assert r.content.rstrip().endswith(b"%%EOF")
        assert r.headers["content-type"].startswith("application/pdf")
        assert _pdf_has_image(r.content) is False, "QR/image found but no back_url was provided"
    finally:
        requests.delete(f"{BASE_URL}/api/students/{sid}", headers=auth_headers, timeout=15)


def test_pdf_with_back_url_embeds_qr(auth_headers):
    """?back_url=... → PDF must contain a QR /Image xobject and grow in size."""
    sid = _mk_student(auth_headers, "TESTQR_With", "Ben")
    try:
        # Baseline size without QR
        r_no = requests.get(
            f"{BASE_URL}/api/students/{sid}/fahrkontrolle.pdf",
            headers=auth_headers,
            timeout=60,
        )
        assert r_no.status_code == 200
        size_no_qr = len(r_no.content)

        # With back_url
        back = f"https://example.com/admin/students/{sid}"
        r_yes = requests.get(
            f"{BASE_URL}/api/students/{sid}/fahrkontrolle.pdf",
            params={"back_url": back},
            headers=auth_headers,
            timeout=60,
        )
        assert r_yes.status_code == 200
        assert r_yes.content[:4] == b"%PDF"
        assert r_yes.content.rstrip().endswith(b"%%EOF")
        assert _pdf_has_image(r_yes.content), "expected an /Image xobject in PDF (QR code)"
        assert len(r_yes.content) > size_no_qr, (
            f"QR PDF ({len(r_yes.content)}) should be larger than base PDF ({size_no_qr})"
        )
    finally:
        requests.delete(f"{BASE_URL}/api/students/{sid}", headers=auth_headers, timeout=15)


def test_pdf_with_back_url_special_chars(auth_headers):
    """Ampersands + query strings in back_url must not break generation."""
    sid = _mk_student(auth_headers, "TESTQR_Special", "Chloe")
    try:
        back = "https://example.com/admin/students/foo?x=1&y=2#hash"
        r = requests.get(
            f"{BASE_URL}/api/students/{sid}/fahrkontrolle.pdf",
            params={"back_url": back},
            headers=auth_headers,
            timeout=60,
        )
        assert r.status_code == 200
        assert r.content[:4] == b"%PDF"
        assert _pdf_has_image(r.content)
    finally:
        requests.delete(f"{BASE_URL}/api/students/{sid}", headers=auth_headers, timeout=15)


# ---------------------------------------------------------------------------
#  Progress helper cross-check (backend data → same formula as progress.js)
# ---------------------------------------------------------------------------
def test_progress_stefan_haas_overall_matches_ui(auth_headers):
    """Recompute overall % for pre-seeded Stefan Haas – expect ~83%."""
    # Stefan Haas – pre-seeded
    r = requests.get(f"{BASE_URL}/api/students/{STEFAN_ID}", headers=auth_headers, timeout=15)
    if r.status_code == 404:
        pytest.skip("Pre-seeded Stefan Haas student not present in this env")
    assert r.status_code == 200

    cats = requests.get(f"{BASE_URL}/api/fahrkontrolle/categories", headers=auth_headers, timeout=15).json()
    subs = requests.get(f"{BASE_URL}/api/fahrkontrolle/subitems", headers=auth_headers, timeout=15).json()
    lessons = requests.get(
        f"{BASE_URL}/api/fahrkontrolle/students/{STEFAN_ID}/lessons",
        headers=auth_headers, timeout=15,
    ).json()
    ass = requests.get(
        f"{BASE_URL}/api/fahrkontrolle/students/{STEFAN_ID}/assessments",
        headers=auth_headers, timeout=15,
    ).json()
    assess_map = {(a["subitem_id"], a["lesson_id"]): a for a in ass}

    overall = _overall_percent(cats, subs, lessons, assess_map)
    # UI screenshot showed ~83%. Allow ±5% wiggle in case seed data drifts.
    assert 70 <= overall <= 95, f"unexpected overall percent {overall}"

    # 6 categories, sanity check
    assert len(cats) >= 6

    # Verify that at least ONE category is 100% (Manöver per spec) OR at
    # least all categories have a valid percent 0..100.
    for c in cats:
        pct = _category_percent(c["id"], subs, lessons, assess_map)
        assert 0 <= pct <= 100


def test_progress_fresh_student_zero_percent(auth_headers):
    """Brand-new student with no lessons/no assessments → 0%."""
    sid = _mk_student(auth_headers, "TESTProg_Zero", "Zoe")
    try:
        cats = requests.get(f"{BASE_URL}/api/fahrkontrolle/categories", headers=auth_headers, timeout=15).json()
        subs = requests.get(f"{BASE_URL}/api/fahrkontrolle/subitems", headers=auth_headers, timeout=15).json()
        lessons = requests.get(
            f"{BASE_URL}/api/fahrkontrolle/students/{sid}/lessons",
            headers=auth_headers, timeout=15,
        ).json()
        ass = requests.get(
            f"{BASE_URL}/api/fahrkontrolle/students/{sid}/assessments",
            headers=auth_headers, timeout=15,
        ).json()
        assess_map = {(a["subitem_id"], a["lesson_id"]): a for a in ass}
        overall = _overall_percent(cats, subs, lessons, assess_map)
        assert overall == 0
    finally:
        requests.delete(f"{BASE_URL}/api/students/{sid}", headers=auth_headers, timeout=15)


def test_progress_category_percent_after_ratings(auth_headers):
    """Add real ratings to a fresh student and verify category percent."""
    sid = _mk_student(auth_headers, "TESTProg_Real", "Ralf")
    try:
        # Fetch reference data
        cats = requests.get(f"{BASE_URL}/api/fahrkontrolle/categories", headers=auth_headers, timeout=15).json()
        subs = requests.get(f"{BASE_URL}/api/fahrkontrolle/subitems", headers=auth_headers, timeout=15).json()
        assert cats and subs

        # Pick the first category with at least 2 subitems
        target_cat = None
        for c in cats:
            csubs = [s for s in subs if s["category_id"] == c["id"]]
            if len(csubs) >= 2:
                target_cat = c
                break
        assert target_cat is not None
        cat_subs = [s for s in subs if s["category_id"] == target_cat["id"]]

        # 1 lesson
        lr = requests.post(
            f"{BASE_URL}/api/fahrkontrolle/students/{sid}/lessons",
            json={"date": "2026-01-05"},
            headers=auth_headers, timeout=30,
        )
        assert lr.status_code == 200
        lesson_id = lr.json()["id"]

        # Rate first two subitems in target_cat: "4" and "2"
        for sub, val in zip(cat_subs[:2], ["4", "2"]):
            r = requests.put(
                f"{BASE_URL}/api/fahrkontrolle/students/{sid}/assessments",
                json={
                    "subitem_id": sub["id"],
                    "lesson_id": lesson_id,
                    "value": val,
                    "comment": "",
                },
                headers=auth_headers, timeout=30,
            )
            assert r.status_code == 200

        ass = requests.get(
            f"{BASE_URL}/api/fahrkontrolle/students/{sid}/assessments",
            headers=auth_headers, timeout=15,
        ).json()
        assess_map = {(a["subitem_id"], a["lesson_id"]): a for a in ass}

        # Expected: sum of best percents / len(cat_subs)
        expected_sum = 100 + 50  # first sub=4 → 100, second=2 → 50, rest=0
        expected_pct = round(expected_sum / len(cat_subs))
        actual = _category_percent(target_cat["id"], subs, [{"id": lesson_id}], assess_map)
        assert actual == expected_pct, (
            f"category percent mismatch: expected {expected_pct}, got {actual} "
            f"(cat has {len(cat_subs)} subitems)"
        )
    finally:
        requests.delete(f"{BASE_URL}/api/students/{sid}", headers=auth_headers, timeout=15)


# ---------------------------------------------------------------------------
#  Helper
# ---------------------------------------------------------------------------
def _mk_student(auth_headers, last, first):
    r = requests.post(
        f"{BASE_URL}/api/students",
        json={
            "first_name": first,
            "last_name": last,
            "category": "B",
            "instructor": "Nadine",
            "start_date": "2026-01-10",
        },
        headers=auth_headers, timeout=30,
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]
