import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import Editable from "@/components/edit/Editable";

export default function Pricing({ data }) {
  const { lang, pick, t } = useLang();
  if (!data) return null;

  return (
    <section
      id="pricing"
      data-testid="pricing-section"
      className="section-pad bg-[#fbf9f6]"
    >
      <div className="container-x">
        <div className="max-w-2xl mb-12">
          <div className="flex items-center gap-2 mb-4">
            <span className="dot-accent" />
            <span className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]">
              CHF · Preise
            </span>
          </div>
          <Editable
            path={`pricing.title_${lang}`}
            value={pick(data.title_de, data.title_en)}
            as="h2"
            className="font-display leading-[0.98] tracking-tight block"
            style={{ fontSize: "clamp(2.1rem, 4.4vw, 4rem)" }}
          />
          <Editable
            path={`pricing.subtitle_${lang}`}
            value={pick(data.subtitle_de, data.subtitle_en)}
            as="p"
            multiline
            className="mt-5 text-lg text-[#475569] leading-relaxed font-medium block"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(data.plans || []).map((p, i) => (
            <motion.div
              key={p.id || i}
              data-testid={`pricing-card-${i}`}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              className={`relative rounded-3xl p-7 md:p-8 border transition-transform duration-300 hover:-translate-y-1 ${
                p.highlight
                  ? "bg-[#0f172a] text-white border-[#0f172a]"
                  : "bg-white text-[#0f172a] border-[#e2e8f0]"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-7 tag tag-accent">Beliebt</span>
              )}
              <Editable
                path={`pricing.plans.${i}.region_${lang}`}
                value={pick(p.region_de, p.region_en)}
                className={`text-[10px] tracking-widest uppercase font-semibold mb-2 block ${p.highlight ? "text-white/60" : "text-[#94a3b8]"}`}
              />
              <Editable
                path={`pricing.plans.${i}.name_${lang}`}
                value={pick(p.name_de, p.name_en)}
                as="div"
                className="font-display text-xl"
              />
              <Editable
                path={`pricing.plans.${i}.duration_${lang}`}
                value={pick(p.duration_de, p.duration_en)}
                className={`text-xs mt-1 block ${p.highlight ? "text-white/60" : "text-[#94a3b8]"}`}
              />
              <Editable
                path={`pricing.plans.${i}.price`}
                value={p.price}
                as="div"
                className="font-display text-5xl mt-7 tracking-tighter"
              />
              <a
                href="#contact"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
                }}
                data-testid={`pricing-cta-${i}`}
                className={`mt-7 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors ${
                  p.highlight ? "text-[#ff5a36] hover:text-white" : "text-[#0f172a] hover:text-[#ff5a36]"
                }`}
              >
                {t.pricing.ctaText} <ArrowRight size={14} />
              </a>
            </motion.div>
          ))}
        </div>

        <Editable
          path={`pricing.note_${lang}`}
          value={pick(data.note_de, data.note_en)}
          as="p"
          multiline
          className="mt-10 text-sm text-[#475569] max-w-3xl leading-relaxed font-medium block"
        />
      </div>
    </section>
  );
}
