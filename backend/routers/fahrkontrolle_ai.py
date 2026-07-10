"""AI-assisted Fahrkontrolle analysis (Claude Sonnet 4.5).

Two endpoints:

  POST /api/students/{sid}/fahrkontrolle/ai
     Aggregates the student's rating matrix + last lesson notes and asks
     Claude Sonnet 4.5 for
        * exam-readiness estimate (0-100 %)
        * top 3 weak areas
        * up to 5 concrete next-lesson suggestions
     Persists the last result on the student doc so the admin UI can
     display it after a page reload.

  POST /api/students/{sid}/fahrkontrolle/voice-memo
     Accepts an audio blob (webm/mp3/m4a), sends it to OpenAI Whisper via
     the Emergent LLM key and returns the transcript. The caller can then
     put the transcript into the lesson-note field or POST it back to the
     `/ai` endpoint for a follow-up analysis.
"""
from __future__ import annotations

import io
import json
import os
import re
from datetime import datetime, timezone
from typing import Any

from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.llm.openai import OpenAISpeechToText
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from core.db import db
from core.security import get_current_admin


router = APIRouter(prefix="/students", tags=["fahrkontrolle-ai"])


def _emergent_key() -> str:
    k = os.environ.get("EMERGENT_LLM_KEY")
    if not k:
        raise HTTPException(503, "EMERGENT_LLM_KEY nicht konfiguriert")
    return k


# ---------------------------------------------------------------------------
#  Data collection helpers
# ---------------------------------------------------------------------------
async def _collect_analysis_context(sid: str) -> dict:
    """Aggregate all data Claude needs into one JSON-serialisable dict."""
    student = await db.students.find_one({"id": sid}, {"_id": 0, "password_hash": 0})
    if not student:
        raise HTTPException(404, "Schüler nicht gefunden")

    from routers.rating_scale import ensure_rating_scale
    rating_scale = await ensure_rating_scale()
    levels = rating_scale.get("levels") or []
    weights = {
        lv["value"]: round((i + 1) / max(len(levels), 1) * 100)
        for i, lv in enumerate(levels)
    }
    retry_val = (rating_scale.get("retry") or {}).get("value", "X")
    weights[retry_val] = 0

    categories = await db.fk_categories.find({}, {"_id": 0}).sort("order", 1).to_list(200)
    subs = await db.fk_subitems.find({}, {"_id": 0}).to_list(2000)
    subs_by_cat: dict[str, list[dict]] = {}
    for s in subs:
        subs_by_cat.setdefault(s["category_id"], []).append(s)

    assess = await db.student_assessments.find(
        {"student_id": sid}, {"_id": 0}
    ).to_list(50000)
    best_by_sub: dict[str, int] = {}
    latest_by_sub: dict[str, dict] = {}
    for a in assess:
        sub = a.get("subitem_id")
        if not sub:
            continue
        v = a.get("value")
        w = weights.get(v, 0)
        if w > best_by_sub.get(sub, -1):
            best_by_sub[sub] = w
        # latest by lesson_id order (assume assessments carry lesson_id)
        prev = latest_by_sub.get(sub)
        if not prev or (a.get("updated_at", "") > prev.get("updated_at", "")):
            latest_by_sub[sub] = a

    cat_rows = []
    weak_subs: list[dict] = []
    for cat in categories:
        cat_subs = subs_by_cat.get(cat["id"], [])
        if not cat_subs:
            continue
        pct_list = [best_by_sub.get(s["id"], 0) for s in cat_subs]
        cat_pct = round(sum(pct_list) / len(pct_list))
        cat_rows.append({
            "title": cat.get("title_de", ""),
            "percent": cat_pct,
            "subitems": [
                {"title": s.get("title_de", ""), "best_percent": best_by_sub.get(s["id"], 0)}
                for s in cat_subs
            ],
        })
        for s in cat_subs:
            best = best_by_sub.get(s["id"], 0)
            if best < 50:
                weak_subs.append({
                    "category": cat.get("title_de", ""),
                    "subitem": s.get("title_de", ""),
                    "best_percent": best,
                })

    # Recent lesson notes (last 5)
    lessons = await db.student_lessons.find(
        {"student_id": sid}, {"_id": 0}
    ).sort("date", -1).to_list(5)

    return {
        "student": {
            "first_name": student.get("first_name", ""),
            "last_name": student.get("last_name", ""),
            "birth_date": student.get("birth_date", ""),
            "license_category": student.get("license_category", "B"),
        },
        "rating_scale": {
            "labels": {lv["value"]: lv.get("desc_de") for lv in levels}
                     | {retry_val: (rating_scale.get("retry") or {}).get("desc_de", "")},
            "top_label": levels[-1]["desc_de"] if levels else "",
        },
        "categories": cat_rows,
        "weak_subitems": sorted(weak_subs, key=lambda x: x["best_percent"])[:15],
        "recent_lessons": [
            {
                "date": l.get("date", ""),
                "duration_min": l.get("duration_min"),
                "notes": (l.get("notes") or "").strip(),
                "instructor_memo": (l.get("instructor_memo") or "").strip(),
            }
            for l in lessons
        ],
    }


