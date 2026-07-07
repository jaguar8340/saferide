import { motion } from "framer-motion";

/**
 * Elegant About / "Über mich" – two-column magazine layout with a gold-framed
 * portrait and refined serif typography.
 */
export default function ElegantAbout({ content = {} }) {
  const a = content.about || {};
  const title = a.title_de || "Über mich";
  const body = a.body_de || "";
  const overline = a.overline_de || "Portrait";
  const badge = a.badge_name || "Nadine Stäubli";
  const role = a.badge_role_de || "Fahrlehrerin & Mental Coach";
  const image =
    a.image_url ||
    "https://images.unsplash.com/photo-1590650046871-92c887180603?w=900&auto=format&fit=crop&q=80";

  const stats = [
    { v: a.stat1_value, l: a.stat1_label_de },
    { v: a.stat2_value, l: a.stat2_label_de },
    { v: a.stat3_value, l: a.stat3_label_de },
  ].filter((s) => s.v);

  return (
    <section
      id="about"
      data-testid="elegant-about-section"
      className="relative py-24 md:py-36 bg-[#faf6f0]"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        {/* Left – gold-framed portrait */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7 }}
          className="lg:col-span-5 relative"
        >
          <div className="el-frame">
            <img
              src={image}
              alt={badge}
              className="w-full h-[520px] md:h-[620px] object-cover"
              loading="lazy"
            />
          </div>
          {/* Signature-style plaque */}
          <div className="absolute -bottom-6 right-4 md:right-8 bg-[#0d1b2a] text-[#faf6f0] px-6 py-4 max-w-[85%]">
            <div className="font-serif italic text-2xl leading-tight text-[#c9a961]">
              {badge}
            </div>
            <div className="mt-1 font-manrope text-[10px] tracking-[0.28em] uppercase text-white/60">
              {role}
            </div>
          </div>
        </motion.div>

        {/* Right – copy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="lg:col-span-7"
        >
          <div className="mb-6">
            <span className="el-overline el-overline--start">
              <span className="block w-8 h-px bg-[#c9a961]" />
              {overline}
            </span>
          </div>
          <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl leading-[0.95] tracking-tight text-[#0d1b2a]">
            {title.split(" ").map((w, i, arr) => (
              <span key={i}>
                {w}
                {i === 0 && arr.length > 1 && (
                  <span className="italic text-[#c9a961]">.</span>
                )}
                {i < arr.length - 1 ? " " : ""}
              </span>
            ))}
          </h2>

          {/* Decorative divider */}
          <div className="mt-8 flex items-center gap-4 max-w-md">
            <span className="block flex-1 h-px bg-[#e5ded1]" />
            <span className="w-2 h-2 rotate-45 bg-[#c9a961]" />
            <span className="block flex-1 h-px bg-[#e5ded1]" />
          </div>

          <p className="mt-8 font-manrope text-lg leading-[1.75] text-[#37475a] font-light max-w-xl whitespace-pre-line">
            {body}
          </p>

          {a.trust_de && (
            <div className="mt-8 inline-flex items-center gap-3 border border-[#c9a961]/50 bg-white px-5 py-3">
              <span className="w-1.5 h-1.5 bg-[#c9a961] rounded-full" />
              <span className="font-manrope text-xs tracking-[0.15em] text-[#37475a] font-medium">
                {a.trust_de}
              </span>
            </div>
          )}

          {/* Stats */}
          {stats.length > 0 && (
            <div className="mt-10 grid grid-cols-3 gap-4 max-w-lg">
              {stats.map((s, i) => (
                <div
                  key={i}
                  data-testid={`elegant-about-stat-${i}`}
                  className="border-l border-[#c9a961] pl-4"
                >
                  <div className="font-serif text-4xl text-[#0d1b2a] leading-none">
                    {s.v}
                  </div>
                  <div className="mt-2 font-manrope text-[10px] tracking-[0.22em] uppercase text-[#7a8595]">
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
