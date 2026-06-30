import { useEffect, useRef, useState } from "react";
import { Award, Plus, Trash2, Loader2, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
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
export default function CertificatesDialog() {
  const { lang, pick } = useLang();
  const { editMode } = useEdit();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(null);
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
          className="mt-7 inline-flex items-center gap-2 bg-white border border-[#e2e8f0] rounded-full pl-3 pr-5 py-2 text-sm font-semibold text-[#0f172a] hover:border-[#ff5a36] hover:text-[#ff5a36] transition-colors group"
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
                  <div className="relative aspect-[4/5] overflow-hidden bg-[#fbf9f6]">
                    <img
                      src={resolveUrl(c.image_url)}
                      alt={pick(c.title_de, c.title_en)}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {editMode && (
                      <button
                        type="button"
                        onClick={() => remove(c.id)}
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
    </Dialog>
  );
}
