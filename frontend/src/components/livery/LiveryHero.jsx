import { motion } from "framer-motion";
import { ArrowRight, Phone, Star } from "lucide-react";

/**
 * Livery Hero – editorial magazine cover feel. Big compressed Anton
 * headline over the actual red Audi S3 photo (or CMS hero image), with a
 * script "safe ride" accent, race-number sticker, and a safety-tape strip.
 * Two-column layout so the copy dominates and the wrapped car peeks in.
 */
export default function LiveryHero({ content = {} }) {
  const h = content.hero || {};
  const subtitle =
    h.subtitle_de ||
    "Persönlich. Ehrlich. Mit den vermutlich sportlichsten Fahrschulautos der Schweiz. Von Nadine – handgemacht, seit 2020.";
  const carImage =
    (content.fleet && content.fleet[0] && content.fleet[0].image_url) ||
    h.image_url ||
    "https://images.unsplash.com/photo-1580446623001-3abf670c5c55?w=1200&auto=format&fit=crop&q=85";

  return (
    <section
      id="top"
      data-testid="livery-hero-section"
      className="relative pt-40 pb-0 overflow-hidden bg-[#f2ede4]"
    >
      {/* Grain */}
      <div className="absolute inset-0 lv-grain pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 md:px-8 grid lg:grid-cols-12 gap-10 items-end">
        {/* Left – copy */}
        <div className="lg:col-span-7 pb-16 md:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="flex items-center gap-3 mb-8"
          >
            <span className="lv-label lv-label--red">
              <Star size={12} fill="currentColor" strokeWidth={0} /> Season 2026
            </span>
            <span className="lv-label lv-label--white">
              11 Standorte · CH
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7, ease: "easeOut" }}
            className="font-anton text-[4rem] sm:text-[6.5rem] lg:text-[9rem] leading-[0.88] uppercase text-[#0f1419] tracking-tight"
            data-testid="livery-hero-title"
          >
            Fahrschule
            <span className="block font-script normal-case text-[#c9302c] text-[5rem] sm:text-[7rem] lg:text-[10rem] leading-[0.75] -mt-2">
              safe ride
            </span>
            <span className="block text-[#1a2332] mt-4">Anders.</span>
            <span className="block text-[#c9302c]">
              Besser.
            </span>
            <span className="block text-[#1a2332]">
              <span className="lv-scribble">Mutiger.</span>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-10 font-mano text-lg md:text-xl leading-relaxed text-[#3a4553] max-w-xl"
            data-testid="livery-hero-subtitle"
          >
            {subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5 }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <a href="#contact" className="lv-btn" data-testid="livery-hero-cta-anfragen">
              <span>Anfragen</span>
              <ArrowRight size={16} strokeWidth={2.5} />
            </a>
            <a href="tel:+41795850085" className="lv-btn lv-btn--ghost" data-testid="livery-hero-cta-call">
              <Phone size={14} strokeWidth={2.5} />
              <span>+41 79 585 00 85</span>
            </a>
          </motion.div>
        </div>

        {/* Right – car photo panel with wrap-cut and race number sticker */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35, duration: 0.7, ease: "easeOut" }}
          className="lg:col-span-5 relative self-stretch min-h-[560px]"
        >
          <div className="absolute inset-0 lg:-mr-8 xl:-mr-16">
            <div className="relative w-full h-full lv-wrap-cut-bottom border-2 border-[#0f1419] overflow-hidden">
              <img
                src={carImage}
                alt="Fahrschule Safe Ride"
                className="w-full h-full object-cover"
                loading="eager"
              />
              {/* Diagonal red overlay stripe */}
              <div
                className="absolute inset-y-0 left-[-10%] w-32 bg-[#c9302c]/85"
                style={{ transform: "skewX(-14deg)" }}
              />
              {/* Race number sticker */}
              <div className="absolute top-8 left-8">
                <span className="lv-race-num lv-race-num--red">01</span>
              </div>
              {/* Bottom label bar */}
              <div className="absolute bottom-8 left-4 right-4 flex items-center justify-between">
                <span className="lv-label lv-label--navy">Audi S3 · Team Safe Ride</span>
                <span className="font-anton text-white text-lg tracking-widest">ZH · SZ · SG · GR</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom stat strip with safety tape */}
      <div className="relative mt-8">
        <div className="lv-tape h-3" />
        <div className="bg-[#1a2332] text-white">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { v: "5.0", l: "Google Rating" },
              { v: "11", l: "Standorte" },
              { v: "04", l: "Kantone" },
              { v: "60+", l: "Reviews" },
            ].map((s, i) => (
              <div
                key={s.l}
                data-testid={`livery-hero-stat-${s.l.toLowerCase().replace(/\s+/g, "-")}`}
                className="flex items-baseline gap-3"
              >
                <span className="font-anton text-4xl md:text-5xl leading-none text-[#f2c94c]">{s.v}</span>
                <span className="font-anton text-xs tracking-[0.25em] uppercase text-white/70">
                  {s.l}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
