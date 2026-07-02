import { motion } from "framer-motion";
import {
  Car,
  Truck,
  BookOpen,
  Brain,
  Heart,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";
import Editable from "@/components/edit/Editable";
import SectionTitle from "@/components/site/SectionTitle";

const ICONS = { Car, Truck, BookOpen, Brain, Heart, ShieldCheck, Sparkles };

const VARIANTS = [
  { bg: "bg-white", fg: "text-[#0f172a]", iconBg: "bg-gradient-to-br from-[#ff5a36] to-[#ff8c42]", iconFg: "text-white" },
  { bg: "bg-[#ff5a36]", fg: "text-white", iconBg: "bg-white/15", iconFg: "text-white" },
  { bg: "bg-[#fff6ef]", fg: "text-[#0f172a]", iconBg: "bg-[#ffe4d6]", iconFg: "text-[#e74123]" },
  { bg: "bg-white", fg: "text-[#0f172a]", iconBg: "bg-gradient-to-br from-[#1e6fff] to-[#0b4fd8]", iconFg: "text-white" },
  { bg: "bg-[#0f172a]", fg: "text-white", iconBg: "bg-[#ff5a36]", iconFg: "text-white" },
  { bg: "bg-[#dbe9ff]", fg: "text-[#0f172a]", iconBg: "bg-[#1e6fff]", iconFg: "text-white" },
];

export default function Services({ items }) {
  const { lang, pick, t } = useLang();
  const { content } = useEdit();
  const overline = pick(content?.services_overline_de, content?.services_overline_en) || t.services.overline;
  const title = pick(content?.services_title_de, content?.services_title_en) || t.services.title;

  return (
    <section
      id="services"
      data-testid="services-section"
      className="section-pad bg-[#fbf9f6]"
    >
      <div className="container-x">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="dot-accent" />
              <Editable
                path={`services_overline_${lang}`}
                value={overline}
                className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]"
              />
            </div>
            <SectionTitle
              path={`services_title_${lang}`}
              value={title}
              className="max-w-3xl"
              style={{ fontSize: "clamp(2.1rem, 4.4vw, 4rem)" }}
            />
          </div>
          <span className="tag tag-light">
            {String(items.length).padStart(2, "0")} Services
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {items.map((s, i) => {
            const Icon = ICONS[s.icon] || Sparkles;
            const v = VARIANTS[i % VARIANTS.length];
            return (
              <motion.div
                key={s.id || i}
                data-testid={`service-card-${i}`}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.07 }}
                className={`group relative ${v.bg} ${v.fg} border border-[#e2e8f0] rounded-3xl p-7 md:p-8 hover:-translate-y-1 transition-transform duration-300`}
              >
                <div className="flex items-start justify-between mb-7">
                  <span
                    className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl ${v.iconBg} ${v.iconFg}`}
                  >
                    <Icon size={20} strokeWidth={1.75} />
                  </span>
                  <span className="text-xs font-semibold opacity-50 tabular-nums">
                    {String(i + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
                  </span>
                </div>
                <Editable
                  path={`services.${i}.title_${lang}`}
                  value={pick(s.title_de, s.title_en)}
                  as="h3"
                  className="font-display text-2xl leading-tight mb-3 block"
                />
                <Editable
                  path={`services.${i}.description_${lang}`}
                  value={pick(s.description_de, s.description_en)}
                  as="p"
                  multiline
                  className="text-base leading-relaxed opacity-90 font-medium block"
                />
                <ArrowUpRight
                  size={20}
                  className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
