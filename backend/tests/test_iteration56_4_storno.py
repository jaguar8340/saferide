"""Iteration 56.4 — Storno statt Löschen: `storno_note` field + P&L exclusion."""
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
    return next(s for s in students if s.get("zip") and s.get("city"))["id"]


class TestStornoNoteField:
    def test_default_empty(self, headers, student_id):
        inv = requests.post(
            f"{BASE_URL}/api/students/{student_id}/invoices",
            json={"lesson_date": "2026-02-16", "duration_min": 45, "price_chf": 95.0},
            headers=headers, timeout=15,
        ).json()
        try:
            assert inv.get("storno_note", "") == ""
        finally:
            requests.delete(
                f"{BASE_URL}/api/students/{student_id}/invoices/{inv['id']}",
                headers=headers, timeout=15,
            )

    def test_cancel_via_patch_sets_note(self, headers, student_id):
        inv = requests.post(
            f"{BASE_URL}/api/students/{student_id}/invoices",
            json={"lesson_date": "2026-02-16", "duration_min": 45, "price_chf": 95.0, "status": "open"},
            headers=headers, timeout=15,
        ).json()
        try:
            p = requests.patch(
                f"{BASE_URL}/api/students/{student_id}/invoices/{inv['id']}",
                json={"status": "cancelled", "storno_note": "Falsche Zeitangabe – Neuausstellung folgt."},
                headers=headers, timeout=15,
            )
            assert p.status_code == 200
            assert p.json()["status"] == "cancelled"
            assert p.json()["storno_note"] == "Falsche Zeitangabe – Neuausstellung folgt."

            # Reactivate: storno_note leeren
            r = requests.patch(
                f"{BASE_URL}/api/students/{student_id}/invoices/{inv['id']}",
                json={"status": "open", "storno_note": ""},
                headers=headers, timeout=15,
            )
            assert r.status_code == 200
            assert r.json()["status"] == "open"
            assert r.json()["storno_note"] == ""
        finally:
            requests.delete(
                f"{BASE_URL}/api/students/{student_id}/invoices/{inv['id']}",
                headers=headers, timeout=15,
            )


class TestCancelledExcludedFromPL:
    def test_cancelled_invoice_not_in_pl_rows(self, headers, student_id):
        """Ein stornierter Beleg darf nicht mehr als Zeile in der Erfolgsrechnung
        (`ledger`-Endpoint) auftauchen. Der `revenue_cancelled`-Zähler bleibt
        aber erhalten, damit der Storno-Betrag für Audit-Zwecke ablesbar ist."""
        # Erstellen und stornieren
        inv = requests.post(
            f"{BASE_URL}/api/students/{student_id}/invoices",
            json={"lesson_date": "2026-02-16", "duration_min": 45, "price_chf": 123.45, "status": "open"},
            headers=headers, timeout=15,
        ).json()
        try:
            requests.patch(
                f"{BASE_URL}/api/students/{student_id}/invoices/{inv['id']}",
                json={"status": "cancelled", "storno_note": "Test"},
                headers=headers, timeout=15,
            )

            year = int(inv["date"][:4])
            month = int(inv["date"][5:7])
            ledger = requests.get(
                f"{BASE_URL}/api/accounting/monthly/{year}/{month}",
                headers=headers, timeout=15,
            ).json()

            # Zeile für 123.45 mit „Rechnung {number}" darf nicht existieren
            for row in ledger["rows"]:
                if row["kind"] == "income" and abs(row["amount"] - 123.45) < 0.001:
                    assert inv["number"] not in (row.get("label") or ""), (
                        f"Stornierte Rechnung sollte NICHT in P&L-Zeilen sein, gefunden: {row}"
                    )
            # revenue_cancelled muss ≥ 123.45 sein
            assert ledger["totals"]["revenue_cancelled"] >= 123.45
        finally:
            requests.delete(
                f"{BASE_URL}/api/students/{student_id}/invoices/{inv['id']}",
                headers=headers, timeout=15,
            )
