"""Voucher / Gutschein module.

Simple discount code system:
  * admin creates a voucher with a code, amount, valid-until date
  * public endpoint returns "is this code redeemable and what does it discount"
  * a student can redeem a voucher – it becomes tied to their id and can
    then be applied to invoices later
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core.db import db
from core.security import get_current_admin, get_current_student

router = APIRouter(prefix="/vouchers", tags=["vouchers"])
portal_router = APIRouter(prefix="/portal/vouchers", tags=["portal-vouchers"])


DiscountType = Literal["percent", "chf"]


class VoucherIn(BaseModel):
    code: str = Field(min_length=3, max_length=32)
    amount: float = Field(gt=0)
    discount_type: DiscountType = "chf"
    valid_until: Optional[str] = None        # ISO date
    note: str = ""


class VoucherPatch(BaseModel):
    amount: Optional[float] = None
    discount_type: Optional[DiscountType] = None
    valid_until: Optional[str] = None
    note: Optional[str] = None


class Voucher(BaseModel):
    id: str
    code: str
    amount: float
    discount_type: DiscountType
    valid_until: Optional[str] = None
    note: str = ""
    redeemed_by_student_id: Optional[str] = None
    redeemed_at: Optional[str] = None
    created_at: str
    created_by: str = ""


class RedeemRequest(BaseModel):
    code: str


def _normalise_code(code: str) -> str:
    return code.strip().upper().replace(" ", "")


def _voucher_still_valid(v: dict) -> bool:
    until = v.get("valid_until") or ""
    if not until:
        return True
    try:
        exp = datetime.fromisoformat(until)
    except ValueError:
        return True
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    return exp >= datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
#  Admin CRUD
# ---------------------------------------------------------------------------
@router.get("", response_model=list[Voucher])
async def list_vouchers(admin=Depends(get_current_admin)):
    docs = await db.vouchers.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs


@router.post("", response_model=Voucher)
async def create_voucher(payload: VoucherIn, admin=Depends(get_current_admin)):
    code = _normalise_code(payload.code)
    if await db.vouchers.find_one({"code": code}):
        raise HTTPException(409, f"Gutschein-Code '{code}' existiert bereits")
    doc = {
        "id": str(uuid.uuid4()),
        "code": code,
        "amount": float(payload.amount),
        "discount_type": payload.discount_type,
        "valid_until": payload.valid_until or "",
        "note": payload.note,
        "redeemed_by_student_id": None,
        "redeemed_at": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin.get("email", ""),
    }
    await db.vouchers.insert_one(dict(doc))
    return doc


@router.patch("/{voucher_id}", response_model=Voucher)
async def update_voucher(
    voucher_id: str, payload: VoucherPatch, admin=Depends(get_current_admin)
):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "Nichts zu aktualisieren")
    r = await db.vouchers.update_one({"id": voucher_id}, {"$set": updates})
    if r.matched_count == 0:
        raise HTTPException(404, "Gutschein nicht gefunden")
    return await db.vouchers.find_one({"id": voucher_id}, {"_id": 0})


@router.delete("/{voucher_id}")
async def delete_voucher(voucher_id: str, admin=Depends(get_current_admin)):
    r = await db.vouchers.delete_one({"id": voucher_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "Gutschein nicht gefunden")
    return {"ok": True}


# ---------------------------------------------------------------------------
#  Student portal – redeem
# ---------------------------------------------------------------------------
@portal_router.post("/redeem", response_model=Voucher)
async def redeem_voucher(
    payload: RedeemRequest, student=Depends(get_current_student)
):
    code = _normalise_code(payload.code)
    voucher = await db.vouchers.find_one({"code": code})
    if not voucher:
        raise HTTPException(404, "Gutschein nicht gefunden")
    if voucher.get("redeemed_by_student_id"):
        raise HTTPException(409, "Gutschein bereits eingelöst")
    if not _voucher_still_valid(voucher):
        raise HTTPException(410, "Gutschein abgelaufen")
    await db.vouchers.update_one(
        {"id": voucher["id"]},
        {"$set": {
            "redeemed_by_student_id": student["id"],
            "redeemed_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    return await db.vouchers.find_one({"id": voucher["id"]}, {"_id": 0})
