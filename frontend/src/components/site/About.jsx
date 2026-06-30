import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import Editable from "@/components/edit/Editable";
import EditableImage from "@/components/edit/EditableImage";

export default function About({ data }) {
  const { lang, pick, t } = useLang();
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
              <Editable
                path={`about.overline_${lang}`}
                value={pick(data.overline_de, data.overline_en)}
                className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]"
              />
            </div>
            <Editable
              path={`about.title_${lang}`}
              value={pick(data.title_de, data.title_en)}
              as="h2"
              className="font-display leading-[0.98] tracking-tight text-[#0f172a]"
              style={{ fontSize: "clamp(2.1rem, 4.4vw, 4rem)" }}
            />
            <Editable
              path={`about.body_${lang}`}
              value={pick(data.body_de, data.body_en)}
              as="p"
              multiline
              className="mt-7 text-lg text-[#475569] leading-relaxed font-medium max-w-xl block"
            />
            <div className="mt-6 inline-flex items-center gap-2 bg-white border border-[#e2e8f0] rounded-full px-4 py-2 text-sm font-semibold">
              <span className="dot-accent" />
              <Editable
                path={`about.trust_${lang}`}
                value={pick(data.trust_de, data.trust_en)}
                className="font-semibold"
              />
            </div>

            <div className="mt-10 grid grid-cols-3 gap-3 md:gap-4">
              {[
                { key: "stat1", v: data.stat1_value, l_de: data.stat1_label_de, l_en: data.stat1_label_en, bg: "bg-[#ff5a36]", fg: "text-white" },
                { key: "stat2", v: data.stat2_value, l_de: data.stat2_label_de, l_en: data.stat2_label_en, bg: "bg-white border border-[#e2e8f0]", fg: "text-[#0f172a]" },
                { key: "stat3", v: data.stat3_value, l_de: data.stat3_label_de, l_en: data.stat3_label_en, bg: "bg-[#0f172a]", fg: "text-white" },
              ].map((s, i) => (
                <div
                  key={s.key}
                  data-testid={`about-stat-${i}`}
                  className={`${s.bg} ${s.fg} rounded-2xl p-5`}
                >
                  <Editable
                    path={`about.${s.key}_value`}
                    value={s.v}
                    as="div"
                    className="font-display text-3xl md:text-4xl leading-none"
                  />
                  <Editable
                    path={`about.${s.key}_label_${lang}`}
                    value={pick(s.l_de, s.l_en)}
                    as="div"
                    className="mt-2 text-[10px] tracking-widest uppercase opacity-80 font-semibold"
                  />
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
              <EditableImage
                path="about.image_url"
                src={data.image_url}
                alt="Nadine Stäubli"
                className="block rounded-3xl overflow-hidden"
                imgClassName="w-full h-[440px] md:h-[560px] object-cover"
              />
              <div className="absolute -bottom-5 -left-5 md:-left-8 bg-white border border-[#e2e8f0] rounded-2xl px-5 py-4 shadow-[0_12px_30px_-12px_rgba(15,23,42,0.18)]">
                <Editable
                  path="about.badge_name"
                  value={data.badge_name}
                  as="div"
                  className="font-display text-xl text-[#0f172a] block"
                />
                <Editable
                  path={`about.badge_role_${lang}`}
                  value={pick(data.badge_role_de, data.badge_role_en)}
                  as="div"
                  className="text-xs text-[#475569] mt-1 font-medium block"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
