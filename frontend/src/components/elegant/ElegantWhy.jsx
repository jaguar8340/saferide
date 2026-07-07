import { motion } from "framer-motion";
import { Heart, Brain, Sparkles, Car, MapPin, ShieldCheck } from "lucide-react";

const ICONS = { Heart, Brain, Sparkles, Car, MapPin, ShieldCheck };

/**
 * Elegant "Warum Safe Ride" – philosophy pillars rendered as refined feature
 * cards with thin borders, gold accents and roman numerals.
 */
function romanize(num) {
  const map = [
    ["X", 10],
    ["IX", 9],
    ["V", 5],
    ["IV", 4],
    ["I", 1],
  ];
  let n = num;
  let out = "";
  for (const [r, v] of map) {
    while (n >= v) {
      out += r;
      n -= v;
    }
  }
  return out;
}

export default function ElegantWhy({ content = {} }) {
  const w = content.why_safe_ride || {};
  const pillars = w.pillars || [];
  const overline = w.overline_de || "Philosophie";
  const title = w.title_de || "Unsere Grundwerte";
  const intro = w.intro_de || "";

  if (!pillars.length) return null;

  return (
    <section
      id="why"
      data-testid="elegant-why-section"
      className="relative py-24 md:py-36 bg-[#f3ecdf] border-y border-[#e5ded1]"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="max-w-3xl mb-16 md:mb-20">
          <div className="mb-5">
            <span className="el-overline el-overline--start">
              <span className="block w-8 h-px bg-[#c9a961]" />
              {overline}
            </span>
          </div>
          <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl leading-[0.95] tracking-tight text-[#0d1b2a]">
            {title.split(" ").map((w2, i, arr) => (
              <span key={i}>
                {w2}
                {i === Math.floor(arr.length / 2) && arr.length > 2 && (
                  <br />
                )}
                {i < arr.length - 1 ? " " : ""}
              </span>
            ))}
          </h2>
          {intro && (
            <p className="mt-8 font-manrope text-lg leading-[1.75] text-[#37475a] font-light max-w-2xl">
              {intro}
            </p>
          )}
        </div>

        {/* Pillars – asymmetric magazine grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {pillars.map((p, i) => {
            const Icon = ICONS[p.icon] || Sparkles;
            const featured = i === 1;
            return (
              <motion.article
                key={p.id || i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.55, delay: (i % 3) * 0.1 }}
                data-testid={`elegant-why-pillar-${i}`}
                className={`relative el-card p-8 md:p-10 group ${
                  featured
                    ? "bg-[#0d1b2a] text-[#faf6f0] border-[#0d1b2a] hover:border-[#c9a961]"
                    : ""
                }`}
              >
                {/* Roman numeral */}
                <div
                  className={`font-serif italic text-4xl mb-6 ${
                    featured ? "text-[#c9a961]" : "text-[#c9a961]"
                  }`}
                >
                  {romanize(i + 1)}.
                </div>

                <span
                  className={`inline-flex items-center justify-center w-11 h-11 mb-6 border ${
                    featured
                      ? "border-[#c9a961]/60 text-[#c9a961]"
                      : "border-[#c9a961] text-[#c9a961]"
                  }`}
                >
                  <Icon size={18} strokeWidth={1.6} />
                </span>

                <h3
                  className={`font-serif text-2xl md:text-3xl leading-tight tracking-tight ${
                    featured ? "text-white" : "text-[#0d1b2a]"
                  }`}
                >
                  {p.title_de}
                </h3>
                <p
                  className={`mt-4 font-manrope text-[15px] leading-[1.75] font-light whitespace-pre-line ${
                    featured ? "text-white/75" : "text-[#37475a]"
                  }`}
                >
                  {p.body_de}
                </p>

                {/* Gold hover bar */}
                <span className="absolute left-0 bottom-0 h-px w-0 bg-[#c9a961] group-hover:w-full transition-all duration-700" />
              </motion.article>
            );
          })}
        </div>

        {w.closing_de && (
          <div className="mt-20 max-w-3xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <span className="el-quote-mark">&ldquo;</span>
            </div>
            <p className="font-italic-serif text-2xl md:text-3xl leading-relaxed text-[#0d1b2a] tracking-tight">
              {w.closing_de}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
