"""GPS Tracks — MVP Web-only recording.

The driving instructor opens the admin dashboard, picks a student and hits
"Start". While the browser tab stays open the frontend polls
`navigator.geolocation.watchPosition()` and batches new points to
`POST /api/gps/tracks/{id}/points` every few seconds. On "Stop" the client
issues a final `PATCH /api/gps/tracks/{id}` with `end` = true.

Data model (`db.gps_tracks`):
    id, student_id (optional), student_name, instructor_email,
    started_at, ended_at, note,
    points: [{lat, lng, ts, accuracy?, speed?}],
    distance_km, duration_min

The portal exposes `GET /api/portal/gps/tracks` and
`GET /api/portal/gps/tracks/{id}` scoped to the current student.
"""
from __future__ import annotations

import math
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core.db import db
from core.security import get_current_admin, get_current_student


router = APIRouter(prefix="/gps", tags=["gps"])
portal_router = APIRouter(prefix="/portal/gps", tags=["gps-portal"])


class GpsPoint(BaseModel):
    lat: float
    lng: float
    ts: str
    accuracy: Optional[float] = None
    speed: Optional[float] = None


class TrackStart(BaseModel):
    student_id: Optional[str] = None
    note: Optional[str] = ""


class TrackStop(BaseModel):
    end: bool = True
    note: Optional[str] = None


class TrackSummary(BaseModel):
    id: str
    student_id: Optional[str] = None
    student_name: str = ""
    instructor_email: str = ""
    started_at: str
    ended_at: Optional[str] = None
    note: str = ""
    distance_km: float = 0.0
    duration_min: float = 0.0
    point_count: int = 0


class TrackDetail(TrackSummary):
    points: List[GpsPoint] = []


def _haversine_km(a: GpsPoint, b: GpsPoint) -> float:
    """Great-circle distance in km."""
    lat1, lat2 = math.radians(a.lat), math.radians(b.lat)
    dlat = math.radians(b.lat - a.lat)
    dlng = math.radians(b.lng - a.lng)
    x = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
    return 6371.0 * 2 * math.asin(min(1.0, math.sqrt(x)))


def _stats_for_points(points: list[dict]) -> tuple[float, float]:
    if len(points) < 2:
        return 0.0, 0.0
    dist = 0.0
    prev = GpsPoint(**points[0])
    for pt in points[1:]:
        cur = GpsPoint(**pt)
        dist += _haversine_km(prev, cur)
        prev = cur
    try:
        t0 = datetime.fromisoformat(points[0]["ts"].replace("Z", "+00:00"))
        t1 = datetime.fromisoformat(points[-1]["ts"].replace("Z", "+00:00"))
        dur_min = max(0.0, (t1 - t0).total_seconds() / 60.0)
    except Exception:      # noqa: BLE001
        dur_min = 0.0
    return round(dist, 3), round(dur_min, 2)


def _summary(doc: dict) -> dict:
    pts = doc.get("points", [])
    return {
        "id": doc["id"],
        "student_id": doc.get("student_id"),
        "student_name": doc.get("student_name", ""),
        "instructor_email": doc.get("instructor_email", ""),
        "started_at": doc.get("started_at", ""),
        "ended_at": doc.get("ended_at"),
        "note": doc.get("note", ""),
        "distance_km": doc.get("distance_km", 0.0),
        "duration_min": doc.get("duration_min", 0.0),
        "point_count": len(pts),
    }


