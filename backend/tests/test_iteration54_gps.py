"""Iteration 54 — GPS Tracks MVP.

Backend endpoints:
- POST /api/gps/tracks (start)
- POST /api/gps/tracks/{id}/points (append)
- PATCH /api/gps/tracks/{id} (stop / edit note)
- GET /api/gps/tracks (list, ?student_id filter)
- GET /api/gps/tracks/{id} (detail with points)
- DELETE /api/gps/tracks/{id}
- GET /api/portal/gps/tracks (student-scoped)
- GET /api/portal/gps/tracks/{id}
"""
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
    r = requests.get(f"{BASE_URL}/api/students", headers=headers, timeout=15)
    return r.json()[0]["id"]


class TestGps:
    def test_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/gps/tracks", timeout=15)
        assert r.status_code in (401, 403)

    def test_full_track_flow(self, headers, student_id):
        # Start
        r = requests.post(
            f"{BASE_URL}/api/gps/tracks",
            json={"student_id": student_id, "note": "IT54-Test"},
            headers=headers, timeout=15,
        )
        assert r.status_code == 200
        track = r.json()
        assert track["student_id"] == student_id
        assert track["student_name"]  # non-empty
        assert track["ended_at"] is None
        tid = track["id"]

        # Append 4 points (roughly along Autobahn A3 Winterthur → Zurich)
        pts = [
            {"lat": 47.5, "lng": 8.72, "ts": "2026-02-14T10:00:00Z"},
            {"lat": 47.48, "lng": 8.68, "ts": "2026-02-14T10:02:00Z"},
            {"lat": 47.46, "lng": 8.60, "ts": "2026-02-14T10:05:00Z"},
            {"lat": 47.42, "lng": 8.55, "ts": "2026-02-14T10:09:00Z"},
        ]
        r = requests.post(
            f"{BASE_URL}/api/gps/tracks/{tid}/points",
            json=pts, headers=headers, timeout=15,
        )
        assert r.status_code == 200
        after = r.json()
        assert after["point_count"] == 4
        assert after["distance_km"] > 5.0 and after["distance_km"] < 20.0
        assert after["duration_min"] == 9.0

        # Empty batch → 400
        r_empty = requests.post(
            f"{BASE_URL}/api/gps/tracks/{tid}/points",
            json=[], headers=headers, timeout=15,
        )
        assert r_empty.status_code == 400

        # Stop
        r = requests.patch(
            f"{BASE_URL}/api/gps/tracks/{tid}",
            json={"end": True}, headers=headers, timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["ended_at"] is not None

        # List (admin)
        lst = requests.get(f"{BASE_URL}/api/gps/tracks", headers=headers, timeout=15).json()
        assert any(t["id"] == tid for t in lst)

        # List filtered by student
        filt = requests.get(
            f"{BASE_URL}/api/gps/tracks",
            params={"student_id": student_id},
            headers=headers, timeout=15,
        ).json()
        assert all(t["student_id"] == student_id for t in filt)
        assert any(t["id"] == tid for t in filt)

        # Detail
        d = requests.get(f"{BASE_URL}/api/gps/tracks/{tid}", headers=headers, timeout=15).json()
        assert len(d["points"]) == 4

        # DELETE
        drop = requests.delete(
            f"{BASE_URL}/api/gps/tracks/{tid}", headers=headers, timeout=15,
        )
        assert drop.status_code == 200

        # Now GET → 404
        after_del = requests.get(
            f"{BASE_URL}/api/gps/tracks/{tid}", headers=headers, timeout=15,
        )
        assert after_del.status_code == 404

    def test_portal_requires_portal_jwt(self):
        r = requests.get(f"{BASE_URL}/api/portal/gps/tracks", timeout=15)
        assert r.status_code in (401, 403)

    def test_no_students(self, headers):
        r = requests.post(
            f"{BASE_URL}/api/gps/tracks",
            json={},   # no student
            headers=headers, timeout=15,
        )
        assert r.status_code == 200
        t = r.json()
        assert t["student_id"] is None
        assert t["student_name"] == ""
        requests.delete(f"{BASE_URL}/api/gps/tracks/{t['id']}", headers=headers, timeout=15)
