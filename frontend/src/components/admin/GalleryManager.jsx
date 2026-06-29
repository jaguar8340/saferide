import { useEffect, useState } from "react";
import { Plus, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";
import { useLang } from "@/contexts/LanguageContext";

const empty = { image_url: "", caption_de: "", caption_en: "" };

const BTN_PRIMARY =
  "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[10px] font-extrabold tracking-widest uppercase bg-[#0033ff] text-[#ccff00] hover:bg-[#0022cc] transition-colors";
const BTN_GHOST =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-extrabold tracking-widest uppercase border-2 border-[#0a0a0a] text-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-white transition-colors";
const BTN_DANGER =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-extrabold tracking-widest uppercase border-2 border-[#0a0a0a] text-[#0a0a0a] hover:bg-[#ff0055] hover:text-white hover:border-[#ff0055] transition-colors";

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

  const inputCls = "w-full bg-[#f4f5f0] border-2 border-[#0a0a0a]/10 focus:border-[#0033ff] focus:outline-none px-3 py-2.5 text-sm text-[#0a0a0a] rounded-xl font-medium";

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h2 className="font-display font-black uppercase tracking-tighter text-3xl md:text-4xl">
            {t.admin.tabs.gallery}
          </h2>
          <p className="text-[#0a0a0a]/55 text-sm mt-1 font-medium">{items.length} Bilder</p>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} data-testid="gallery-add-btn" className={BTN_PRIMARY}>
            <Plus size={13} /> {t.admin.add}
          </button>
        )}
      </div>

      {adding && (
        <div
          data-testid="gallery-form"
          className="bg-white border-2 border-[#0a0a0a]/10 rounded-3xl p-6 mb-6 space-y-4"
        >
          <label className="block">
            <span className="text-[10px] tracking-[0.25em] uppercase text-[#0a0a0a]/60 font-extrabold block mb-2">Bild URL</span>
            <input
              type="text"
              value={form.image_url}
              onChange={setField("image_url")}
              data-testid="gallery-image-url"
              className={inputCls}
              placeholder="https://…"
            />
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[10px] tracking-[0.25em] uppercase text-[#0a0a0a]/60 font-extrabold block mb-2">Caption DE</span>
              <input value={form.caption_de} onChange={setField("caption_de")} data-testid="gallery-caption-de" className={inputCls} />
            </label>
            <label className="block">
              <span className="text-[10px] tracking-[0.25em] uppercase text-[#0a0a0a]/60 font-extrabold block mb-2">Caption EN</span>
              <input value={form.caption_en} onChange={setField("caption_en")} data-testid="gallery-caption-en" className={inputCls} />
            </label>
          </div>
          {form.image_url && (
            <div className="h-40 bg-[#f4f5f0] overflow-hidden rounded-2xl border-2 border-[#0a0a0a]/10">
              <img src={form.image_url} alt="preview" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={save} disabled={busy} data-testid="gallery-save" className={`${BTN_PRIMARY} disabled:opacity-60`}>
              <Save size={13} /> {busy ? t.admin.saving : t.admin.save}
            </button>
            <button onClick={cancel} data-testid="gallery-cancel" className={BTN_GHOST}>
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
            className="bg-white border-2 border-[#0a0a0a]/10 rounded-3xl overflow-hidden group"
          >
            <div className="h-40 overflow-hidden">
              <img src={g.image_url} alt={g.caption_de || "image"} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
            </div>
            <div className="p-3">
              <p className="text-xs text-[#0a0a0a]/70 line-clamp-1 font-medium">{g.caption_de || "—"}</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => startEdit(g)} data-testid={`gallery-edit-${g.id}`} className="rounded-full text-[10px] py-1.5 px-2.5 border-2 border-[#0a0a0a]/15 text-[#0a0a0a]/70 hover:text-[#0a0a0a] hover:border-[#0a0a0a] tracking-widest uppercase font-extrabold">
                  {t.admin.edit}
                </button>
                <button onClick={() => remove(g.id)} data-testid={`gallery-delete-${g.id}`} className="rounded-full text-[10px] py-1.5 px-2.5 border-2 border-[#0a0a0a]/15 text-[#0a0a0a]/70 hover:text-white hover:bg-[#ff0055] hover:border-[#ff0055] inline-flex items-center gap-1.5">
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
