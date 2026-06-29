import { ArrowRight } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";

export default function Pricing({ data }) {
  const { pick, t } = useLang();
  if (!data) return null;

  return (
    <section
      id="pricing"
      data-testid="pricing-section"
      className="section bg-[#0a0a0a] border-t border-white/5"
    >
      <div className="text-center mb-14 max-w-2xl mx-auto">
        <div className="overline mb-4">CHF · Preise</div>
        <h2 className="font-display font-bold uppercase tracking-tight text-3xl md:text-5xl lg:text-6xl leading-[0.95]">
          {pick(data.title_de, data.title_en)}
        </h2>
        <p className="mt-5 text-white/65 text-sm md:text-base">
          {pick(data.subtitle_de, data.subtitle_en)}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(data.plans || []).map((p, i) => (
          <div
            key={p.id || i}
            data-testid={`pricing-card-${i}`}
            className={`relative p-7 ${
              p.highlight
                ? "bg-[#FF2E00] text-white"
                : "card-surface text-white"
            }`}
            style={{ borderRadius: 2 }}
          >
            {p.highlight && (
              <span
                className="absolute -top-3 left-7 bg-white text-black text-[10px] tracking-[0.3em] uppercase font-bold px-2 py-1"
                style={{ borderRadius: 2 }}
              >
                Beliebt
              </span>
            )}
            <div className={`text-[10px] tracking-[0.3em] uppercase font-bold mb-3 ${p.highlight ? "text-white/80" : "text-[#FF2E00]"}`}>
              {pick(p.region_de, p.region_en)}
            </div>
            <div className="font-display font-bold text-xl mb-1">
              {pick(p.name_de, p.name_en)}
            </div>
            <div className={`text-xs ${p.highlight ? "text-white/80" : "text-white/55"}`}>
              {pick(p.duration_de, p.duration_en)}
            </div>
            <div className="font-display font-black text-4xl md:text-5xl mt-7">
              {p.price}
            </div>
            <a
              href="#contact"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
              }}
              data-testid={`pricing-cta-${i}`}
              className={`mt-7 inline-flex items-center gap-2 text-xs tracking-widest uppercase font-bold border-b ${
                p.highlight ? "border-white" : "border-white/30 hover:border-[#FF2E00] hover:text-[#FF2E00]"
              } pb-1 transition-colors`}
            >
              {t.pricing.ctaText} <ArrowRight size={14} />
            </a>
          </div>
        ))}
      </div>

      <p className="mt-10 text-xs text-white/50 max-w-3xl leading-relaxed">
        {pick(data.note_de, data.note_en)}
      </p>
    </section>
  );
}
