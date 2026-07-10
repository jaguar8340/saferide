"""Object storage helpers – Hetzner S3 (primary) + Emergent fallback (legacy).

All uploads (photos, logos, receipts, learner-permits, VKU docs, invoice
attachments, DB backups, PDF exports) go into a Hetzner S3 bucket that
lives in Falkenstein, Germany.

Public interface unchanged from the previous emergent implementation so no
router needs to be touched:

    put_object(path, data, content_type) -> {"path": path, ...}
    get_object(path)                     -> (bytes, content_type)

Legacy files that were uploaded to Emergent's object-storage BEFORE the
migration are still readable: ``get_object`` first tries Hetzner and — on
miss — transparently falls back to the old service. Writes always go to
Hetzner, so the legacy bucket becomes read-only and shrinks over time as
records are updated.
"""
from __future__ import annotations

import logging
import os
from typing import Optional, Tuple

import boto3
import requests
from botocore.client import Config
from botocore.exceptions import ClientError
from fastapi import HTTPException

log = logging.getLogger(__name__)

APP_NAME = os.environ.get("APP_NAME", "saferide")

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
}
ALLOWED_VIDEO_TYPES = {
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
}
ALLOWED_DOCUMENT_TYPES = {
    "application/pdf": "pdf",
}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024   # 10 MB images
MAX_VIDEO_BYTES = 60 * 1024 * 1024    # 60 MB videos
MAX_DOCUMENT_BYTES = 8 * 1024 * 1024  # 8 MB documents (learner-permit scans)


# ---------------------------------------------------------------------------
#  Hetzner S3 client (lazy singleton – reused across requests)
# ---------------------------------------------------------------------------
_s3_client = None


def _get_s3():
    global _s3_client
    if _s3_client is not None:
        return _s3_client
    endpoint = os.environ.get("S3_ENDPOINT_URL")
    access_key = os.environ.get("S3_ACCESS_KEY")
    secret_key = os.environ.get("S3_SECRET_KEY")
    region = os.environ.get("S3_REGION", "eu-central")
    if not (endpoint and access_key and secret_key):
        return None
    _s3_client = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=region,
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"},         # Hetzner uses path-style URLs
            retries={"max_attempts": 3, "mode": "standard"},
        ),
    )
    return _s3_client


def _bucket() -> str:
    return os.environ.get("S3_BUCKET") or APP_NAME


# ---------------------------------------------------------------------------
#  Legacy Emergent object storage (READ-only fallback)
# ---------------------------------------------------------------------------
_EMERGENT_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
_emergent_key: Optional[str] = None


def _init_emergent() -> Optional[str]:
    global _emergent_key
    if _emergent_key:
        return _emergent_key
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        return None
    try:
        resp = requests.post(
            f"{_EMERGENT_URL}/init", json={"emergent_key": key}, timeout=30
        )
        resp.raise_for_status()
        _emergent_key = resp.json()["storage_key"]
        return _emergent_key
    except Exception as e:                  # noqa: BLE001
        log.warning("Emergent legacy storage init failed: %s", e)
        return None


def _read_from_emergent(path: str) -> Optional[Tuple[bytes, str]]:
    global _emergent_key
    key = _init_emergent()
    if not key:
        return None
    try:
        resp = requests.get(
            f"{_EMERGENT_URL}/objects/{path}",
            headers={"X-Storage-Key": key},
            timeout=60,
        )
        if resp.status_code == 403:
            _emergent_key = None
            key = _init_emergent()
            if not key:
                return None
            resp = requests.get(
                f"{_EMERGENT_URL}/objects/{path}",
                headers={"X-Storage-Key": key},
                timeout=60,
            )
        if resp.status_code == 200:
            return (
                resp.content,
                resp.headers.get("Content-Type", "application/octet-stream"),
            )
    except Exception as e:                  # noqa: BLE001
        log.warning("Emergent legacy read failed for %s: %s", path, e)
    return None


# ---------------------------------------------------------------------------
#  Public API — put / get
# ---------------------------------------------------------------------------
def put_object(path: str, data: bytes, content_type: str) -> dict:
    """Upload the payload to Hetzner S3 and return `{"path": path}`.

    Raises 502 if the bucket is unreachable (client can retry).
    """
    s3 = _get_s3()
    if not s3:
        raise HTTPException(
            status_code=503,
            detail="Speicher-Konfiguration unvollständig. Bitte Admin kontaktieren.",
        )
    try:
        s3.put_object(
            Bucket=_bucket(),
            Key=path,
            Body=data,
            ContentType=content_type,
            CacheControl="public, max-age=31536000, immutable",
        )
    except ClientError as e:
        log.error("Hetzner put_object failed: %s", e)
        raise HTTPException(
            status_code=502,
            detail="Speicher aktuell nicht erreichbar, bitte erneut versuchen.",
        ) from e
    return {"path": path, "bucket": _bucket()}


def get_object(path: str) -> Tuple[bytes, str]:
    """Return (bytes, content_type). Tries Hetzner first, then legacy."""
    s3 = _get_s3()
    if s3:
        try:
            obj = s3.get_object(Bucket=_bucket(), Key=path)
            data = obj["Body"].read()
            ctype = obj.get("ContentType") or "application/octet-stream"
            return data, ctype
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code", "")
            if code not in ("NoSuchKey", "404", "NotFound"):
                log.error("Hetzner get_object error for %s: %s", path, e)
                raise HTTPException(
                    status_code=502,
                    detail="Speicher aktuell nicht erreichbar.",
                ) from e
            # NoSuchKey → fall through to legacy fallback

    # Legacy fallback so pre-migration URLs keep working
    legacy = _read_from_emergent(path)
    if legacy is not None:
        return legacy
    raise HTTPException(status_code=404, detail="Datei nicht gefunden")


def delete_object(path: str) -> None:
    """Best-effort delete of an object. Silently ignores missing keys."""
    s3 = _get_s3()
    if not s3:
        return
    try:
        s3.delete_object(Bucket=_bucket(), Key=path)
    except ClientError as e:
        log.warning("Hetzner delete_object failed for %s: %s", path, e)


# Back-compat shim (old name, still used in tests)
def init_storage() -> Optional[str]:
    return "hetzner" if _get_s3() else None
