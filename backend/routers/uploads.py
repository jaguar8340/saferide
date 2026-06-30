"""File uploads (admin) + public file serving."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile

from core.db import db
from core.security import get_current_admin
from core.storage import (
    ALLOWED_IMAGE_TYPES,
    ALLOWED_VIDEO_TYPES,
    APP_NAME,
    MAX_UPLOAD_BYTES,
    MAX_VIDEO_BYTES,
    get_object,
    put_object,
)

router = APIRouter(tags=["uploads"])


@router.post("/upload")
async def upload_file(file: UploadFile = File(...), admin=Depends(get_current_admin)):
    content_type = file.content_type or "application/octet-stream"
    is_image = content_type in ALLOWED_IMAGE_TYPES
    is_video = content_type in ALLOWED_VIDEO_TYPES
    if not (is_image or is_video):
        raise HTTPException(status_code=400, detail="Nur Bild- (jpg/png/webp/gif) oder Videodateien (mp4/mov/webm) erlaubt")
    data = await file.read()
    limit = MAX_VIDEO_BYTES if is_video else MAX_UPLOAD_BYTES
    if len(data) > limit:
        max_mb = limit // (1024 * 1024)
        raise HTTPException(status_code=413, detail=f"Datei zu gross (max. {max_mb} MB)")
    ext = (ALLOWED_VIDEO_TYPES if is_video else ALLOWED_IMAGE_TYPES)[content_type]
    path = f"{APP_NAME}/uploads/{uuid.uuid4()}.{ext}"
    result = put_object(path, data, content_type)
    stored_path = result.get("path", path)
    await db.files.insert_one({
        "id": str(uuid.uuid4()),
        "storage_path": stored_path,
        "original_filename": file.filename,
        "content_type": content_type,
        "kind": "video" if is_video else "image",
        "size": len(data),
        "uploaded_by": admin.get("email"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"path": stored_path, "url": f"/api/files/{stored_path}", "kind": "video" if is_video else "image"}


@router.get("/files/{path:path}")
async def serve_file(path: str):
    try:
        data, ctype = get_object(path)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=404, detail="Datei nicht gefunden") from e
    return Response(content=data, media_type=ctype, headers={"Cache-Control": "public, max-age=31536000"})
