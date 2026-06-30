import { useEffect, useState } from "react";
import { Plus, Trash2, Save, X, Star } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";
import { useLang } from "@/contexts/LanguageContext";

const empty = { name: "", rating: 5, date: "", text_de: "", text_en: "" };

export default function TestimonialsManager() {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const r = await api.get("/testimonials");
      setItems(r.data);
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const setField = (k) => (e) =>
    setForm((p) => ({ ...p, [k]: k === "rating" ? Number(e.target.value) : e.target.value }));

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      rating: item.rating,
      date: item.date,
      text_de: item.text_de,
      text_en: item.text_en || "",
    });
    setAdding(true);
  };

  const cancel = () => {
    setAdding(false);
    setEditingId(null);
    setForm(empty);
  };

  const save = async () => {
    setBusy(true);
    try {
      if (editingId) await api.put(`/testimonials/${editingId}`, form);
      else await api.post("/testimonials", form);
      toast.success(t.admin.saved);
      cancel();
      load();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setBusy(false); }
  };

  const remove = async (id) => {
    if (!confirm("Wirklich löschen?")) return;
    try {
      await api.delete(`/testimonials/${id}`);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const inputCls = "w-full bg-white border border-[#e7e5e4] focus:border-[#1c1917] focus:outline-none px-3 py-2.5 text-sm text-[#1c1917] rounded-lg font-light";

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-7">
        <div>
          <h2 className="font-display leading-[0.98] tracking-tight text-3xl md:text-4xl">
            {t.admin.tabs.testimonials}
          </h2>
          <p className="text-[#475569] text-sm mt-1 font-medium">{items.length} Einträge</p>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} data-testid="testimonial-add-btn" className="btn-primary text-xs py-2 px-4">
            <Plus size={13} /> {t.admin.add}
          </button>
        )}
      </div>

      {adding && (
        <div data-testid="testimonial-form" className="card p-6 md:p-7 mb-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="block">
              <span className="label">Name</span>
              <input value={form.name} onChange={setField("name")} data-testid="testimonial-name" className={inputCls + " mt-1"} />
            </label>
            <label className="block">
              <span className="label">Datum</span>
              <input value={form.date} onChange={setField("date")} data-testid="testimonial-date" className={inputCls + " mt-1"} />
            </label>
            <label className="block">
              <span className="label">Bewertung (1-5)</span>
              <input type="number" value={form.rating} onChange={setField("rating")} data-testid="testimonial-rating" className={inputCls + " mt-1"} />
            </label>
          </div>
          <label className="block">
            <span className="label">Text DE</span>
            <textarea rows={3} value={form.text_de} onChange={setField("text_de")} data-testid="testimonial-text-de" className={inputCls + " mt-1 resize-y"} />
          </label>
          <label className="block">
            <span className="label">Text EN</span>
            <textarea rows={3} value={form.text_en} onChange={setField("text_en")} data-testid="testimonial-text-en" className={inputCls + " mt-1 resize-y"} />
          </label>
          <div className="flex gap-2">
            <button onClick={save} disabled={busy} data-testid="testimonial-save" className="btn-primary text-xs py-2 px-4 disabled:opacity-60">
              <Save size={13} /> {busy ? t.admin.saving : t.admin.save}
            </button>
            <button onClick={cancel} data-testid="testimonial-cancel" className="btn-ghost text-xs py-2 px-3">
              <X size={13} /> {t.admin.cancel}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((it) => (
          <div key={it.id} data-testid={`testimonial-row-${it.id}`} className="card p-6">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <div className="font-serif text-lg">{it.name}</div>
                <div className="text-[10px] tracking-widest uppercase text-[#a8a29e] mt-0.5">{it.date}</div>
              </div>
              <div className="flex">
                {[...Array(it.rating || 5)].map((_, i) => (
                  <Star key={i} size={12} className="text-[#065f46]" fill="#065f46" />
                ))}
              </div>
            </div>
            <p className="text-sm text-[#57534e] leading-relaxed line-clamp-3 font-light">&ldquo;{it.text_de}&rdquo;</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => startEdit(it)} data-testid={`testimonial-edit-${it.id}`} className="text-xs py-1.5 px-3 rounded-full border border-[#e7e5e4] text-[#57534e] hover:text-[#1c1917] hover:border-[#1c1917] transition-colors">
                {t.admin.edit}
              </button>
              <button onClick={() => remove(it.id)} data-testid={`testimonial-delete-${it.id}`} className="text-xs py-1.5 px-3 rounded-full border border-[#e7e5e4] text-[#57534e] hover:text-red-600 hover:border-red-600 inline-flex items-center gap-1.5 transition-colors">
                <Trash2 size={11} /> {t.admin.delete}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
