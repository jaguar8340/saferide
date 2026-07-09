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
import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Plus,
  StickyNote,
  Trash2,
  Route as RouteIcon,
  ChevronDown,
  FileDown,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";
import RatingPopup, {
  RATING_META,
} from "@/components/admin/students/RatingPopup";

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

  const exportPdf = async () => {
    if (lessons.length === 0) return;
    setExportingPdf(true);
    try {
      const res = await api.get(
        `/students/${student.id}/fahrkontrolle.pdf`,
        { responseType: "blob" },
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
                      <div
                        data-testid={`fahrkontrolle-lesson-date-${l.lesson_number}`}
                        className="text-[10px] text-[#a8a29e] leading-tight tabular-nums whitespace-nowrap"
                      >
                        {formatDateDMY(l.date)}
                      </div>
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
                return (
                  <Fragment key={cat.id}>
                    <tr className="bg-[#0f172a] text-white">
                      <td
                        colSpan={lessons.length + 1}
                        className="px-4 py-2.5 font-display text-base leading-tight sticky left-0"
                      >
                        {catNumberFor(cat)}. {cat.title_de}
                      </td>
                    </tr>
                    {catSubs.map((sub) => (
                      <tr
                        key={sub.id}
                        className="border-b border-[#f5f5f4] last:border-0"
                      >
                        <td className="px-4 py-2 sticky left-0 bg-white z-[1]">
                          <div className="text-xs text-[#a8a29e] font-semibold tabular-nums">
                            {catNumberFor(cat)}.{subNumberFor(cat, sub)}
                          </div>
                          <div className="text-sm text-[#0f172a] font-medium leading-tight">
                            {sub.title_de}
                          </div>
                        </td>
                        {lessons.map((l) => {
                          const key = `${sub.id}:${l.id}`;
                          const cell = assessments[key];
                          const value = cell?.value || "";
                          const hasComment = !!(cell?.comment);
                          const meta = value ? RATING_META[value] : null;
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
                    ))}
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
        contextLabel={
          popupCell
            ? `${catNumberFor(popupCell.category)}.${subNumberFor(popupCell.category, popupCell.subitem)} ${popupCell.subitem.title_de} · Lektion ${popupCell.lesson.lesson_number}`
            : ""
        }
        onSave={saveRating}
        onClear={clearRating}
        onClose={() => setPopupCell(null)}
      />
    </div>
  );
}
