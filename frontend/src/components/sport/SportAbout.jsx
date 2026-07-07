import { motion } from "framer-motion";
import { Award } from "lucide-react";

/**
 * Sport variant of the About / "Über mich" section. Reads the same CMS
 * `content.about` field but renders it in the racing / carbon aesthetic.
 */
export default function SportAbout({ content = {} }) {
  const a = content.about || {};
  const title = a.title_de || "Über mich";
  const body = a.body_de || "";
  const overline = a.overline_de || "About the Driver";
  const badge = a.badge_name || "Nadine Stäubli";
  const role = a.badge_role_de || "Deine Fahrlehrerin";
  const image =
    a.image_url ||
    "https://images.unsplash.com/photo-1590650046871-92c887180603?w=800&auto=format&fit=crop&q=80";

  const stats = [
    { v: a.stat1_value, l: a.stat1_label_de },
    { v: a.stat2_value, l: a.stat2_label_de },
    { v: a.stat3_value, l: a.stat3_label_de },
  ].filter((s) => s.v);

  return (
    <section
      id="about"
      data-testid="sport-about-section"
      className="relative py-24 md:py-32 bg-[#09090b] border-t border-[#27272a]"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
        {/* Left – portrait */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-5 relative"
        >
          <div className="relative sport-grid-card border border-[#27272a]">
            <img
              src={image}
              alt={badge}
              className="w-full h-[440px] md:h-[560px] object-cover"
              loading="lazy"
            />
            {/* Position tag */}
            <div className="absolute top-5 left-5 font-race text-lg tracking-widest bg-[#e11d48] text-white px-3 py-1">
              #01 PILOT
            </div>
          </div>
          {/* Floating driver card */}
          <div className="absolute -bottom-5 left-5 md:-left-6 bg-black border border-[#27272a] sport-glow-red px-5 py-4">
            <div className="font-race text-2xl leading-none tracking-wide">
              {badge}
            </div>
            <div className="mt-1 font-mono text-[10px] tracking-[0.28em] uppercase text-white/50">
              {role}
            </div>
          </div>
        </motion.div>

        {/* Right – copy */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="lg:col-span-7"
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-0.5 bg-[#e11d48]" />
            <span className="sport-overline">{overline}</span>
          </div>
          <h2 className="font-race text-5xl md:text-6xl lg:text-7xl uppercase leading-none tracking-wide">
            {title.split(" ").map((w, i, arr) => (
              <span key={i} className="block">
                {w}
                {i === arr.length - 1 && <span className="text-[#e11d48]">.</span>}
              </span>
            ))}
          </h2>
          <p className="mt-8 text-white/70 text-lg leading-relaxed max-w-xl whitespace-pre-line">
            {body}
          </p>

          {/* Stats */}
          {stats.length > 0 && (
            <div className="mt-10 grid grid-cols-3 gap-3 md:gap-4 max-w-xl">
              {stats.map((s, i) => (
                <div
                  key={i}
                  data-testid={`sport-about-stat-${i}`}
                  className="bg-[#111113] border border-[#27272a] p-5 hover:border-[#e11d48] transition-colors"
                >
                  <div className="font-race text-4xl leading-none tracking-tight text-white">
                    {s.v}
                  </div>
                  <div className="mt-2 font-mono text-[9px] tracking-[0.25em] uppercase text-white/50">
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 inline-flex items-center gap-2 border border-[#27272a] px-4 py-2">
            <Award size={14} className="text-[#e11d48]" />
            <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/70">
              {a.trust_de || "Zertifizierte Fahrlehrerin"}
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
