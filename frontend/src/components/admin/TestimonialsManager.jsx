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
      if (editingId) {
        await api.put(`/testimonials/${editingId}`, form);
      } else {
        await api.post("/testimonials", form);
      }
      toast.success(t.admin.saved);
      cancel();
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Wirklich löschen?")) return;
    try {
      await api.delete(`/testimonials/${id}`);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h2 className="font-display font-bold uppercase tracking-tight text-2xl md:text-3xl">
            {t.admin.tabs.testimonials}
          </h2>
          <p className="text-white/55 text-sm mt-1">{items.length} Einträge</p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            data-testid="testimonial-add-btn"
            className="btn-primary text-[10px] py-2 px-4"
            style={{ borderRadius: 2 }}
          >
            <Plus size={13} /> {t.admin.add}
          </button>
        )}
      </div>

      {adding && (
        <div
          data-testid="testimonial-form"
          className="card-surface p-6 mb-6 space-y-4"
          style={{ borderRadius: 2 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input label="Name" value={form.name} onChange={setField("name")} testid="testimonial-name" />
            <Input label="Datum (z.B. Juni 2026)" value={form.date} onChange={setField("date")} testid="testimonial-date" />
            <Input label="Bewertung (1–5)" type="number" value={form.rating} onChange={setField("rating")} testid="testimonial-rating" />
          </div>
          <Textarea label="Text DE" value={form.text_de} onChange={setField("text_de")} testid="testimonial-text-de" />
          <Textarea label="Text EN" value={form.text_en} onChange={setField("text_en")} testid="testimonial-text-en" />
          <div className="flex gap-2">
            <button onClick={save} disabled={busy} data-testid="testimonial-save" className="btn-primary text-[10px] py-2 px-4 disabled:opacity-60" style={{ borderRadius: 2 }}>
              <Save size={13} /> {busy ? t.admin.saving : t.admin.save}
            </button>
            <button onClick={cancel} data-testid="testimonial-cancel" className="btn-ghost text-[10px] py-2 px-4" style={{ borderRadius: 2 }}>
              <X size={13} /> {t.admin.cancel}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((it) => (
          <div
            key={it.id}
            data-testid={`testimonial-row-${it.id}`}
            className="card-surface p-5"
            style={{ borderRadius: 2 }}
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <div>
                <div className="font-display font-bold">{it.name}</div>
                <div className="text-[10px] tracking-widest uppercase text-white/45 mt-0.5">{it.date}</div>
              </div>
              <div className="flex">
                {[...Array(it.rating || 5)].map((_, i) => (
                  <Star key={i} size={12} className="text-[#FF2E00]" fill="#FF2E00" />
                ))}
              </div>
            </div>
            <p className="text-xs text-white/70 leading-relaxed line-clamp-3">&ldquo;{it.text_de}&rdquo;</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => startEdit(it)} data-testid={`testimonial-edit-${it.id}`} className="btn-ghost text-[10px] py-1.5 px-3" style={{ borderRadius: 2 }}>
                {t.admin.edit}
              </button>
              <button onClick={() => remove(it.id)} data-testid={`testimonial-delete-${it.id}`} className="text-[10px] py-1.5 px-3 text-white/60 hover:text-[#FF2E00] tracking-widest uppercase font-bold inline-flex items-center gap-2 border border-white/10" style={{ borderRadius: 2 }}>
                <Trash2 size={12} /> {t.admin.delete}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", testid }) {
  return (
    <label className="block">
      <span className="text-[10px] tracking-[0.25em] uppercase text-white/55 font-bold block mb-2">{label}</span>
      <input
        type={type}
        value={value ?? ""}
        onChange={onChange}
        data-testid={testid}
        className="w-full bg-[#0f0f0f] border border-white/10 focus:border-[#FF2E00] focus:outline-none px-3 py-2.5 text-sm text-white"
        style={{ borderRadius: 2 }}
      />
    </label>
  );
}

function Textarea({ label, value, onChange, testid }) {
  return (
    <label className="block">
      <span className="text-[10px] tracking-[0.25em] uppercase text-white/55 font-bold block mb-2">{label}</span>
      <textarea
        rows={3}
        value={value ?? ""}
        onChange={onChange}
        data-testid={testid}
        className="w-full bg-[#0f0f0f] border border-white/10 focus:border-[#FF2E00] focus:outline-none px-3 py-2.5 text-sm text-white resize-y"
        style={{ borderRadius: 2 }}
      />
    </label>
  );
}
