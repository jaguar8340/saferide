"""Blog posts CRUD (public + admin)."""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from core.db import db
from core.security import get_current_admin
from models.schemas import BlogPostCreate, BlogPostPatch

router = APIRouter(tags=["blog"])


def is_post_published(doc: dict) -> bool:
    """A post is publicly visible if:
      - status == 'published' (optionally with a future `scheduled_publish_at`
        which acts as a publish-delay), OR
      - status == 'scheduled' AND `scheduled_publish_at` is in the past
        (auto-promote at request time).
    """
    status = doc.get("status")
    sched = doc.get("scheduled_publish_at")
    now = datetime.now(timezone.utc)
    if status == "published":
        if not sched:
            return True
        try:
            sched_dt = datetime.fromisoformat(sched.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            return True
        return sched_dt <= now
    if status == "scheduled" and sched:
        try:
            sched_dt = datetime.fromisoformat(sched.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            return False
        return sched_dt <= now
    return False


@router.get("/blog")
async def list_blog_posts(category: Optional[str] = None, tag: Optional[str] = None):
    """Public list of all published blog posts. Optional filter by category / tag."""
    items = await db.blog_posts.find({}, {"_id": 0}).sort("published_at", -1).to_list(500)
    items = [p for p in items if is_post_published(p)]
    if category:
        items = [p for p in items if category in (p.get("categories") or [])]
    if tag:
        items = [p for p in items if tag in (p.get("tags") or [])]
    return items


@router.get("/blog/admin")
async def list_blog_posts_admin(admin=Depends(get_current_admin)):
    """Admin view – includes drafts and scheduled posts."""
    return await db.blog_posts.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@router.get("/blog/{slug}")
async def get_blog_post(slug: str):
    doc = await db.blog_posts.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Beitrag nicht gefunden")
    return doc


@router.post("/blog")
async def create_blog_post(payload: BlogPostCreate, admin=Depends(get_current_admin)):
    body = payload.model_dump()
    body["slug"] = body["slug"].lower().strip()
    if await db.blog_posts.find_one({"slug": body["slug"]}):
        raise HTTPException(status_code=409, detail="Slug existiert bereits")
    body["id"] = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    body.setdefault("status", "draft")
    body.setdefault("categories", [])
    body.setdefault("tags", [])
    body.setdefault("reading_time_min", 3)
    body.setdefault("order", await db.blog_posts.count_documents({}))
    body["created_at"] = now
    body["updated_at"] = now
    await db.blog_posts.insert_one(body)
    return {k: v for k, v in body.items() if k != "_id"}


@router.patch("/blog/{slug}")
async def update_blog_post(slug: str, payload: BlogPostPatch, admin=Depends(get_current_admin)):
    set_ops = payload.model_dump(exclude_unset=True)
    if not set_ops:
        raise HTTPException(status_code=400, detail="Leere Aktualisierung")
    set_ops["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.blog_posts.update_one({"slug": slug}, {"$set": set_ops})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Beitrag nicht gefunden")
    return await db.blog_posts.find_one({"slug": slug}, {"_id": 0})


@router.delete("/blog/{slug}")
async def delete_blog_post(slug: str, admin=Depends(get_current_admin)):
    res = await db.blog_posts.delete_one({"slug": slug})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Beitrag nicht gefunden")
    return {"ok": True}
