"""MongoDB backup — admin-only download endpoint.

Streams a gzip-compressed JSON snapshot of every collection so the admin
can pull nightly backups to their local PC via a scheduled task.

Format:
  {
    "app": "saferide",
    "generated_at": "2026-02-09T22:00:00Z",
    "collections": {
        "students":            [ {...}, {...} ],
        "student_lessons":     [ {...} ],
        "student_assessments": [ {...} ],
        "student_invoices":    [ {...} ],
        ...
    }
  }

All ObjectId fields are dropped (projection `{_id: 0}`) so the JSON stays
serializable without custom encoders.

Full-backup + restore (added later) bundle the MongoDB snapshot together
with every object in the Hetzner S3 bucket into a single ``.zip`` so the
admin has ONE file that contains everything needed to rebuild the app.
"""
from __future__ import annotations

import asyncio
import gzip
import io
import json
import logging
import zipfile
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response

from core.db import db
from core.security import get_current_admin
from core.storage import get_object, list_objects, put_object

router = APIRouter(prefix="/backup", tags=["backup"])
log = logging.getLogger("backup")

# Collections included in the backup. Add new ones here as the app grows.
BACKUP_COLLECTIONS = [
    "content",
    "testimonials",
    "gallery",
    "contact_submissions",
    "vku_registrations",
    "bookings",
    "blog_posts",
    "pages",
    "locations",
    "students",
    "student_lessons",
    "student_assessments",
    "student_invoices",
    "invoice_counters",
    "student_documents",
    "student_activities",
    "fk_categories",
    "fk_subitems",
    "fk_routes",
    "business_settings",
    "accounts",
    "expenses",
    "packages",
    "certificates",
    "partners",
    "users",                # includes hashed passwords — protect the file
]


@router.get("/mongo")
async def download_full_backup(admin=Depends(get_current_admin)):
    """Return the full DB snapshot as a gzipped JSON attachment.

    Admin-only. The file is designed for offline archiving — restore
    manually via `mongoimport` or a small Python script if needed.
    """
    now = datetime.now(timezone.utc)
    payload: dict = {
        "app": "saferide",
        "generated_at": now.isoformat(),
        "collections": {},
    }

    for name in BACKUP_COLLECTIONS:
        col = db.get_collection(name)
        docs = await col.find({}, {"_id": 0}).to_list(length=None)
        payload["collections"][name] = docs

    raw = json.dumps(payload, ensure_ascii=False, default=str).encode("utf-8")
    compressed = gzip.compress(raw, compresslevel=6)

    filename = f"saferide-backup-{now.strftime('%Y-%m-%d')}.json.gz"
    return Response(
        content=compressed,
        media_type="application/gzip",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Backup-App": "saferide",
            "X-Backup-Generated-At": now.isoformat(),
            # Convenience: sizes so cron scripts can log without unzipping
            "X-Backup-Raw-Size": str(len(raw)),
            "X-Backup-Compressed-Size": str(len(compressed)),
        },
    )


@router.get("/status")
async def backup_status(admin=Depends(get_current_admin)):
    """Quick summary — total document count per collection + S3 file count.

    Used by the admin UI to show a small dashboard next to the download
    button ("Alle Sammlungen · X Datensätze insgesamt").
    """
    counts: dict[str, int] = {}
    total = 0
    for name in BACKUP_COLLECTIONS:
        col = db.get_collection(name)
        n = await col.count_documents({})
        counts[name] = n
        total += n
    # Best-effort S3 stats (may be empty if storage is unreachable)
    files: list[dict] = []
    try:
        files = list_objects()
    except Exception as e:                       # noqa: BLE001
        log.warning("backup.status: could not list S3 objects: %s", e)
    file_bytes = sum(f.get("size") or 0 for f in files)
    return {
        "total_documents": total,
        "collections": counts,
        "collection_count": len(BACKUP_COLLECTIONS),
        "files_count": len(files),
        "files_bytes": file_bytes,
    }


# ---------------------------------------------------------------------------
#  Vollständiges Backup — MongoDB + jede Datei aus dem Hetzner-Bucket
# ---------------------------------------------------------------------------
FILES_PREFIX_IN_ZIP = "files/"      # inside the ZIP, every S3 key lives here
MAX_FULL_BACKUP_BYTES = 4 * 1024 * 1024 * 1024   # 4 GB safety cap


def _serialise_mongo() -> bytes:
    """Return the raw JSON representation of every backupable collection."""
    payload: dict = {
        "app": "saferide",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "collections": {},
    }
    # Sync-friendly: caller awaits this via ``asyncio.to_thread`` if needed
    # For the ZIP path we build it directly in the async handler below.
    return json.dumps(payload, ensure_ascii=False, default=str).encode("utf-8")


