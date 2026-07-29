#!/usr/bin/env python3
"""Focused bug verification for Fahrkontrolle PDF notes + footer overlap.

Checks the preview deployment only:
  - Admin login works and notes API returns the expected student notes.
  - Fahrkontrolle PDF contains a new "Diverse Notizen" section on a new page.
  - All note texts are present in PDF text, in newest-first API order.
  - Last journal page footer/legend area contains only footer words (no comment overflow).

Artifacts are written under /app/test_reports/pdf_notes_artifacts.
"""
from __future__ import annotations

import html
import json
import os
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import requests


BASE_URL = os.environ.get(
    "PREVIEW_BASE_URL", "https://driving-school-cms.preview.emergentagent.com"
).rstrip("/")
STUDENT_ID = os.environ.get(
    "TEST_STUDENT_ID", "fd5004d2-ff55-4379-97e6-ee48373e99e1"
)
EMAIL = os.environ.get("ADMIN_EMAIL", "admin@saferide.ch")
PASSWORD = os.environ.get("ADMIN_PASSWORD", "SafeRide2026!")

ARTIFACT_DIR = Path("/app/test_reports/pdf_notes_artifacts")
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
PDF_PATH = ARTIFACT_DIR / "teo_fahrkontrolle_preview.pdf"
TEXT_PATH = ARTIFACT_DIR / "teo_fahrkontrolle_preview.txt"
BBOX_PATH = ARTIFACT_DIR / "teo_fahrkontrolle_preview_bbox.html"
RESULT_PATH = ARTIFACT_DIR / "bug_verification_pdf_notes_result.json"


def norm_text(s: str) -> str:
    s = html.unescape(s or "")
    s = s.replace("\u00a0", " ")
    # Remove spaces that pdftotext sometimes inserts before punctuation.
    s = re.sub(r"\s+([.,;:!?])", r"\1", s)
    return re.sub(r"\s+", " ", s).strip()


def fmt_date(iso: str | None) -> str:
    if not iso or len(iso) < 10:
        return "—"
    return f"{iso[8:10]}/{iso[5:7]}/{iso[0:4]}"


def run(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, check=True, text=True, capture_output=True)


