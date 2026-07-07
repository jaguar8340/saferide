import { motion } from "framer-motion";
import { Heart, Brain, Sparkles, Car, MapPin, ShieldCheck } from "lucide-react";

const ICONS = { Heart, Brain, Sparkles, Car, MapPin, ShieldCheck };

/**
 * Sport variant of "Warum Safe Ride" – pillars rendered as a race dashboard
 * of numbered technical cards on a dark surface.
 */
export default function SportWhy({ content = {} }) {
  const w = content.why_safe_ride || {};
  const pillars = w.pillars || [];
  const overline = w.overline_de || "Racing Edge";
  const title = w.title_de || "Warum Safe Ride";
  const intro = w.intro_de || "";

  if (!pillars.length) return null;

  return (
    <section
      id="why"
      data-testid="sport-why-section"
      className="relative py-24 md:py-32 sport-carbon border-t border-[#27272a]"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid lg:grid-cols-12 gap-10 mb-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.55 }}
            className="lg:col-span-7"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-0.5 bg-[#e11d48]" />
              <span className="sport-overline">{overline}</span>
            </div>
            <h2 className="font-race text-5xl md:text-7xl uppercase leading-none tracking-wide">
              {title}
              <span className="text-[#e11d48]">.</span>
            </h2>
          </motion.div>
          {intro && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="lg:col-span-5 text-white/60 text-lg leading-relaxed"
            >
              {intro}
            </motion.p>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {pillars.map((p, i) => {
            const Icon = ICONS[p.icon] || Sparkles;
            return (
              <motion.article
                key={p.id || i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
                data-testid={`sport-why-pillar-${i}`}
                className="group relative bg-black border border-[#27272a] hover:border-[#e11d48] p-7 md:p-8 transition-colors overflow-hidden"
              >
                {/* Corner tag */}
                <div className="flex items-start justify-between mb-6">
                  <span className="w-11 h-11 flex items-center justify-center bg-[#e11d48]/10 border border-[#e11d48]/40 group-hover:bg-[#e11d48] transition-colors">
                    <Icon size={18} className="text-[#e11d48] group-hover:text-white transition-colors" strokeWidth={2.2} />
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/40">
                    Data · {String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                <h3 className="font-race text-2xl md:text-3xl uppercase tracking-wide leading-tight">
                  {p.title_de}
                </h3>
                <p className="mt-3 text-white/60 text-sm leading-relaxed whitespace-pre-line">
                  {p.body_de}
                </p>

                {/* Red hover bar */}
                <span className="absolute left-0 bottom-0 h-0.5 w-0 bg-[#e11d48] group-hover:w-full transition-all duration-500" />
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
