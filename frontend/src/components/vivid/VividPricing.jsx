import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";

/**
 * Vivid Pricing – colourful pricing cards with the featured plan popping
 * as a hot-pink hero. Each card gets a sticker "region tag" on top.
 */
export default function VividPricing({ content = {} }) {
  const p = content.pricing || {};
  const plans = p.plans || [];
  const overline = p.currency_overline_de || "Faire Preise";
  const title = p.title_de || "Preise";
  const subtitle = p.subtitle_de || "";
  const cta = p.cta_text_de || "Anfragen";
  const popular = p.popular_label_de || "Beliebt";

  if (!plans.length) return null;

  return (
    <section
      id="pricing"
      data-testid="vivid-pricing-section"
      className="relative py-24 md:py-32 bg-[#fef9f4]"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14 md:mb-16">
          <span className="v-overline inline-flex mb-6" data-testid="vivid-pricing-overline">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0a0a1f]" />
            {overline}
          </span>
          <h2 className="font-grotesk text-5xl md:text-6xl lg:text-7xl leading-[0.95] tracking-[-0.035em] text-[#0a0a1f]">
            Klar. <span className="v-hl-pink text-white">Ehrlich.</span>{" "}
            <span className="v-hl-blue text-white">Fair.</span>
          </h2>
          {subtitle && (
            <p className="mt-6 font-inter text-lg leading-relaxed text-[#3a3a5a]">
              {subtitle}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {plans.map((plan, i) => {
            const highlight = !!plan.highlight;
            return (
              <motion.div
                key={plan.id || i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.55, delay: i * 0.08 }}
                data-testid={`vivid-pricing-card-${i}`}
                className={`relative border-2 border-[#0a0a1f] rounded-[28px] p-7 md:p-8 transition-all hover:-translate-y-1 ${
                  highlight
                    ? "bg-[#ff3b8b] text-white"
                    : "bg-white text-[#0a0a1f]"
                }`}
                style={{ boxShadow: highlight ? "6px 6px 0 #0a0a1f" : "5px 5px 0 #0a0a1f" }}
              >
                {highlight && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 v-sticker v-sticker--lime whitespace-nowrap"
                    style={{ transform: "translateX(-50%) rotate(-4deg)" }}
                  >
                    <Check size={12} strokeWidth={3} /> {popular}
                  </div>
                )}

                {/* Region sticker */}
                <span
                  className={`v-sticker ${highlight ? "v-sticker--blue" : "v-sticker--pink"} inline-flex mb-6`}
                  style={{ transform: "rotate(-3deg)" }}
                >
                  {plan.region_de || "CH"}
                </span>

                <div className="font-grotesk text-2xl md:text-[1.6rem] leading-tight tracking-[-0.02em]">
                  {plan.name_de}
                </div>
                <div className={`mt-1 font-inter text-sm ${highlight ? "text-white/80" : "text-[#7a7a95]"}`}>
                  {plan.duration_de}
                </div>

                {/* Price */}
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-grotesk text-5xl md:text-6xl leading-none tracking-[-0.04em]">
                    {plan.price}
                  </span>
                </div>

                {/* CTA */}
                <a
                  href="#contact"
                  className={`mt-8 inline-flex items-center gap-2 rounded-full px-5 py-3 font-grotesk text-sm font-semibold transition-all border-2 border-[#0a0a1f] ${
                    highlight
                      ? "bg-white text-[#0a0a1f] hover:bg-[#c8ff4d]"
                      : "bg-[#0a0a1f] text-white hover:bg-[#3b5bff]"
                  }`}
                  data-testid={`vivid-pricing-cta-${i}`}
                >
                  <span>{cta}</span>
                  <ArrowRight size={14} strokeWidth={2.5} />
                </a>
              </motion.div>
            );
          })}
        </div>

        {p.note_de && (
          <p className="mt-12 text-center max-w-2xl mx-auto font-inter text-sm leading-relaxed text-[#7a7a95]">
            {p.note_de}
          </p>
        )}
      </div>
    </section>
  );
}
