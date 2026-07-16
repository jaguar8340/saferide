/**
 * Fahrstunden-Tab — compact, well-structured card view per lesson.
 *
 * Layout per lesson (Card):
 *   Header    : L{n} badge · editable date · duration · quick delete
 *   Content   : 3 columns → Strecken · Bewertungen · Notiz zur Lektion
 *   Extras    : Diverse Notizen die zum Datum passen (fk_notes) mit optionalem Bild
 *
 * Data source:
 *   • /api/fahrkontrolle/students/{id}/lessons        (list)
 *   • /api/fahrkontrolle/students/{id}/assessments    (count comments/ratings)
 *   • /api/fahrkontrolle/routes                       (route names)
 *   • /api/fahrkontrolle/students/{id}/notes          (diverse Notizen, matched by date)
 */
import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Trash2,
  Route as RouteIcon,
  StickyNote,
  Plus,
  Calendar,
  Clock,
  ImageIcon,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError, resolveUrl } from "@/lib/api";

const formatDMY = (iso) => {
  if (!iso || typeof iso !== "string") return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "—";
};

/** Normalize any date-ish string to YYYY-MM-DD for matching. */
const dateKey = (iso) => (iso && typeof iso === "string" ? iso.slice(0, 10) : "");

export default function LessonsTab({ student }) {
  const [lessons, setLessons] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [fkNotes, setFkNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = async () => {
    try {
      const [l, a, r, n] = await Promise.all([
        api.get(`/fahrkontrolle/students/${student.id}/lessons`),
        api.get(`/fahrkontrolle/students/${student.id}/assessments`),
        api.get("/fahrkontrolle/routes"),
        api.get(`/fahrkontrolle/students/${student.id}/notes`),
      ]);
      setLessons(l.data);
      setAssessments(a.data);
      setRoutes(r.data);
      setFkNotes(n.data || []);
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

  /** Group diverse Notizen by date-key for O(1) lookup per lesson. */
  const notesByDate = useMemo(() => {
    const m = {};
    for (const n of fkNotes) {
      const k = dateKey(n.date);
      if (!k) continue;
      if (!m[k]) m[k] = [];
      m[k].push(n);
    }
    return m;
  }, [fkNotes]);

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
      <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
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

      <div className="grid grid-cols-1 gap-4">
        {lessons.map((l) => (
          <LessonCard
            key={l.id}
            lesson={l}
            routesById={routesById}
            ratingCount={ratingCountByLesson[l.id] || 0}
            commentCount={commentCountByLesson[l.id] || 0}
            linkedNotes={notesByDate[dateKey(l.date)] || []}
            onPatch={patchLesson}
            onDelete={removeLesson}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Compact per-lesson card                                            */
/* ------------------------------------------------------------------ */
function LessonCard({
  lesson,
  routesById,
  ratingCount,
  commentCount,
  linkedNotes,
  onPatch,
  onDelete,
}) {
  const routeNames = (lesson.routes || [])
    .map((rid) => routesById[rid]?.name)
    .filter(Boolean);

  return (
    <article
      data-testid={`lesson-card-${lesson.lesson_number}`}
      className="bg-white border border-[#e7e5e4] rounded-2xl overflow-hidden"
    >
      {/* ---------- Header ---------- */}
      <header className="flex flex-wrap items-center gap-3 px-4 md:px-5 py-3 bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white">
        <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center font-display text-lg shrink-0">
          L{lesson.lesson_number}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 flex-1 min-w-0">
          <HeaderInline
            icon={<Calendar size={12} />}
            label="Datum"
            value={lesson.date}
            type="date"
            display={formatDMY(lesson.date)}
            onSave={(v) => onPatch(lesson.id, "date", v)}
            testid={`lesson-card-date-${lesson.lesson_number}`}
          />
          <HeaderInline
            icon={<Clock size={12} />}
            label="Dauer"
            value={lesson.duration_min}
            type="number"
            display={`${lesson.duration_min || 0} min`}
            onSave={(v) => onPatch(lesson.id, "duration_min", parseInt(v, 10) || 0)}
            testid={`lesson-card-duration-${lesson.lesson_number}`}
          />
        </div>
        <button
          onClick={() => onDelete(lesson.id)}
          data-testid={`lesson-delete-${lesson.lesson_number}`}
          className="w-8 h-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10"
          aria-label="Löschen"
        >
          <Trash2 size={13} />
        </button>
      </header>

      {/* ---------- Body: 3 columns ---------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-[#f3f0eb]">
        {/* Strecken */}
        <section className="p-4 md:p-5">
          <SectionLabel icon={<RouteIcon size={12} />} title="Strecken" />
          <div className="mt-2">
            <div className="font-display text-2xl leading-none">
              {routeNames.length}
            </div>
            {routeNames.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {routeNames.slice(0, 6).map((name, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center text-[10px] tracking-wide bg-[#eef2ff] text-[#4338ca] px-2 py-0.5 rounded-full"
                  >
                    {name}
                  </span>
                ))}
                {routeNames.length > 6 && (
                  <span className="inline-flex items-center text-[10px] text-[#78716c]">
                    +{routeNames.length - 6}
                  </span>
                )}
              </div>
            ) : (
              <div className="mt-1.5 text-[11px] text-[#a8a29e] italic">
                Keine Strecken erfasst
              </div>
            )}
          </div>
        </section>

        {/* Bewertungen */}
        <section className="p-4 md:p-5">
          <SectionLabel icon={<StickyNote size={12} />} title="Bewertungen" />
          <div className="mt-2 flex items-baseline gap-3">
            <div className="font-display text-2xl leading-none">{ratingCount}</div>
            {commentCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase bg-[#fff7ed] text-[#c2410c] px-2 py-1 rounded-full">
                <MessageSquare size={10} /> {commentCount} Komment.
              </span>
            )}
          </div>
          <div className="mt-1.5 text-[11px] text-[#78716c]">
            {ratingCount > 0
              ? "Zellen in Fahrkontrolle bewertet"
              : "Noch nichts bewertet"}
          </div>
        </section>

        {/* Notiz zur Lektion */}
        <section className="p-4 md:p-5">
          <SectionLabel icon={<MessageSquare size={12} />} title="Notiz zur Lektion" />
          <FullNoteInline
            value={lesson.notes || ""}
            onSave={(v) => onPatch(lesson.id, "notes", v)}
            testid={`lesson-card-notes-${lesson.lesson_number}`}
          />
        </section>
      </div>

      {/* ---------- Verknüpfte Diverse Notizen (via Datum) ---------- */}
      {linkedNotes.length > 0 && (
        <div
          data-testid={`lesson-card-linked-notes-${lesson.lesson_number}`}
          className="border-t border-[#f3f0eb] bg-[#fbf9f6] px-4 md:px-5 py-3 space-y-2"
        >
          <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase text-[#c2410c]">
            <StickyNote size={11} />
            Diverse Notizen ({formatDMY(lesson.date)})
            <span className="ml-1 text-[#a8a29e]">· {linkedNotes.length}</span>
          </div>
          <ul className="space-y-2">
            {linkedNotes.map((n) => (
              <li
                key={n.id}
                data-testid={`lesson-linked-note-${n.id}`}
                className="bg-white border border-[#f3f0eb] rounded-xl p-3 flex gap-3 items-start"
              >
                {n.image_url && (
                  <a
                    href={resolveUrl(n.image_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                    data-testid={`lesson-linked-note-image-${n.id}`}
                  >
                    <img
                      src={resolveUrl(n.image_url)}
                      alt="Notiz"
                      className="w-14 h-14 object-cover rounded-lg border border-[#e7e5e4]"
                    />
                  </a>
                )}
                <div className="flex-1 text-sm text-[#334155] whitespace-pre-line leading-relaxed">
                  {n.text}
                </div>
                {!n.image_url && (
                  <ImageIcon size={12} className="text-[#d6d3d1] shrink-0 mt-1" />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

function SectionLabel({ icon, title }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase text-[#475569]">
      <span className="text-[#ff5a36]">{icon}</span>
      {title}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline editors                                                     */
/* ------------------------------------------------------------------ */

/** Compact inline field for the dark card header (chip-styled). */
function HeaderInline({ icon, label, value, display, type = "text", onSave, testid }) {
  const [draft, setDraft] = useState(value ?? "");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 bg-white/10 rounded-full pl-2 pr-1 py-1">
        <span className="text-white/70">{icon}</span>
        <input
          autoFocus
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setEditing(false);
            if (draft !== value) onSave(draft);
          }}
          data-testid={testid}
          className="w-32 text-xs bg-transparent text-white placeholder-white/60 border border-white/20 rounded-full px-2 py-0.5 focus:outline-none focus:border-[#ff5a36]"
        />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      data-testid={testid}
      className="inline-flex items-center gap-1.5 text-xs text-white/90 hover:text-white bg-white/5 hover:bg-white/10 rounded-full px-2.5 py-1 transition-colors"
      title={label}
    >
      <span className="text-white/60">{icon}</span>
      <span className="font-medium">{display}</span>
    </button>
  );
}

/** Multi-line note editor that auto-saves on blur. */
function FullNoteInline({ value, onSave, testid }) {
  const [draft, setDraft] = useState(value ?? "");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  return (
    <textarea
      rows={focused || draft ? 3 : 2}
      value={draft}
      placeholder="Notiz zur Lektion …"
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        if (draft !== (value ?? "")) onSave(draft);
      }}
      data-testid={testid}
      className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-xl px-3 py-2 focus:outline-none focus:border-[#ff5a36] resize-y mt-1.5"
    />
  );
}
