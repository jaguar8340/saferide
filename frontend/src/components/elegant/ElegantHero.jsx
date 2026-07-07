import { motion } from "framer-motion";
import { ArrowRight, Star } from "lucide-react";

/**
 * Refined magazine-style hero. Serif headline with italic accent word,
 * centered layout, thin gold hairlines, quiet motion.
 */
export default function ElegantHero({ content = {} }) {
  const h = content.hero || {};
  // Compose a refined tagline. Even if CMS holds different copy, the design
  // presents a distinguished-driving-school proposition.
  const kicker = h.overline_de || "Anno · MMXXVI";
  const subtitle =
    h.subtitle_de ||
    "Eine Fahrschule für Menschen, die Wert auf Sorgfalt, Zeit und persönliche Begleitung legen. Individuell. Diskret. Auf höchstem Niveau.";

  return (
    <section
      id="top"
      data-testid="elegant-hero-section"
      className="relative pt-40 pb-24 md:pt-52 md:pb-32 el-paper overflow-hidden"
    >
      {/* Faint gold hairline top decoration */}
      <div className="absolute top-32 left-1/2 -translate-x-1/2 flex items-center gap-3">
        <span className="block w-16 h-px bg-[#c9a961]" />
        <span className="w-1.5 h-1.5 rotate-45 bg-[#c9a961]" />
        <span className="block w-16 h-px bg-[#c9a961]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 md:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7 }}
          className="mb-10"
        >
          <span className="font-manrope text-[10px] md:text-[11px] tracking-[0.4em] uppercase text-[#9d823f] font-medium">
            {kicker}
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.9, ease: "easeOut" }}
          className="font-serif text-5xl sm:text-7xl md:text-8xl lg:text-[8.5rem] leading-[0.95] tracking-tight text-[#0d1b2a]"
          data-testid="elegant-hero-title"
        >
          Fahrschule
          <br />
          <span className="italic font-normal text-[#c9a961]">safe ride</span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.55, duration: 0.6 }}
          className="mt-10 mb-8 flex items-center justify-center"
        >
          <span className="el-ornament">
            <Star size={14} strokeWidth={1.5} fill="currentColor" />
          </span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="max-w-2xl mx-auto font-manrope text-lg md:text-xl leading-relaxed text-[#37475a] font-light"
          data-testid="elegant-hero-subtitle"
        >
          {subtitle}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-4"
        >
          <a
            href="#contact"
            className="el-btn el-btn--gold"
            data-testid="elegant-hero-cta-anfragen"
          >
            <span>Termin vereinbaren</span>
            <ArrowRight size={14} strokeWidth={1.8} />
          </a>
          <a
            href="tel:+41795850085"
            className="el-btn el-btn--ghost"
            data-testid="elegant-hero-cta-call"
          >
            <span>+41 79 585 00 85</span>
          </a>
        </motion.div>

        {/* Trust row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.8 }}
          className="mt-20 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 pt-10 border-t border-[#e5ded1] max-w-3xl mx-auto"
        >
          <div className="text-center">
            <div className="font-serif text-4xl md:text-5xl text-[#0d1b2a] leading-none">5.0</div>
            <div className="mt-2 font-manrope text-[10px] tracking-[0.28em] uppercase text-[#7a8595]">Google Rating</div>
          </div>
          <div className="hidden md:block w-px h-12 bg-[#e5ded1]" />
          <div className="text-center">
            <div className="font-serif text-4xl md:text-5xl text-[#0d1b2a] leading-none">11</div>
            <div className="mt-2 font-manrope text-[10px] tracking-[0.28em] uppercase text-[#7a8595]">Standorte</div>
          </div>
          <div className="hidden md:block w-px h-12 bg-[#e5ded1]" />
          <div className="text-center">
            <div className="font-serif text-4xl md:text-5xl text-[#0d1b2a] leading-none">4</div>
            <div className="mt-2 font-manrope text-[10px] tracking-[0.28em] uppercase text-[#7a8595]">Kantone</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
