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
"""
from __future__ import annotations

import gzip
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from core.db import db
from core.security import get_current_admin

router = APIRouter(prefix="/backup", tags=["backup"])

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
    """Quick summary — total document count per collection.

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
    return {
        "total_documents": total,
        "collections": counts,
        "collection_count": len(BACKUP_COLLECTIONS),
    }
