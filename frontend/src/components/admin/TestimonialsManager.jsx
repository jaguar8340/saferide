import { useEffect, useState } from "react";
import { Plus, Trash2, Save, X, Star } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";
import { useLang } from "@/contexts/LanguageContext";

const empty = { name: "", rating: 5, date: "", text_de: "", text_en: "" };

const BTN_PRIMARY =
  "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[10px] font-extrabold tracking-widest uppercase bg-[#0033ff] text-[#ccff00] hover:bg-[#0022cc] transition-colors";
const BTN_GHOST =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-extrabold tracking-widest uppercase border-2 border-[#0a0a0a] text-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-white transition-colors";
const BTN_DANGER =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-extrabold tracking-widest uppercase border-2 border-[#0a0a0a] text-[#0a0a0a] hover:bg-[#ff0055] hover:text-white hover:border-[#ff0055] transition-colors";

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
          <h2 className="font-display font-black uppercase tracking-tighter text-3xl md:text-4xl">
            {t.admin.tabs.testimonials}
          </h2>
          <p className="text-[#0a0a0a]/55 text-sm mt-1 font-medium">{items.length} Einträge</p>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} data-testid="testimonial-add-btn" className={BTN_PRIMARY}>
            <Plus size={13} /> {t.admin.add}
          </button>
        )}
      </div>

      {adding && (
        <div
          data-testid="testimonial-form"
          className="bg-white border-2 border-[#0a0a0a]/10 rounded-3xl p-6 mb-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input label="Name" value={form.name} onChange={setField("name")} testid="testimonial-name" />
            <Input label="Datum (z.B. Juni 2026)" value={form.date} onChange={setField("date")} testid="testimonial-date" />
            <Input label="Bewertung (1–5)" type="number" value={form.rating} onChange={setField("rating")} testid="testimonial-rating" />
          </div>
          <Textarea label="Text DE" value={form.text_de} onChange={setField("text_de")} testid="testimonial-text-de" />
          <Textarea label="Text EN" value={form.text_en} onChange={setField("text_en")} testid="testimonial-text-en" />
          <div className="flex gap-2">
            <button onClick={save} disabled={busy} data-testid="testimonial-save" className={`${BTN_PRIMARY} disabled:opacity-60`}>
              <Save size={13} /> {busy ? t.admin.saving : t.admin.save}
            </button>
            <button onClick={cancel} data-testid="testimonial-cancel" className={BTN_GHOST}>
              <X size={13} /> {t.admin.cancel}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((it) => (
          <div
            key={it.id}
            data-testid={`testimonial-row-${it.id}`}
            className="bg-white border-2 border-[#0a0a0a]/10 rounded-3xl p-5"
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <div>
                <div className="font-display font-extrabold text-lg">{it.name}</div>
                <div className="text-[10px] tracking-widest uppercase text-[#0a0a0a]/45 mt-0.5 font-bold">{it.date}</div>
              </div>
              <div className="flex">
                {[...Array(it.rating || 5)].map((_, i) => (
                  <Star key={i} size={12} className="text-[#ff0055]" fill="#ff0055" />
                ))}
              </div>
            </div>
            <p className="text-sm text-[#0a0a0a]/75 leading-relaxed line-clamp-3 font-medium">&ldquo;{it.text_de}&rdquo;</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => startEdit(it)} data-testid={`testimonial-edit-${it.id}`} className={BTN_GHOST}>
                {t.admin.edit}
              </button>
              <button onClick={() => remove(it.id)} data-testid={`testimonial-delete-${it.id}`} className={BTN_DANGER}>
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
      <span className="text-[10px] tracking-[0.25em] uppercase text-[#0a0a0a]/60 font-extrabold block mb-2">{label}</span>
      <input
        type={type}
        value={value ?? ""}
        onChange={onChange}
        data-testid={testid}
        className="w-full bg-[#f4f5f0] border-2 border-[#0a0a0a]/10 focus:border-[#0033ff] focus:outline-none px-3 py-2.5 text-sm text-[#0a0a0a] rounded-xl font-medium"
      />
    </label>
  );
}

function Textarea({ label, value, onChange, testid }) {
  return (
    <label className="block">
      <span className="text-[10px] tracking-[0.25em] uppercase text-[#0a0a0a]/60 font-extrabold block mb-2">{label}</span>
      <textarea
        rows={3}
        value={value ?? ""}
        onChange={onChange}
        data-testid={testid}
        className="w-full bg-[#f4f5f0] border-2 border-[#0a0a0a]/10 focus:border-[#0033ff] focus:outline-none px-3 py-2.5 text-sm text-[#0a0a0a] resize-y rounded-xl font-medium"
      />
    </label>
  );
}
