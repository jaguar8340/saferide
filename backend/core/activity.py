"""Tiny helper to append audit-log entries to the `student_activities`
collection.

Every write is fire-and-forget: if the DB is temporarily down we do NOT
want to fail the underlying business action (e.g. saving a rating), so
we swallow exceptions and log to stderr.

Kinds (append-only):
    student.update           → master data field changed
    student.create           → new student created
    lesson.create            → new Fahrkontrolle lesson
    lesson.update            → lesson updated (date, duration, routes)
    lesson.delete            → lesson deleted
    assessment.upsert        → rating / comment saved
    invoice.create           → new invoice added
    invoice.update           → invoice patched
    invoice.delete           → invoice deleted
    document.upload          → new file linked
    document.delete          → document removed
"""
from __future__ import annotations

import sys
import uuid
from datetime import datetime, timezone
from typing import Any

from core.db import db


async def log_activity(
    student_id: str,
    kind: str,
    message: str,
    actor: str | None = None,
    meta: dict[str, Any] | None = None,
) -> None:
    try:
        await db.student_activities.insert_one({
            "id": str(uuid.uuid4()),
            "student_id": student_id,
            "kind": kind,
            "message": message,
            "meta": meta or {},
            "actor": actor or "",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception as e:  # pragma: no cover – best-effort logging
        print(f"[log_activity] failed: {e}", file=sys.stderr)
