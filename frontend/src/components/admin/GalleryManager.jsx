import { useEffect, useState } from "react";
import { Plus, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";
import { useLang } from "@/contexts/LanguageContext";

const empty = { image_url: "", caption_de: "", caption_en: "" };

export default function GalleryManager() {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const r = await api.get("/gallery");
      setItems(r.data);
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const setField = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({ image_url: item.image_url, caption_de: item.caption_de || "", caption_en: item.caption_en || "" });
    setAdding(true);
  };

  const cancel = () => {
    setAdding(false);
    setEditingId(null);
    setForm(empty);
  };

  const save = async () => {
    if (!form.image_url) {
      toast.error("Bild URL ist erforderlich");
      return;
    }
    setBusy(true);
    try {
      if (editingId) {
        await api.put(`/gallery/${editingId}`, form);
      } else {
        await api.post("/gallery", form);
      }
      toast.success(t.admin.saved);
      cancel();
      load();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setBusy(false); }
  };

  const remove = async (id) => {
    if (!confirm("Wirklich löschen?")) return;
    try {
      await api.delete(`/gallery/${id}`);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h2 className="font-display font-bold uppercase tracking-tight text-2xl md:text-3xl">
            {t.admin.tabs.gallery}
          </h2>
          <p className="text-white/55 text-sm mt-1">{items.length} Bilder</p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            data-testid="gallery-add-btn"
            className="btn-primary text-[10px] py-2 px-4"
            style={{ borderRadius: 2 }}
          >
            <Plus size={13} /> {t.admin.add}
          </button>
        )}
      </div>

      {adding && (
        <div
          data-testid="gallery-form"
          className="card-surface p-6 mb-6 space-y-4"
          style={{ borderRadius: 2 }}
        >
          <label className="block">
            <span className="text-[10px] tracking-[0.25em] uppercase text-white/55 font-bold block mb-2">Bild URL</span>
            <input
              type="text"
              value={form.image_url}
              onChange={setField("image_url")}
              data-testid="gallery-image-url"
              className="w-full bg-[#0f0f0f] border border-white/10 focus:border-[#FF2E00] focus:outline-none px-3 py-2.5 text-sm text-white"
              style={{ borderRadius: 2 }}
              placeholder="https://…"
            />
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[10px] tracking-[0.25em] uppercase text-white/55 font-bold block mb-2">Caption DE</span>
              <input value={form.caption_de} onChange={setField("caption_de")} data-testid="gallery-caption-de" className="w-full bg-[#0f0f0f] border border-white/10 focus:border-[#FF2E00] focus:outline-none px-3 py-2.5 text-sm text-white" style={{ borderRadius: 2 }} />
            </label>
            <label className="block">
              <span className="text-[10px] tracking-[0.25em] uppercase text-white/55 font-bold block mb-2">Caption EN</span>
              <input value={form.caption_en} onChange={setField("caption_en")} data-testid="gallery-caption-en" className="w-full bg-[#0f0f0f] border border-white/10 focus:border-[#FF2E00] focus:outline-none px-3 py-2.5 text-sm text-white" style={{ borderRadius: 2 }} />
            </label>
          </div>
          {form.image_url && (
            <div className="h-40 bg-[#0a0a0a] overflow-hidden" style={{ borderRadius: 2 }}>
              <img src={form.image_url} alt="preview" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={save} disabled={busy} data-testid="gallery-save" className="btn-primary text-[10px] py-2 px-4 disabled:opacity-60" style={{ borderRadius: 2 }}>
              <Save size={13} /> {busy ? t.admin.saving : t.admin.save}
            </button>
            <button onClick={cancel} data-testid="gallery-cancel" className="btn-ghost text-[10px] py-2 px-4" style={{ borderRadius: 2 }}>
              <X size={13} /> {t.admin.cancel}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((g) => (
          <div
            key={g.id}
            data-testid={`gallery-row-${g.id}`}
            className="card-surface overflow-hidden group"
            style={{ borderRadius: 2 }}
          >
            <div className="h-40 overflow-hidden">
              <img src={g.image_url} alt={g.caption_de || "image"} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </div>
            <div className="p-3">
              <p className="text-xs text-white/70 line-clamp-1">{g.caption_de || "—"}</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => startEdit(g)} data-testid={`gallery-edit-${g.id}`} className="text-[10px] py-1.5 px-2.5 border border-white/15 text-white/70 hover:text-white tracking-widest uppercase font-bold" style={{ borderRadius: 2 }}>
                  {t.admin.edit}
                </button>
                <button onClick={() => remove(g.id)} data-testid={`gallery-delete-${g.id}`} className="text-[10px] py-1.5 px-2.5 border border-white/15 text-white/70 hover:text-[#FF2E00] inline-flex items-center gap-1.5" style={{ borderRadius: 2 }}>
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
