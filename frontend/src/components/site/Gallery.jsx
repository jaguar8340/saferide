import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Loader2, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";
import { api, formatApiError, resolveUrl } from "@/lib/api";
import Editable from "@/components/edit/Editable";

export default function Gallery({ items }) {
  const { lang, pick, t } = useLang();
  const { editMode, reloadGallery } = useEdit();
  const fileRef = useRef(null);
  const replaceTargetRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(null);

  if (!items?.length && !editMode) return null;

  const handleAddClick = () => {
    replaceTargetRef.current = null;
    fileRef.current?.click();
  };
  const handleReplaceClick = (id) => () => {
    replaceTargetRef.current = id;
    fileRef.current?.click();
  };

  const handleFile = async (e) => {
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
      const up = await api.post("/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = up.data.url;
      if (replaceTargetRef.current) {
        await api.put(`/gallery/${replaceTargetRef.current}`, {
          image_url: url,
          caption_de: items.find((g) => g.id === replaceTargetRef.current)?.caption_de || "",
          caption_en: items.find((g) => g.id === replaceTargetRef.current)?.caption_en || "",
        });
      } else {
        await api.post("/gallery", { image_url: url, caption_de: "", caption_en: "" });
      }
      toast.success("Galerie aktualisiert");
      await reloadGallery();
    } catch (err) {
      toast.error(formatApiError(err, "Upload fehlgeschlagen"));
    } finally {
      setUploading(false);
      replaceTargetRef.current = null;
    }
  };

  const remove = async (id) => {
    if (!confirm("Bild wirklich löschen?")) return;
    setBusy(id);
    try {
      await api.delete(`/gallery/${id}`);
      await reloadGallery();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(null);
    }
  };

  const updateCaption = async (id, field, value) => {
    const it = items.find((g) => g.id === id);
    if (!it) return;
    try {
      await api.put(`/gallery/${id}`, { ...it, [field]: value });
      await reloadGallery();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <section
      id="gallery"
      data-testid="gallery-section"
      className="section-pad bg-[#fbf9f6]"
    >
      <div className="container-x">
        <div className="flex items-end justify-between gap-4 mb-12 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="dot-accent" />
              <span className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]">
                {t.gallery.overline}
              </span>
            </div>
            <h2
              className="font-display leading-[0.98] tracking-tight"
              style={{ fontSize: "clamp(2.1rem, 4.4vw, 4rem)" }}
            >
              {t.gallery.title.split(" ").map((w, i, arr) =>
                i === arr.length - 1 ? (
                  <span key={i} className="font-serif-i text-[#ff5a36] font-normal">{w}</span>
                ) : (
                  <span key={i}>{w} </span>
                ),
              )}
            </h2>
          </div>
          {editMode && (
            <button
              onClick={handleAddClick}
              disabled={uploading}
              data-testid="gallery-inline-add"
              className="btn-accent text-sm py-2.5 px-4 disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Lädt…
                </>
              ) : (
                <>
                  <Plus size={14} /> Bild hinzufügen
                </>
              )}
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {items.map((g, i) => (
            <motion.div
              key={g.id || i}
              data-testid={`gallery-item-${i}`}
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: (i % 4) * 0.05 }}
              className={`group relative overflow-hidden rounded-3xl ${
                i % 5 === 0 ? "col-span-2 row-span-2" : ""
              }`}
            >
              <img
                src={resolveUrl(g.image_url)}
                alt={pick(g.caption_de, g.caption_en) || "gallery"}
                className="w-full h-full min-h-[220px] md:min-h-[280px] object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {!editMode && (g.caption_de || g.caption_en) && (
                <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="tag tag-light text-[10px]">
                    {pick(g.caption_de, g.caption_en)}
                  </span>
                </div>
              )}
              {editMode && (
                <>
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/45 transition-colors flex items-center justify-center gap-2 opacity-0 hover:opacity-100">
                    <button
                      onClick={handleReplaceClick(g.id)}
                      data-testid={`gallery-replace-${g.id}`}
                      disabled={uploading}
                      className="inline-flex items-center gap-1.5 bg-white text-[#0f172a] rounded-full px-3 py-2 text-xs font-semibold disabled:opacity-60"
                    >
                      <ImagePlus size={13} /> Ersetzen
                    </button>
                    <button
                      onClick={() => remove(g.id)}
                      data-testid={`gallery-remove-${g.id}`}
                      disabled={busy === g.id}
                      className="inline-flex items-center gap-1.5 bg-[#ff5a36] text-white rounded-full px-3 py-2 text-xs font-semibold disabled:opacity-60"
                    >
                      {busy === g.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <input
                      type="text"
                      defaultValue={pick(g.caption_de, g.caption_en) || ""}
                      onBlur={(e) =>
                        updateCaption(g.id, `caption_${lang}`, e.target.value)
                      }
                      placeholder={lang === "de" ? "Bildtitel…" : "Caption…"}
                      data-testid={`gallery-caption-${g.id}`}
                      className="w-full bg-white/90 backdrop-blur text-[#0f172a] text-xs font-medium rounded-full px-3 py-1.5 border border-white/50 focus:border-[#ff5a36] focus:outline-none"
                    />
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
          data-testid="gallery-inline-file"
        />
      </div>
    </section>
  );
}