# ---------------------------------------------------------------------------
#  Prompt
# ---------------------------------------------------------------------------
_SYSTEM_PROMPT = """Du bist ein erfahrener Schweizer Fahrlehrer und analysierst
den Ausbildungsstand einer Fahrschülerin / eines Fahrschülers.

Antworte AUSSCHLIESSLICH mit gültigem JSON in genau diesem Schema (keine
Markdown-Fences, keine erklärenden Absätze davor oder danach):

{
  "exam_readiness_percent": 0-100,
  "readiness_label": "kurzer Freitext, z.B. 'gut auf Kurs' | 'braucht noch Feinschliff' | 'prüfungsbereit'",
  "summary_de": "2-3 Sätze zum aktuellen Stand",
  "weak_areas": [
     {"title": "…", "why": "…", "priority": 1..3}
  ],
  "next_lessons": [
     {"focus": "kurzer Fokus", "goals": ["Ziel 1", "Ziel 2"], "duration_min": 45|60|90}
  ]
}

Max 3 weak_areas, max 5 next_lessons. Antworte auf Deutsch (Schweizer Konvention).
Wenn Daten unvollständig sind, arbeite mit dem was vorhanden ist und weise
im summary_de darauf hin.
"""


class AnalysisRequest(BaseModel):
    extra_note: str = Field(default="", max_length=2000)


class AiAnalysis(BaseModel):
    exam_readiness_percent: int
    readiness_label: str = ""
    summary_de: str = ""
    weak_areas: list[dict] = []
    next_lessons: list[dict] = []
    generated_at: str
    model: str


def _extract_json(text: str) -> dict:
    """Best-effort JSON extraction from an LLM response."""
    if not text:
        raise HTTPException(502, "Leere Antwort vom KI-Modell")
    # Strip code fences if the model added them anyway.
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if not m:
        raise HTTPException(502, "KI-Antwort ist kein gültiges JSON")
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        raise HTTPException(502, "KI-Antwort ist kein gültiges JSON")


# ---------------------------------------------------------------------------
#  Endpoint: run analysis
# ---------------------------------------------------------------------------
@router.post("/{sid}/fahrkontrolle/ai", response_model=AiAnalysis)
async def analyse_readiness(
    sid: str, payload: AnalysisRequest, admin=Depends(get_current_admin)
):
    ctx = await _collect_analysis_context(sid)
    user_prompt = "Kontext (JSON):\n" + json.dumps(ctx, ensure_ascii=False, indent=2)
    if payload.extra_note.strip():
        user_prompt += "\n\nZusätzliche Notiz des Fahrlehrers:\n" + payload.extra_note.strip()

    chat = LlmChat(
        api_key=_emergent_key(),
        session_id=f"fk-ai-{sid}",
        system_message=_SYSTEM_PROMPT,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    reply = await chat.send_message(UserMessage(text=user_prompt))
    data = _extract_json(reply or "")

    result = AiAnalysis(
        exam_readiness_percent=int(max(0, min(100, data.get("exam_readiness_percent", 0)))),
        readiness_label=str(data.get("readiness_label", ""))[:120],
        summary_de=str(data.get("summary_de", ""))[:1000],
        weak_areas=list(data.get("weak_areas", []))[:3],
        next_lessons=list(data.get("next_lessons", []))[:5],
        generated_at=datetime.now(timezone.utc).isoformat(),
        model="claude-sonnet-4-5",
    )

    # Persist last analysis on student doc so a page-reload shows it.
    await db.students.update_one(
        {"id": sid},
        {"$set": {"last_ai_analysis": result.model_dump()}},
    )
    return result


@router.get("/{sid}/fahrkontrolle/ai")
async def get_last_analysis(sid: str, admin=Depends(get_current_admin)):
    """Return the last cached analysis (if any) without re-invoking the model."""
    doc = await db.students.find_one({"id": sid}, {"_id": 0, "last_ai_analysis": 1})
    if not doc or not doc.get("last_ai_analysis"):
        raise HTTPException(404, "Noch keine KI-Analyse vorhanden")
    return doc["last_ai_analysis"]


# ---------------------------------------------------------------------------
#  Endpoint: voice memo → German transcript (Whisper)
# ---------------------------------------------------------------------------
@router.post("/{sid}/fahrkontrolle/voice-memo")
async def voice_memo(sid: str, file: UploadFile = File(...), admin=Depends(get_current_admin)):
    if not await db.students.find_one({"id": sid}, {"_id": 0, "id": 1}):
        raise HTTPException(404, "Schüler nicht gefunden")

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(400, "Leere Audio-Datei")
    if len(audio_bytes) > 24 * 1024 * 1024:
        raise HTTPException(413, "Audio-Datei zu gross (max 24 MB)")

    # Whisper needs a real file-like with a name so the multipart part
    # gets the right suffix; wrap the bytes in BytesIO + set .name.
    buf: Any = io.BytesIO(audio_bytes)
    # Preserve the client-provided suffix (or fall back to .webm which
    # is what browser MediaRecorder produces).
    suffix = os.path.splitext(file.filename or "")[1].lower() or ".webm"
    buf.name = f"memo{suffix}"

    stt = OpenAISpeechToText(api_key=_emergent_key())
    try:
        resp = await stt.transcribe(
            file=buf,
            model="whisper-1",
            response_format="text",
            language="de",
            prompt="Fahrschulnotiz Schweizer Fahrlehrer, Fachbegriffe: Blickführung, Rollen, Schulterblick, Fahrstreifenwechsel.",
        )
    except Exception as e:      # noqa: BLE001
        raise HTTPException(502, f"Transkription fehlgeschlagen: {e}")

    text = (resp.text if hasattr(resp, "text") else str(resp)).strip()
    return {"transcript": text}
