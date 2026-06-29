import { Star, Quote } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";

export default function Testimonials({ items }) {
  const { pick, t } = useLang();
  if (!items?.length) return null;

  return (
    <section
      id="reviews"
      data-testid="reviews-section"
      className="section bg-[#0a0a0a] border-t border-white/5"
    >
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
        <div>
          <div className="overline mb-4">{t.reviews.overline}</div>
          <h2 className="font-display font-bold uppercase tracking-tight text-3xl md:text-5xl lg:text-6xl leading-[0.95] max-w-2xl">
            {t.reviews.title}
          </h2>
        </div>
        <div
          className="flex items-center gap-3 px-4 py-3 border border-white/10 self-start md:self-end"
          style={{ borderRadius: 2 }}
        >
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={16} className="text-[#FF2E00]" fill="#FF2E00" />
            ))}
          </div>
          <span className="text-xs tracking-widest uppercase font-bold text-white/70">
            5.0 · {t.reviews.rating}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((r, i) => (
          <div
            key={r.id || i}
            data-testid={`review-card-${i}`}
            className="card-surface p-7 relative"
            style={{ borderRadius: 2 }}
          >
            <Quote size={22} className="text-[#FF2E00] mb-4" />
            <p className="text-white/80 text-sm leading-relaxed mb-6 italic">
              &ldquo;{pick(r.text_de, r.text_en || r.text_de)}&rdquo;
            </p>
            <div className="flex items-center justify-between pt-5 border-t border-white/10">
              <div>
                <div className="font-display font-bold text-base">{r.name}</div>
                <div className="text-[10px] tracking-widest uppercase text-white/45 mt-1">
                  {r.date}
                </div>
              </div>
              <div className="flex">
                {[...Array(r.rating || 5)].map((_, idx) => (
                  <Star
                    key={idx}
                    size={12}
                    className="text-[#FF2E00]"
                    fill="#FF2E00"
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
