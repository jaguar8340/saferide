/**
 * Fahrstunden-Tab — flat, sortable list of all lessons for a student.
 *
 * Data source: /api/fahrkontrolle/students/{id}/lessons.
 * The heavy CRUD (add / delete lesson) already lives in FahrkontrolleTab
 * where the matrix is edited. This tab is a read-first summary designed
 * for the driving instructor to skim recent lessons at a glance:
 *   • Lesson number, Datum (DD/MM/YYYY), Dauer, Streckenzahl,
 *     Notiz-Preview, Kommentar-Marker aus Assessments.
 *   • Edit-in-place für Datum, Dauer, Notiz (autosave on blur).
 *   • Delete confirmation matches the matrix behaviour.
 */
import { useEffect, useMemo, useState } from "react";
import { Loader2, Trash2, Route as RouteIcon, StickyNote, Plus } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";

const formatDMY = (iso) => {
  if (!iso || typeof iso !== "string") return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "—";
};

export default function LessonsTab({ student }) {
  const [lessons, setLessons] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = async () => {
    try {
      const [l, a, r] = await Promise.all([
        api.get(`/fahrkontrolle/students/${student.id}/lessons`),
        api.get(`/fahrkontrolle/students/${student.id}/assessments`),
        api.get("/fahrkontrolle/routes"),
      ]);
      setLessons(l.data);
      setAssessments(a.data);
      setRoutes(r.data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id]);

  const routesById = useMemo(() => {
    const m = {};
    for (const r of routes) m[r.id] = r;
    return m;
  }, [routes]);

  const commentCountByLesson = useMemo(() => {
    const m = {};
    for (const a of assessments) {
      if (a.comment) m[a.lesson_id] = (m[a.lesson_id] || 0) + 1;
    }
    return m;
  }, [assessments]);

  const ratingCountByLesson = useMemo(() => {
    const m = {};
    for (const a of assessments) {
      if (a.value) m[a.lesson_id] = (m[a.lesson_id] || 0) + 1;
    }
    return m;
  }, [assessments]);

  const patchLesson = async (id, field, value) => {
    try {
      await api.patch(`/fahrkontrolle/students/${student.id}/lessons/${id}`, {
        [field]: value,
      });
      toast.success("Gespeichert");
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const addLesson = async () => {
    setAdding(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await api.post(`/fahrkontrolle/students/${student.id}/lessons`, {
        date: today,
        duration_min: 45,
      });
      toast.success("Lektion angelegt");
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setAdding(false);
    }
  };

  const removeLesson = async (id) => {
    if (!window.confirm("Lektion inklusive Bewertungen wirklich löschen?")) return;
    try {
      await api.delete(`/fahrkontrolle/students/${student.id}/lessons/${id}`);
      toast.success("Gelöscht");
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const totalMinutes = lessons.reduce((s, l) => s + (l.duration_min || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#78716c]">
        <Loader2 size={14} className="animate-spin" /> Lade Fahrstunden …
      </div>
    );
  }

  return (
    <div data-testid="lessons-tab">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
        <div>
          <h2 className="font-display text-3xl md:text-4xl leading-none tracking-tight">
            Fahrstunden
          </h2>
          <p className="text-xs text-[#78716c] mt-2">
            <span className="font-semibold text-[#0f172a]">{lessons.length}</span>{" "}
            {lessons.length === 1 ? "Lektion" : "Lektionen"}{" "}
            <span className="mx-1">·</span>
            <span className="font-semibold text-[#0f172a]">
              {Math.floor(totalMinutes / 60)} h {totalMinutes % 60} min
            </span>{" "}
            insgesamt
          </p>
        </div>
        <button
          type="button"
          onClick={addLesson}
          disabled={adding}
          data-testid="lessons-add-button"
          className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-[#ff5a36] text-white px-4 py-2 rounded-full hover:opacity-90 disabled:opacity-50"
        >
          {adding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          Neue Lektion
        </button>
      </div>

      {lessons.length === 0 && (
        <div className="bg-white border border-dashed border-[#e7e5e4] rounded-2xl p-10 text-center text-sm text-[#78716c]">
          Noch keine Lektion erfasst.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {lessons.map((l) => (
          <div
            key={l.id}
            data-testid={`lesson-row-${l.lesson_number}`}
            className="bg-white border border-[#e7e5e4] rounded-2xl p-4 flex flex-wrap items-center gap-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#0f172a] text-white flex items-center justify-center font-display text-lg shrink-0">
              L{l.lesson_number}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1 min-w-[260px]">
              <FieldInline
                label="Datum"
                value={l.date}
                type="date"
                display={formatDMY(l.date)}
                onSave={(v) => patchLesson(l.id, "date", v)}
              />
              <FieldInline
                label="Dauer (min)"
                value={l.duration_min}
                type="number"
                display={`${l.duration_min || 0} min`}
                onSave={(v) => patchLesson(l.id, "duration_min", parseInt(v, 10) || 0)}
              />
              <div>
                <label className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] block mb-1">
                  Strecken
                </label>
                <div className="text-sm text-[#0f172a] font-medium flex items-center gap-1.5">
                  <RouteIcon size={12} className="text-[#1e6fff]" />
                  {(l.routes || []).length}
                  <span className="text-[11px] text-[#78716c] truncate">
                    {(l.routes || [])
                      .map((rid) => routesById[rid]?.name)
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] block mb-1">
                  Bewertungen
                </label>
                <div className="text-sm text-[#0f172a] font-medium flex items-center gap-2">
                  <span>{ratingCountByLesson[l.id] || 0}</span>
                  {commentCountByLesson[l.id] > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-[#ff5a36]">
                      <StickyNote size={10} /> {commentCountByLesson[l.id]}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <FieldInline
              label="Notiz zur Lektion"
              value={l.notes}
              display={l.notes || "—"}
              full
              onSave={(v) => patchLesson(l.id, "notes", v)}
            />
            <button
              onClick={() => removeLesson(l.id)}
              data-testid={`lesson-delete-${l.lesson_number}`}
              className="w-9 h-9 flex items-center justify-center rounded-full text-[#a8a29e] hover:text-[#dc2626] hover:bg-[#fee2e2]"
              aria-label="Löschen"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Compact inline label + input with autosave onBlur. */
function FieldInline({ label, value, display, type = "text", full, onSave }) {
  const [draft, setDraft] = useState(value ?? "");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  if (editing) {
    return (
      <div className={full ? "w-full" : ""}>
        <label className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] block mb-1">
          {label}
        </label>
        <input
          autoFocus
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setEditing(false);
            if (draft !== value) onSave(draft);
          }}
          className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#ff5a36]"
        />
      </div>
    );
  }
  return (
    <div className={full ? "w-full" : ""}>
      <label className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] block mb-1">
        {label}
      </label>
      <button
        onClick={() => setEditing(true)}
        className="text-sm text-[#0f172a] font-medium text-left w-full hover:text-[#ff5a36] transition-colors"
      >
        {display}
      </button>
    </div>
  );
}
