import { motion } from "framer-motion";
import { Award, Heart } from "lucide-react";

/**
 * Vivid "Über mich" – playful two-column layout with a sticker-decorated
 * portrait and colourful highlight badges around the copy.
 */
export default function VividAbout({ content = {} }) {
  const a = content.about || {};
  const title = a.title_de || "Über mich";
  const body = a.body_de || "";
  const overline = a.overline_de || "Hi, ich bin's";
  const badge = a.badge_name || "Nadine Stäubli";
  const role = a.badge_role_de || "Fahrlehrerin & Mental Coach";
  const image =
    a.image_url ||
    "https://images.unsplash.com/photo-1590650046871-92c887180603?w=900&auto=format&fit=crop&q=80";

  const stats = [
    { v: a.stat1_value, l: a.stat1_label_de, bg: "bg-[#3b5bff]", fg: "text-white" },
    { v: a.stat2_value, l: a.stat2_label_de, bg: "bg-[#ff3b8b]", fg: "text-white" },
    { v: a.stat3_value, l: a.stat3_label_de, bg: "bg-[#c8ff4d]", fg: "text-[#0a0a1f]" },
  ].filter((s) => s.v);

  return (
    <section
      id="about"
      data-testid="vivid-about-section"
      className="relative py-24 md:py-32 bg-[#fef9f4] overflow-hidden"
    >
      <div className="v-blob bg-[#a3f7bf]" style={{ top: "20%", right: "-100px", width: "300px", height: "300px" }} />

      <div className="relative max-w-7xl mx-auto px-4 md:px-8 grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
        {/* Left – portrait with sticker overlays */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-5 relative"
        >
          <div className="relative rounded-[36px] overflow-hidden border-[3px] border-[#0a0a1f]" style={{ boxShadow: "10px 10px 0 #0a0a1f" }}>
            <img
              src={image}
              alt={badge}
              className="w-full h-[460px] md:h-[560px] object-cover"
              loading="lazy"
            />
          </div>

          {/* Floating stickers */}
          <div className="absolute top-6 -left-4 v-sticker v-sticker--pink" style={{ transform: "rotate(-8deg)" }}>
            <Heart size={12} fill="currentColor" strokeWidth={0} /> Made with love
          </div>
          <div className="absolute bottom-8 -right-5 md:-right-8 v-sticker v-sticker--blue" style={{ transform: "rotate(6deg)" }}>
            #01 Fahrlehrerin
          </div>

          {/* Name card */}
          <div className="absolute -bottom-6 left-6 right-6 bg-white border-2 border-[#0a0a1f] rounded-2xl px-5 py-4" style={{ boxShadow: "5px 5px 0 #0a0a1f" }}>
            <div className="font-grotesk text-2xl text-[#0a0a1f] leading-tight">
              {badge}
            </div>
            <div className="mt-1 font-inter text-xs text-[#3a3a5a] font-medium">
              {role}
            </div>
          </div>
        </motion.div>

        {/* Right – copy */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="lg:col-span-7"
        >
          <span className="v-overline mb-6 inline-flex" data-testid="vivid-about-overline">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0a0a1f]" />
            {overline}
          </span>

          <h2 className="font-grotesk text-5xl md:text-6xl lg:text-7xl leading-[0.95] tracking-[-0.035em] text-[#0a0a1f] mt-6">
            {title.split(" ").map((w, i, arr) => {
              const isLast = i === arr.length - 1;
              return (
                <span key={i} className={isLast ? "v-hl-yellow" : ""}>
                  {w}
                  {i < arr.length - 1 ? " " : ""}
                </span>
              );
            })}
          </h2>

          <p className="mt-8 font-inter text-lg leading-[1.75] text-[#3a3a5a] max-w-xl whitespace-pre-line">
            {body}
          </p>

          {a.trust_de && (
            <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white border-2 border-[#0a0a1f] px-4 py-2 font-grotesk text-xs font-semibold text-[#0a0a1f]" style={{ boxShadow: "3px 3px 0 #0a0a1f" }}>
              <Award size={14} className="text-[#ff3b8b]" strokeWidth={2.2} />
              {a.trust_de}
            </div>
          )}

          {/* Stats */}
          {stats.length > 0 && (
            <div className="mt-10 grid grid-cols-3 gap-3 md:gap-4 max-w-xl">
              {stats.map((s, i) => (
                <div
                  key={i}
                  data-testid={`vivid-about-stat-${i}`}
                  className={`${s.bg} ${s.fg} border-2 border-[#0a0a1f] rounded-2xl p-5`}
                  style={{ boxShadow: "4px 4px 0 #0a0a1f" }}
                >
                  <div className="font-grotesk text-3xl md:text-4xl leading-none">
                    {s.v}
                  </div>
                  <div className="mt-2 font-inter text-[10px] tracking-[0.15em] uppercase font-semibold opacity-90">
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
