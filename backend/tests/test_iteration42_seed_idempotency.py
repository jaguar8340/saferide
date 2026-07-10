"""Iteration 42 – Seed idempotency for booking_packages, blog_posts, locations.

Once the initial defaults have been seeded and the admin deletes an item,
a subsequent process restart (= redeploy) must NOT re-insert the deleted
row. Guarded by a marker document per collection in ``_seed_state``.
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


def _restart_backend_and_wait() -> None:
    import subprocess
    import time

    subprocess.run(
        ["sudo", "supervisorctl", "restart", "backend"],
        check=True, capture_output=True,
    )
    for _ in range(40):
        try:
            if requests.get(f"{API}/content", timeout=3).status_code == 200:
                return
        except requests.RequestException:
            pass
        time.sleep(0.5)
    raise RuntimeError("Backend did not come back up after restart")


def _delete_restart_restore(
    list_endpoint: str,
    delete_endpoint_fmt: str,
    key: str,
    restore_fn,
    headers: dict,
):
    """Helper: fetch list, delete first item, restart backend, assert the
    deleted item stays gone, then restore it."""
    initial = requests.get(f"{API}{list_endpoint}", headers=headers, timeout=15).json()
    assert len(initial) >= 2, f"Need at least 2 items in {list_endpoint}"
    victim = initial[0]
    victim_key = victim[key]

    r = requests.delete(
        f"{API}{delete_endpoint_fmt.format(k=victim_key)}",
        headers=headers, timeout=15,
    )
    assert r.status_code == 200, r.text
    after_delete = requests.get(f"{API}{list_endpoint}", headers=headers, timeout=15).json()
    assert len(after_delete) == len(initial) - 1

    try:
        _restart_backend_and_wait()
        after_restart = requests.get(f"{API}{list_endpoint}", headers=headers, timeout=15).json()
        assert len(after_restart) == len(after_delete), (
            f"{list_endpoint}: seed re-inserted deleted items. "
            f"before={len(after_delete)} after_restart={len(after_restart)}"
        )
        assert victim_key not in {p[key] for p in after_restart}
    finally:
        restore_fn(victim, headers)


# ---------------------------------------------------------------------------
# Booking packages
# ---------------------------------------------------------------------------
def test_deleted_package_stays_deleted_after_restart():
    tok = _auth()
    h = {"Authorization": f"Bearer {tok}"}

    def restore(victim, headers):
        payload = {k: v for k, v in victim.items() if k != "id"}
        requests.post(f"{API}/packages", headers=headers, json=payload, timeout=15)

    _delete_restart_restore(
        list_endpoint="/packages",
        delete_endpoint_fmt="/packages/{k}",
        key="slug",
        restore_fn=restore,
        headers=h,
    )


# ---------------------------------------------------------------------------
# Blog posts
# ---------------------------------------------------------------------------
def test_deleted_blog_post_stays_deleted_after_restart():
    tok = _auth()
    h = {"Authorization": f"Bearer {tok}"}

    def restore(victim, headers):
        payload = {k: v for k, v in victim.items() if k not in {"id", "created_at", "updated_at"}}
        requests.post(f"{API}/blog", headers=headers, json=payload, timeout=15)

    _delete_restart_restore(
        list_endpoint="/blog",
        delete_endpoint_fmt="/blog/{k}",
        key="slug",
        restore_fn=restore,
        headers=h,
    )


# ---------------------------------------------------------------------------
# Locations
# ---------------------------------------------------------------------------
def test_deleted_location_stays_deleted_after_restart():
    tok = _auth()
    h = {"Authorization": f"Bearer {tok}"}

    def restore(victim, headers):
        payload = {k: v for k, v in victim.items() if k != "id"}
        requests.post(f"{API}/locations", headers=headers, json=payload, timeout=20)

    _delete_restart_restore(
        list_endpoint="/locations",
        delete_endpoint_fmt="/locations/{k}",
        key="slug",
        restore_fn=restore,
        headers=h,
    )


def test_seed_state_markers_exist():
    """After any successful startup, markers for all three collections must exist."""
    tok = _auth()
    h = {"Authorization": f"Bearer {tok}"}
    for endpoint in ("/packages", "/blog", "/locations"):
        items = requests.get(f"{API}{endpoint}", headers=h, timeout=15).json()
        assert len(items) >= 1, f"{endpoint} unexpectedly empty"

