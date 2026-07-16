/**
 * FahrkontrolleTab — the heart of the Fahrkontrolle module.
 *
 * Renders a scrollable matrix: rows = subitems grouped by category,
 * columns = the student's lessons (dynamic, auto-numbered). Each cell
 * shows a colored rating value (1/2/3/4/X) if set, plus a small
 * pencil-dot in the corner when a per-cell comment is stored.
 *
 * Tapping any cell opens the {@link RatingPopup} centered/mobile-bottom.
 *
 * Bulk data loaded once on mount:
 *   • GET /api/fahrkontrolle/categories
 *   • GET /api/fahrkontrolle/subitems
 *   • GET /api/fahrkontrolle/routes
 *   • GET /api/fahrkontrolle/students/{id}/lessons
 *   • GET /api/fahrkontrolle/students/{id}/assessments
 */
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Plus,
  StickyNote,
  Trash2,
  Route as RouteIcon,
  ChevronDown,
  FileDown,
  AlertCircle,
  CircleDashed,
  CheckCircle2,
  FileText,
  Pencil,
  ImagePlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError, resolveUrl } from "@/lib/api";
import RatingPopup, {
  RATING_META,
} from "@/components/admin/students/RatingPopup";
import useRatingScale from "@/hooks/useRatingScale";
import FahrkontrolleAiPanel from "@/components/admin/students/FahrkontrolleAiPanel";
import {
  categoryPercent,
  categoryWarning,
  overallPercent,
  subitemWarning,
  WARN_STYLES,
} from "@/components/admin/students/progress";

/** Format an ISO date (YYYY-MM-DD) as strict DD/MM/YYYY.
 *  Returns "—" for empty/invalid input. */
const formatDateDMY = (iso) => {
  if (!iso || typeof iso !== "string") return "—";
  // Accept both YYYY-MM-DD and full ISO strings (YYYY-MM-DDTHH:mm:ss…).
  const datePart = iso.slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!m) return "—";
  return `${m[3]}/${m[2]}/${m[1]}`;
};

