import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

/**
 * Elegant Pricing – luxury pricelist style. White cards with thin borders,
 * roman-numeral markers, gold accent on the featured plan.
 */
export default function ElegantPricing({ content = {} }) {
  const p = content.pricing || {};
  const plans = p.plans || [];
  const overline = p.currency_overline_de || "Investition · CHF";
  const title = p.title_de || "Preise";
  const subtitle = p.subtitle_de || "";
  const cta = p.cta_text_de || "Termin vereinbaren";
  const popular = p.popular_label_de || "Empfohlen";

  if (!plans.length) return null;

  return (
    <section
      id="pricing"
      data-testid="elegant-pricing-section"
      className="relative py-24 md:py-36 bg-[#faf6f0] border-t border-[#e5ded1]"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <div className="mb-5 flex justify-center">
            <span className="inline-flex items-center gap-3 font-manrope text-[10px] tracking-[0.32em] uppercase text-[#9d823f] font-medium">
              <span className="block w-10 h-px bg-[#c9a961]" />
              {overline}
              <span className="block w-10 h-px bg-[#c9a961]" />
            </span>
          </div>
          <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl leading-[0.95] tracking-tight text-[#0d1b2a]">
            {title.split(" ").map((w, i, arr) => (
              <span key={i}>
                {w}
                {i === arr.length - 1 && arr.length > 0 ? (
                  <span className="italic text-[#c9a961]">.</span>
                ) : (
                  " "
                )}
              </span>
            ))}
          </h2>
          {subtitle && (
            <p className="mt-6 font-manrope text-lg leading-relaxed text-[#37475a] font-light">
              {subtitle}
            </p>
          )}
        </div>

        {/* Plan grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          {plans.map((plan, i) => {
            const highlight = !!plan.highlight;
            return (
              <motion.div
                key={plan.id || i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.55, delay: i * 0.08 }}
                data-testid={`elegant-pricing-card-${i}`}
                className={`relative border p-8 md:p-10 transition-all hover:-translate-y-1 ${
                  highlight
                    ? "bg-[#0d1b2a] text-white border-[#0d1b2a]"
                    : "bg-white text-[#0d1b2a] border-[#e5ded1] hover:border-[#c9a961]"
                }`}
              >
                {highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#c9a961] text-[#0d1b2a] font-manrope text-[9px] tracking-[0.32em] uppercase px-4 py-1.5 font-semibold">
                    {popular}
                  </div>
                )}

                {/* Region */}
                <div
                  className={`font-manrope text-[10px] tracking-[0.3em] uppercase mb-1 ${
                    highlight ? "text-[#c9a961]" : "text-[#7a8595]"
                  }`}
                >
                  {plan.region_de || "CH"}
                </div>

                {/* Plan name */}
                <h3 className="font-serif text-3xl leading-tight tracking-tight mt-2">
                  {plan.name_de}
                </h3>
                <div
                  className={`mt-2 font-italic-serif text-base ${
                    highlight ? "text-white/70" : "text-[#7a8595]"
                  }`}
                >
                  {plan.duration_de}
                </div>

                {/* Divider */}
                <div
                  className={`my-8 h-px ${
                    highlight ? "bg-white/20" : "bg-[#e5ded1]"
                  }`}
                />

                {/* Price */}
                <div className="flex items-baseline gap-2">
                  <span
                    className={`font-serif text-6xl leading-none tracking-tight ${
                      highlight ? "text-[#c9a961]" : "text-[#0d1b2a]"
                    }`}
                  >
                    {plan.price}
                  </span>
                </div>

                {/* CTA */}
                <a
                  href="#contact"
                  className={`mt-10 inline-flex items-center gap-2 font-manrope text-[11px] tracking-[0.28em] uppercase group ${
                    highlight
                      ? "text-white hover:text-[#c9a961]"
                      : "text-[#0d1b2a] hover:text-[#c9a961]"
                  }`}
                  data-testid={`elegant-pricing-cta-${i}`}
                >
                  <span>{cta}</span>
                  <ArrowRight
                    size={14}
                    strokeWidth={1.8}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </a>
              </motion.div>
            );
          })}
        </div>

        {p.note_de && (
          <p className="mt-14 text-center max-w-2xl mx-auto font-manrope text-sm leading-relaxed text-[#7a8595] font-light italic">
            {p.note_de}
          </p>
        )}
      </div>
    </section>
  );
}
