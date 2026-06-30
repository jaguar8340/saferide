import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";

export default function About({ data }) {
  const { pick, t } = useLang();
  if (!data) return null;

  return (
    <section
      id="about"
      data-testid="about-section"
      className="section-pad bg-[#fbf9f6]"
    >
      <div className="container-x">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 order-2 lg:order-1"
          >
            <div className="flex items-center gap-2 mb-5">
              <Sparkles size={14} className="text-[#ff5a36]" />
              <span className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]">
                {pick(data.overline_de, data.overline_en)}
              </span>
            </div>
            <h2
              className="font-display leading-[0.98] tracking-tight text-[#0f172a]"
              style={{ fontSize: "clamp(2.1rem, 4.4vw, 4rem)" }}
            >
              {pick(data.title_de, data.title_en).split("–")[0]}
              <span className="font-serif-i text-[#ff5a36] font-normal">
                – {pick(data.title_de, data.title_en).split("–")[1]?.trim()}
              </span>
            </h2>
            <p className="mt-7 text-lg text-[#475569] leading-relaxed font-medium max-w-xl">
              {pick(data.body_de, data.body_en)}
            </p>
            <div className="mt-6 inline-flex items-center gap-2 bg-white border border-[#e2e8f0] rounded-full px-4 py-2 text-sm font-semibold">
              <span className="dot-accent" />
              {t.about.trust}
            </div>

            <div className="mt-10 grid grid-cols-3 gap-3 md:gap-4">
              {[
                {
                  v: data.stat1_value,
                  l: pick(data.stat1_label_de, data.stat1_label_en),
                  bg: "bg-[#ff5a36]",
                  fg: "text-white",
                },
                {
                  v: data.stat2_value,
                  l: pick(data.stat2_label_de, data.stat2_label_en),
                  bg: "bg-white border border-[#e2e8f0]",
                  fg: "text-[#0f172a]",
                },
                {
                  v: data.stat3_value,
                  l: pick(data.stat3_label_de, data.stat3_label_en),
                  bg: "bg-[#0f172a]",
                  fg: "text-white",
                },
              ].map((s, i) => (
                <div
                  key={i}
                  data-testid={`about-stat-${i}`}
                  className={`${s.bg} ${s.fg} rounded-2xl p-5`}
                >
                  <div className="font-display text-3xl md:text-4xl leading-none">
                    {s.v}
                  </div>
                  <div className="mt-2 text-[10px] tracking-widest uppercase opacity-80 font-semibold">
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-5 order-1 lg:order-2"
          >
            <div className="relative">
              <img
                src={data.image_url}
                alt="Nadine Stäubli"
                className="w-full h-[440px] md:h-[560px] object-cover rounded-3xl"
              />
              <div className="absolute -bottom-5 -left-5 md:-left-8 bg-white border border-[#e2e8f0] rounded-2xl px-5 py-4 shadow-[0_12px_30px_-12px_rgba(15,23,42,0.18)]">
                <div className="font-display text-xl text-[#0f172a]">Nadine Stäubli</div>
                <div className="text-xs text-[#475569] mt-1 font-medium">
                  Fahrlehrerin <span className="text-[#ff5a36]">·</span> seit 2014
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
