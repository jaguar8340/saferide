import { motion } from "framer-motion";
import { useLang } from "@/contexts/LanguageContext";
import { resolveUrl } from "@/lib/api";

export default function Gallery({ items }) {
  const { pick, t } = useLang();
  if (!items?.length) return null;

  return (
    <section
      id="gallery"
      data-testid="gallery-section"
      className="section-pad bg-[#fbf9f6]"
    >
      <div className="container-x">
        <div className="mb-12">
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
              {(g.caption_de || g.caption_en) && (
                <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="tag tag-light text-[10px]">
                    {pick(g.caption_de, g.caption_en)}
                  </span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
