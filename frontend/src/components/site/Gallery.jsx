import { motion } from "framer-motion";
import { useLang } from "@/contexts/LanguageContext";

export default function Gallery({ items }) {
  const { pick, t } = useLang();
  if (!items?.length) return null;

  return (
    <section
      id="gallery"
      data-testid="gallery-section"
      className="section-pad bg-white"
    >
      <div className="container-x px-5 md:px-10 lg:px-14">
        <div className="mb-12">
          <div className="eyebrow text-[#0033ff] mb-4">{t.gallery.overline}</div>
          <h2
            className="font-display font-black uppercase tracking-tighter leading-[0.9]"
            style={{ fontSize: "clamp(2.4rem, 5.5vw, 5rem)" }}
          >
            {t.gallery.title}
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {items.map((g, i) => (
            <motion.div
              key={g.id || i}
              data-testid={`gallery-item-${i}`}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: (i % 4) * 0.06 }}
              className={`group relative overflow-hidden rounded-3xl border-2 border-[#0a0a0a] ${
                i % 5 === 0 ? "col-span-2 row-span-2" : ""
              }`}
            >
              <img
                src={g.image_url}
                alt={pick(g.caption_de, g.caption_en) || "gallery"}
                className="w-full h-full min-h-[200px] md:min-h-[240px] object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-[#0033ff] mix-blend-multiply opacity-0 group-hover:opacity-80 transition-opacity duration-500" />
              {(g.caption_de || g.caption_en) && (
                <div className="absolute bottom-4 left-4 right-4 text-[#ccff00] font-display font-black text-lg uppercase tracking-tight opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {pick(g.caption_de, g.caption_en)}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