export default function FahrkontrolleTab({ student }) {
  const [categories, setCategories] = useState([]);
  const [subitems, setSubitems] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [assessments, setAssessments] = useState({});   // key = `${subitem_id}:${lesson_id}` → row
  const [loading, setLoading] = useState(true);
  const [popupCell, setPopupCell] = useState(null);
  const [addingLesson, setAddingLesson] = useState(false);
  const [openRoutesForLesson, setOpenRoutesForLesson] = useState(null);
  const [notes, setNotes] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);

  // Dynamic rating scale (labels + colours). Falls back to RATING_META
  // while the hook fetches on first mount.
  const { meta: dynMeta = RATING_META, valueWeight, topValue } = useRatingScale();

  const exportPdf = async () => {
    if (lessons.length === 0) return;
    setExportingPdf(true);
    try {
      const backUrl = `${window.location.origin}/admin/students/${student.id}`;
      const res = await api.get(
        `/students/${student.id}/fahrkontrolle.pdf`,
        {
          params: { back_url: backUrl },
          responseType: "blob",
        },
      );
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = `${student.last_name || ""}_${student.first_name || ""}`
        .replace(/[^a-zA-Z0-9_-]+/g, "_")
        .replace(/^_+|_+$/g, "") || "schueler";
      a.download = `Fahrkontrolle_${safeName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("PDF erstellt");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setExportingPdf(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [c, s, r, l, a] = await Promise.all([
        api.get("/fahrkontrolle/categories"),
        api.get("/fahrkontrolle/subitems"),
        api.get("/fahrkontrolle/routes"),
        api.get(`/fahrkontrolle/students/${student.id}/lessons`),
        api.get(`/fahrkontrolle/students/${student.id}/assessments`),
      ]);
      setCategories(c.data || []);
      setSubitems(s.data || []);
      setRoutes(r.data || []);
      setLessons(l.data || []);
      const map = {};
      for (const item of a.data || []) {
        map[`${item.subitem_id}:${item.lesson_id}`] = item;
      }
      setAssessments(map);
      setNotes(student.notes || "");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
  }, [student.id]);

  const catNumberFor = (cat) => {
    // Return the 1-based index of the category in visible order.
    const sorted = [...categories].sort((a, b) => a.order - b.order);
    return sorted.findIndex((c) => c.id === cat.id) + 1;
  };
  const subNumberFor = (cat, sub) => {
    const catSubs = subitems
      .filter((s) => s.category_id === cat.id)
      .sort((a, b) => a.order - b.order);
    return catSubs.findIndex((s) => s.id === sub.id) + 1;
  };

  const addLesson = async () => {
    setAddingLesson(true);
    try {
      const r = await api.post(
        `/fahrkontrolle/students/${student.id}/lessons`,
        { date: new Date().toISOString().slice(0, 10) },
      );
      setLessons((cur) => [...cur, r.data]);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setAddingLesson(false);
    }
  };

  const removeLesson = async (lesson) => {
    if (!confirm(`Lektion ${lesson.lesson_number} löschen? Alle Bewertungen dieser Lektion gehen verloren.`))
      return;
    try {
      await api.delete(
        `/fahrkontrolle/students/${student.id}/lessons/${lesson.id}`,
      );
      setLessons((cur) => cur.filter((l) => l.id !== lesson.id));
      const next = { ...assessments };
      for (const k of Object.keys(next)) {
        if (next[k].lesson_id === lesson.id) delete next[k];
      }
      setAssessments(next);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const patchLessonDate = async (lessonId, newDate) => {
    if (!newDate) return;
    try {
      const r = await api.patch(
        `/fahrkontrolle/students/${student.id}/lessons/${lessonId}`,
        { date: newDate },
      );
      setLessons((cur) => cur.map((l) => (l.id === lessonId ? r.data : l)));
      toast.success("Datum gespeichert");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const saveRating = async (value, comment) => {
    if (!popupCell) return;
    try {
      const r = await api.put(
        `/fahrkontrolle/students/${student.id}/assessments`,
        {
          subitem_id: popupCell.subitem.id,
          lesson_id: popupCell.lesson.id,
          value,
          comment,
        },
      );
      const key = `${popupCell.subitem.id}:${popupCell.lesson.id}`;
      if (value === "" && comment === "") {
        const next = { ...assessments };
        delete next[key];
        setAssessments(next);
      } else {
        setAssessments((cur) => ({ ...cur, [key]: r.data }));
      }
      // NOTE: intentionally do NOT close the popup here.
      // Autosave keeps the popup open so the user can add a comment
      // after tapping a rating. The popup closes on "Fertig" / X / overlay.
    } catch (e) {
      toast.error(formatApiError(e));
      throw e;   // re-throw so popup skips its "Gespeichert" flash
    }
  };

  const clearRating = async () => {
    if (!popupCell) return;
    try {
      await saveRating("", "");
      setPopupCell(null);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const uploadPhoto = async (file) => {
    if (!popupCell) return;
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post(
        `/fahrkontrolle/students/${student.id}/assessments/photo`,
        fd,
        {
          params: {
            subitem_id: popupCell.subitem.id,
            lesson_id: popupCell.lesson.id,
          },
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      const key = `${popupCell.subitem.id}:${popupCell.lesson.id}`;
      setAssessments((cur) => ({ ...cur, [key]: r.data }));
    } catch (e) {
      toast.error(formatApiError(e));
      throw e;
    }
  };

  const deletePhoto = async (url) => {
    if (!popupCell) return;
    try {
      const r = await api.delete(
        `/fahrkontrolle/students/${student.id}/assessments/photo`,
        {
          params: {
            subitem_id: popupCell.subitem.id,
            lesson_id: popupCell.lesson.id,
            url,
          },
        },
      );
      const key = `${popupCell.subitem.id}:${popupCell.lesson.id}`;
      if (
        !r.data.value &&
        !r.data.comment &&
        (!r.data.photo_urls || r.data.photo_urls.length === 0)
      ) {
        const next = { ...assessments };
        delete next[key];
        setAssessments(next);
      } else {
        setAssessments((cur) => ({ ...cur, [key]: r.data }));
      }
    } catch (e) {
      toast.error(formatApiError(e));
      throw e;
    }
  };

  const toggleRouteForLesson = async (lesson, routeId) => {
    const nextRoutes = lesson.routes?.includes(routeId)
      ? lesson.routes.filter((r) => r !== routeId)
      : [...(lesson.routes || []), routeId];
    try {
      const r = await api.patch(
        `/fahrkontrolle/students/${student.id}/lessons/${lesson.id}`,
        { routes: nextRoutes },
      );
      setLessons((cur) => cur.map((l) => (l.id === lesson.id ? r.data : l)));
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const saveNotes = async () => {
    if (notes === (student.notes || "")) return;
    try {
      await api.patch(`/students/${student.id}`, { notes });
      toast.success("Bemerkungen gespeichert");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const categoriesSorted = useMemo(
    () => [...categories].sort((a, b) => a.order - b.order),
    [categories],
  );
  const routesById = useMemo(() => {
    const m = {};
    for (const r of routes) m[r.id] = r;
    return m;
  }, [routes]);

  // Progress + warning computations (memoized on data changes)
  const overallPct = useMemo(
    () => overallPercent(categories, subitems, lessons, assessments),
    [categories, subitems, lessons, assessments],
  );
  const catStats = useMemo(() => {
    const map = {};
    for (const c of categories) {
      map[c.id] = {
        percent: categoryPercent(c.id, subitems, lessons, assessments),
        warning: categoryWarning(c.id, subitems, lessons, assessments),
      };
    }
    return map;
  }, [categories, subitems, lessons, assessments]);
  const subWarnings = useMemo(() => {
    const map = {};
    for (const s of subitems) {
      map[s.id] = subitemWarning(s.id, lessons, assessments);
    }
    return map;
  }, [subitems, lessons, assessments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-[#78716c]">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="fahrkontrolle-tab">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-[#78716c]">
          <span className="font-semibold text-[#0f172a]">{lessons.length}</span>
          {lessons.length === 1 ? "Lektion" : "Lektionen"}
          <span className="mx-1">·</span>
          <span className="font-semibold text-[#0f172a]">
            {Object.values(assessments).filter((a) => a.value).length}
          </span>
          Bewertungen
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportPdf}
            disabled={exportingPdf || lessons.length === 0}
            data-testid="fahrkontrolle-export-pdf"
            title={lessons.length === 0 ? "Erst eine Lektion anlegen" : "PDF-Export A4"}
            className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-white border border-[#0f172a] text-[#0f172a] px-4 py-2 rounded-full hover:bg-[#0f172a] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {exportingPdf ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <FileDown size={12} />
            )}
            PDF-Export
          </button>
          <button
            type="button"
            onClick={addLesson}
            disabled={addingLesson}
            data-testid="fahrkontrolle-add-lesson"
            className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-[#ff5a36] text-white px-4 py-2 rounded-full hover:opacity-90 disabled:opacity-50"
          >
            {addingLesson ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Plus size={12} />
            )}
            Neue Lektion
          </button>
        </div>
      </div>

      {/* Progress panel */}
      {lessons.length > 0 && (
        <ProgressPanel
          overall={overallPct}
          categoriesSorted={categoriesSorted}
          catStats={catStats}
        />
      )}

      {/* Diverse Notizen */}
      <DiverseNotesSection studentId={student.id} />

      {/* Matrix (horizontal scroll on narrow screens) */}
      {lessons.length === 0 ? (
        <div className="py-16 text-center bg-white border border-dashed border-[#e7e5e4] rounded-2xl text-[#78716c] text-sm">
          Noch keine Lektion erfasst. Klicke oben rechts auf&nbsp;
          <span className="font-semibold">Neue Lektion</span>, um zu starten.
        </div>
      ) : (
        <div className="bg-white border border-[#e7e5e4] rounded-2xl overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#fafaf9] border-b border-[#e7e5e4]">
                <th
                  className="text-left px-4 py-3 font-semibold text-xs tracking-widest uppercase text-[#475569] sticky left-0 bg-[#fafaf9] z-10 min-w-[220px]"
                >
                  Punkt
                </th>
                {lessons.map((l) => (
                  <th
                    key={l.id}
                    data-testid={`fahrkontrolle-lesson-header-${l.lesson_number}`}
                    className="px-1.5 py-3 text-center w-[76px] min-w-[76px] align-middle"
                  >
                    <div className="w-11 mx-auto flex flex-col items-center gap-0.5">
                      <div className="font-display text-base leading-none">
                        L{l.lesson_number}
                      </div>
                      <input
                        type="date"
                        value={l.date || ""}
                        onChange={(e) => patchLessonDate(l.id, e.target.value)}
                        data-testid={`fahrkontrolle-lesson-date-input-${l.lesson_number}`}
                        title="Datum bearbeiten"
                        className="text-[10px] text-[#334155] leading-tight tabular-nums bg-transparent border border-transparent hover:border-[#e2e8f0] rounded px-1 py-0.5 focus:outline-none focus:border-[#ff5a36] focus:bg-white w-[70px] text-center cursor-pointer"
                      />
                      <button
                        onClick={() => removeLesson(l)}
                        className="mt-0.5 flex items-center justify-center w-5 h-5 rounded-full text-[#a8a29e] hover:text-[#dc2626] hover:bg-[#fee2e2]"
                        aria-label="Lektion löschen"
                      >
                        <Trash2 size={9} />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categoriesSorted.map((cat) => {
                const catSubs = subitems
                  .filter((s) => s.category_id === cat.id)
                  .sort((a, b) => a.order - b.order);
                const cStat = catStats[cat.id] || { percent: 0, warning: "neutral" };
                const cWarn = WARN_STYLES[cStat.warning];
                return (
                  <Fragment key={cat.id}>
                    <tr className="bg-[#0f172a] text-white">
                      <td
                        colSpan={lessons.length + 1}
                        className="px-4 py-2.5 font-display text-base leading-tight sticky left-0"
                        data-testid={`fk-category-row-${cat.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <span>{catNumberFor(cat)}. {cat.title_de}</span>
                          <span
                            data-testid={`fk-category-warning-${cat.id}`}
                            className="inline-flex items-center gap-1 text-[10px] tracking-[0.18em] uppercase font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: cWarn.bg, color: cWarn.text }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: cWarn.dot }}
                            />
                            {cWarn.label}
                          </span>
                          <span
                            data-testid={`fk-category-percent-${cat.id}`}
                            className="ml-auto text-xs font-semibold tabular-nums text-[#94a3b8]"
                          >
                            {cStat.percent}%
                          </span>
                        </div>
                      </td>
                    </tr>
                    {catSubs.map((sub) => {
                      const sWarn = WARN_STYLES[subWarnings[sub.id] || "neutral"];
                      return (
                        <tr
                          key={sub.id}
                          className="border-b border-[#f5f5f4] last:border-0"
                        >
                          <td
                            className="px-4 py-2 sticky left-0 bg-white z-[1] border-l-4"
                            style={{ borderLeftColor: sWarn.dot }}
                            data-testid={`fk-subitem-row-${sub.id}`}
                          >
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="text-xs text-[#a8a29e] font-semibold tabular-nums">
                                  {catNumberFor(cat)}.{subNumberFor(cat, sub)}
                                </div>
                                <div className="text-sm text-[#0f172a] font-medium leading-tight">
                                  {sub.title_de}
                                </div>
                              </div>
                              {(subWarnings[sub.id] === "red" || subWarnings[sub.id] === "yellow") && (
                                <span
                                  className="ml-auto inline-flex items-center justify-center w-5 h-5 rounded-full shrink-0"
                                  style={{ background: sWarn.bg }}
                                  title={sWarn.label}
                                  data-testid={`fk-subitem-warning-${sub.id}`}
                                >
                                  {subWarnings[sub.id] === "red" ? (
                                    <AlertCircle size={11} style={{ color: sWarn.text }} strokeWidth={2.5} />
                                  ) : (
                                    <CircleDashed size={11} style={{ color: sWarn.text }} strokeWidth={2.5} />
                                  )}
                                </span>
                              )}
                              {subWarnings[sub.id] === "green" && (
                                <span
                                  className="ml-auto inline-flex items-center justify-center w-5 h-5 rounded-full shrink-0"
                                  style={{ background: sWarn.bg }}
                                  title={sWarn.label}
                                  data-testid={`fk-subitem-warning-${sub.id}`}
                                >
                                  <CheckCircle2 size={11} style={{ color: sWarn.text }} strokeWidth={2.5} />
                                </span>
                              )}
                            </div>
                          </td>
                          {lessons.map((l) => {
                            const key = `${sub.id}:${l.id}`;
                            const cell = assessments[key];
                            const value = cell?.value || "";
                            const hasComment = !!(cell?.comment);
                            const meta = value ? (dynMeta[value] || RATING_META[value] || null) : null;
                            return (
                              <td
                                key={l.id}
                                className="px-1.5 py-1.5 text-center w-[76px] min-w-[76px]"
                              >
                                <button
                                  onClick={() =>
                                    setPopupCell({ subitem: sub, lesson: l, category: cat })
                                  }
                                  data-testid={`fk-cell-${sub.id}-${l.id}`}
                                  className={`relative w-11 h-11 mx-auto rounded-xl font-display text-lg leading-none flex items-center justify-center transition-all ${
                                    meta
                                    ? "shadow-sm active:scale-95"
                                    : "border border-dashed border-[#e7e5e4] text-[#a8a29e] hover:border-[#ff5a36]"
                                }`}
                                style={
                                  meta
                                    ? { background: meta.bg, color: meta.fg }
                                    : undefined
                                }
                              >
                                {value || ""}
                                {hasComment && (
                                  <span
                                    className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-white border border-[#0f172a] flex items-center justify-center"
                                    aria-label="Kommentar vorhanden"
                                  >
                                    <StickyNote
                                      size={7}
                                      strokeWidth={2.5}
                                      className="text-[#0f172a]"
                                    />
                                  </span>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
              {/* Routes row */}
              <tr className="bg-[#f5f5f4]">
                <td
                  colSpan={lessons.length + 1}
                  className="px-4 py-2 font-display text-base sticky left-0"
                >
                  Gefahrene Strecken
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 sticky left-0 bg-white text-xs text-[#78716c]">
                  Klick auf eine Lektion, um Strecken anzuwählen
                </td>
                {lessons.map((l) => {
                  const routesCount = (l.routes || []).length;
                  return (
                    <td
                      key={l.id}
                      className="px-1.5 py-2 text-center relative w-[76px] min-w-[76px]"
                    >
                      <button
                        onClick={() =>
                          setOpenRoutesForLesson(
                            openRoutesForLesson === l.id ? null : l.id,
                          )
                        }
                        data-testid={`fk-routes-toggle-${l.id}`}
                        className={`w-11 h-11 mx-auto rounded-xl flex flex-col items-center justify-center transition-colors ${
                          routesCount > 0
                            ? "bg-[#1e6fff]/10 text-[#1e6fff]"
                            : "border border-dashed border-[#e7e5e4] text-[#a8a29e] hover:border-[#1e6fff]"
                        }`}
                      >
                        <RouteIcon size={13} />
                        <span className="text-[9px] font-bold mt-0.5">
                          {routesCount || "+"}
                        </span>
                      </button>
                      {openRoutesForLesson === l.id && (
                        <div
                          data-testid={`fk-routes-panel-${l.id}`}
                          className="absolute right-0 top-full mt-2 z-40 bg-white border border-[#e7e5e4] rounded-2xl shadow-xl p-3 min-w-[220px] text-left"
                        >
                          <div className="text-[10px] tracking-widest uppercase font-semibold text-[#475569] mb-2 flex items-center justify-between">
                            <span>Lektion {l.lesson_number}</span>
                            <button
                              onClick={() => setOpenRoutesForLesson(null)}
                              className="text-[#a8a29e] hover:text-[#0f172a]"
                            >
                              <ChevronDown size={12} />
                            </button>
                          </div>
                          <div className="max-h-52 overflow-y-auto space-y-1">
                            {routes.map((r) => {
                              const active = (l.routes || []).includes(r.id);
                              return (
                                <button
                                  key={r.id}
                                  onClick={() => toggleRouteForLesson(l, r.id)}
                                  className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors ${
                                    active
                                      ? "bg-[#1e6fff] text-white"
                                      : "hover:bg-[#f5f5f4] text-[#0f172a]"
                                  }`}
                                >
                                  {active ? "✓ " : ""}
                                  {r.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
              {/* Route pills row (readable summary) */}
              <tr className="border-b border-[#f5f5f4]">
                <td className="px-4 py-2 sticky left-0 bg-white text-xs text-[#a8a29e]">
                  Übersicht
                </td>
                {lessons.map((l) => (
                  <td key={l.id} className="px-1.5 py-2 text-center align-top w-[76px] min-w-[76px]">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {(l.routes || []).map((rid) => {
                        const r = routesById[rid];
                        if (!r) return null;
                        return (
                          <span
                            key={rid}
                            className="inline-block text-[9px] px-2 py-0.5 rounded-full bg-[#1e6fff]/10 text-[#1e6fff] font-semibold whitespace-nowrap"
                          >
                            {r.name}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Global notes textbox */}
      <div className="bg-white border border-[#e7e5e4] rounded-2xl p-5">
        <div className="text-[10px] font-semibold tracking-[0.22em] uppercase text-[#475569] mb-2">
          Bemerkungen
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          data-testid="fahrkontrolle-notes"
          placeholder="Allgemeine Bemerkungen zum Schüler (unabhängig von einer Lektion) …"
          rows={4}
          className="w-full text-sm bg-[#fafaf9] border border-[#e7e5e4] focus:border-[#ff5a36] focus:outline-none rounded-2xl p-3 leading-relaxed resize-y min-h-[120px]"
        />
      </div>

      {/* Popup */}
      <RatingPopup
        open={!!popupCell}
        initialValue={
          popupCell
            ? assessments[`${popupCell.subitem.id}:${popupCell.lesson.id}`]
                ?.value || ""
            : ""
        }
        initialComment={
          popupCell
            ? assessments[`${popupCell.subitem.id}:${popupCell.lesson.id}`]
                ?.comment || ""
            : ""
        }
        photoUrls={
          popupCell
            ? assessments[`${popupCell.subitem.id}:${popupCell.lesson.id}`]
                ?.photo_urls || []
            : []
        }
        contextLabel={
          popupCell
            ? `${catNumberFor(popupCell.category)}.${subNumberFor(popupCell.category, popupCell.subitem)} ${popupCell.subitem.title_de} · Lektion ${popupCell.lesson.lesson_number}`
            : ""
        }
        onSave={saveRating}
        onClear={clearRating}
        onPhotoUpload={uploadPhoto}
        onPhotoDelete={deletePhoto}
        onClose={() => setPopupCell(null)}
      />

      <FahrkontrolleAiPanel
        studentId={student.id}
        studentName={`${student.first_name || ""} ${student.last_name || ""}`.trim()}
      />
    </div>
  );
}


/** Big progress panel shown above the matrix.
 *  - Overall percent (large left card + arc)
 *  - Category chips with mini progress bar + warning color
 */
function ProgressPanel({ overall, categoriesSorted, catStats }) {
  return (
    <div
      data-testid="fahrkontrolle-progress-panel"
      className="bg-white border border-[#e7e5e4] rounded-2xl p-5 md:p-6"
    >
      <div className="flex items-start gap-6 flex-wrap">
        {/* Overall progress */}
        <div className="flex items-center gap-4 min-w-[190px]">
          <ProgressRing percent={overall} size={72} />
          <div>
            <div className="text-[10px] font-semibold tracking-[0.22em] uppercase text-[#475569]">
              Ausbildungsfortschritt
            </div>
            <div
              className="font-display text-4xl leading-none mt-1 tabular-nums"
              data-testid="fahrkontrolle-progress-overall"
            >
              {overall}%
            </div>
            <div className="text-[11px] text-[#78716c] mt-1">
              Gesamt · Höchstbewertung pro Punkt
            </div>
          </div>
        </div>

        {/* Category chips grid */}
        <div className="flex-1 min-w-[260px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {categoriesSorted.map((cat, idx) => {
            const st = catStats[cat.id] || { percent: 0, warning: "neutral" };
            const warn = WARN_STYLES[st.warning];
            return (
              <div
                key={cat.id}
                data-testid={`fahrkontrolle-progress-category-${cat.id}`}
                className="rounded-xl border p-3"
                style={{ borderColor: warn.border, background: warn.bg }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: warn.dot }}
                  />
                  <span
                    className="text-[11px] font-semibold uppercase tracking-widest truncate"
                    style={{ color: warn.text }}
                    title={cat.title_de}
                  >
                    {idx + 1}. {cat.title_de}
                  </span>
                  <span
                    className="ml-auto text-xs font-semibold tabular-nums shrink-0"
                    style={{ color: warn.text }}
                  >
                    {st.percent}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-white/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(2, st.percent)}%`,
                      background: warn.dot,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-[#f1f5f9] flex flex-wrap items-center gap-3 text-[10px] tracking-widest uppercase text-[#94a3b8]">
        <span className="inline-flex items-center gap-1.5">
          <AlertCircle size={11} className="text-[#dc2626]" strokeWidth={2.5} />
          Problemthema
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CircleDashed size={11} className="text-[#eab308]" strokeWidth={2.5} />
          Noch nie bewertet
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 size={11} className="text-[#16a34a]" strokeWidth={2.5} />
          Sicher beherrscht
        </span>
      </div>
    </div>
  );
}

/** Simple SVG progress ring for the overall percentage. */
function ProgressRing({ percent = 0, size = 72, stroke = 8 }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  // Colour ramp: red < 30, amber < 60, coral < 80, green ≥ 80
  const ringColor =
    clamped >= 80 ? "#16a34a"
    : clamped >= 60 ? "#ff5a36"
    : clamped >= 30 ? "#eab308"
    : "#dc2626";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#f1f5f9"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={ringColor}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 400ms ease" }}
      />
    </svg>
  );
}


// ---------------------------------------------------------------------------
//  Diverse Notizen (free-form date + text notes, editable inline)
// ---------------------------------------------------------------------------
function DiverseNotesSection({ studentId }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [draftDate, setDraftDate] = useState(today);
  const [draftText, setDraftText] = useState("");
  const [draftImage, setDraftImage] = useState("");           // /api/files/... URL
  const [uploadingNew, setUploadingNew] = useState(false);
  const newFileRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [editText, setEditText] = useState("");
  const [editImage, setEditImage] = useState("");
  const [uploadingEdit, setUploadingEdit] = useState(false);
  const editFileRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api.get(`/fahrkontrolle/students/${studentId}/notes`);
        if (!cancelled) setNotes(r.data || []);
      } catch (e) {
        if (!cancelled) toast.error(formatApiError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [studentId]);

  /** Upload a single image to Hetzner via /api/upload and return its URL. */
  const uploadImage = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const r = await api.post("/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return r.data?.url || "";
  };

  const handleNewImage = async (file) => {
    if (!file) return;
    setUploadingNew(true);
    try {
      const url = await uploadImage(file);
      setDraftImage(url);
      toast.success("Bild hochgeladen");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setUploadingNew(false);
      if (newFileRef.current) newFileRef.current.value = "";
    }
  };

  const handleEditImage = async (file) => {
    if (!file) return;
    setUploadingEdit(true);
    try {
      const url = await uploadImage(file);
      setEditImage(url);
      toast.success("Bild hochgeladen");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setUploadingEdit(false);
      if (editFileRef.current) editFileRef.current.value = "";
    }
  };

  const add = async () => {
    if (!draftText.trim() && !draftImage) {
      toast.error("Bitte Text oder Bild eintragen");
      return;
    }
    setCreating(true);
    try {
      const r = await api.post(
        `/fahrkontrolle/students/${studentId}/notes`,
        { date: draftDate, text: draftText.trim(), image_url: draftImage || "" },
      );
      setNotes((cur) => [r.data, ...cur]);
      setDraftText("");
      setDraftImage("");
      setDraftDate(today);
      toast.success("Notiz gespeichert");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (n) => {
    setEditingId(n.id);
    setEditDate(n.date || "");
    setEditText(n.text || "");
    setEditImage(n.image_url || "");
  };

  const saveEdit = async () => {
    try {
      const r = await api.patch(
        `/fahrkontrolle/students/${studentId}/notes/${editingId}`,
        { date: editDate, text: editText.trim(), image_url: editImage || "" },
      );
      setNotes((cur) => cur.map((n) => (n.id === editingId ? r.data : n)));
      setEditingId(null);
      toast.success("Notiz aktualisiert");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const remove = async (id) => {
    if (!confirm("Notiz löschen?")) return;
    try {
      await api.delete(`/fahrkontrolle/students/${studentId}/notes/${id}`);
      setNotes((cur) => cur.filter((n) => n.id !== id));
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  return (
    <div
      data-testid="fk-diverse-notes"
      className="bg-white border border-[#e7e5e4] rounded-2xl p-4 md:p-5 space-y-3"
    >
      <div className="flex items-center gap-2">
        <FileText size={14} className="text-[#ff5a36]" />
        <h3 className="font-display text-base">Diverse Notizen</h3>
        <span className="ml-auto text-[10px] text-[#a8a29e]">{notes.length}</span>
      </div>

      {/* New-note form */}
      <div className="grid grid-cols-1 md:grid-cols-[140px,1fr,auto] gap-2 items-start">
        <input
          type="date"
          value={draftDate}
          onChange={(e) => setDraftDate(e.target.value)}
          data-testid="fk-note-new-date"
          className="text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-xl px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
        />
        <div className="space-y-2">
          <textarea
            rows={2}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder="Notiz (z. B. „hat heute Prüfungsangst thematisiert“)"
            data-testid="fk-note-new-text"
            className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-xl px-3 py-2 focus:outline-none focus:border-[#ff5a36] resize-y"
          />
          {/* Image controls (upload / preview / remove) */}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={newFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleNewImage(e.target.files?.[0])}
              data-testid="fk-note-new-image-input"
            />
            <button
              type="button"
              onClick={() => newFileRef.current?.click()}
              disabled={uploadingNew}
              data-testid="fk-note-new-image-btn"
              className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase border border-[#e7e5e4] text-[#475569] px-3 py-1.5 rounded-full hover:bg-[#fafaf9] disabled:opacity-50"
            >
              {uploadingNew ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <ImagePlus size={11} />
              )}
              {draftImage ? "Bild ersetzen" : "Bild anfügen"}
            </button>
            {draftImage && (
              <div className="flex items-center gap-2">
                <a
                  href={resolveUrl(draftImage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="fk-note-new-image-preview"
                >
                  <img
                    src={resolveUrl(draftImage)}
                    alt="Vorschau"
                    className="w-12 h-12 object-cover rounded-lg border border-[#e7e5e4]"
                  />
                </a>
                <button
                  type="button"
                  onClick={() => setDraftImage("")}
                  className="text-[#dc2626] hover:bg-[#fef2f2] rounded-full p-1"
                  title="Bild entfernen"
                  data-testid="fk-note-new-image-remove"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={add}
          disabled={creating || uploadingNew}
          data-testid="fk-note-add"
          className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-[#ff5a36] text-white px-4 py-2 rounded-full hover:opacity-90 disabled:opacity-50 h-fit"
        >
          {creating ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
          Hinzufügen
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-xs text-[#78716c] flex items-center gap-2">
          <Loader2 size={12} className="animate-spin" /> Lade …
        </div>
      ) : notes.length === 0 ? (
        <div className="text-xs text-[#a8a29e] italic">Noch keine Notizen.</div>
      ) : (
        <ul className="space-y-2 pt-1">
          {notes.map((n) => (
            <li
              key={n.id}
              data-testid={`fk-note-${n.id}`}
              className="bg-[#fafaf9] border border-[#f3f0eb] rounded-xl p-3"
            >
              {editingId === n.id ? (
                <div className="space-y-2">
                  <div className="flex gap-2 flex-wrap items-start">
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      data-testid={`fk-note-edit-date-${n.id}`}
                      className="text-sm bg-white border border-[#e2e8f0] rounded-xl px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
                    />
                    <textarea
                      rows={3}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      data-testid={`fk-note-edit-text-${n.id}`}
                      className="flex-1 min-w-[240px] text-sm bg-white border border-[#e2e8f0] rounded-xl px-3 py-2 focus:outline-none focus:border-[#ff5a36] resize-y"
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      ref={editFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleEditImage(e.target.files?.[0])}
                      data-testid={`fk-note-edit-image-input-${n.id}`}
                    />
                    <button
                      type="button"
                      onClick={() => editFileRef.current?.click()}
                      disabled={uploadingEdit}
                      data-testid={`fk-note-edit-image-btn-${n.id}`}
                      className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase border border-[#e7e5e4] text-[#475569] px-3 py-1.5 rounded-full hover:bg-white disabled:opacity-50"
                    >
                      {uploadingEdit ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <ImagePlus size={11} />
                      )}
                      {editImage ? "Ersetzen" : "Bild anfügen"}
                    </button>
                    {editImage && (
                      <div className="flex items-center gap-2">
                        <img
                          src={resolveUrl(editImage)}
                          alt="Vorschau"
                          className="w-12 h-12 object-cover rounded-lg border border-[#e7e5e4]"
                        />
                        <button
                          type="button"
                          onClick={() => setEditImage("")}
                          className="text-[#dc2626] hover:bg-[#fef2f2] rounded-full p-1"
                          title="Bild entfernen"
                          data-testid={`fk-note-edit-image-remove-${n.id}`}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={uploadingEdit}
                      data-testid={`fk-note-save-${n.id}`}
                      className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase bg-[#0f172a] text-white px-3 py-1.5 rounded-full disabled:opacity-50"
                    >
                      <CheckCircle2 size={11} /> Speichern
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-[10px] font-semibold tracking-widest uppercase text-[#78716c] hover:text-[#0f172a] px-3 py-1.5"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="text-[10px] font-semibold tracking-widest uppercase text-[#c2410c] bg-[#fff7ed] px-2 py-1 rounded-full shrink-0 tabular-nums">
                    {formatDateDMY(n.date) || "—"}
                  </div>
                  {n.image_url && (
                    <a
                      href={resolveUrl(n.image_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                      data-testid={`fk-note-image-${n.id}`}
                    >
                      <img
                        src={resolveUrl(n.image_url)}
                        alt="Notiz-Bild"
                        className="w-14 h-14 object-cover rounded-lg border border-[#e7e5e4]"
                      />
                    </a>
                  )}
                  <div className="flex-1 text-sm text-[#334155] whitespace-pre-line leading-relaxed">
                    {n.text}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(n)}
                      data-testid={`fk-note-edit-${n.id}`}
                      className="w-7 h-7 flex items-center justify-center rounded-full text-[#334155] hover:text-[#0f172a] hover:bg-white"
                      title="Bearbeiten"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(n.id)}
                      data-testid={`fk-note-delete-${n.id}`}
                      className="w-7 h-7 flex items-center justify-center rounded-full text-[#dc2626] hover:bg-[#fef2f2]"
                      title="Löschen"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

