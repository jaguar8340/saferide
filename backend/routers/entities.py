"""Certificates / Diplomas and Partner companies CRUD."""
import uuid

from fastapi import APIRouter, Depends, HTTPException

from core.db import db
from core.security import get_current_admin
from models.schemas import (
    CertificateCreate,
    CertificatePatch,
    PartnerCreate,
    PartnerPatch,
)

router = APIRouter(tags=["entities"])


# ---------- Certificates ----------
@router.get("/certificates")
async def list_certificates():
    return await db.certificates.find({}, {"_id": 0}).sort("order", 1).to_list(200)


@router.post("/certificates")
async def create_certificate(payload: CertificateCreate, admin=Depends(get_current_admin)):
    body = payload.model_dump()
    body["id"] = str(uuid.uuid4())
    body.setdefault("order", await db.certificates.count_documents({}))
    await db.certificates.insert_one(body)
    return {k: v for k, v in body.items() if k != "_id"}


@router.patch("/certificates/{cert_id}")
async def update_certificate(cert_id: str, payload: CertificatePatch, admin=Depends(get_current_admin)):
    set_ops = payload.model_dump(exclude_unset=True)
    if not set_ops:
        raise HTTPException(status_code=400, detail="Leere Aktualisierung")
    res = await db.certificates.update_one({"id": cert_id}, {"$set": set_ops})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Zertifikat nicht gefunden")
    return await db.certificates.find_one({"id": cert_id}, {"_id": 0})


@router.delete("/certificates/{cert_id}")
async def delete_certificate(cert_id: str, admin=Depends(get_current_admin)):
    res = await db.certificates.delete_one({"id": cert_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Zertifikat nicht gefunden")
    return {"ok": True}


# ---------- Partners ----------
@router.get("/partners")
async def list_partners():
    return await db.partners.find({}, {"_id": 0}).sort("order", 1).to_list(200)


@router.post("/partners")
async def create_partner(payload: PartnerCreate, admin=Depends(get_current_admin)):
    body = payload.model_dump()
    body["slug"] = body["slug"].lower().strip()
    if await db.partners.find_one({"slug": body["slug"]}):
        raise HTTPException(status_code=409, detail="Slug existiert bereits")
    body["id"] = str(uuid.uuid4())
    body.setdefault("order", await db.partners.count_documents({}))
    await db.partners.insert_one(body)
    return {k: v for k, v in body.items() if k != "_id"}


@router.patch("/partners/{slug}")
async def update_partner(slug: str, payload: PartnerPatch, admin=Depends(get_current_admin)):
    set_ops = payload.model_dump(exclude_unset=True)
    if not set_ops:
        raise HTTPException(status_code=400, detail="Leere Aktualisierung")
    res = await db.partners.update_one({"slug": slug}, {"$set": set_ops})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Partner nicht gefunden")
    return await db.partners.find_one({"slug": slug}, {"_id": 0})


@router.delete("/partners/{slug}")
async def delete_partner(slug: str, admin=Depends(get_current_admin)):
    res = await db.partners.delete_one({"slug": slug})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Partner nicht gefunden")
    return {"ok": True}