@router.get("/full.zip")
async def download_full_backup_zip(admin=Depends(get_current_admin)):
    """Return a ZIP that contains BOTH the MongoDB snapshot AND every file
    stored in the Hetzner S3 bucket.

    Structure inside the archive::

        manifest.json         -- summary meta
        mongo.json            -- full DB (same format as /backup/mongo but raw)
        files/<original-key>  -- every S3 object, path preserved

    Sized-capped at 4 GB (raises 413 if the bucket is bigger). Nadine can
    always download `/backup/mongo` alone as a lightweight fallback.
    """
    started = datetime.now(timezone.utc)

    # --- 1) Mongo ---------------------------------------------------------
    payload: dict = {
        "app": "saferide",
        "generated_at": started.isoformat(),
        "collections": {},
    }
    for name in BACKUP_COLLECTIONS:
        docs = await db.get_collection(name).find({}, {"_id": 0}).to_list(length=None)
        payload["collections"][name] = docs
    mongo_bytes = json.dumps(payload, ensure_ascii=False, default=str).encode("utf-8")

    # --- 2) S3 files ------------------------------------------------------
    files_meta = list_objects()
    total_size = sum(f.get("size") or 0 for f in files_meta)
    if total_size > MAX_FULL_BACKUP_BYTES:
        raise HTTPException(
            status_code=413,
            detail=(
                f"Bucket ist zu gross für ein Voll-Backup "
                f"({total_size // (1024*1024)} MB > {MAX_FULL_BACKUP_BYTES // (1024*1024)} MB). "
                f"Lade das MongoDB-Backup separat und sichere die Dateien direkt via Hetzner."
            ),
        )

    # --- 3) build ZIP in-memory (stored, i.e. no re-compression — JPEG/PDF
    #        are already compressed, storing them saves both CPU and time)
    buf = io.BytesIO()
    manifest: dict = {
        "app": "saferide",
        "generated_at": started.isoformat(),
        "mongo_size": len(mongo_bytes),
        "collection_count": len(BACKUP_COLLECTIONS),
        "files_count": 0,
        "files_bytes": 0,
        "files_missing": [],
    }
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        # Mongo dump — compress this because JSON compresses very well
        z.writestr("mongo.json", mongo_bytes)
        # Files — no re-compression, they're binary blobs
        for f in files_meta:
            key = f["key"]
            try:
                data, _ctype = get_object(key)
            except HTTPException as e:
                # File was in the listing but is gone / permission denied
                log.warning("full-backup: could not fetch %s: %s", key, e.detail)
                manifest["files_missing"].append(key)
                continue
            except Exception as e:                   # noqa: BLE001
                log.warning("full-backup: unexpected read err %s: %s", key, e)
                manifest["files_missing"].append(key)
                continue
            info = zipfile.ZipInfo(f"{FILES_PREFIX_IN_ZIP}{key}")
            info.date_time = started.timetuple()[:6]
            # STORED (no zlib) — files are already compressed, saves CPU/time
            info.compress_type = zipfile.ZIP_STORED
            z.writestr(info, data)
            manifest["files_count"] += 1
            manifest["files_bytes"] += len(data)
        z.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2))

    zip_bytes = buf.getvalue()
    filename = f"saferide-full-backup-{started.strftime('%Y-%m-%d')}.zip"
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Backup-App": "saferide",
            "X-Backup-Generated-At": started.isoformat(),
            "X-Backup-Files-Count": str(manifest["files_count"]),
            "X-Backup-Files-Bytes": str(manifest["files_bytes"]),
            "X-Backup-Files-Missing": str(len(manifest["files_missing"])),
            "X-Backup-Mongo-Bytes": str(len(mongo_bytes)),
            "X-Backup-Zip-Bytes": str(len(zip_bytes)),
        },
    )


# ---------------------------------------------------------------------------
#  Restore — read a full-backup ZIP and put everything back in place
# ---------------------------------------------------------------------------
# Guard against accidental clicks. The caller MUST send this exact string as
# ``?confirm=`` — the UI shows a scary confirmation dialog and only then
# submits the request with the correct value.
RESTORE_CONFIRM_TOKEN = "RESTORE-YES"
MAX_RESTORE_UPLOAD_BYTES = MAX_FULL_BACKUP_BYTES


