import { motion } from "framer-motion";
import { MapPin, Signpost } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";
import Editable from "@/components/edit/Editable";

/**
 * "Hier fahren wir" — compact SEO-friendly summary of the road types
 * and nearby villages we cover from this location. Replaces the old
 * long-form "Prüfungsstrecken" grid with 4 detail cards.
 *
 * Renders two chip rows (features + places), each editable inline via
 * a comma-separated string. Fully backward-compatible: reads from the
 * existing `here_we_drive_features` / `here_we_drive_places` arrays.
 */
export default function LocRoutes({ loc, updateField }) {
  const { lang, pick } = useLang();
  const { editMode } = useEdit();

  const features = loc.here_we_drive_features || [];
  const places = loc.here_we_drive_places || [];

  const featuresLabel = pick(
    loc.here_we_drive_features_label_de,
    loc.here_we_drive_features_label_en,
  ) || (lang === "en" ? "These situations we train" : "Diese Situationen trainieren wir");

  const placesLabel = pick(
    loc.here_we_drive_places_label_de,
    loc.here_we_drive_places_label_en,
  ) || (lang === "en" ? "And we also drive in these places" : "Und in diesen Orten fahren wir auch");

  // Inline-editable chip list (comma-separated string).
  const editableChipList = (path, items, testidPrefix) => {
    if (editMode) {
      return (
        <input
          type="text"
          defaultValue={items.join(", ")}
          data-testid={`${testidPrefix}-editor`}
          onBlur={(e) => {
            const next = e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            updateField(path, next);
          }}
          className="w-full bg-white border border-[#e2e8f0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#ff5a36]"
          placeholder={lang === "en" ? "Comma-separated" : "Kommagetrennt"}
        />
      );
    }
    return (
      <div className="flex flex-wrap gap-2" data-testid={`${testidPrefix}-chips`}>
        {items.map((item, i) => (
          <span
            key={`${item}-${i}`}
            data-testid={`${testidPrefix}-chip-${i}`}
            className="inline-flex items-center gap-1.5 bg-white border border-[#e2e8f0] rounded-full px-3.5 py-1.5 text-sm font-semibold text-[#0f172a] hover:border-[#ff5a36] hover:text-[#ff5a36] transition-colors"
          >
            {item}
          </span>
        ))}
      </div>
    );
  };

  return (
    <section className="section-pad bg-[#fbf9f6]" data-testid="loc-here-we-drive">
      <div className="container-x px-5 md:px-8 lg:px-12">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="dot-accent" />
            <span className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]">
              {lang === "en" ? "Where we drive" : "Hier fahren wir"}
            </span>
          </div>
          <Editable
            path={`exam_routes_title_${lang}`}
            value={pick(loc.exam_routes_title_de, loc.exam_routes_title_en)}
            onUpdate={updateField}
            as="h2"
            className="font-display leading-[0.98] tracking-tight block"
            style={{ fontSize: "clamp(1.8rem, 3.4vw, 2.75rem)" }}
          />
          <Editable
            path={`exam_routes_intro_${lang}`}
            value={pick(loc.exam_routes_intro_de, loc.exam_routes_intro_en)}
            onUpdate={updateField}
            as="p"
            multiline
            className="mt-3 max-w-2xl text-base text-[#475569] leading-relaxed font-medium block"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.45 }}
          className="grid md:grid-cols-2 gap-4 md:gap-5"
        >
          {/* Features (road types / situations) */}
          <div
            className="relative bg-white border border-[#e2e8f0] rounded-2xl p-5 md:p-6"
            data-testid="loc-here-features-card"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#ff5a36]/10 text-[#ff5a36] shrink-0">
                <Signpost size={16} />
              </span>
              <Editable
                path={`here_we_drive_features_label_${lang}`}
                value={featuresLabel}
                onUpdate={updateField}
                as="div"
                className="font-display text-lg md:text-xl text-[#0f172a] leading-tight flex-1"
              />
            </div>
            {editableChipList("here_we_drive_features", features, "loc-here-features")}
          </div>

          {/* Places (nearby villages) */}
          <div
            className="relative bg-white border border-[#e2e8f0] rounded-2xl p-5 md:p-6"
            data-testid="loc-here-places-card"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#1e6fff]/10 text-[#1e6fff] shrink-0">
                <MapPin size={16} />
              </span>
              <Editable
                path={`here_we_drive_places_label_${lang}`}
                value={placesLabel}
                onUpdate={updateField}
                as="div"
                className="font-display text-lg md:text-xl text-[#0f172a] leading-tight flex-1"
              />
            </div>
            {editableChipList("here_we_drive_places", places, "loc-here-places")}
          </div>
        </motion.div>

        <div className="mt-8">
          <Editable
            path={`exam_routes_outro_${lang}`}
            value={pick(loc.exam_routes_outro_de, loc.exam_routes_outro_en)}
            onUpdate={updateField}
            as="p"
            multiline
            placeholder={lang === "de" ? "Ergänzender Text …" : "Additional text …"}
            className="text-base text-[#475569] leading-relaxed font-medium block max-w-3xl"
          />
        </div>
      </div>
    </section>
  );
}
