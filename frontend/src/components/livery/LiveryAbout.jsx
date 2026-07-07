import { motion } from "framer-motion";
import { Award } from "lucide-react";

/**
 * Livery About – editorial split with a red-frame portrait on the left,
 * bold anton headline + script "Über mich" accent + magazine copy right.
 */
export default function LiveryAbout({ content = {} }) {
  const a = content.about || {};
  const title = a.title_de || "Über mich";
  const body = a.body_de || "";
  const badge = a.badge_name || "Nadine Stäubli";
  const role = a.badge_role_de || "Fahrlehrerin · Mental Coach";
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
      data-testid="livery-about-section"
      className="relative py-24 md:py-32 bg-[#f2ede4] overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
        {/* Left – portrait with red frame */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-5 relative"
        >
          <div className="relative">
            {/* Offset red block behind photo */}
            <div className="absolute -bottom-5 -right-5 w-full h-full bg-[#c9302c] border-2 border-[#0f1419]" />
            <div className="relative border-2 border-[#0f1419] overflow-hidden">
              <img
                src={image}
                alt={badge}
                className="w-full h-[460px] md:h-[560px] object-cover"
                loading="lazy"
              />
              {/* Race number sticker */}
              <div className="absolute top-6 left-6">
                <span className="lv-race-num">N°1</span>
              </div>
              {/* Bottom name badge */}
              <div className="absolute bottom-0 inset-x-0 bg-[#1a2332] px-5 py-4 flex items-center justify-between">
                <div>
                  <div className="font-script text-3xl leading-none text-[#f2c94c]">
                    {badge}
                  </div>
                  <div className="font-anton text-[11px] tracking-[0.22em] uppercase text-white/70 mt-1">
                    {role}
                  </div>
                </div>
                <span className="w-10 h-10 lv-tape-red" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right – copy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="lg:col-span-7"
        >
          <div className="mb-4 flex items-center gap-3">
            <span className="lv-label lv-label--red">Portrait</span>
            <span className="font-script text-3xl text-[#c9302c] leading-none">— hi, ich bin&apos;s</span>
          </div>

          <h2 className="font-anton text-6xl md:text-7xl lg:text-8xl uppercase leading-[0.9] tracking-tight text-[#0f1419]" data-testid="livery-about-title">
            {title}
            <span className="text-[#c9302c]">.</span>
          </h2>

          <p className="mt-10 font-mano text-lg leading-[1.75] text-[#3a4553] max-w-xl whitespace-pre-line">
            {body}
          </p>

          {a.trust_de && (
            <div className="mt-8 inline-flex items-center gap-2 bg-white border-2 border-[#0f1419] px-4 py-2.5">
              <Award size={14} className="text-[#c9302c]" strokeWidth={2.2} />
              <span className="font-anton text-xs tracking-[0.18em] uppercase text-[#0f1419]">
                {a.trust_de}
              </span>
            </div>
          )}

          {/* Stats */}
          {stats.length > 0 && (
            <div className="mt-10 grid grid-cols-3 gap-4 max-w-xl">
              {stats.map((s, i) => (
                <div
                  key={i}
                  data-testid={`livery-about-stat-${i}`}
                  className="border-2 border-[#0f1419] bg-white p-5 relative"
                >
                  <div className="font-anton text-4xl md:text-5xl leading-none text-[#0f1419]">
                    {s.v}
                  </div>
                  <div className="mt-2 font-anton text-[10px] tracking-[0.2em] uppercase text-[#7a8595]">
                    {s.l}
                  </div>
                  {/* Corner tape accent */}
                  <span className="absolute top-0 right-0 w-8 h-2 lv-tape" />
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
