import { useEffect, useRef, useState } from "react";
import { Award, Plus, Trash2, Loader2, ImagePlus, X, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";
import { api, formatApiError, resolveUrl } from "@/lib/api";
import Editable from "@/components/edit/Editable";

/**
 * Inline-editable certificates / diplomas viewer rendered as a button +
 * modal grid. Admins can upload, retitle and delete certificates directly
 * from the modal.
 */
export default function CertificatesDialog({ triggerClassName = "" }) {
  const { lang, pick } = useLang();
  const { editMode } = useEdit();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(null);
  const [zoomIndex, setZoomIndex] = useState(null); // null | index
  const fileRef = useRef(null);

  const load = async () => {
    try {
      const r = await api.get("/certificates");
      setItems(r.data || []);
    } catch (err) {
      setItems([]);
    }
  };
  // Lazy load on first open
  useEffect(() => {
    if (open && items === null) load();
  }, [open, items]);

  // Keyboard navigation for the lightbox.
  useEffect(() => {
    if (zoomIndex === null || !items) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setZoomIndex(null);
      } else if (e.key === "ArrowRight") {
        setZoomIndex((i) => (i === items.length - 1 ? 0 : i + 1));
      } else if (e.key === "ArrowLeft") {
        setZoomIndex((i) => (i === 0 ? items.length - 1 : i - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomIndex, items]);

  const upload = async (e) => {
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
      const created = await api.post("/certificates", {
        title_de: file.name.replace(/\.[^/.]+$/, ""),
        title_en: file.name.replace(/\.[^/.]+$/, ""),
        image_url: up.data.url,
        year: "",
      });
      setItems((cur) => [...(cur || []), created.data]);
      toast.success("Diplom hochgeladen");
    } catch (err) {
      toast.error(formatApiError(err, "Upload fehlgeschlagen"));
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Diplom wirklich löschen?")) return;
    setBusy(id);
    try {
      await api.delete(`/certificates/${id}`);
      setItems((cur) => (cur || []).filter((c) => c.id !== id));
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(null);
    }
  };

  const updateField = async (id, field, value) => {
    try {
      const r = await api.patch(`/certificates/${id}`, { [field]: value });
      setItems((cur) => (cur || []).map((c) => (c.id === id ? r.data : c)));
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          data-testid="certificates-open"
          className={`mt-7 inline-flex items-center gap-2 bg-white border border-[#e2e8f0] rounded-full pl-3 pr-5 py-2 text-sm font-semibold text-[#0f172a] hover:border-[#ff5a36] hover:text-[#ff5a36] transition-colors group ${triggerClassName}`}
        >
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#ff5a36]/10 text-[#ff5a36] group-hover:bg-[#ff5a36] group-hover:text-white transition-colors">
            <Award size={14} />
          </span>
          {lang === "de" ? "Alle Diplome & Zertifikate ansehen" : "View all diplomas & certificates"}
        </button>
      </DialogTrigger>

      <DialogContent
        data-testid="certificates-dialog"
        className="max-w-5xl max-h-[90vh] overflow-y-auto bg-[#fbf9f6] border-none"
      >
        <DialogHeader className="pr-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="dot-accent animate-pulse-accent" />
            <span className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]">
              {lang === "de" ? "Diplome & Zertifikate" : "Diplomas & certificates"}
            </span>
          </div>
          <DialogTitle
            className="font-display leading-[0.98] tracking-tight text-[#0f172a]"
            style={{ fontSize: "clamp(1.8rem, 3vw, 2.6rem)" }}
          >
            {lang === "de" ? "Nadine Stäubli" : "Nadine Stäubli"} —{" "}
            <span className="font-serif-i text-[#ff5a36]">
              {lang === "de" ? "Qualifikationen" : "qualifications"}
            </span>
          </DialogTitle>
          <p className="text-sm text-[#475569] font-medium mt-2 max-w-xl">
            {lang === "de"
              ? "Alle Diplome, Berufsbewilligungen und Weiterbildungen — laufend ergänzt."
              : "All diplomas, professional licences and further training — continuously updated."}
          </p>
          <DialogDescription className="sr-only">
            {lang === "de"
              ? "Liste aller Diplome und Zertifikate von Nadine Stäubli. Klicke ein Bild für die Vollansicht."
              : "List of all diplomas and certificates of Nadine Stäubli. Click an image for full view."}
          </DialogDescription>
        </DialogHeader>

        {editMode && (
          <div className="flex justify-end -mt-2 mb-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              data-testid="certificates-add"
              className="btn-accent text-xs py-2 px-3 disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <Loader2 size={12} className="animate-spin" /> Lädt…
                </>
              ) : (
                <>
                  <Plus size={12} /> Diplom hinzufügen
                </>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={upload}
              className="hidden"
            />
          </div>
        )}

        {items === null ? (
          <div className="py-12 text-center text-xs font-semibold tracking-widest uppercase text-[#94a3b8]">
            Lade…
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#475569] font-medium">
            {lang === "de" ? "Noch keine Diplome hochgeladen." : "No diplomas uploaded yet."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {items.map((c, i) => (
                <motion.article
                  key={c.id}
                  data-testid={`certificate-${i}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="relative bg-white border border-[#e2e8f0] rounded-3xl overflow-hidden group"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-[#fbf9f6] cursor-zoom-in" onClick={(e) => { if (editMode) return; e.stopPropagation(); setZoomIndex(i); }}>
                    <img
                      src={resolveUrl(c.image_url)}
                      alt={pick(c.title_de, c.title_en)}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {!editMode && (
                      <div className="absolute inset-0 flex items-end justify-end p-3 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <span
                          data-testid={`certificate-zoom-${i}`}
                          className="inline-flex items-center gap-1 bg-white/95 backdrop-blur text-[#0f172a] text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full"
                        >
                          <ZoomIn size={11} /> Vollansicht
                        </span>
                      </div>
                    )}
                    {editMode && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); remove(c.id); }}
                        disabled={busy === c.id}
                        data-testid={`certificate-remove-${c.id}`}
                        className="absolute top-3 right-3 inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#ff5a36] text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-100"
                        aria-label="Diplom entfernen"
                      >
                        {busy === c.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                    )}
                  </div>
                  <div className="p-5">
                    {editMode ? (
                      <input
                        type="text"
                        defaultValue={pick(c.title_de, c.title_en) || ""}
                        onBlur={(e) => {
                          const val = e.target.value;
                          if (val !== (lang === "de" ? c.title_de : c.title_en)) {
                            updateField(c.id, `title_${lang}`, val);
                          }
                        }}
                        data-testid={`certificate-title-${c.id}`}
                        placeholder={lang === "de" ? "Titel…" : "Title…"}
                        className="w-full bg-transparent font-display text-lg leading-tight tracking-tight focus:outline-none border-b border-transparent focus:border-[#ff5a36]"
                      />
                    ) : (
                      <h3 className="font-display text-lg leading-tight tracking-tight">
                        {pick(c.title_de, c.title_en)}
                      </h3>
                    )}
                    {(c.year || editMode) && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-[#475569] font-medium">
                        {editMode ? (
                          <input
                            type="text"
                            defaultValue={c.year || ""}
                            onBlur={(e) => {
                              if (e.target.value !== (c.year || "")) {
                                updateField(c.id, "year", e.target.value);
                              }
                            }}
                            placeholder={lang === "de" ? "Jahr" : "Year"}
                            data-testid={`certificate-year-${c.id}`}
                            className="w-16 bg-transparent text-xs focus:outline-none border-b border-transparent focus:border-[#ff5a36]"
                          />
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-[#ff5a36]">
                            <Award size={11} /> {c.year}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        )}
      </DialogContent>

      {/* Full-screen lightbox for zoomed certificate */}
      <AnimatePresence>
        {zoomIndex !== null && items && items[zoomIndex] && (
          <motion.div
            data-testid="certificate-lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomIndex(null)}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 md:p-10 cursor-zoom-out"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setZoomIndex(null);
              }}
              data-testid="certificate-lightbox-close"
              className="absolute top-5 right-5 inline-flex items-center justify-center w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors"
              aria-label="Schliessen"
            >
              <X size={18} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setZoomIndex((i) => (i === 0 ? items.length - 1 : i - 1));
              }}
              data-testid="certificate-lightbox-prev"
              className="absolute left-3 md:left-8 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors"
              aria-label="Vorheriges Diplom"
            >
              <span className="font-display text-2xl leading-none -mt-0.5">‹</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setZoomIndex((i) => (i === items.length - 1 ? 0 : i + 1));
              }}
              data-testid="certificate-lightbox-next"
              className="absolute right-3 md:right-8 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors"
              aria-label="Nächstes Diplom"
            >
              <span className="font-display text-2xl leading-none -mt-0.5">›</span>
            </button>
            <motion.img
              key={items[zoomIndex].id}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.25 }}
              src={resolveUrl(items[zoomIndex].image_url)}
              alt={pick(items[zoomIndex].title_de, items[zoomIndex].title_en)}
              data-testid="certificate-lightbox-image"
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] max-w-[92vw] object-contain rounded-lg shadow-2xl"
            />
            <div
              data-testid="certificate-lightbox-caption"
              className="mt-5 text-white text-sm font-medium tracking-wide flex items-center gap-3"
            >
              <span className="font-display text-lg">
                {pick(items[zoomIndex].title_de, items[zoomIndex].title_en)}
              </span>
              {items[zoomIndex].year && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold tracking-widest uppercase text-[#ff5a36]">
                  <Award size={11} /> {items[zoomIndex].year}
                </span>
              )}
              <span
                data-testid="certificate-lightbox-counter"
                className="text-xs text-white/50 ml-2"
              >
                {zoomIndex + 1} / {items.length}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Dialog>
  );
}
