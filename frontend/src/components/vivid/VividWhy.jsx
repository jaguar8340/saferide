import { motion } from "framer-motion";
import { Heart, Brain, Sparkles, Car, MapPin, ShieldCheck } from "lucide-react";

const ICONS = { Heart, Brain, Sparkles, Car, MapPin, ShieldCheck };

// Distinct card palettes cycled through so each pillar feels unique.
const PALETTES = [
  { bg: "bg-[#c8ff4d]", ink: "text-[#0a0a1f]", icon: "bg-[#0a0a1f] text-[#c8ff4d]" },
  { bg: "bg-[#3b5bff]", ink: "text-white", icon: "bg-white text-[#3b5bff]" },
  { bg: "bg-[#ff3b8b]", ink: "text-white", icon: "bg-white text-[#ff3b8b]" },
  { bg: "bg-[#ffd60a]", ink: "text-[#0a0a1f]", icon: "bg-[#0a0a1f] text-[#ffd60a]" },
  { bg: "bg-[#e2d5ff]", ink: "text-[#0a0a1f]", icon: "bg-[#0a0a1f] text-[#e2d5ff]" },
  { bg: "bg-[#a3f7bf]", ink: "text-[#0a0a1f]", icon: "bg-[#0a0a1f] text-[#a3f7bf]" },
];

/**
 * Vivid "Warum Safe Ride" – kaleidoscopic pillar cards, each with its own
 * saturated colour, hand-drawn feel and playful rotate on hover.
 */
export default function VividWhy({ content = {} }) {
  const w = content.why_safe_ride || {};
  const pillars = w.pillars || [];
  const overline = w.overline_de || "Warum uns?";
  const title = w.title_de || "Warum Safe Ride";
  const intro = w.intro_de || "";

  if (!pillars.length) return null;

  return (
    <section
      id="why"
      data-testid="vivid-why-section"
      className="relative py-24 md:py-32 bg-[#fff4e6] overflow-hidden"
    >
      <div className="v-blob bg-[#3b5bff]" style={{ top: "10%", left: "-140px", width: "360px", height: "360px", opacity: 0.35 }} />

      <div className="relative max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="grid lg:grid-cols-12 gap-8 mb-14 md:mb-16 items-end">
          <div className="lg:col-span-7">
            <span className="v-overline inline-flex mb-6" style={{ background: "#ff3b8b", color: "#fff" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              {overline}
            </span>
            <h2 className="font-grotesk text-5xl md:text-6xl lg:text-7xl leading-[0.95] tracking-[-0.035em] text-[#0a0a1f]">
              Weil <span className="v-hl-lime">Fahren lernen</span>
              <br />
              Freude machen darf
              <span className="font-instrument text-[#ff3b8b] not-italic italic">.</span>
            </h2>
          </div>
          {intro && (
            <p className="lg:col-span-5 font-inter text-lg leading-relaxed text-[#3a3a5a]">
              {intro}
            </p>
          )}
        </div>

        {/* Pillars */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {pillars.map((p, i) => {
            const Icon = ICONS[p.icon] || Sparkles;
            const c = PALETTES[i % PALETTES.length];
            const rot = i % 2 === 0 ? "-rotate-[0.6deg]" : "rotate-[0.6deg]";
            return (
              <motion.article
                key={p.id || i}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
                data-testid={`vivid-why-pillar-${i}`}
                className={`${c.bg} ${c.ink} ${rot} rounded-[28px] border-2 border-[#0a0a1f] p-7 md:p-8 transition-all hover:rotate-0 hover:-translate-y-1`}
                style={{ boxShadow: "6px 6px 0 #0a0a1f" }}
              >
                <div className="flex items-start justify-between mb-6">
                  <span className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl ${c.icon}`}>
                    <Icon size={20} strokeWidth={2.2} />
                  </span>
                  <span className="font-grotesk text-3xl font-bold opacity-30 leading-none">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="font-grotesk text-2xl md:text-3xl leading-tight tracking-[-0.02em]">
                  {p.title_de}
                </h3>
                <p className="mt-3 font-inter text-[15px] leading-relaxed opacity-90 whitespace-pre-line">
                  {p.body_de}
                </p>
              </motion.article>
            );
          })}
        </div>

        {/* Closing */}
        {w.closing_de && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5 }}
            className="mt-16 text-center max-w-3xl mx-auto font-grotesk text-2xl md:text-3xl leading-snug tracking-[-0.02em] text-[#0a0a1f]"
          >
            {w.closing_de}
          </motion.p>
        )}
      </div>
    </section>
  );
}
