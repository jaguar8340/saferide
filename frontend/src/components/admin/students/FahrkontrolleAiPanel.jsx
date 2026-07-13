/**
 * Fahrkontrolle AI panel — Claude Sonnet 4.5 exam-readiness + lesson
 * suggestions, with optional voice-memo → Whisper transcription that
 * gets included in the prompt.
 *
 * Rendered as a card at the bottom of FahrkontrolleTab.jsx.
 */
import { useEffect, useRef, useState } from "react";
import {
  Sparkles, Loader2, Mic, MicOff, Wand2, ChevronRight, Timer,
  AlertTriangle, RefreshCw, StopCircle,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";

export default function FahrkontrolleAiPanel({ studentId, studentName }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeDate, setActiveDate] = useState(null);   // null = latest

  // Voice recording state
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);

  const loadHistory = async () => {
    try {
      const r = await api.get(`/students/${studentId}/fahrkontrolle/ai/history`);
      setHistory(r.data);
      if (r.data.length && !activeDate) {
        setActiveDate(r.data[0].date);
        setResult(r.data[0]);
      }
    } catch { /* ignore */ }
  };

  // On mount, load full history (falls back to /ai for legacy carry-over).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const h = await api.get(`/students/${studentId}/fahrkontrolle/ai/history`);
        if (cancelled) return;
        setHistory(h.data);
        if (h.data.length) {
          setActiveDate(h.data[0].date);
          setResult(h.data[0]);
          return;
        }
        // Fallback: legacy single "last_ai_analysis"
        const r = await api.get(`/students/${studentId}/fahrkontrolle/ai`);
        if (!cancelled) setResult(r.data);
      } catch {
        /* no previous analysis */
      }
    })();
    return () => { cancelled = true; };
  }, [studentId]);

  const runAnalysis = async () => {
    setBusy(true);
    try {
      const r = await api.post(`/students/${studentId}/fahrkontrolle/ai`, {
        extra_note: note.trim(),
      }, { timeout: 120_000 });
      setResult(r.data);
      setActiveDate(new Date().toISOString().slice(0, 10));
      await loadHistory();
      toast.success("KI-Analyse aktualisiert");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  // ------------------------------------------------------------------
  //  Voice-memo recorder
  // ------------------------------------------------------------------
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        await uploadForTranscription(blob);
      };
      rec.start();
      mediaRef.current = rec;
      setRecording(true);
    } catch (e) {
      toast.error("Mikrofon nicht verfügbar: " + (e?.message || e));
    }
  };

  const stopRecording = () => {
    if (mediaRef.current && mediaRef.current.state === "recording") {
      mediaRef.current.stop();
      setRecording(false);
    }
  };

  const uploadForTranscription = async (blob) => {
    setTranscribing(true);
    try {
      const fd = new FormData();
      fd.append("file", blob, "memo.webm");
      const r = await api.post(
        `/students/${studentId}/fahrkontrolle/voice-memo`, fd,
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 90_000,
        },
      );
      const text = (r.data?.transcript || "").trim();
      if (!text) {
        toast.warning("Keine Sprache erkannt");
      } else {
        setNote((prev) => (prev ? `${prev.trim()}\n${text}` : text));
        toast.success("Sprachmemo transkribiert");
      }
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setTranscribing(false);
    }
  };

  // ------------------------------------------------------------------
  //  Render
  // ------------------------------------------------------------------
  const readinessColor =
    !result ? "#94a3b8"
    : result.exam_readiness_percent >= 85 ? "#166534"
    : result.exam_readiness_percent >= 60 ? "#84cc16"
    : result.exam_readiness_percent >= 30 ? "#f59e0b"
    : "#dc2626";

  return (
    <section
      data-testid="fk-ai-panel"
      className="mt-6 bg-white border border-[#e7e5e4] rounded-2xl p-4 md:p-6"
    >
      <header className="flex items-center gap-2 mb-4">
        <Sparkles size={16} className="text-[#ff5a36]" />
        <h3 className="font-display text-lg">KI-Analyse</h3>
        <span className="ml-auto text-[10px] font-semibold tracking-widest uppercase text-[#78716c]">
          Claude Sonnet 4.5
        </span>
      </header>

      {/* Note + voice-memo input */}
      <div className="mb-4">
        <label className="text-xs font-semibold tracking-widest uppercase text-[#475569] mb-1.5 block">
          Zusätzliche Notiz (optional)
        </label>
        <div className="relative">
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Freitext für Claude: z.B. „Heute besonders unsicher beim Kreisverkehr, Wetter regnerisch"
            data-testid="fk-ai-note"
            className="w-full bg-[#fafaf9] border border-[#e7e5e4] rounded-xl px-3 py-2 pr-24 text-sm leading-relaxed focus:outline-none focus:border-[#ff5a36] resize-none"
          />
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            disabled={transcribing}
            data-testid="fk-ai-mic"
            title={recording ? "Aufnahme stoppen" : "Sprachmemo aufnehmen"}
            className={`absolute right-2 bottom-2 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold tracking-widest uppercase transition-colors ${
              recording
                ? "bg-[#dc2626] text-white animate-pulse"
                : "bg-[#fff7ed] text-[#c2410c] hover:bg-[#ffedd5]"
            }`}
          >
            {transcribing ? (
              <><Loader2 size={11} className="animate-spin" /> Transkribiert</>
            ) : recording ? (
              <><StopCircle size={11} /> Stop</>
            ) : (
              <><Mic size={11} /> Memo</>
            )}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={runAnalysis}
        disabled={busy}
        data-testid="fk-ai-run"
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#ff5a36] hover:bg-[#e64d2e] disabled:opacity-50 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
        {result ? "Neu analysieren" : "KI-Analyse anfragen"}
      </button>

      {/* Per-day history chips */}
      {history.length > 0 && (
        <div className="mt-4" data-testid="fk-ai-history">
          <div className="text-[10px] font-semibold tracking-widest uppercase text-[#78716c] mb-2">
            Analyse-Historie ({history.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {history.map((h) => {
              const isActive = h.date === activeDate;
              return (
                <button
                  key={h.date}
                  type="button"
                  onClick={() => { setActiveDate(h.date); setResult(h); }}
                  data-testid={`fk-ai-day-${h.date}`}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                    isActive
                      ? "bg-[#ff5a36] text-white border-[#ff5a36]"
                      : "bg-white text-[#0f172a] border-[#e7e5e4] hover:border-[#ff5a36]"
                  }`}
                  title={h.readiness_label || ""}
                >
                  {formatDay(h.date)}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive ? "bg-white/25" : "bg-[#fafaf9]"
                  }`}>
                    {h.exam_readiness_percent}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Result panel */}
      {result && (
        <div className="mt-6 space-y-5" data-testid="fk-ai-result">
          {/* Readiness gauge */}
          <div className="bg-[#fafaf9] border border-[#e7e5e4] rounded-xl p-4">
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 rounded-full flex flex-col items-center justify-center shrink-0"
                style={{ background: readinessColor, color: "#fff" }}
              >
                <div className="font-display text-2xl leading-none">
                  {result.exam_readiness_percent}
                </div>
                <div className="text-[9px] tracking-widest uppercase mt-1 opacity-90">%</div>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold tracking-widest uppercase text-[#475569]">
                  Prüfungsbereitschaft {studentName ? `· ${studentName}` : ""}
                </div>
                <div className="font-display text-xl leading-tight text-[#0f172a] mt-0.5">
                  {result.readiness_label || "—"}
                </div>
                <p className="text-sm text-[#475569] mt-1.5 leading-relaxed">
                  {result.summary_de}
                </p>
              </div>
            </div>
          </div>

          {/* Weak areas */}
          {result.weak_areas?.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-[#475569] mb-2">
                <AlertTriangle size={12} className="text-[#dc2626]" />
                Schwächen
              </div>
              <ul className="space-y-2">
                {result.weak_areas.map((w, i) => (
                  <li
                    key={i}
                    data-testid={`fk-ai-weak-${i}`}
                    className="bg-white border border-[#fecaca] rounded-xl p-3"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold text-[#dc2626]">
                        Prio {w.priority || (i + 1)}
                      </span>
                      <div className="font-semibold text-sm text-[#0f172a]">
                        {w.title}
                      </div>
                    </div>
                    {w.why && (
                      <p className="text-xs text-[#475569] mt-1 leading-relaxed">
                        {w.why}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Next lessons */}
          {result.next_lessons?.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-[#475569] mb-2">
                <ChevronRight size={12} className="text-[#ff5a36]" />
                Vorschläge für die nächsten Lektionen
              </div>
              <ul className="space-y-2">
                {result.next_lessons.map((l, i) => (
                  <li
                    key={i}
                    data-testid={`fk-ai-lesson-${i}`}
                    className="bg-white border border-[#e7e5e4] rounded-xl p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-[#ff5a36]">
                        L{i + 1}
                      </span>
                      <div className="font-semibold text-sm text-[#0f172a] flex-1">
                        {l.focus}
                      </div>
                      {l.duration_min && (
                        <span className="inline-flex items-center gap-1 text-[10px] tracking-widest uppercase text-[#78716c]">
                          <Timer size={10} /> {l.duration_min} min
                        </span>
                      )}
                    </div>
                    {Array.isArray(l.goals) && l.goals.length > 0 && (
                      <ul className="ml-6 list-disc space-y-0.5">
                        {l.goals.map((g, gi) => (
                          <li key={gi} className="text-xs text-[#475569] leading-relaxed">
                            {g}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.generated_at && (
            <div className="flex items-center gap-1 text-[10px] text-[#a8a29e] pt-1">
              <RefreshCw size={9} />
              Zuletzt aktualisiert: {new Date(result.generated_at).toLocaleString("de-CH")}
            </div>
          )}
        </div>
      )}
    </section>
  );
}



function formatDay(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("de-CH", { day: "2-digit", month: "short" });
  } catch {
    return iso;
  }
}

