import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

/**
 * Sport variant of the Pricing section – "Race Packages" styled as
 * telemetry price tags. Reads content.pricing from the CMS.
 */
export default function SportPricing({ content = {} }) {
  const p = content.pricing || {};
  const plans = p.plans || [];
  const overline = p.currency_overline_de || "CHF · Race Packages";
  const title = p.title_de || "Preise";
  const subtitle = p.subtitle_de || "";
  const cta = p.cta_text_de || "Anfragen";
  const popular = p.popular_label_de || "Beliebt";

  if (!plans.length) return null;

  return (
    <section
      id="pricing"
      data-testid="sport-pricing-section"
      className="relative py-24 md:py-32 bg-[#09090b] border-t border-[#27272a]"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="mb-14 max-w-3xl">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-0.5 bg-[#e11d48]" />
            <span className="sport-overline">{overline}</span>
          </div>
          <h2 className="font-race text-5xl md:text-7xl uppercase leading-none tracking-wide">
            {title}
            <span className="text-[#e11d48]">.</span>
          </h2>
          {subtitle && (
            <p className="mt-6 text-white/60 text-lg leading-relaxed">
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
                transition={{ duration: 0.5, delay: i * 0.08 }}
                data-testid={`sport-pricing-card-${i}`}
                className={`relative group border transition-all overflow-hidden ${
                  highlight
                    ? "bg-[#e11d48] border-[#e11d48] text-white sport-glow-red"
                    : "bg-[#111113] border-[#27272a] text-white hover:border-[#e11d48]"
                }`}
              >
                {highlight && (
                  <div className="absolute top-0 right-0 bg-black text-white font-mono text-[10px] tracking-[0.28em] uppercase px-3 py-1.5">
                    {popular}
                  </div>
                )}

                <div className="p-7 md:p-8">
                  {/* Region + canton */}
                  <div className={`flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] uppercase mb-6 ${highlight ? "text-white/70" : "text-white/40"}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {plan.region_de || "CH"}
                  </div>

                  {/* Plan name */}
                  <div className="font-race text-3xl leading-tight uppercase tracking-wide mb-1">
                    {plan.name_de}
                  </div>
                  <div className={`font-mono text-[11px] tracking-widest uppercase ${highlight ? "text-white/60" : "text-white/40"}`}>
                    {plan.duration_de}
                  </div>

                  {/* Price */}
                  <div className="mt-8 flex items-baseline gap-2">
                    <span className="font-race text-6xl leading-none tracking-tight tabular-nums">
                      {plan.price}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className={`my-7 h-px ${highlight ? "bg-white/25" : "bg-[#27272a]"}`} />

                  {/* CTA */}
                  <a
                    href="#pit"
                    className={`inline-flex items-center gap-2 font-mono text-xs tracking-[0.25em] uppercase transition-all ${
                      highlight
                        ? "text-white hover:translate-x-1"
                        : "text-white/80 hover:text-[#e11d48] hover:translate-x-1"
                    }`}
                    data-testid={`sport-pricing-cta-${i}`}
                  >
                    <span>{cta}</span>
                    <ArrowRight size={14} strokeWidth={2.5} />
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>

        {p.note_de && (
          <p className="mt-10 text-white/40 text-sm leading-relaxed max-w-3xl">
            {p.note_de}
          </p>
        )}
      </div>
    </section>
  );
}
