import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";

/**
 * Livery Pricing – rally-team spec-card style. Featured plan is a red wrap
 * card with a "Grid P1" sticker. Others are white bordered cards.
 */
export default function LiveryPricing({ content = {} }) {
  const p = content.pricing || {};
  const plans = p.plans || [];
  const title = p.title_de || "Preise";
  const subtitle = p.subtitle_de || "";
  const cta = p.cta_text_de || "Anfragen";
  const popular = p.popular_label_de || "Beliebt";

  if (!plans.length) return null;

  return (
    <section
      id="pricing"
      data-testid="livery-pricing-section"
      className="relative py-24 md:py-32 bg-[#ece5d6] border-y-2 border-[#0f1419]"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="mb-14 md:mb-16 max-w-3xl">
          <div className="mb-5 flex items-center gap-3">
            <span className="lv-label lv-label--navy">CHF · Preisliste</span>
            <span className="font-script text-3xl text-[#c9302c] leading-none">— fair &amp; klar</span>
          </div>
          <h2 className="font-anton text-6xl md:text-7xl lg:text-8xl uppercase leading-[0.88] tracking-tight text-[#0f1419]">
            {title}
            <span className="text-[#c9302c]">.</span>
          </h2>
          {subtitle && (
            <p className="mt-6 font-mano text-lg leading-relaxed text-[#3a4553] max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan, i) => {
            const highlight = !!plan.highlight;
            return (
              <motion.div
                key={plan.id || i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                data-testid={`livery-pricing-card-${i}`}
                className={`relative border-2 border-[#0f1419] p-7 md:p-8 transition-all hover:-translate-y-1 ${
                  highlight
                    ? "bg-[#c9302c] text-white"
                    : "bg-white text-[#0f1419]"
                }`}
              >
                {highlight && (
                  <div className="absolute -top-4 -right-3">
                    <span className="lv-label lv-label--navy">
                      <Check size={12} strokeWidth={3} /> {popular}
                    </span>
                  </div>
                )}

                {/* Grid number + region */}
                <div className="flex items-center justify-between mb-6">
                  <span className={`lv-race-num ${highlight ? "lv-race-num--navy" : ""}`}>
                    P{i + 1}
                  </span>
                  <span className={`font-anton text-[11px] tracking-[0.2em] uppercase ${highlight ? "text-white/70" : "text-[#7a8595]"}`}>
                    {plan.region_de || "CH"}
                  </span>
                </div>

                {/* Name */}
                <h3 className="font-anton text-2xl md:text-3xl uppercase leading-tight tracking-tight">
                  {plan.name_de}
                </h3>
                <div className={`mt-1 font-mano text-sm ${highlight ? "text-white/80" : "text-[#7a8595]"}`}>
                  {plan.duration_de}
                </div>

                {/* Price */}
                <div className="mt-8 flex items-baseline gap-2">
                  <span className="font-anton text-6xl md:text-7xl leading-none tracking-tighter">
                    {plan.price}
                  </span>
                </div>

                {/* CTA */}
                <a
                  href="#contact"
                  className={`mt-8 inline-flex items-center gap-2 font-anton text-sm tracking-[0.18em] uppercase transition-all border-b-2 pb-1 ${
                    highlight
                      ? "text-white border-white hover:border-[#f2c94c] hover:text-[#f2c94c]"
                      : "text-[#0f1419] border-[#0f1419] hover:border-[#c9302c] hover:text-[#c9302c]"
                  }`}
                  data-testid={`livery-pricing-cta-${i}`}
                >
                  <span>{cta}</span>
                  <ArrowRight size={14} strokeWidth={2.5} />
                </a>
              </motion.div>
            );
          })}
        </div>

        {p.note_de && (
          <p className="mt-12 max-w-3xl font-mano text-sm leading-relaxed text-[#7a8595] italic">
            {p.note_de}
          </p>
        )}
      </div>
    </section>
  );
}
