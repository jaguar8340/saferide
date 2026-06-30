import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Save, X, UploadCloud, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError, resolveUrl } from "@/lib/api";
import { useLang } from "@/contexts/LanguageContext";

const empty = { image_url: "", caption_de: "", caption_en: "" };

export default function GalleryManager() {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

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

  const handleFiles = async (filesList) => {
    const file = filesList?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Bitte eine Bilddatei wählen");
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    setUploading(true);
    try {
      const r = await api.post("/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((p) => ({ ...p, image_url: r.data.url }));
      toast.success(t.admin.uploaded);
    } catch (e) {
      toast.error(formatApiError(e, "Upload fehlgeschlagen"));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.image_url) {
      toast.error("Bitte zuerst ein Bild hochladen");
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
      <div className="flex items-center justify-between flex-wrap gap-3 mb-7">
        <div>
          <h2 className="font-display leading-[0.98] tracking-tight text-3xl md:text-4xl">
            {t.admin.tabs.gallery}
          </h2>
          <p className="text-[#475569] text-sm mt-1 font-medium">{items.length} Bilder</p>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} data-testid="gallery-add-btn" className="btn-primary text-xs py-2 px-4">
            <Plus size={13} /> {t.admin.add}
          </button>
        )}
      </div>

      {adding && (
        <div
          data-testid="gallery-form"
          className="card p-6 md:p-7 mb-6 space-y-5"
        >
          <div>
            <label className="label">Bild</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFiles(e.target.files)}
              data-testid="gallery-file-input"
              className="hidden"
            />
            {form.image_url ? (
              <div className="mt-3 relative">
                <img
                  src={resolveUrl(form.image_url)}
                  alt="preview"
                  className="w-full h-56 object-cover rounded-xl border border-[#e7e5e4]"
                />
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    data-testid="gallery-replace-image"
                    className="btn-ghost text-xs py-2 px-3"
                  >
                    <UploadCloud size={13} /> Ersetzen
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, image_url: "" }))}
                    data-testid="gallery-clear-image"
                    className="btn-ghost text-xs py-2 px-3"
                  >
                    <X size={13} /> Entfernen
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                data-testid="gallery-upload-btn"
                className="mt-2 w-full border border-dashed border-[#d6d3d1] rounded-xl p-10 flex flex-col items-center gap-2 hover:border-[#065f46] hover:bg-[#fafaf9] transition-colors disabled:opacity-60"
              >
                {uploading ? (
                  <>
                    <UploadCloud size={22} className="text-[#065f46] animate-pulse" />
                    <span className="text-sm font-medium text-[#1c1917]">{t.admin.uploading}</span>
                  </>
                ) : (
                  <>
                    <ImageIcon size={22} className="text-[#78716c]" />
                    <span className="text-sm font-medium text-[#1c1917]">{t.admin.dropHere}</span>
                    <span className="text-xs text-[#a8a29e]">JPG · PNG · WEBP · GIF · bis 10 MB</span>
                  </>
                )}
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <label className="block">
              <span className="label">Caption DE</span>
              <input value={form.caption_de} onChange={setField("caption_de")} data-testid="gallery-caption-de" className="input-underline mt-1" />
            </label>
            <label className="block">
              <span className="label">Caption EN</span>
              <input value={form.caption_en} onChange={setField("caption_en")} data-testid="gallery-caption-en" className="input-underline mt-1" />
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={busy} data-testid="gallery-save" className="btn-primary text-xs py-2 px-4 disabled:opacity-60">
              <Save size={13} /> {busy ? t.admin.saving : t.admin.save}
            </button>
            <button onClick={cancel} data-testid="gallery-cancel" className="btn-ghost text-xs py-2 px-3">
              <X size={13} /> {t.admin.cancel}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((g) => (
          <div
            key={g.id}
            data-testid={`gallery-row-${g.id}`}
            className="card overflow-hidden group"
          >
            <div className="h-40 overflow-hidden">
              <img src={resolveUrl(g.image_url)} alt={g.caption_de || "image"} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </div>
            <div className="p-3">
              <p className="text-xs text-[#57534e] line-clamp-1 font-light">{g.caption_de || "—"}</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => startEdit(g)} data-testid={`gallery-edit-${g.id}`} className="text-xs py-1.5 px-2.5 rounded-full border border-[#e7e5e4] text-[#57534e] hover:text-[#1c1917] hover:border-[#1c1917] transition-colors">
                  {t.admin.edit}
                </button>
                <button onClick={() => remove(g.id)} data-testid={`gallery-delete-${g.id}`} className="text-xs py-1.5 px-2.5 rounded-full border border-[#e7e5e4] text-[#57534e] hover:text-red-600 hover:border-red-600 inline-flex items-center gap-1.5 transition-colors">
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
