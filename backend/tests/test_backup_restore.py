"""Regression tests for the full backup + restore round-trip."""
import io
import os
import time
import zipfile

import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://driving-school-cms.preview.emergentagent.com",
).rstrip("/")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@saferide.ch")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "SafeRide2026!")


@pytest.fixture(scope="module")
def admin_headers():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200
    tok = r.json().get("access_token") or r.json().get("token")
    return {"Authorization": f"Bearer {tok}"}


class TestBackupStatus:
    def test_status_includes_files(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/backup/status", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert "total_documents" in body
        assert "collection_count" in body
        assert "files_count" in body
        assert "files_bytes" in body


class TestFullBackup:
    def test_download_full_zip(self, admin_headers):
        r = requests.get(
            f"{BASE_URL}/api/backup/full.zip", headers=admin_headers, timeout=120
        )
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/zip")
        # Sanity — parse the zip
        zf = zipfile.ZipFile(io.BytesIO(r.content))
        names = zf.namelist()
        assert "mongo.json" in names
        assert "manifest.json" in names
        # X-headers exposed to admin UI
        assert r.headers.get("x-backup-app") == "saferide"
        assert int(r.headers.get("x-backup-files-count", "0")) >= 0
        # If there are S3 files, at least one entry should live under files/
        files_count = int(r.headers.get("x-backup-files-count", "0"))
        if files_count > 0:
            assert any(n.startswith("files/") for n in names)


class TestRestore:
    def test_restore_wrong_confirm_rejected(self, admin_headers):
        # Build a minimal valid zip to isolate the confirm-guard test
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr("mongo.json", '{"app":"saferide","collections":{}}')
        r = requests.post(
            f"{BASE_URL}/api/backup/restore?confirm=WRONG",
            headers=admin_headers,
            files={"file": ("bak.zip", buf.getvalue(), "application/zip")},
            timeout=30,
        )
        assert r.status_code == 400
        assert "Best" in r.json().get("detail", "") or "RESTORE-YES" in r.json().get("detail", "")

    def test_restore_missing_mongo_json_rejected(self, admin_headers):
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr("random.txt", "hello")
        r = requests.post(
            f"{BASE_URL}/api/backup/restore?confirm=RESTORE-YES",
            headers=admin_headers,
            files={"file": ("bak.zip", buf.getvalue(), "application/zip")},
            timeout=30,
        )
        assert r.status_code == 400

    def test_restore_bad_zip_rejected(self, admin_headers):
        r = requests.post(
            f"{BASE_URL}/api/backup/restore?confirm=RESTORE-YES",
            headers=admin_headers,
            files={"file": ("bak.zip", b"not a zip file at all", "application/zip")},
            timeout=30,
        )
        assert r.status_code == 400

    def test_backup_then_restore_roundtrip(self, admin_headers):
        """Download full backup, submit it back for restore — everything ok."""
        # 1) download
        r_dl = requests.get(
            f"{BASE_URL}/api/backup/full.zip", headers=admin_headers, timeout=180
        )
        assert r_dl.status_code == 200
        zip_bytes = r_dl.content

        # 2) restore (parallel uploads, should return well under 60s)
        start = time.monotonic()
        r_rs = requests.post(
            f"{BASE_URL}/api/backup/restore?confirm=RESTORE-YES",
            headers=admin_headers,
            files={"file": ("bak.zip", zip_bytes, "application/zip")},
            timeout=180,
        )
        elapsed = time.monotonic() - start
        assert r_rs.status_code == 200, r_rs.text[:200]
        body = r_rs.json()
        assert body["ok"] is True
        assert body["pre_restore_snapshot_id"].startswith("pre-restore-")
        # Should have restored every backup-tracked collection
        assert len(body["collections_restored"]) > 0
        # No file-upload errors expected on a same-bucket round-trip
        assert body["files_errors"] == []
        # Bounded runtime — proves the parallel upload works
        assert elapsed < 90, f"restore took {elapsed:.1f}s"

        # 3) students endpoint still returns normal data
        r_stu = requests.get(f"{BASE_URL}/api/students", headers=admin_headers, timeout=15)
        assert r_stu.status_code == 200
        assert isinstance(r_stu.json(), list)
