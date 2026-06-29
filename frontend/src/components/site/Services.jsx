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

const ICONS = {
  Car,
  Truck,
  BookOpen,
  Brain,
  Heart,
  ShieldCheck,
  Sparkles,
};

const COLOR_VARIANTS = [
  { bg: "bg-[#0033ff]", fg: "text-[#ccff00]", iconBg: "bg-[#ccff00]", iconFg: "text-[#0a0a0a]" },
  { bg: "bg-white", fg: "text-[#0a0a0a]", iconBg: "bg-[#0033ff]", iconFg: "text-[#ccff00]" },
  { bg: "bg-[#ccff00]", fg: "text-[#0a0a0a]", iconBg: "bg-[#0a0a0a]", iconFg: "text-[#ccff00]" },
  { bg: "bg-white", fg: "text-[#0a0a0a]", iconBg: "bg-[#ff0055]", iconFg: "text-white" },
  { bg: "bg-[#ff0055]", fg: "text-white", iconBg: "bg-white", iconFg: "text-[#ff0055]" },
  { bg: "bg-white", fg: "text-[#0a0a0a]", iconBg: "bg-[#0a0a0a]", iconFg: "text-[#ccff00]" },
];

export default function Services({ items }) {
  const { pick, t } = useLang();

  return (
    <section
      id="services"
      data-testid="services-section"
      className="section-pad bg-[#f4f5f0]"
    >
      <div className="container-x px-5 md:px-10 lg:px-14">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <div className="eyebrow text-[#ff0055] mb-4">{t.services.overline}</div>
            <h2
              className="font-display font-black uppercase tracking-tighter leading-[0.92] max-w-3xl"
              style={{ fontSize: "clamp(2.4rem, 5.5vw, 5rem)" }}
            >
              {t.services.title}
            </h2>
          </div>
          <div className="text-[#0a0a0a]/50 text-sm font-bold tracking-widest uppercase">
            <span className="text-[#0033ff] text-3xl font-display">
              {String(items.length).padStart(2, "0")}
            </span>{" "}
            / Services
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {items.map((s, i) => {
            const Icon = ICONS[s.icon] || Sparkles;
            const v = COLOR_VARIANTS[i % COLOR_VARIANTS.length];
            return (
              <motion.div
                key={s.id || i}
                data-testid={`service-card-${i}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.55, delay: (i % 3) * 0.08 }}
                className={`group relative ${v.bg} ${v.fg} rounded-3xl p-7 md:p-8 border-2 border-[#0a0a0a] overflow-hidden hover:-translate-y-1 transition-transform duration-300`}
              >
                <div className="absolute top-5 right-5 text-[10px] font-bold tracking-widest opacity-50">
                  {String(i + 1).padStart(2, "0")} / 0{items.length}
                </div>
                <div
                  className={`inline-flex items-center justify-center w-14 h-14 rounded-full ${v.iconBg} ${v.iconFg} mb-6 border-2 border-[#0a0a0a] group-hover:rotate-12 transition-transform duration-500`}
                >
                  <Icon size={22} />
                </div>
                <h3 className="font-display font-black text-2xl md:text-3xl leading-[1.05] mb-3 uppercase tracking-tight">
                  {pick(s.title_de, s.title_en)}
                </h3>
                <p className="text-base leading-relaxed opacity-90 font-medium">
                  {pick(s.description_de, s.description_en)}
                </p>
                <ArrowUpRight
                  size={22}
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
