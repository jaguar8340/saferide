import { useEffect, useState } from "react";
import { Mail, Phone, Trash2, Inbox as InboxIcon } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";
import { useLang } from "@/contexts/LanguageContext";

const BTN_DANGER =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-extrabold tracking-widest uppercase border-2 border-[#0a0a0a] text-[#0a0a0a] hover:bg-[#ff0055] hover:text-white hover:border-[#ff0055] transition-colors";

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
        <h2 className="font-display font-black uppercase tracking-tighter text-3xl md:text-4xl">
          {t.admin.tabs.submissions}
        </h2>
        <p className="text-[#0a0a0a]/55 text-sm mt-1 font-medium">{items.length} Anfragen · {items.filter(i => !i.read).length} ungelesen</p>
      </div>

      {items.length === 0 ? (
        <div className="bg-white border-2 border-[#0a0a0a]/10 rounded-3xl p-10 text-center text-[#0a0a0a]/50 text-sm font-medium">
          <InboxIcon className="mx-auto mb-3 text-[#0a0a0a]/30" />
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
                className={`w-full text-left p-4 border-2 rounded-2xl transition-colors ${
                  selected?.id === s.id
                    ? "border-[#0033ff] bg-[#0033ff]/5"
                    : "border-[#0a0a0a]/10 bg-white hover:border-[#0a0a0a]/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="font-display font-extrabold text-base">{s.first_name} {s.last_name}</div>
                  {!s.read && <span className="w-2 h-2 rounded-full bg-[#ff0055] mt-1.5" />}
                </div>
                <div className="text-[10px] tracking-widest uppercase text-[#0a0a0a]/45 mb-2 font-bold">{formatDate(s.created_at)}</div>
                <div className="text-xs text-[#0a0a0a]/65 line-clamp-2 font-medium">{s.message || s.email}</div>
              </button>
            ))}
          </div>
          <div className="lg:col-span-7">
            {selected ? (
              <div className="bg-white border-2 border-[#0a0a0a]/10 rounded-3xl p-6" data-testid="submission-detail">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="font-display font-black text-3xl uppercase tracking-tighter">{selected.first_name} {selected.last_name}</div>
                    <div className="text-xs text-[#0a0a0a]/45 mt-1 font-bold tracking-wider uppercase">{formatDate(selected.created_at)}</div>
                  </div>
                  <button onClick={() => remove(selected.id)} data-testid="submission-delete" className={BTN_DANGER}>
                    <Trash2 size={12} /> {t.admin.delete}
                  </button>
                </div>
                <div className="space-y-3 text-sm border-t-2 border-[#0a0a0a]/10 pt-4 font-medium">
                  <a href={`mailto:${selected.email}`} className="flex items-center gap-2 text-[#0a0a0a]/80 hover:text-[#0033ff]" data-testid="submission-email-link">
                    <Mail size={14} className="text-[#0033ff]" /> {selected.email}
                  </a>
                  <a href={`tel:${selected.phone}`} className="flex items-center gap-2 text-[#0a0a0a]/80 hover:text-[#0033ff]" data-testid="submission-phone-link">
                    <Phone size={14} className="text-[#0033ff]" /> {selected.phone}
                  </a>
                </div>
                {selected.message && (
                  <div className="mt-5 p-4 bg-[#f4f5f0] border-2 border-[#0a0a0a]/10 text-sm text-[#0a0a0a]/75 leading-relaxed whitespace-pre-wrap rounded-2xl font-medium">
                    {selected.message}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border-2 border-[#0a0a0a]/10 rounded-3xl p-10 text-center text-[#0a0a0a]/50 text-sm font-medium">
                Anfrage links auswählen
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
