import { motion } from "framer-motion";
import { Heart, Brain, Sparkles, Car, MapPin, ShieldCheck } from "lucide-react";

const ICONS = { Heart, Brain, Sparkles, Car, MapPin, ShieldCheck };

/**
 * Livery Why – rally-team pit-board style. Each pillar is a data card with
 * a race number, wrap-cut top edge, and a tape strip. Palette alternates
 * red / navy / cream to echo the fleet's tri-colour wrap.
 */
export default function LiveryWhy({ content = {} }) {
  const w = content.why_safe_ride || {};
  const pillars = w.pillars || [];
  const title = w.title_de || "Warum Safe Ride";
  const intro = w.intro_de || "";

  if (!pillars.length) return null;

  // Cycle wrap-colour combos across the pillars
  const SCHEMES = [
    { bg: "bg-[#c9302c]", ink: "text-white", num: "lv-race-num--navy", tape: "lv-tape" },
    { bg: "bg-[#1a2332]", ink: "text-white", num: "lv-race-num--red", tape: "lv-tape-red" },
    { bg: "bg-[#fefdfb]", ink: "text-[#0f1419]", num: "", tape: "lv-tape" },
    { bg: "bg-[#c9302c]", ink: "text-white", num: "lv-race-num--navy", tape: "lv-tape" },
    { bg: "bg-[#1a2332]", ink: "text-white", num: "lv-race-num--red", tape: "lv-tape" },
    { bg: "bg-[#fefdfb]", ink: "text-[#0f1419]", num: "", tape: "lv-tape-red" },
  ];

  return (
    <section
      id="why"
      data-testid="livery-why-section"
      className="relative py-24 md:py-32 bg-[#ece5d6] border-y-2 border-[#0f1419] overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid lg:grid-cols-12 gap-8 mb-14 md:mb-16 items-end">
          <div className="lg:col-span-8">
            <div className="mb-5 flex items-center gap-3">
              <span className="lv-label lv-label--red">Warum wir</span>
              <span className="font-script text-3xl text-[#c9302c] leading-none">— das Manifest</span>
            </div>
            <h2 className="font-anton text-6xl md:text-7xl lg:text-8xl uppercase leading-[0.88] tracking-tight text-[#0f1419]">
              {title}
              <span className="text-[#c9302c]">.</span>
            </h2>
          </div>
          {intro && (
            <p className="lg:col-span-4 font-mano text-lg leading-relaxed text-[#3a4553]">
              {intro}
            </p>
          )}
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {pillars.map((p, i) => {
            const Icon = ICONS[p.icon] || Sparkles;
            const s = SCHEMES[i % SCHEMES.length];
            return (
              <motion.article
                key={p.id || i}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
                data-testid={`livery-why-pillar-${i}`}
                className={`relative ${s.bg} ${s.ink} border-2 border-[#0f1419] p-8 md:p-9 group overflow-hidden`}
              >
                {/* Tape corner */}
                <span className={`absolute top-0 right-0 w-16 h-2 ${s.tape}`} />

                {/* Race number */}
                <div className="mb-6 flex items-start justify-between">
                  <span className={`lv-race-num ${s.num}`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className={`inline-flex items-center justify-center w-11 h-11 border-2 ${s.ink === "text-white" ? "border-white/40" : "border-[#0f1419]/30"} ${s.ink}`}>
                    <Icon size={18} strokeWidth={2.2} />
                  </span>
                </div>

                <h3 className="font-anton text-2xl md:text-3xl uppercase tracking-wide leading-tight">
                  {p.title_de}
                </h3>
                <p className={`mt-3 font-mano text-[15px] leading-relaxed whitespace-pre-line ${s.ink === "text-white" ? "text-white/80" : "text-[#3a4553]"}`}>
                  {p.body_de}
                </p>
              </motion.article>
            );
          })}
        </div>

        {w.closing_de && (
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5 }}
            className="mt-16 max-w-3xl font-script text-3xl md:text-4xl leading-snug text-[#0f1419]"
          >
            &ldquo; {w.closing_de} &rdquo;
          </motion.p>
        )}
      </div>
    </section>
  );
}
