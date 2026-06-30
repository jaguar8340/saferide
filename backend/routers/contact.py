"""Contact form submissions (public POST + admin CRUD)."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from core.db import db
from core.security import get_current_admin
from models.schemas import ContactSubmission, ContactSubmissionCreate

router = APIRouter(tags=["contact"])


@router.post("/contact", response_model=ContactSubmission)
async def submit_contact(payload: ContactSubmissionCreate):
    sub = ContactSubmission(**payload.model_dump())
    await db.contact_submissions.insert_one(sub.model_dump())
    return sub


@router.get("/contact/submissions", response_model=List[ContactSubmission])
async def list_submissions(admin=Depends(get_current_admin)):
    return await db.contact_submissions.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)


@router.delete("/contact/submissions/{sub_id}")
async def delete_submission(sub_id: str, admin=Depends(get_current_admin)):
    res = await db.contact_submissions.delete_one({"id": sub_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden")
    return {"ok": True}


@router.patch("/contact/submissions/{sub_id}/read")
async def mark_read(sub_id: str, admin=Depends(get_current_admin)):
    res = await db.contact_submissions.update_one({"id": sub_id}, {"$set": {"read": True}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden")
    return {"ok": True}
