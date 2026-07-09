/**
 * Aktivitäten-Tab — read-only chronological audit log per student.
 *
 * Every write from other endpoints (student patch, lesson CRUD,
 * assessment upsert, invoice CRUD, document upload/delete) appends to
 * this feed via `core.activity.log_activity`. Newest first.
 */
import { useEffect, useState } from "react";
import {
  Loader2,
  UserRound,
  Pencil,
  Plus,
  Trash2,
  StickyNote,
  Receipt,
  FileText,
  ClipboardList,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";

const KIND_STYLES = {
  "student.create":    { icon: UserRound,     color: "#16a34a", label: "Angelegt" },
  "student.update":    { icon: Pencil,        color: "#1e6fff", label: "Stammdaten" },
  "lesson.create":     { icon: Plus,          color: "#ff5a36", label: "Neue Lektion" },
  "lesson.update":     { icon: Pencil,        color: "#1e6fff", label: "Lektion" },
  "lesson.delete":     { icon: Trash2,        color: "#dc2626", label: "Lektion gelöscht" },
  "assessment.upsert": { icon: StickyNote,    color: "#f97316", label: "Bewertung" },
  "invoice.create":    { icon: Receipt,       color: "#16a34a", label: "Rechnung" },
  "invoice.update":    { icon: Receipt,       color: "#1e6fff", label: "Rechnung" },
  "invoice.delete":    { icon: Trash2,        color: "#dc2626", label: "Rechnung gelöscht" },
  "document.upload":   { icon: FileText,      color: "#0f172a", label: "Dokument" },
  "document.delete":   { icon: Trash2,        color: "#dc2626", label: "Dokument gelöscht" },
  default:             { icon: ClipboardList, color: "#78716c", label: "Aktivität" },
};

const formatRelative = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "gerade eben";
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `vor ${Math.floor(diff / 86400)} Tagen`;
  return d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export default function ActivitiesTab({ student }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api.get(`/students/${student.id}/activities`, {
          params: { limit: 200 },
        });
        if (!cancelled) setItems(r.data);
      } catch (e) {
        if (!cancelled) toast.error(formatApiError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [student.id]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#78716c]">
        <Loader2 size={14} className="animate-spin" /> Lade Aktivitäten …
      </div>
    );
  }

  return (
    <div data-testid="activities-tab" className="max-w-3xl">
      <h2 className="font-display text-3xl md:text-4xl leading-none tracking-tight mb-6">
        Aktivitäten
      </h2>

      {items.length === 0 ? (
        <div className="bg-white border border-dashed border-[#e7e5e4] rounded-2xl p-10 text-center text-sm text-[#78716c]">
          <Trophy size={20} className="text-[#a8a29e] mx-auto mb-3" />
          Noch keine Aktivitäten. Änderungen an Stammdaten, Lektionen,
          Bewertungen und Rechnungen erscheinen hier automatisch.
        </div>
      ) : (
        <ol className="relative">
          <span className="absolute left-4 top-0 bottom-0 w-px bg-[#e7e5e4]" />
          {items.map((it) => {
            const meta = KIND_STYLES[it.kind] || KIND_STYLES.default;
            const Icon = meta.icon;
            return (
              <li
                key={it.id}
                data-testid={`activity-row-${it.id}`}
                className="relative pl-11 pb-4"
              >
                <div
                  className="absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center border border-white shadow-sm"
                  style={{ background: `${meta.color}18`, color: meta.color }}
                >
                  <Icon size={13} />
                </div>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span
                    className="text-[10px] font-semibold tracking-widest uppercase"
                    style={{ color: meta.color }}
                  >
                    {meta.label}
                  </span>
                  <span className="text-xs text-[#a8a29e]">
                    {formatRelative(it.created_at)}
                  </span>
                  {it.actor && (
                    <span className="text-xs text-[#78716c]">· {it.actor}</span>
                  )}
                </div>
                <div className="text-sm text-[#0f172a] leading-snug mt-0.5">
                  {it.message}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