@router.post("/restore")
async def restore_full_backup(
    confirm: str = Query(..., description=f"Must equal `{RESTORE_CONFIRM_TOKEN}` to proceed"),
    file: UploadFile = File(..., description="A .zip produced by /backup/full.zip"),
    admin=Depends(get_current_admin),
):
    """Restore a previously-downloaded ZIP: overwrites every backup-tracked
    collection AND writes every ``files/…`` entry back to S3.

    **Destructive.** Before touching a single collection we snapshot the
    current DB into ``pre_restore_snapshots`` (a special collection) so a
    misclick can be undone by re-uploading the snapshot.
    """
    if confirm != RESTORE_CONFIRM_TOKEN:
        raise HTTPException(
            status_code=400,
            detail=f"Bestätigung fehlt oder falsch (erwarte `{RESTORE_CONFIRM_TOKEN}`).",
        )

    raw = await file.read()
    if len(raw) > MAX_RESTORE_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Backup-Datei ist zu gross.")
    try:
        zf = zipfile.ZipFile(io.BytesIO(raw))
    except zipfile.BadZipFile as e:
        raise HTTPException(status_code=400, detail=f"Ungültiges ZIP: {e}")

    if "mongo.json" not in zf.namelist():
        raise HTTPException(
            status_code=400,
            detail="`mongo.json` fehlt im ZIP – ist das eine Safe-Ride-Sicherung?",
        )
    try:
        mongo_payload = json.loads(zf.read("mongo.json").decode("utf-8"))
    except Exception as e:                          # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"`mongo.json` unlesbar: {e}")
    collections_in_backup = (mongo_payload or {}).get("collections") or {}
    if not isinstance(collections_in_backup, dict):
        raise HTTPException(status_code=400, detail="`mongo.json` hat kein gültiges `collections` Feld.")

    started = datetime.now(timezone.utc)

    # --- Safety net: snapshot current DB into a dated pre-restore collection
    snapshot_tag = started.strftime("%Y%m%dT%H%M%SZ")
    snapshot_doc: dict = {
        "id": f"pre-restore-{snapshot_tag}",
        "created_at": started.isoformat(),
        "restored_from_filename": file.filename or "",
        "collections": {},
    }
    for name in BACKUP_COLLECTIONS:
        docs = await db.get_collection(name).find({}, {"_id": 0}).to_list(length=None)
        snapshot_doc["collections"][name] = docs
    await db.get_collection("pre_restore_snapshots").insert_one(dict(snapshot_doc))

    # --- Replace collections ---------------------------------------------
    restored: dict[str, int] = {}
    skipped: list[str] = []
    for name, docs in collections_in_backup.items():
        if name not in BACKUP_COLLECTIONS:
            # Refuse to touch unlisted collections — safer than blind wipes
            skipped.append(name)
            continue
        col = db.get_collection(name)
        await col.delete_many({})
        if isinstance(docs, list) and docs:
            # ``insert_many`` mutates docs to add _id; make copies so mongo
            # doesn't reject on duplicate _id from a re-imported snapshot
            clean = [dict(d) for d in docs if isinstance(d, dict)]
            for d in clean:
                d.pop("_id", None)
            if clean:
                await col.insert_many(clean, ordered=False)
        restored[name] = len(docs) if isinstance(docs, list) else 0

    # --- Push files back into Hetzner ------------------------------------
    #
    # Sequential put_object for 200+ files would blow past the 60 s CDN
    # timeout easily. We fan out to a bounded thread-pool via
    # asyncio.to_thread + a semaphore so the S3 bucket doesn't get hit with
    # 200 parallel requests either.
    file_ok = 0
    file_err: list[str] = []
    sem = asyncio.Semaphore(16)

    async def _upload(zi: zipfile.ZipInfo) -> tuple[bool, str]:
        key = zi.filename[len(FILES_PREFIX_IN_ZIP):]
        if not key:
            return True, ""
        try:
            data = zf.read(zi)
            ctype = _guess_ctype(key)
            async with sem:
                await asyncio.to_thread(put_object, key, data, ctype)
            return True, ""
        except HTTPException as e:
            return False, f"{key}: {e.detail}"
        except Exception as e:                       # noqa: BLE001
            return False, f"{key}: {e}"

    file_infos = [
        zi for zi in zf.infolist()
        if zi.filename.startswith(FILES_PREFIX_IN_ZIP) and not zi.is_dir()
    ]
    results = await asyncio.gather(*(_upload(zi) for zi in file_infos))
    for ok, err in results:
        if ok:
            file_ok += 1
        elif err:
            file_err.append(err)

    return {
        "ok": True,
        "restored_at": started.isoformat(),
        "collections_restored": restored,
        "collections_skipped": skipped,
        "files_restored": file_ok,
        "files_errors": file_err[:20],       # cap so response stays small
        "pre_restore_snapshot_id": snapshot_doc["id"],
    }


_CTYPE_BY_EXT = {
    ".pdf":  "application/pdf",
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif":  "image/gif",
    ".mp4":  "video/mp4",
    ".mov":  "video/quicktime",
    ".webm": "video/webm",
    ".ics":  "text/calendar",
    ".json": "application/json",
    ".gz":   "application/gzip",
}


def _guess_ctype(path: str) -> str:
    import os as _os
    ext = _os.path.splitext(path)[1].lower()
    return _CTYPE_BY_EXT.get(ext, "application/octet-stream")
