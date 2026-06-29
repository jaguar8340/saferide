import { useEffect, useState } from "react";
import { Mail, Phone, Trash2, Check, Inbox as InboxIcon } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";
import { useLang } from "@/contexts/LanguageContext";

export default function SubmissionsViewer() {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const r = await api.get("/contact/submissions");
      setItems(r.data);
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const remove = async (id) => {
    if (!confirm("Wirklich löschen?")) return;
    try {
      await api.delete(`/contact/submissions/${id}`);
      if (selected?.id === id) setSelected(null);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const markRead = async (id) => {
    try {
      await api.patch(`/contact/submissions/${id}/read`);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const formatDate = (s) => {
    try { return new Date(s).toLocaleString("de-CH"); } catch { return s; }
  };

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h2 className="font-display font-bold uppercase tracking-tight text-2xl md:text-3xl">
          {t.admin.tabs.submissions}
        </h2>
        <p className="text-white/55 text-sm mt-1">{items.length} Anfragen · {items.filter(i => !i.read).length} ungelesen</p>
      </div>

      {items.length === 0 ? (
        <div className="card-surface p-10 text-center text-white/50 text-sm" style={{ borderRadius: 2 }}>
          <InboxIcon className="mx-auto mb-3 text-white/30" />
          {t.admin.noItems}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5 space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {items.map((s) => (
              <button
                key={s.id}
                onClick={() => { setSelected(s); if (!s.read) markRead(s.id); }}
                data-testid={`submission-row-${s.id}`}
                className={`w-full text-left p-4 border ${selected?.id === s.id ? "border-[#FF2E00] bg-[#141414]" : "border-white/10 bg-[#0f0f0f]"} transition-colors`}
                style={{ borderRadius: 2 }}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="font-display font-bold text-sm">{s.first_name} {s.last_name}</div>
                  {!s.read && <span className="w-2 h-2 rounded-full bg-[#FF2E00] mt-1.5" />}
                </div>
                <div className="text-[10px] tracking-widest uppercase text-white/45 mb-2">{formatDate(s.created_at)}</div>
                <div className="text-xs text-white/65 line-clamp-2">{s.message || s.email}</div>
              </button>
            ))}
          </div>
          <div className="lg:col-span-7">
            {selected ? (
              <div className="card-surface p-6" style={{ borderRadius: 2 }} data-testid="submission-detail">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="font-display font-black text-2xl">{selected.first_name} {selected.last_name}</div>
                    <div className="text-xs text-white/45 mt-1">{formatDate(selected.created_at)}</div>
                  </div>
                  <button onClick={() => remove(selected.id)} data-testid="submission-delete" className="text-[10px] py-2 px-3 border border-white/15 text-white/60 hover:text-[#FF2E00] inline-flex items-center gap-2 tracking-widest uppercase font-bold" style={{ borderRadius: 2 }}>
                    <Trash2 size={12} /> {t.admin.delete}
                  </button>
                </div>
                <div className="space-y-2 text-sm border-t border-white/10 pt-4">
                  <a href={`mailto:${selected.email}`} className="flex items-center gap-2 text-white/80 hover:text-white" data-testid="submission-email-link">
                    <Mail size={14} className="text-[#FF2E00]" /> {selected.email}
                  </a>
                  <a href={`tel:${selected.phone}`} className="flex items-center gap-2 text-white/80 hover:text-white" data-testid="submission-phone-link">
                    <Phone size={14} className="text-[#FF2E00]" /> {selected.phone}
                  </a>
                </div>
                {selected.message && (
                  <div className="mt-5 p-4 bg-[#0f0f0f] border border-white/10 text-sm text-white/75 leading-relaxed whitespace-pre-wrap" style={{ borderRadius: 2 }}>
                    {selected.message}
                  </div>
                )}
              </div>
            ) : (
              <div className="card-surface p-10 text-center text-white/50 text-sm" style={{ borderRadius: 2 }}>
                Anfrage links auswählen
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
