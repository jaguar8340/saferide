"""Admin document library — generic file storage (Verträge, Steuerunterlagen …).

Not tied to a specific student. Uploaded PDFs + JPGs are stored on Hetzner S3
(shared with the rest of the app) and indexed in the `admin_documents`
collection with a title + optional note.

Endpoints (all admin-only, prefixed `/api/documents`):

  GET    /api/documents            – list all documents (?q=… for search)
  POST   /api/documents            – multipart upload (file + title + note)
  PATCH  /api/documents/{doc_id}   – edit title / note
  DELETE /api/documents/{doc_id}   – remove metadata + storage blob
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field

from core.db import db
from core.security import get_current_admin
from core.storage import (
    ALLOWED_DOCUMENT_TYPES,
    ALLOWED_IMAGE_TYPES,
    APP_NAME,
    MAX_DOCUMENT_BYTES,
    MAX_UPLOAD_BYTES,
    delete_object,
    put_object,
)

router = APIRouter(prefix="/documents", tags=["admin-documents"])

#  Restrict admin document library to PDF + JPG per user requirement.
DOC_ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
}
DOC_MAX_BYTES = 20 * 1024 * 1024   # 20 MB — larger than student docs on purpose


class AdminDocument(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    note: str = ""
    category: str = ""                              # z. B. „Verträge", „Steuer", „Versicherung"
    original_filename: str = ""
    storage_path: str
    url: str
    content_type: str
    size: int
    kind: str      # "pdf" | "image"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    uploaded_by: str = ""


class AdminDocumentPatch(BaseModel):
    title: Optional[str] = None
    note: Optional[str] = None
    category: Optional[str] = None


DEFAULT_CATEGORIES = ["Verträge", "Steuer", "Versicherung", "Buchhaltung", "Allgemein"]


@router.get("", response_model=List[AdminDocument])
async def list_documents(
    q: Optional[str] = Query(default=None, description="Volltextsuche in Titel + Notiz"),
    category: Optional[str] = Query(default=None, description="Nur Dateien dieser Kategorie"),
    admin=Depends(get_current_admin),
):
    query: dict = {}
    if q:
        safe = q.strip()
        if safe:
            regex = {"$regex": _escape_regex(safe), "$options": "i"}
            query["$or"] = [
                {"title": regex},
                {"note": regex},
                {"original_filename": regex},
            ]
    if category is not None:
        # Empty string filters unclassified documents intentionally
        query["category"] = category
    docs = await db.admin_documents.find(query, {"_id": 0}).sort("created_at", -1).to_list(5000)
    return docs


@router.get("/categories")
async def list_categories(admin=Depends(get_current_admin)):
    """Return the list of category names + doc count. Merges DB categories
    with the default seed so newcomers see suggestions immediately."""
    pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
    ]
    rows = await db.admin_documents.aggregate(pipeline).to_list(1000)
    by_name: dict = {}
    for r in rows:
        name = (r["_id"] or "").strip()
        if not name:
            by_name.setdefault("", {"name": "", "count": 0})
            by_name[""]["count"] += r["count"]
        else:
            by_name[name] = {"name": name, "count": r["count"]}
    for seed in DEFAULT_CATEGORIES:
        by_name.setdefault(seed, {"name": seed, "count": 0})
    # Load user-added categories that have no docs yet
    stored = await db.admin_document_categories.find({}, {"_id": 0}).to_list(500)
    for s in stored:
        by_name.setdefault(s["name"], {"name": s["name"], "count": 0})
    ordered = [by_name.get(n) for n in DEFAULT_CATEGORIES if by_name.get(n)]
    extras = sorted(
        [v for n, v in by_name.items() if n and n not in DEFAULT_CATEGORIES],
        key=lambda x: x["name"].lower(),
    )
    unclassified = by_name.get("")
    return ordered + extras + ([unclassified] if unclassified else [])


class CategoryIn(BaseModel):
    name: str


@router.post("/categories")
async def create_category(payload: CategoryIn, admin=Depends(get_current_admin)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(400, "Name darf nicht leer sein")
    if len(name) > 60:
        raise HTTPException(400, "Kategorie zu lang (max. 60 Zeichen)")
    await db.admin_document_categories.update_one(
        {"name": name}, {"$setOnInsert": {"name": name}}, upsert=True,
    )
    return {"name": name}


@router.delete("/categories/{name}")
async def delete_category(name: str, admin=Depends(get_current_admin)):
    count = await db.admin_documents.count_documents({"category": name})
    if count > 0:
        raise HTTPException(400, f"Kategorie enthält noch {count} Datei(en) — bitte zuerst leeren oder verschieben")
    await db.admin_document_categories.delete_one({"name": name})
    return {"ok": True}


@router.post("", response_model=AdminDocument)
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(""),
    note: str = Form(""),
    category: str = Form(""),
    admin=Depends(get_current_admin),
):
    if not title.strip():
        # Fall back to filename without extension so the row is never empty.
        title = (file.filename or "Neues Dokument").rsplit(".", 1)[0][:200]

    content_type = file.content_type or "application/octet-stream"
    if content_type not in DOC_ALLOWED_TYPES:
        raise HTTPException(400, "Nur PDF und JPG erlaubt")

    data = await file.read()
    if len(data) > DOC_MAX_BYTES:
        raise HTTPException(413, f"Datei zu gross (max. {DOC_MAX_BYTES // (1024*1024)} MB)")

    ext = DOC_ALLOWED_TYPES[content_type]
    path = f"{APP_NAME}/admin-documents/{uuid.uuid4()}.{ext}"
    put_object(path, data, content_type)

    doc = AdminDocument(
        title=title.strip(),
        note=note.strip(),
        category=category.strip(),
        original_filename=file.filename or "",
        storage_path=path,
        url=f"/api/files/{path}",
        content_type=content_type,
        size=len(data),
        kind="pdf" if content_type == "application/pdf" else "image",
        uploaded_by=admin.get("email", ""),
    )
    await db.admin_documents.insert_one(doc.model_dump())
    return doc


@router.patch("/{doc_id}", response_model=AdminDocument)
async def patch_document(
    doc_id: str,
    payload: AdminDocumentPatch,
    admin=Depends(get_current_admin),
):
    doc = await db.admin_documents.find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Dokument nicht gefunden")
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        await db.admin_documents.update_one({"id": doc_id}, {"$set": updates})
        doc.update(updates)
    return doc


@router.delete("/{doc_id}")
async def delete_document(doc_id: str, admin=Depends(get_current_admin)):
    doc = await db.admin_documents.find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Dokument nicht gefunden")
    await db.admin_documents.delete_one({"id": doc_id})
    #  Best-effort blob cleanup — safe to ignore failures because DELETE only
    #  removes admin-uploaded objects and Hetzner ignores missing keys.
    try:
        delete_object(doc["storage_path"])
    except Exception:      # noqa: BLE001
        pass
    return {"ok": True}


def _escape_regex(s: str) -> str:
    """Escape user input for use inside a MongoDB $regex."""
    return "".join("\\" + c if c in ".^$*+?()[]{}|\\" else c for c in s)