# ---------------------------------------------------------------------------
#  ADMIN
# ---------------------------------------------------------------------------
@router.post("/tracks", response_model=TrackSummary)
async def start_track(payload: TrackStart, admin=Depends(get_current_admin)):
    student_name = ""
    if payload.student_id:
        s = await db.students.find_one({"id": payload.student_id}, {"first_name": 1, "last_name": 1})
        if s:
            student_name = f"{s.get('first_name', '')} {s.get('last_name', '')}".strip()
    doc = {
        "id": str(uuid.uuid4()),
        "student_id": payload.student_id or None,
        "student_name": student_name,
        "instructor_email": admin.get("email", ""),
        "started_at": datetime.now(timezone.utc).isoformat(),
        "ended_at": None,
        "note": (payload.note or "").strip(),
        "points": [],
        "distance_km": 0.0,
        "duration_min": 0.0,
    }
    await db.gps_tracks.insert_one(doc)
    return _summary(doc)


@router.post("/tracks/{track_id}/points", response_model=TrackSummary)
async def append_points(track_id: str, points: List[GpsPoint], admin=Depends(get_current_admin)):
    if not points:
        raise HTTPException(400, "Keine Punkte übermittelt")
    doc = await db.gps_tracks.find_one({"id": track_id})
    if not doc:
        raise HTTPException(404, "Track nicht gefunden")
    new_points = doc.get("points", []) + [p.model_dump() for p in points]
    dist, dur = _stats_for_points(new_points)
    await db.gps_tracks.update_one(
        {"id": track_id},
        {"$set": {"points": new_points, "distance_km": dist, "duration_min": dur}},
    )
    doc["points"] = new_points
    doc["distance_km"] = dist
    doc["duration_min"] = dur
    return _summary(doc)


@router.patch("/tracks/{track_id}", response_model=TrackSummary)
async def update_track(track_id: str, payload: TrackStop, admin=Depends(get_current_admin)):
    doc = await db.gps_tracks.find_one({"id": track_id})
    if not doc:
        raise HTTPException(404, "Track nicht gefunden")
    updates: dict = {}
    if payload.end:
        updates["ended_at"] = datetime.now(timezone.utc).isoformat()
    if payload.note is not None:
        updates["note"] = payload.note.strip()
    if updates:
        await db.gps_tracks.update_one({"id": track_id}, {"$set": updates})
        doc.update(updates)
    return _summary(doc)


@router.get("/tracks", response_model=List[TrackSummary])
async def list_tracks(
    student_id: Optional[str] = None,
    limit: int = 200,
    admin=Depends(get_current_admin),
):
    q: dict = {}
    if student_id:
        q["student_id"] = student_id
    cursor = db.gps_tracks.find(q, {"_id": 0}).sort("started_at", -1).limit(max(1, min(limit, 1000)))
    docs = await cursor.to_list(limit)
    return [_summary(d) for d in docs]


@router.get("/tracks/{track_id}", response_model=TrackDetail)
async def get_track(track_id: str, admin=Depends(get_current_admin)):
    doc = await db.gps_tracks.find_one({"id": track_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Track nicht gefunden")
    return {**_summary(doc), "points": doc.get("points", [])}


@router.delete("/tracks/{track_id}")
async def delete_track(track_id: str, admin=Depends(get_current_admin)):
    res = await db.gps_tracks.delete_one({"id": track_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Track nicht gefunden")
    return {"ok": True}


# ---------------------------------------------------------------------------
#  STUDENT PORTAL (read-only, scoped)
# ---------------------------------------------------------------------------
@portal_router.get("/tracks", response_model=List[TrackSummary])
async def portal_list(student=Depends(get_current_student)):
    cursor = db.gps_tracks.find(
        {"student_id": student["id"], "ended_at": {"$ne": None}},
        {"_id": 0},
    ).sort("started_at", -1).limit(200)
    docs = await cursor.to_list(200)
    return [_summary(d) for d in docs]


@portal_router.get("/tracks/{track_id}", response_model=TrackDetail)
async def portal_get(track_id: str, student=Depends(get_current_student)):
    doc = await db.gps_tracks.find_one(
        {"id": track_id, "student_id": student["id"]}, {"_id": 0},
    )
    if not doc:
        raise HTTPException(404, "Track nicht gefunden")
    return {**_summary(doc), "points": doc.get("points", [])}
