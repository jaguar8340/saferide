import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";

const ACCENTS = ["bg-[#0033ff]", "bg-[#ccff00]", "bg-[#ff0055]"];
const ACCENT_FG = ["text-[#ccff00]", "text-[#0a0a0a]", "text-white"];

export default function Testimonials({ items }) {
  const { pick, t } = useLang();
  if (!items?.length) return null;

  return (
    <section
      id="reviews"
      data-testid="reviews-section"
      className="section-pad bg-[#f4f5f0]"
    >
      <div className="container-x px-5 md:px-10 lg:px-14">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <div className="eyebrow text-[#0033ff] mb-4">{t.reviews.overline}</div>
            <h2
              className="font-display font-black uppercase tracking-tighter leading-[0.9] max-w-2xl"
              style={{ fontSize: "clamp(2.4rem, 5.5vw, 5rem)" }}
            >
              {t.reviews.title}
            </h2>
          </div>
          <div className="flex items-center gap-3 bg-white border-2 border-[#0a0a0a] rounded-full px-5 py-3 self-start md:self-end">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} className="text-[#ff0055]" fill="#ff0055" />
              ))}
            </div>
            <span className="text-xs tracking-widest uppercase font-extrabold text-[#0a0a0a]">
              5.0 · {t.reviews.rating}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {items.map((r, i) => {
            const accentIdx = i % ACCENTS.length;
            return (
              <motion.div
                key={r.id || i}
                data-testid={`review-card-${i}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.55, delay: (i % 3) * 0.08 }}
                className="relative bg-white border-2 border-[#0a0a0a] rounded-3xl p-7 overflow-hidden hover:-translate-y-1 transition-transform duration-300"
              >
                <div
                  className={`absolute top-0 left-0 right-0 h-2 ${ACCENTS[accentIdx]}`}
                />
                <Quote
                  size={28}
                  className={`mb-4 ${
                    accentIdx === 0
                      ? "text-[#0033ff]"
                      : accentIdx === 1
                      ? "text-[#0a0a0a]"
                      : "text-[#ff0055]"
                  }`}
                />
                <p className="text-[#0a0a0a]/80 leading-relaxed mb-6 font-medium">
                  &ldquo;{pick(r.text_de, r.text_en || r.text_de)}&rdquo;
                </p>
                <div className="flex items-center justify-between pt-5 border-t-2 border-[#0a0a0a]/10">
                  <div>
                    <div className="font-display font-extrabold text-lg">
                      {r.name}
                    </div>
                    <div className="text-[10px] tracking-widest uppercase text-[#0a0a0a]/45 mt-1 font-bold">
                      {r.date}
                    </div>
                  </div>
                  <div className="flex">
                    {[...Array(r.rating || 5)].map((_, idx) => (
                      <Star
                        key={idx}
                        size={12}
                        className="text-[#ff0055]"
                        fill="#ff0055"
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
