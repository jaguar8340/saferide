import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";

export default function Testimonials({ items }) {
  const { pick, t } = useLang();
  if (!items?.length) return null;

  return (
    <section
      id="reviews"
      data-testid="reviews-section"
      className="section-pad bg-white border-y border-[#e2e8f0]"
    >
      <div className="container-x">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="dot-accent" />
              <span className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]">
                {t.reviews.overline}
              </span>
            </div>
            <h2
              className="font-display leading-[0.98] tracking-tight max-w-2xl"
              style={{ fontSize: "clamp(2.1rem, 4.4vw, 4rem)" }}
            >
              {t.reviews.title.split(" ").map((w, i, arr) =>
                i === arr.length - 1 ? (
                  <span key={i} className="font-serif-i text-[#ff5a36] font-normal">{w}</span>
                ) : (
                  <span key={i}>{w} </span>
                ),
              )}
            </h2>
          </div>
          <div className="flex items-center gap-3 bg-[#fbf9f6] rounded-full px-5 py-3 text-sm">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} className="text-[#ff5a36]" fill="#ff5a36" />
              ))}
            </div>
            <span className="font-semibold text-[#0f172a]">5.0</span>
            <span className="text-[#475569]">· {t.reviews.rating}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((r, i) => (
            <motion.div
              key={r.id || i}
              data-testid={`review-card-${i}`}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.06 }}
              className={`relative rounded-3xl p-7 md:p-8 border ${
                i === 0
                  ? "bg-[#ff5a36] text-white border-[#ff5a36]"
                  : "bg-[#fbf9f6] text-[#0f172a] border-[#e2e8f0]"
              }`}
            >
              <Quote
                size={24}
                className={i === 0 ? "text-white/50 mb-4" : "text-[#ff5a36] mb-4"}
              />
              <p className="leading-relaxed font-medium text-base">
                &ldquo;{pick(r.text_de, r.text_en || r.text_de)}&rdquo;
              </p>
              <div className={`mt-6 pt-5 border-t flex items-center justify-between ${i === 0 ? "border-white/20" : "border-[#e2e8f0]"}`}>
                <div>
                  <div className="font-semibold text-base">{r.name}</div>
                  <div className={`text-[10px] tracking-widest uppercase mt-1 font-semibold ${i === 0 ? "text-white/60" : "text-[#94a3b8]"}`}>
                    {r.date}
                  </div>
                </div>
                <div className="flex">
                  {[...Array(r.rating || 5)].map((_, idx) => (
                    <Star
                      key={idx}
                      size={12}
                      className={i === 0 ? "text-white" : "text-[#ff5a36]"}
                      fill={i === 0 ? "#fff" : "#ff5a36"}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
