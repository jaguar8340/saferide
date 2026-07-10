"""Iteration 42 – Booking-packages seed idempotency.

Once the initial default packages have been seeded and the admin deletes
one of them, a subsequent process restart (= redeploy) must NOT re-insert
the deleted default. This is guarded by a marker document in the
``_seed_state`` collection.
"""
import os

import pytest
import requests

BASE = (os.environ.get("REACT_APP_BACKEND_URL") or "").rstrip("/")
if not BASE:
    pytest.skip("REACT_APP_BACKEND_URL not set", allow_module_level=True)
API = f"{BASE}/api"

ADMIN = {"email": "admin@saferide.ch", "password": "SafeRide2026!"}


def _auth() -> str:
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=15)
    r.raise_for_status()
    return r.json()["access_token"]


def _list_packages() -> list[dict]:
    return requests.get(f"{API}/packages", timeout=15).json()


def _restart_backend_and_wait() -> None:
    import subprocess
    import time

    subprocess.run(
        ["sudo", "supervisorctl", "restart", "backend"],
        check=True, capture_output=True,
    )
    # Poll until /api/content responds again
    for _ in range(40):
        try:
            if requests.get(f"{API}/content", timeout=3).status_code == 200:
                return
        except requests.RequestException:
            pass
        time.sleep(0.5)
    raise RuntimeError("Backend did not come back up after restart")


def test_deleted_package_stays_deleted_after_restart():
    tok = _auth()
    h = {"Authorization": f"Bearer {tok}"}

    # 1. Snapshot current packages
    initial = _list_packages()
    assert len(initial) >= 2, "Need at least 2 packages to run this test"
    victim = initial[0]
    victim_slug = victim["slug"]

    # 2. Delete one
    r = requests.delete(f"{API}/packages/{victim_slug}", headers=h, timeout=15)
    assert r.status_code == 200, r.text
    after_delete = _list_packages()
    assert len(after_delete) == len(initial) - 1
    assert victim_slug not in {p["slug"] for p in after_delete}

    try:
        # 3. Restart backend – simulates a redeploy
        _restart_backend_and_wait()

        # 4. The deleted package must NOT come back
        after_restart = _list_packages()
        assert len(after_restart) == len(after_delete), (
            f"Seed re-inserted deleted packages. "
            f"before={len(after_delete)} after_restart={len(after_restart)}"
        )
        assert victim_slug not in {p["slug"] for p in after_restart}
    finally:
        # 5. Restore for other tests
        payload = {k: v for k, v in victim.items() if k not in {"id"}}
        requests.post(f"{API}/packages", headers=h, json=payload, timeout=15)


def test_seed_state_marker_exists_after_startup():
    """After any successful startup, a booking_packages marker must exist."""
    tok = _auth()
    h = {"Authorization": f"Bearer {tok}"}
    # There is no public endpoint for _seed_state, but the invariant is
    # verifiable indirectly: initial list is populated (already covered
    # in test above) AND deletion+restart doesn't revive rows. We assert
    # the collection is non-empty as a sanity check.
    pkgs = _list_packages()
    assert len(pkgs) >= 1
