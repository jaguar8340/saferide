import { useEffect, useState } from "react";
import { Mail, Phone, Trash2, Inbox as InboxIcon } from "lucide-react";
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
      <div className="mb-7">
        <h2 className="font-display leading-[0.98] tracking-tight text-3xl md:text-4xl">
          {t.admin.tabs.submissions}
        </h2>
        <p className="text-[#475569] text-sm mt-1 font-medium">
          {items.length} Anfragen · {items.filter(i => !i.read).length} ungelesen
        </p>
      </div>

      {items.length === 0 ? (
        <div className="card p-10 text-center text-[#78716c] text-sm font-light">
          <InboxIcon className="mx-auto mb-3 text-[#a8a29e]" />
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
                className={`w-full text-left p-4 border rounded-xl transition-colors ${
                  selected?.id === s.id
                    ? "border-[#1c1917] bg-white"
                    : "border-[#e7e5e4] bg-white hover:border-[#a8a29e]"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="font-serif text-base">{s.first_name} {s.last_name}</div>
                  {!s.read && <span className="w-2 h-2 rounded-full bg-[#065f46] mt-1.5" />}
                </div>
                <div className="text-[10px] tracking-widest uppercase text-[#a8a29e] mb-2 font-medium">{formatDate(s.created_at)}</div>
                <div className="text-xs text-[#57534e] line-clamp-2 font-light">{s.message || s.email}</div>
              </button>
            ))}
          </div>
          <div className="lg:col-span-7">
            {selected ? (
              <div className="card p-6 md:p-7" data-testid="submission-detail">
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div>
                    <div className="font-serif text-3xl font-light leading-tight">{selected.first_name} {selected.last_name}</div>
                    <div className="text-xs text-[#a8a29e] mt-1 tracking-wider uppercase">{formatDate(selected.created_at)}</div>
                  </div>
                  <button onClick={() => remove(selected.id)} data-testid="submission-delete" className="text-xs py-2 px-3 rounded-full border border-[#e7e5e4] text-[#57534e] hover:text-red-600 hover:border-red-600 inline-flex items-center gap-1.5 transition-colors">
                    <Trash2 size={12} /> {t.admin.delete}
                  </button>
                </div>
                <div className="space-y-3 text-sm border-t border-[#e7e5e4] pt-5 font-light">
                  <a href={`mailto:${selected.email}`} className="flex items-center gap-2 text-[#1c1917] hover:text-[#065f46]" data-testid="submission-email-link">
                    <Mail size={14} className="text-[#065f46]" /> {selected.email}
                  </a>
                  <a href={`tel:${selected.phone}`} className="flex items-center gap-2 text-[#1c1917] hover:text-[#065f46]" data-testid="submission-phone-link">
                    <Phone size={14} className="text-[#065f46]" /> {selected.phone}
                  </a>
                </div>
                {selected.message && (
                  <div className="mt-5 p-4 bg-[#fafaf9] border border-[#e7e5e4] text-sm text-[#1c1917] leading-relaxed whitespace-pre-wrap rounded-lg font-light">
                    {selected.message}
                  </div>
                )}
              </div>
            ) : (
              <div className="card p-10 text-center text-[#78716c] text-sm font-light">
                Anfrage links auswählen
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
