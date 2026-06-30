import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowUpRight, MapPin } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { resolveUrl } from "@/lib/api";
import Editable from "@/components/edit/Editable";

/**
 * "Ausserdem in folgenden Regionen für dich da" – shows ALL OTHER
 * Safe Ride locations as compact cards with image + name + canton + link.
 * Excludes the current location (matched by `currentSlug`).
 */
export default function OtherLocationsSection({ currentSlug, currentName, allLocations = [], texts, onUpdate }) {
  const { lang, pick } = useLang();
  const others = allLocations.filter((l) => l.slug !== currentSlug);
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
              <Link
                to={`/fahrschule-${loc.slug}`}
                className="group block bg-white border border-[#e2e8f0] rounded-3xl overflow-hidden hover:-translate-y-1 hover:border-[#ff5a36] transition-all duration-300"
              >
                <div className="relative h-[180px] md:h-[200px] overflow-hidden">
                  {loc.hero_image_url && (
                    <img
                      src={resolveUrl(loc.hero_image_url)}
                      alt={loc.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  )}
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-white/95 backdrop-blur text-[#0f172a] rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-widest uppercase">
                    {loc.canton}
                  </span>
                </div>
                <div className="p-5 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-xl tracking-tight truncate">
                      Fahrschule {loc.name}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#475569] mt-1.5 font-medium">
                      <MapPin size={12} className="text-[#ff5a36] shrink-0" />
                      <span className="truncate">
                        /fahrschule-{loc.slug}
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#fbf9f6] text-[#0f172a] group-hover:bg-[#ff5a36] group-hover:text-white transition-colors shrink-0">
                    <ArrowUpRight size={14} />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
