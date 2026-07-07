import { motion } from "framer-motion";
import { ArrowRight, Star, Phone } from "lucide-react";

/**
 * Playful, colourful hero. Big Space-Grotesk headline with highlighted words
 * (blue/pink/lime marker underlines) and stickers. Background: warm cream
 * with blurred colour blobs and gently animated confetti dots.
 */
export default function VividHero({ content = {} }) {
  const h = content.hero || {};
  const subtitle =
    h.subtitle_de ||
    "Moderne Fahrschule in ZH · SZ · SG · GR. Persönlich, ehrlich und mit richtig viel Herz auf der Strasse.";

  return (
    <section
      id="top"
      data-testid="vivid-hero-section"
      className="relative pt-36 pb-24 md:pt-44 md:pb-32 overflow-hidden bg-[#fef9f4] v-grain"
    >
      {/* Colour blobs */}
      <div className="v-blob bg-[#c8ff4d]" style={{ top: "-80px", left: "-120px", width: "480px", height: "480px" }} />
      <div className="v-blob bg-[#ff3b8b]" style={{ bottom: "-120px", right: "-140px", width: "520px", height: "520px" }} />
      <div className="v-blob bg-[#3b5bff]" style={{ top: "40%", right: "10%", width: "260px", height: "260px", opacity: 0.35 }} />

      <div className="relative max-w-7xl mx-auto px-4 md:px-8">
        {/* Kicker sticker */}
        <motion.div
          initial={{ opacity: 0, y: 12, rotate: -8 }}
          animate={{ opacity: 1, y: 0, rotate: -2 }}
          transition={{ delay: 0.15, duration: 0.6, ease: "easeOut" }}
          className="mb-8"
        >
          <span className="v-sticker">
            <Star size={12} fill="currentColor" strokeWidth={0} />
            5.0 auf Google · 60+ Reviews
          </span>
        </motion.div>

        {/* Massive title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.7, ease: "easeOut" }}
          className="font-grotesk text-[3.4rem] sm:text-7xl md:text-8xl lg:text-[8.5rem] leading-[0.9] tracking-[-0.04em] max-w-5xl"
          data-testid="vivid-hero-title"
        >
          Fahren lernen,
          <br />
          <span className="v-hl-lime">aber</span>{" "}
          <span className="font-instrument text-[#ff3b8b] not-italic">
            <span className="italic">chill.</span>
          </span>
          <br />
          <span className="v-hl-blue text-white">ohne Stress.</span>
        </motion.h1>

        {/* Subtitle + CTAs */}
        <div className="mt-10 grid lg:grid-cols-12 gap-10 items-start">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
            className="lg:col-span-7 font-inter text-lg md:text-xl leading-relaxed text-[#3a3a5a] max-w-2xl"
            data-testid="vivid-hero-subtitle"
          >
            {subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col xl:flex-row items-start gap-4"
          >
            <a href="#contact" className="v-btn v-btn--pink" data-testid="vivid-hero-cta-anfragen">
              <span>Jetzt anfragen</span>
              <ArrowRight size={16} strokeWidth={2.5} />
            </a>
            <a href="tel:+41795850085" className="v-btn v-btn--ghost" data-testid="vivid-hero-cta-call">
              <Phone size={14} strokeWidth={2.5} />
              <span>+41 79 585 00 85</span>
            </a>
          </motion.div>
        </div>

        {/* Feature strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85, duration: 0.5 }}
          className="mt-16 md:mt-20 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
        >
          {[
            { v: "5.0", l: "Rating", tint: "bg-[#ffd60a]" },
            { v: "11", l: "Standorte", tint: "bg-[#c8ff4d]" },
            { v: "04", l: "Kantone", tint: "bg-[#a3f7bf]" },
            { v: "60+", l: "Reviews", tint: "bg-[#e2d5ff]" },
          ].map((s) => (
            <div
              key={s.l}
              data-testid={`vivid-hero-stat-${s.l.toLowerCase()}`}
              className={`v-card v-card--soft ${s.tint} p-5 rounded-3xl border-2 border-[#0a0a1f]`}
              style={{ boxShadow: "4px 4px 0 #0a0a1f" }}
            >
              <div className="font-grotesk text-4xl md:text-5xl leading-none text-[#0a0a1f]">
                {s.v}
              </div>
              <div className="mt-2 font-inter text-xs text-[#3a3a5a] font-medium tracking-wide">
                {s.l}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
