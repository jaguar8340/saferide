import { useRef, useState } from "react";
import { Plus, Trash2, Loader2, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";
import { api, formatApiError, resolveUrl } from "@/lib/api";
import Editable from "@/components/edit/Editable";

export default function LocGallery({ loc, updateField }) {
  const { lang, pick } = useLang();
  const { editMode } = useEdit();
  const gallery = loc.gallery || [];
  const fileRef = useRef(null);
  const replaceTargetRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleAddImage = () => {
    replaceTargetRef.current = null;
    fileRef.current?.click();
  };
  const handleReplaceImage = (id) => () => {
    replaceTargetRef.current = id;
    fileRef.current?.click();
  };
  const handleRemoveImage = (id) => async () => {
    if (!confirm("Bild aus dieser Standort-Galerie entfernen?")) return;
    const next = (loc.gallery || []).filter((g) => g.id !== id);
    updateField("gallery", next);
  };
  const handleGalleryFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Bitte eine Bilddatei wählen");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const url = up.data.url;
      const list = loc.gallery || [];
      if (replaceTargetRef.current) {
        const idx = list.findIndex((g) => g.id === replaceTargetRef.current);
        if (idx >= 0) updateField(`gallery.${idx}.image_url`, url);
      } else {
        const newItem = { id: `lg${Date.now()}`, image_url: url, caption_de: "", caption_en: "" };
        updateField("gallery", [...list, newItem]);
      }
      toast.success("Galerie aktualisiert");
    } catch (err) {
      toast.error(formatApiError(err, "Upload fehlgeschlagen"));
    } finally {
      setUploading(false);
      replaceTargetRef.current = null;
    }
  };

  return (
    <section className="section-pad bg-white border-y border-[#e2e8f0]">
      <div className="container-x px-5 md:px-8 lg:px-12">
        <div className="flex items-end justify-between gap-4 mb-10 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="dot-accent" />
              <span className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]">
                Gallery
              </span>
            </div>
            <Editable
              path={`gallery_title_${lang}`}
              value={pick(loc.gallery_title_de, loc.gallery_title_en)}
              onUpdate={updateField}
              as="h2"
              className="font-display leading-[0.98] tracking-tight block"
              style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
            />
          </div>
          {editMode && (
            <button
              onClick={handleAddImage}
              disabled={uploading}
              data-testid="loc-gallery-add"
              className="btn-accent text-sm py-2.5 px-4 disabled:opacity-60"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Bild
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {gallery.map((g, i) => (
            <div key={g.id} data-testid={`loc-gallery-${i}`} className="group relative overflow-hidden rounded-3xl">
              <img
                src={resolveUrl(g.image_url)}
                alt={pick(g.caption_de, g.caption_en) || loc.name}
                className="w-full h-[220px] md:h-[280px] object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {editMode && (
                <>
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/45 transition-colors flex items-center justify-center gap-2 opacity-0 hover:opacity-100">
                    <button
                      onClick={handleReplaceImage(g.id)}
                      data-testid={`loc-gallery-replace-${i}`}
                      className="inline-flex items-center gap-1.5 bg-white text-[#0f172a] rounded-full px-3 py-2 text-xs font-semibold"
                    >
                      <ImagePlus size={13} /> Ersetzen
                    </button>
                    <button
                      onClick={handleRemoveImage(g.id)}
                      data-testid={`loc-gallery-remove-${i}`}
                      className="inline-flex items-center gap-1.5 bg-[#ff5a36] text-white rounded-full px-3 py-2 text-xs font-semibold"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <input
                      type="text"
                      defaultValue={pick(g.caption_de, g.caption_en) || ""}
                      onBlur={(e) => updateField(`gallery.${i}.caption_${lang}`, e.target.value)}
                      placeholder={lang === "de" ? "Bildtitel…" : "Caption…"}
                      data-testid={`loc-gallery-caption-${i}`}
                      className="w-full bg-white/90 backdrop-blur text-[#0f172a] text-xs font-medium rounded-full px-3 py-1.5 border border-white/50 focus:border-[#ff5a36] focus:outline-none"
                    />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleGalleryFile}
          className="hidden"
          data-testid="loc-gallery-file"
        />
      </div>
    </section>
  );
}
