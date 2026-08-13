/**
 * NewLessonModal — mobile-friendly "Neue Lektion"-Flow.
 *
 *  Opens as a full-screen modal (on mobile) or centered dialog (on desktop).
 *  Instead of the matrix view, the user picks a category card, expands it,
 *  and rates the subitems inline via 1-5 buttons + optional comment.
 *
 *  IMPORTANT — data flow contract:
 *    – On save we FIRST create the lesson via POST /fahrkontrolle/students/{id}/lessons
 *      and THEN PUT one assessment per rated subitem. This mirrors the
 *      existing `saveRating` flow in FahrkontrolleTab.jsx so the matrix
 *      view (which stays visible below) picks the new column up unchanged.
 *    – The modal is 100% additive: it never touches other lessons,
 *      never mutates existing assessments, and never deletes anything.
 *    – "Letzte Bewertungen übernehmen" pre-fills the drafts from the
 *      most-recent assessment per subitem (across ALL prior lessons) —
 *      the user can then adjust before saving.
 */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  Loader2,
  MessageSquare,
  Plus,
  Save,
  X,
  Sparkles,
} from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import useRatingScale from "@/hooks/useRatingScale";
import { RATING_META } from "@/components/admin/students/RatingPopup";

export default function NewLessonModal({
  open,
  onClose,
  studentId,
  categories = [],
  subitems = [],
  assessments = {},
  lessons = [],
  onCreated,
}) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [drafts, setDrafts] = useState({}); // { [subitemId]: { value, comment } }
  const [expandedCatId, setExpandedCatId] = useState(null);
  const [commentEditFor, setCommentEditFor] = useState(null); // subitem_id
  const [saving, setSaving] = useState(false);
  const [carryOverDone, setCarryOverDone] = useState(false);

  // Rating scale is admin-configurable via CMS → Fahrschul-Daten →
  // Bewertungsskala. `dynOrder` = ["1", "2", …, "N", retry] following the
  // exact order and count the admin has set. `dynMeta[v]` provides colour
  // + label. This mirrors the RatingPopup logic 1:1 so both editors stay
  // visually consistent.
  const { meta: dynMeta = RATING_META, order: dynOrder = ["1", "2", "3", "4", "X"] } = useRatingScale();
  // Human-readable range for the header subtitle. Filters out the "retry"
  // level (typically "X") so the copy reads "1–4" instead of "1–4,X".
  const rangeLabel = useMemo(() => {
    const positives = dynOrder.filter((v) => v !== "X");
    if (positives.length === 0) return "1–4";
    return `1–${positives[positives.length - 1]}`;
  }, [dynOrder]);

  const catsSorted = useMemo(
    () => [...categories].sort((a, b) => a.order - b.order),
    [categories],
  );
  const subsByCat = useMemo(() => {
    const m = {};
    for (const s of subitems) {
      (m[s.category_id] ||= []).push(s);
    }
    for (const list of Object.values(m)) {
      list.sort((a, b) => a.order - b.order);
    }
    return m;
  }, [subitems]);

  // Compute "latest assessment per subitem" for the carry-over feature.
  // Assessments carry `lesson_id`, not `lesson_number`, so we derive the
  // number via the `lessons` lookup.
  const lessonNumberById = useMemo(() => {
    const m = {};
    for (const l of lessons) m[l.id] = l.lesson_number ?? 0;
    return m;
  }, [lessons]);

  const latestPerSubitem = useMemo(() => {
    const map = {}; // subitem_id → { value, comment, lessonNumber }
    for (const key of Object.keys(assessments)) {
      const a = assessments[key];
      if (!a || !a.value) continue;
      const num = lessonNumberById[a.lesson_id] ?? 0;
      const cur = map[a.subitem_id];
      if (!cur || num > cur.lessonNumber) {
        map[a.subitem_id] = {
          value: a.value || "",
          comment: a.comment || "",
          lessonNumber: num,
        };
      }
    }
    return map;
  }, [assessments, lessonNumberById]);

  const draftedCount = useMemo(
    () => Object.values(drafts).filter((d) => d && d.value).length,
    [drafts],
  );

  if (!open) return null;

  const setRating = (subitemId, value) => {
    setDrafts((cur) => {
      const existing = cur[subitemId] || {};
      // Toggle off when tapping the same value again.
      const nextValue = existing.value === value ? "" : value;
      return {
        ...cur,
        [subitemId]: {
          value: nextValue,
          comment: existing.comment || "",
        },
      };
    });
  };

  const setComment = (subitemId, comment) => {
    setDrafts((cur) => {
      const existing = cur[subitemId] || {};
      return {
        ...cur,
        [subitemId]: {
          value: existing.value || "",
          comment,
        },
      };
    });
  };

  const carryOverLast = () => {
    const next = { ...drafts };
    let added = 0;
    for (const [sid, info] of Object.entries(latestPerSubitem)) {
      if (info.value && !next[sid]?.value) {
        next[sid] = { value: info.value, comment: "" };
        added += 1;
      }
    }
    setDrafts(next);
    setCarryOverDone(true);
    if (added > 0) toast.success(`${added} Bewertung${added === 1 ? "" : "en"} übernommen`);
    else toast("Keine übertragbaren Bewertungen aus den Vorlektionen gefunden.");
  };

  const submit = async () => {
    if (draftedCount === 0) {
      toast.error("Bitte mindestens einen Punkt bewerten");
      return;
    }
    setSaving(true);
    try {
      // 1) Create the lesson.
      const lRes = await api.post(
        `/fahrkontrolle/students/${studentId}/lessons`,
        { date },
      );
      const lesson = lRes.data;

      // 2) Save every drafted rating in parallel.
      const entries = Object.entries(drafts).filter(([, d]) => d && d.value);
      const results = await Promise.all(
        entries.map(([subitem_id, d]) =>
          api.put(`/fahrkontrolle/students/${studentId}/assessments`, {
            subitem_id,
            lesson_id: lesson.id,
            value: d.value,
            comment: d.comment || "",
          }),
        ),
      );

      const newAssessments = results.map((r) => r.data);
      toast.success(`Lektion ${lesson.lesson_number} angelegt (${newAssessments.length} Bewertungen)`);
      onCreated?.(lesson, newAssessments);
      onClose?.();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      data-testid="new-lesson-modal"
      className="fixed inset-0 bg-black/50 z-50 flex items-stretch md:items-center justify-center p-0 md:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-none md:rounded-3xl w-full md:max-w-3xl shadow-2xl flex flex-col overflow-hidden max-h-screen md:max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (sticky) */}
        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-[#f1f5f9] shrink-0">
          <div>
            <h3 className="font-display text-xl md:text-2xl leading-none">Neue Lektion</h3>
            <p className="text-[11px] text-[#78716c] mt-1">
              Tippe auf ein Kapitel und bewerte die Punkte mit {rangeLabel}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="new-lesson-modal-close"
            aria-label="Schliessen"
            className="p-2 rounded-full hover:bg-[#fafaf9] text-[#78716c]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Sticky action bar (date + carry-over) */}
        <div className="px-4 md:px-6 py-3 border-b border-[#f1f5f9] flex flex-col md:flex-row md:items-center gap-3 shrink-0 bg-[#fafaf9]">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-semibold tracking-widest uppercase text-[#475569]">
              Datum
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              data-testid="new-lesson-date"
              style={{ fontSize: "16px" }}
              className="text-sm bg-white border border-[#e2e8f0] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#ff5a36]"
            />
          </div>
          <button
            type="button"
            onClick={carryOverLast}
            disabled={carryOverDone || Object.keys(latestPerSubitem).length === 0}
            data-testid="new-lesson-carry-over"
            className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-white border border-[#0f172a] text-[#0f172a] px-3 py-1.5 rounded-full hover:bg-[#0f172a] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors md:ml-auto"
            title="Bewertungen aus den letzten Lektionen als Ausgangspunkt setzen"
          >
            <Sparkles size={12} />
            Letzte Bewertungen übernehmen
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-2">
          {catsSorted.map((cat) => {
            const subs = subsByCat[cat.id] || [];
            const catDraftedCount = subs.filter((s) => drafts[s.id]?.value).length;
            const isOpen = expandedCatId === cat.id;
            return (
              <div
                key={cat.id}
                data-testid={`new-lesson-cat-${cat.id}`}
                className="bg-white border border-[#e7e5e4] rounded-2xl overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedCatId(isOpen ? null : cat.id)}
                  data-testid={`new-lesson-cat-toggle-${cat.id}`}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors ${
                    isOpen ? "bg-[#0f172a] text-white" : "bg-white text-[#0f172a] hover:bg-[#fafaf9]"
                  }`}
                >
                  <span className="font-display text-base md:text-lg leading-tight truncate flex-1 min-w-0">
                    {cat.title_de || cat.title || "—"}
                  </span>
                  {catDraftedCount > 0 && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full tabular-nums ${
                        isOpen ? "bg-[#ff5a36] text-white" : "bg-[#ff5a36] text-white"
                      }`}
                    >
                      {catDraftedCount}/{subs.length}
                    </span>
                  )}
                  <ChevronDown
                    size={16}
                    className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-[#e7e5e4] divide-y divide-[#f1f5f9]">
                    {subs.length === 0 ? (
                      <div className="p-4 text-xs text-[#78716c] italic">
                        Keine Punkte in dieser Kategorie.
                      </div>
                    ) : (
                      subs.map((sub) => {
                        const d = drafts[sub.id] || {};
                        const isCommentOpen = commentEditFor === sub.id;
                        return (
                          <div
                            key={sub.id}
                            data-testid={`new-lesson-sub-${sub.id}`}
                            className="p-3 md:p-4"
                          >
                            <div className="text-sm font-semibold text-[#0f172a] mb-2 leading-snug">
                              {sub.title_de || sub.title || "—"}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {dynOrder.map((v) => {
                                const active = d.value === v;
                                const c = dynMeta[v] || RATING_META[v] || { bg: "#e2e8f0", fg: "#0f172a", desc_de: "" };
                                return (
                                  <button
                                    key={v}
                                    type="button"
                                    onClick={() => setRating(sub.id, v)}
                                    data-testid={`new-lesson-rate-${sub.id}-${v}`}
                                    className={`w-11 h-11 rounded-full font-display text-lg tabular-nums transition-all ${
                                      active
                                        ? "shadow-md scale-110 border-0 ring-2 ring-offset-1 ring-[#0f172a]"
                                        : "border-2 bg-white text-[#78716c] border-[#e2e8f0] hover:border-[#94a3b8]"
                                    }`}
                                    style={active ? { background: c.bg, color: c.fg } : {}}
                                    title={c.desc_de || ""}
                                  >
                                    {v}
                                  </button>
                                );
                              })}
                              <button
                                type="button"
                                onClick={() => setCommentEditFor(isCommentOpen ? null : sub.id)}
                                data-testid={`new-lesson-comment-toggle-${sub.id}`}
                                className={`w-11 h-11 rounded-full flex items-center justify-center border-2 transition-colors ${
                                  d.comment
                                    ? "bg-[#0f172a] text-white border-[#0f172a]"
                                    : "bg-white text-[#78716c] border-[#e2e8f0] hover:border-[#94a3b8]"
                                }`}
                                title={d.comment ? "Kommentar bearbeiten" : "Kommentar hinzufügen"}
                              >
                                <MessageSquare size={15} />
                              </button>
                            </div>
                            {isCommentOpen && (
                              <textarea
                                autoFocus
                                rows={2}
                                value={d.comment || ""}
                                onChange={(e) => setComment(sub.id, e.target.value)}
                                data-testid={`new-lesson-comment-input-${sub.id}`}
                                style={{ fontSize: "16px" }}
                                placeholder="Kommentar zu diesem Punkt (optional)"
                                className="mt-2 w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-xl px-3 py-2 focus:outline-none focus:border-[#ff5a36] resize-y"
                              />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {catsSorted.length === 0 && (
            <div className="py-12 text-center text-sm text-[#78716c]">
              Keine Kategorien vorhanden.
            </div>
          )}
        </div>

        {/* Sticky footer with save button */}
        <div className="border-t border-[#f1f5f9] bg-white px-4 md:px-6 py-3 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[#78716c]">
            <span className="font-semibold text-[#0f172a]">{draftedCount}</span> Bewertung{draftedCount === 1 ? "" : "en"}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold tracking-widest uppercase text-[#78716c] px-3 py-2 hover:text-[#0f172a]"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={saving || draftedCount === 0}
              data-testid="new-lesson-save"
              className={`inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase px-5 py-2.5 rounded-full transition-colors ${
                draftedCount === 0 || saving
                  ? "bg-[#e7e5e4] text-[#a8a29e] cursor-not-allowed"
                  : "bg-[#ff5a36] text-white hover:bg-[#e94418]"
              }`}
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Lektion speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
