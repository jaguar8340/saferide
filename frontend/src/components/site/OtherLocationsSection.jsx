import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowUpRight, MapPin, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";
import { api, formatApiError, resolveUrl } from "@/lib/api";
import Editable from "@/components/edit/Editable";

/**
 * Card that links to another location landing page. In admin edit mode
 * exposes an inline upload button that PATCHes the OTHER location's
 * hero_image_url so the admin can fix all 11 location previews from one
 * page without having to navigate to each one.
 */
function OtherLocationCard({ loc, onLocalImageUpdate }) {
  const { editMode } = useEdit();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (e) => {
    e.preventDefault();
    e.stopPropagation();
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
      const newUrl = up.data.url;
      await api.patch(`/locations/${loc.slug}`, { hero_image_url: newUrl });
      onLocalImageUpdate(loc.slug, newUrl);
      toast.success(`Bild für ${loc.name} aktualisiert`);
    } catch (err) {
      toast.error(formatApiError(err, "Upload fehlgeschlagen"));
    } finally {
      setUploading(false);
    }
  };

  const handlePick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileRef.current?.click();
  };

  return (
    <Link
      to={`/fahrschule-${loc.slug}`}
      className="group block bg-white border border-[#e2e8f0] rounded-3xl overflow-hidden hover:-translate-y-1 hover:border-[#ff5a36] transition-all duration-300"
    >
      <div className="relative h-[180px] md:h-[200px] overflow-hidden bg-[#fbf9f6]">
        {loc.hero_image_url ? (
          <img
            src={resolveUrl(loc.hero_image_url)}
            alt={loc.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[#94a3b8] text-xs font-semibold tracking-widest uppercase">
            {loc.name}
          </div>
        )}
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-white/95 backdrop-blur text-[#0f172a] rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-widest uppercase">
          {loc.canton}
        </span>
        {editMode && (
          <>
            <button
              type="button"
              onClick={handlePick}
              disabled={uploading}
              data-testid={`other-region-upload-${loc.slug}`}
              className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-[#ff5a36] text-white rounded-full px-3 py-1.5 text-xs font-semibold shadow-md hover:opacity-90 disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <ImagePlus size={12} />
              )}
              Bild
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={upload}
              onClick={(e) => e.stopPropagation()}
              className="hidden"
            />
          </>
        )}
      </div>
      <div className="p-5 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-display text-xl tracking-tight truncate">
            Fahrschule {loc.name}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#475569] mt-1.5 font-medium">
            <MapPin size={12} className="text-[#ff5a36] shrink-0" />
            <span className="truncate">/fahrschule-{loc.slug}</span>
          </div>
        </div>
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#fbf9f6] text-[#0f172a] group-hover:bg-[#ff5a36] group-hover:text-white transition-colors shrink-0">
          <ArrowUpRight size={14} />
        </span>
      </div>
    </Link>
  );
}

/**
 * "Ausserdem in folgenden Regionen für dich da" – shows ALL OTHER
 * Safe Ride locations as compact cards with image + name + canton + link.
 * Excludes the current location (matched by `currentSlug`).
 */
export default function OtherLocationsSection({
  currentSlug,
  allLocations = [],
  texts,
  onUpdate,
}) {
  const { lang, pick } = useLang();
  const [localOverrides, setLocalOverrides] = useState({});
  const others = allLocations
    .filter((l) => l.slug !== currentSlug)
    .map((l) =>
      localOverrides[l.slug]
        ? { ...l, hero_image_url: localOverrides[l.slug] }
        : l,
    );

  const onLocalImageUpdate = (slug, url) =>
    setLocalOverrides((o) => ({ ...o, [slug]: url }));

  if (others.length === 0) return null;

  return (
    <section
      data-testid="loc-other-regions"
      className="section-pad bg-[#fbf9f6]"
    >
      <div className="container-x px-5 md:px-8 lg:px-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="dot-accent" />
              <Editable
                path={`other_regions_overline_${lang}`}
                value={pick(texts?.overline_de, texts?.overline_en)}
                onUpdate={onUpdate}
                className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]"
              />
            </div>
            <Editable
              path={`other_regions_title_${lang}`}
              value={pick(texts?.title_de, texts?.title_en)}
              onUpdate={onUpdate}
              as="h2"
              className="font-display leading-[0.98] tracking-tight max-w-3xl block"
              style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)" }}
            />
            <Editable
              path={`other_regions_intro_${lang}`}
              value={pick(texts?.intro_de, texts?.intro_en)}
              onUpdate={onUpdate}
              as="p"
              multiline
              className="mt-4 max-w-2xl text-base text-[#475569] leading-relaxed font-medium block"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {others.map((loc, i) => (
            <motion.div
              key={loc.slug}
              data-testid={`other-region-${loc.slug}`}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: (i % 3) * 0.05 }}
            >
              <OtherLocationCard loc={loc} onLocalImageUpdate={onLocalImageUpdate} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
