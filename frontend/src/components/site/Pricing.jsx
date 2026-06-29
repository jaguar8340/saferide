import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";

const CARD_COLORS = [
  { bg: "bg-white", fg: "text-[#0a0a0a]", price: "text-[#0033ff]", border: "border-[#0a0a0a]" },
  { bg: "bg-[#0033ff]", fg: "text-white", price: "text-[#ccff00]", border: "border-[#0a0a0a]" },
  { bg: "bg-white", fg: "text-[#0a0a0a]", price: "text-[#0a0a0a]", border: "border-[#0a0a0a]" },
  { bg: "bg-[#ccff00]", fg: "text-[#0a0a0a]", price: "text-[#0033ff]", border: "border-[#0a0a0a]" },
];

export default function Pricing({ data }) {
  const { pick, t } = useLang();
  if (!data) return null;

  return (
    <section
      id="pricing"
      data-testid="pricing-section"
      className="section-pad bg-[#f4f5f0]"
    >
      <div className="container-x px-5 md:px-10 lg:px-14">
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <div className="eyebrow text-[#ff0055] mb-4">CHF · Preise</div>
          <h2
            className="font-display font-black uppercase tracking-tighter leading-[0.9]"
            style={{ fontSize: "clamp(2.4rem, 5.5vw, 5rem)" }}
          >
            {pick(data.title_de, data.title_en)}
          </h2>
          <p className="mt-5 text-[#4b5563] text-lg md:text-xl font-medium">
            {pick(data.subtitle_de, data.subtitle_en)}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {(data.plans || []).map((p, i) => {
            const c = p.highlight
              ? CARD_COLORS[1]
              : CARD_COLORS[i % CARD_COLORS.length];
            return (
              <motion.div
                key={p.id || i}
                data-testid={`pricing-card-${i}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.55, delay: i * 0.08 }}
                className={`relative ${c.bg} ${c.fg} border-2 ${c.border} rounded-3xl p-7 md:p-8 hover:-translate-y-1 transition-transform duration-300`}
              >
                {p.highlight && (
                  <span className="absolute -top-3 right-6 bg-[#ccff00] text-[#0a0a0a] text-[10px] tracking-widest uppercase font-extrabold px-3 py-1 rounded-full border-2 border-[#0a0a0a]">
                    Beliebt
                  </span>
                )}
                <div className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-3">
                  {pick(p.region_de, p.region_en)}
                </div>
                <div className="font-display font-extrabold text-xl mb-1 uppercase tracking-tight">
                  {pick(p.name_de, p.name_en)}
                </div>
                <div className="text-xs opacity-70">
                  {pick(p.duration_de, p.duration_en)}
                </div>
                <div
                  className={`font-display font-black text-5xl md:text-6xl mt-7 ${c.price} leading-none tracking-tighter`}
                >
                  {p.price}
                </div>
                <a
                  href="#contact"
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById("contact")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  data-testid={`pricing-cta-${i}`}
                  className="mt-7 inline-flex items-center gap-2 text-xs tracking-widest uppercase font-extrabold underline underline-offset-4 hover:no-underline"
                >
                  {t.pricing.ctaText} <ArrowRight size={14} />
                </a>
              </motion.div>
            );
          })}
        </div>

        <p className="mt-10 text-sm text-[#4b5563] max-w-3xl leading-relaxed font-medium">
          {pick(data.note_de, data.note_en)}
        </p>
      </div>
    </section>
  );
}
