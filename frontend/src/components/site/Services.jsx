import {
  Car,
  Truck,
  BookOpen,
  Brain,
  Heart,
  ShieldCheck,
  Sparkles,
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

export default function Services({ items }) {
  const { pick, t } = useLang();

  return (
    <section
      id="services"
      data-testid="services-section"
      className="section bg-[#0a0a0a] border-t border-white/5"
    >
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
        <div>
          <div className="overline mb-4">{t.services.overline}</div>
          <h2 className="font-display font-bold uppercase tracking-tight text-3xl md:text-5xl lg:text-6xl leading-[0.95] max-w-3xl">
            {t.services.title}
          </h2>
        </div>
        <div className="text-white/50 text-sm max-w-xs">
          <span className="text-[#FF2E00] font-bold">06</span> /{" "}
          <span>{String(items.length).padStart(2, "0")}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/5 border border-white/10">
        {items.map((s, i) => {
          const Icon = ICONS[s.icon] || Sparkles;
          return (
            <div
              key={s.id || i}
              data-testid={`service-card-${i}`}
              className="group relative bg-[#0a0a0a] p-8 md:p-10 transition-colors duration-300 hover:bg-[#141414]"
            >
              <div className="absolute top-6 right-6 text-white/30 font-display font-black text-xs tracking-widest">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div
                className="inline-flex items-center justify-center w-12 h-12 mb-6 border border-white/15 group-hover:border-[#FF2E00] group-hover:text-[#FF2E00] transition-colors"
                style={{ borderRadius: 2 }}
              >
                <Icon size={22} />
              </div>
              <h3 className="font-display font-bold text-xl md:text-2xl mb-3 leading-tight">
                {pick(s.title_de, s.title_en)}
              </h3>
              <p className="text-white/65 text-sm md:text-base leading-relaxed">
                {pick(s.description_de, s.description_en)}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
