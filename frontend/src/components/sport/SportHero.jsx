import { motion } from "framer-motion";
import { ArrowRight, Phone, Gauge } from "lucide-react";

/**
 * Massive typography hero with carbon texture, animated speedlines and a
 * telemetry-style bottom stat bar (three digital readouts).
 *
 * `content` is the raw CMS `content` object so we can reuse existing hero
 * fields without introducing a new schema.
 */
export default function SportHero({ content = {} }) {
  const hero = content.hero || {};
  const title = hero.title_de || "Anders. Besser. Mutiger.";
  const subtitle =
    hero.subtitle_de ||
    "Moderne Fahrschule in ZH · SZ · SG · GR. Persönlich. Ehrlich. Mit Vollgas zum Führerschein.";

  return (
    <section
      id="top"
      data-testid="sport-hero-section"
      className="relative pt-40 pb-24 md:pt-48 md:pb-32 overflow-hidden sport-carbon sport-scanlines"
    >
      {/* Animated speedlines */}
      <motion.div
        initial={{ x: "-30%", opacity: 0.7 }}
        animate={{ x: "0%", opacity: 1 }}
        transition={{ duration: 1.4, ease: "easeOut" }}
        className="absolute inset-0 sport-speedlines pointer-events-none"
      />

      {/* Diagonal red accent stripe on the right */}
      <div className="hidden md:block absolute top-0 right-0 w-1/3 h-full pointer-events-none">
        <div
          className="absolute top-0 right-[-30%] w-full h-full bg-[#e11d48]/8"
          style={{ transform: "skewX(-14deg)" }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 md:px-8 grid lg:grid-cols-12 gap-10 items-center">
        {/* Left – copy */}
        <div className="lg:col-span-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="flex items-center gap-3 mb-6"
          >
            <span className="w-8 h-0.5 bg-[#e11d48]" />
            <span className="sport-overline">Season 2026 · Grid #01</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7, ease: "easeOut" }}
            className="font-race uppercase leading-[0.85] text-[5rem] sm:text-[7rem] lg:text-[9rem] tracking-wide"
            data-testid="sport-hero-title"
          >
            {title
              .split(".")
              .map((s) => s.trim())
              .filter(Boolean)
              .map((word, i) => (
                <span key={i} className="block">
                  {word}
                  <span className="text-[#e11d48]">.</span>
                </span>
              ))}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-8 text-white/70 text-lg md:text-xl max-w-2xl leading-relaxed"
            data-testid="sport-hero-subtitle"
          >
            {subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.5 }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <a href="#pit" className="sport-btn" data-testid="sport-hero-cta-anfragen">
              <span>Anfragen</span>
              <ArrowRight size={18} strokeWidth={2.5} />
            </a>
            <a
              href="tel:+41795850085"
              className="sport-btn sport-btn-ghost"
              data-testid="sport-hero-cta-call"
            >
              <Phone size={16} strokeWidth={2.5} />
              <span>+41 79 585 00 85</span>
            </a>
          </motion.div>
        </div>

        {/* Right – speedometer / rev counter visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ delay: 0.35, duration: 0.7, ease: "easeOut" }}
          className="lg:col-span-4 flex justify-center lg:justify-end"
        >
          <div className="relative w-[280px] h-[280px] md:w-[340px] md:h-[340px]">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-2 border-[#27272a]" />
            {/* Red arc */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "conic-gradient(from 135deg, #e11d48 0deg, #e11d48 210deg, transparent 210deg)",
                mask: "radial-gradient(circle, transparent 60%, black 62%)",
                WebkitMask: "radial-gradient(circle, transparent 60%, black 62%)",
              }}
            />
            {/* Inner black disc + numbers */}
            <div className="absolute inset-6 rounded-full bg-[#0d0d0f] border border-[#27272a] flex flex-col items-center justify-center text-center">
              <Gauge size={22} className="text-[#e11d48] mb-2" strokeWidth={2.5} />
              <div className="font-mono text-[10px] tracking-[0.28em] text-white/50 uppercase">
                Confidence
              </div>
              <div className="font-race text-6xl md:text-7xl leading-none mt-1">
                5.0
              </div>
              <div className="font-mono text-[10px] tracking-[0.25em] text-white/40 uppercase mt-1">
                60+ Reviews
              </div>
            </div>
            {/* Tick strip */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-40 h-1 sport-tick-strip opacity-40" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
