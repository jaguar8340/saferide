import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";

export default function Pricing({ data }) {
  const { pick, t } = useLang();
  if (!data) return null;

  return (
    <section
      id="pricing"
      data-testid="pricing-section"
      className="section-pad bg-[#fbf9f6]"
    >
      <div className="container-x">
        <div className="max-w-2xl mb-12">
          <div className="flex items-center gap-2 mb-4">
            <span className="dot-accent" />
            <span className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]">
              CHF · Preise
            </span>
          </div>
          <h2
            className="font-display leading-[0.98] tracking-tight"
            style={{ fontSize: "clamp(2.1rem, 4.4vw, 4rem)" }}
          >
            {pick(data.title_de, data.title_en).split(" ").map((w, i, arr) =>
              i === arr.length - 1 ? (
                <span key={i} className="font-serif-i text-[#ff5a36] font-normal">{w}</span>
              ) : (
                <span key={i}>{w} </span>
              ),
            )}
          </h2>
          <p className="mt-5 text-lg text-[#475569] leading-relaxed font-medium">
            {pick(data.subtitle_de, data.subtitle_en)}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(data.plans || []).map((p, i) => (
            <motion.div
              key={p.id || i}
              data-testid={`pricing-card-${i}`}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              className={`relative rounded-3xl p-7 md:p-8 border transition-transform duration-300 hover:-translate-y-1 ${
                p.highlight
                  ? "bg-[#0f172a] text-white border-[#0f172a]"
                  : "bg-white text-[#0f172a] border-[#e2e8f0]"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-7 tag tag-accent">
                  Beliebt
                </span>
              )}
              <div className={`text-[10px] tracking-widest uppercase font-semibold mb-2 ${p.highlight ? "text-white/60" : "text-[#94a3b8]"}`}>
                {pick(p.region_de, p.region_en)}
              </div>
              <div className="font-display text-xl">
                {pick(p.name_de, p.name_en)}
              </div>
              <div className={`text-xs mt-1 ${p.highlight ? "text-white/60" : "text-[#94a3b8]"}`}>
                {pick(p.duration_de, p.duration_en)}
              </div>
              <div className="font-display text-5xl mt-7 tracking-tighter">
                {p.price.split(" ").map((part, idx) =>
                  idx === 0 ? (
                    <span key={idx} className={`text-base align-top mr-1 ${p.highlight ? "text-white/50" : "text-[#94a3b8]"}`}>
                      {part}
                    </span>
                  ) : (
                    <span key={idx}>{part}</span>
                  ),
                )}
              </div>
              <a
                href="#contact"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
                }}
                data-testid={`pricing-cta-${i}`}
                className={`mt-7 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors ${
                  p.highlight ? "text-[#ff5a36] hover:text-white" : "text-[#0f172a] hover:text-[#ff5a36]"
                }`}
              >
                {t.pricing.ctaText} <ArrowRight size={14} />
              </a>
            </motion.div>
          ))}
        </div>

        <p className="mt-10 text-sm text-[#475569] max-w-3xl leading-relaxed font-medium">
          {pick(data.note_de, data.note_en)}
        </p>
      </div>
    </section>
  );
}