def main() -> int:
    out: dict = {
        "base_url": BASE_URL,
        "student_id": STUDENT_ID,
        "checks": {},
        "failures": [],
        "artifacts": {},
    }

    session = requests.Session()
    login = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": EMAIL, "password": PASSWORD},
        timeout=30,
    )
    out["checks"]["login_status"] = login.status_code
    if login.status_code != 200:
        out["failures"].append(f"Login failed: {login.status_code} {login.text[:300]}")
        RESULT_PATH.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
        return 2
    token = login.json().get("access_token")
    session.headers.update({"Authorization": f"Bearer {token}"})

    notes_resp = session.get(
        f"{BASE_URL}/api/fahrkontrolle/students/{STUDENT_ID}/notes", timeout=30
    )
    out["checks"]["notes_status"] = notes_resp.status_code
    if notes_resp.status_code != 200:
        out["failures"].append(f"Notes API failed: {notes_resp.status_code} {notes_resp.text[:300]}")
        RESULT_PATH.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
        return 2
    notes = notes_resp.json()
    out["checks"]["notes_count_api"] = len(notes)
    out["checks"]["notes_dates_api_order"] = [n.get("date") for n in notes]
    out["checks"]["notes_have_image_url_count"] = sum(1 for n in notes if n.get("image_url"))
    if len(notes) < 1:
        out["failures"].append("Notes API returned zero notes; cannot verify notes PDF inclusion.")
    sorted_dates = sorted([n.get("date", "") for n in notes], reverse=True)
    if [n.get("date", "") for n in notes] != sorted_dates:
        out["failures"].append("Notes API is not sorted newest-first by date.")

    pdf_resp = session.get(
        f"{BASE_URL}/api/students/{STUDENT_ID}/fahrkontrolle.pdf", timeout=60
    )
    out["checks"]["pdf_status"] = pdf_resp.status_code
    out["checks"]["pdf_content_type"] = pdf_resp.headers.get("content-type", "")
    if pdf_resp.status_code != 200 or b"%PDF" not in pdf_resp.content[:20]:
        out["failures"].append(
            f"PDF fetch failed or not PDF: {pdf_resp.status_code} {pdf_resp.headers.get('content-type')}"
        )
        RESULT_PATH.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
        return 2
    PDF_PATH.write_bytes(pdf_resp.content)
    out["artifacts"]["pdf"] = str(PDF_PATH)

    info = run(["pdfinfo", str(PDF_PATH)]).stdout
    page_match = re.search(r"^Pages:\s+(\d+)", info, flags=re.M)
    page_count = int(page_match.group(1)) if page_match else 0
    out["checks"]["pdf_page_count"] = page_count

    pdfimages = run(["pdfimages", "-list", str(PDF_PATH)]).stdout
    # Header + separator only means zero embedded image XObjects.
    out["checks"]["pdfimages_output_lines"] = [ln for ln in pdfimages.splitlines() if ln.strip()]

    run(["pdftotext", "-layout", str(PDF_PATH), str(TEXT_PATH)])
    pdf_text = TEXT_PATH.read_text(encoding="utf-8", errors="replace")
    out["artifacts"]["pdftotext"] = str(TEXT_PATH)
    pages = pdf_text.split("\f")
    # Remove final empty page segment after trailing form feed.
    if pages and not norm_text(pages[-1]):
        pages = pages[:-1]
    out["checks"]["pdftotext_page_count"] = len(pages)

    note_page_indexes = [i for i, p in enumerate(pages) if "Diverse Notizen" in p]
    out["checks"]["diverse_notizen_pages_1_based"] = [i + 1 for i in note_page_indexes]
    if not note_page_indexes:
        out["failures"].append("PDF text does not contain the 'Diverse Notizen' section title.")
    else:
        first_note_idx = note_page_indexes[0]
        if first_note_idx == 0:
            out["failures"].append("Diverse Notizen starts on page 1, not after journal pages.")
        prev_page = pages[first_note_idx - 1]
        if "Diverse Notizen" in prev_page:
            out["failures"].append("Diverse Notizen appears on the page before the notes section page.")
        if "Ausbildungsjournal" not in "\n".join(pages[1:first_note_idx + 1]):
            out["failures"].append("Could not confirm notes section follows journal pages.")

        notes_section_text = norm_text(" ".join(pages[first_note_idx:]))
        out["checks"]["notes_section_text_chars"] = len(notes_section_text)
        missing_notes = []
        note_positions = []
        missing_dates = []
        for n in notes:
            t = norm_text(n.get("text", ""))
            d = fmt_date(n.get("date"))
            pos = notes_section_text.find(t)
            if pos == -1:
                # Fallback that still detects truncation: require both beginning and ending snippets.
                start = t[:80]
                end = t[-80:] if len(t) > 80 else t
                start_pos = notes_section_text.find(start)
                end_pos = notes_section_text.find(end)
                if start_pos == -1 or end_pos == -1 or end_pos < start_pos:
                    missing_notes.append({"id": n.get("id"), "date": n.get("date"), "text_sample": t[:120]})
                    pos = -1
                else:
                    pos = start_pos
            note_positions.append(pos)
            if d not in notes_section_text:
                missing_dates.append({"id": n.get("id"), "date": d})
        out["checks"]["note_text_positions_in_pdf"] = note_positions
        out["checks"]["missing_note_texts"] = missing_notes
        out["checks"]["missing_note_dates"] = missing_dates
        if missing_notes:
            out["failures"].append(f"{len(missing_notes)} note text(s) missing/truncated in PDF notes section.")
        if missing_dates:
            out["failures"].append(f"{len(missing_dates)} note date pill(s) missing from PDF notes section.")
        filtered_positions = [p for p in note_positions if p >= 0]
        if filtered_positions != sorted(filtered_positions):
            out["failures"].append("Notes are not rendered in newest-first API order in the PDF.")

    # BBox extraction to inspect the last journal page bottom area. We expect only
    # footer/legend words near the bottom; any comment words there indicate overlap.
    run(["pdftotext", "-bbox", str(PDF_PATH), str(BBOX_PATH)])
    out["artifacts"]["bbox_html"] = str(BBOX_PATH)
    xml = BBOX_PATH.read_text(encoding="utf-8", errors="replace")
    root = ET.fromstring(xml)
    ns = {"x": "http://www.w3.org/1999/xhtml"}
    bbox_pages = root.findall(".//x:page", ns)
    if note_page_indexes:
        last_journal_page_idx = note_page_indexes[0] - 1
    else:
        last_journal_page_idx = max(1, len(bbox_pages) - 1)
    out["checks"]["last_journal_page_1_based"] = last_journal_page_idx + 1
    allowed_footer_words = {
        "Fahrschule", "Safe", "Ride", "Teo", "Michler-TEST", "Seite",
        "·",
        "1", "2", "3", "4", "X", "=", "erklärt", "geübt", "selbständig",
        "sicher", "nochmals", "üben",
    }
    suspect_bottom_words = []
    expected_footer_words_seen = []
    if 0 <= last_journal_page_idx < len(bbox_pages):
        page_el = bbox_pages[last_journal_page_idx]
        page_height = float(page_el.attrib.get("height", "595"))
        # Anything in the bottom ~21 mm of the landscape A4 page is the footer/legend area.
        threshold_y = page_height - 60.0
        for word in page_el.findall(".//x:word", ns):
            text = norm_text("".join(word.itertext()))
            y_min = float(word.attrib.get("yMin", "0"))
            y_max = float(word.attrib.get("yMax", "0"))
            if y_min >= threshold_y:
                rec = {"text": text, "yMin": round(y_min, 2), "yMax": round(y_max, 2)}
                if text in allowed_footer_words or re.fullmatch(r"\d+", text):
                    expected_footer_words_seen.append(rec)
                else:
                    suspect_bottom_words.append(rec)
    out["checks"]["bottom_footer_expected_words_last_journal"] = expected_footer_words_seen
    out["checks"]["bottom_suspect_words_last_journal"] = suspect_bottom_words
    legend_labels = {"erklärt", "geübt", "selbständig", "nochmals", "üben"}
    seen_labels = {w["text"] for w in expected_footer_words_seen}
    out["checks"]["legend_labels_seen_last_journal"] = sorted(seen_labels & legend_labels)
    if suspect_bottom_words:
        out["failures"].append(
            "Last journal page has non-footer text in footer/legend area: "
            + ", ".join(w["text"] for w in suspect_bottom_words[:12])
        )
    if len(seen_labels & legend_labels) < 4:
        out["failures"].append("Could not detect expected footer legend labels on the last journal page.")

    # Render last journal and first notes page for optional human inspection.
    if page_count:
        render_pages = {"last_journal": last_journal_page_idx + 1}
        if note_page_indexes:
            render_pages["first_notes"] = note_page_indexes[0] + 1
        for label, page_no in render_pages.items():
            prefix = ARTIFACT_DIR / f"{label}_page_{page_no}"
            run(["pdftoppm", "-png", "-r", "110", "-f", str(page_no), "-l", str(page_no), str(PDF_PATH), str(prefix)])
            out["artifacts"][f"render_{label}"] = str(prefix) + f"-{page_no}.png"

    out["ok"] = not out["failures"]
    RESULT_PATH.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(out, indent=2, ensure_ascii=False))
    return 0 if out["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())