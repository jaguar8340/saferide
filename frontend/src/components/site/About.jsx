import { motion } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";

export default function About({ data }) {
  const { pick, t } = useLang();
  if (!data) return null;

  return (
    <section
      id="about"
      data-testid="about-section"
      className="section-pad relative bg-[#f4f5f0]"
    >
      <div className="container-x px-5 md:px-10 lg:px-14 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-6 order-2 lg:order-1"
          >
            <div className="eyebrow text-[#0033ff] mb-5">
              <Sparkles size={14} className="inline-block mr-2 -mt-1" />
              {pick(data.overline_de, data.overline_en)}
            </div>
            <h2
              className="font-display font-black uppercase leading-[0.9] tracking-tighter text-[#0a0a0a]"
              style={{ fontSize: "clamp(2.4rem, 5.5vw, 5rem)" }}
            >
              {pick(data.title_de, data.title_en)}
            </h2>
            <p className="mt-8 text-[#4b5563] text-lg md:text-xl leading-relaxed max-w-xl font-medium">
              {pick(data.body_de, data.body_en)}
            </p>
            <div className="mt-7 inline-flex items-center gap-3 bg-white border-2 border-[#0a0a0a] rounded-full px-5 py-2.5">
              <CheckCircle2 className="text-[#0033ff]" size={18} />
              <span className="text-sm font-bold tracking-wide">
                {t.about.trust}
              </span>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-3 md:gap-4">
              {[
                {
                  v: data.stat1_value,
                  l: pick(data.stat1_label_de, data.stat1_label_en),
                  bg: "bg-[#0033ff]",
                  fg: "text-[#ccff00]",
                },
                {
                  v: data.stat2_value,
                  l: pick(data.stat2_label_de, data.stat2_label_en),
                  bg: "bg-[#ccff00]",
                  fg: "text-[#0a0a0a]",
                },
                {
                  v: data.stat3_value,
                  l: pick(data.stat3_label_de, data.stat3_label_en),
                  bg: "bg-[#ff0055]",
                  fg: "text-white",
                },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  data-testid={`about-stat-${i}`}
                  initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
                  whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
                  className={`${s.bg} ${s.fg} rounded-2xl p-4 md:p-5 border-2 border-[#0a0a0a]`}
                >
                  <div className="font-display font-black text-3xl md:text-4xl leading-none">
                    {s.v}
                  </div>
                  <div className="mt-2 text-[10px] tracking-widest uppercase opacity-90 font-bold">
                    {s.l}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-6 order-1 lg:order-2 relative"
          >
            <div
              aria-hidden
              className="absolute -top-6 -left-6 w-44 h-44 rounded-full bg-[#ccff00] animate-blob"
            />
            <div
              aria-hidden
              className="absolute -bottom-8 -right-8 w-56 h-56 rounded-full bg-[#ff0055] animate-blob"
              style={{ animationDelay: "-3s" }}
            />
            <div className="relative">
              <img
                src={data.image_url}
                alt="Nadine Stäubli"
                className="relative w-full h-[460px] md:h-[560px] object-cover rounded-3xl border-2 border-[#0a0a0a]"
              />
              <div
                className="absolute -bottom-6 -left-6 bg-white border-2 border-[#0a0a0a] rounded-2xl px-5 py-4 max-w-[240px] shadow-xl rotate-[-3deg]"
              >
                <div className="font-display font-black text-2xl text-[#0033ff] leading-none">
                  Nadine
                </div>
                <div className="text-xs text-[#0a0a0a]/70 mt-1.5 font-semibold">
                  Stäubli · Fahrlehrerin
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
