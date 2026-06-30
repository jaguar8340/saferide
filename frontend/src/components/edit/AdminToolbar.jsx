import { Link } from "react-router-dom";
import { Check, Eye, Inbox, LogOut, Settings2, Loader2, PencilLine } from "lucide-react";
import { useEdit } from "@/contexts/EditContext";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminToolbar() {
  const { isAdmin, editMode, setEditMode, saving } = useEdit();
  const { logout } = useAuth();

  if (!isAdmin) return null;

  return (
    <div
      data-testid="admin-toolbar"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 bg-[#0f172a] text-white rounded-full pl-2 pr-2 py-2 shadow-[0_18px_45px_-15px_rgba(15,23,42,0.6)] border border-white/10"
    >
      <button
        onClick={() => setEditMode(!editMode)}
        data-testid="toolbar-toggle-edit"
        className={`inline-flex items-center gap-2 rounded-full pl-3 pr-4 py-2 text-xs font-semibold tracking-wide uppercase transition-colors ${
          editMode
            ? "bg-[#ff5a36] text-white"
            : "bg-white/10 text-white/80 hover:bg-white/20"
        }`}
        title={editMode ? "Bearbeitungsmodus aktiv" : "Bearbeitungsmodus aus"}
      >
        {editMode ? <PencilLine size={14} /> : <Eye size={14} />}
        {editMode ? "Bearbeiten" : "Vorschau"}
      </button>

      <span
        data-testid="toolbar-status"
        className="hidden sm:inline-flex items-center gap-2 px-3 text-[11px] tracking-wide font-medium text-white/70"
      >
        {saving ? (
          <>
            <Loader2 size={12} className="animate-spin" /> Speichere …
          </>
        ) : (
          <>
            <Check size={12} className="text-[#84cc16]" /> Live
          </>
        )}
      </span>

      <Link
        to="/admin"
        data-testid="toolbar-manage"
        className="hidden md:inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold tracking-wide uppercase text-white/80 hover:bg-white/10 transition-colors"
        title="Verwaltung (Bewertungen, Galerie, Anfragen)"
      >
        <Settings2 size={13} /> Verwaltung
      </Link>

      <Link
        to="/admin?tab=submissions"
        data-testid="toolbar-submissions"
        className="hidden md:inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold tracking-wide uppercase text-white/80 hover:bg-white/10 transition-colors"
      >
        <Inbox size={13} /> Anfragen
      </Link>

      <button
        onClick={logout}
        data-testid="toolbar-logout"
        className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold tracking-wide uppercase text-white/80 hover:bg-white/10 transition-colors"
        title="Abmelden"
      >
        <LogOut size={13} />
      </button>
    </div>
  );
}
