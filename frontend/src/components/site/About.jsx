import { CheckCircle2 } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";

export default function About({ data }) {
  const { pick, t } = useLang();
  if (!data) return null;

  return (
    <section
      id="about"
      data-testid="about-section"
      className="section relative"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
        <div className="lg:col-span-6 order-2 lg:order-1">
          <div className="overline mb-5">{pick(data.overline_de, data.overline_en)}</div>
          <h2 className="font-display font-bold uppercase leading-[0.95] tracking-tight text-3xl md:text-5xl lg:text-6xl">
            {pick(data.title_de, data.title_en)}
          </h2>
          <p className="mt-7 text-white/70 text-base md:text-lg leading-relaxed max-w-xl">
            {pick(data.body_de, data.body_en)}
          </p>
          <div className="mt-7 flex items-center gap-3 text-white/80">
            <CheckCircle2 className="text-[#FF2E00]" size={20} />
            <span className="text-sm tracking-wide">{t.about.trust}</span>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { v: data.stat1_value, l: pick(data.stat1_label_de, data.stat1_label_en) },
              { v: data.stat2_value, l: pick(data.stat2_label_de, data.stat2_label_en) },
              { v: data.stat3_value, l: pick(data.stat3_label_de, data.stat3_label_en) },
            ].map((s, i) => (
              <div
                key={i}
                className="p-5 border border-white/10 bg-[#141414]"
                style={{ borderRadius: 2 }}
                data-testid={`about-stat-${i}`}
              >
                <div className="font-display font-black text-3xl md:text-4xl text-white">
                  {s.v}
                </div>
                <div className="mt-2 text-[10px] tracking-[0.2em] uppercase text-white/60">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 order-1 lg:order-2">
          <div className="relative">
            <div
              className="absolute -top-4 -left-4 right-8 bottom-8 border border-[#FF2E00]"
              style={{ borderRadius: 2 }}
            />
            <img
              src={data.image_url}
              alt="Nadine Stäubli"
              className="relative w-full h-[420px] md:h-[520px] object-cover"
              style={{ borderRadius: 2 }}
            />
            <div
              className="absolute -bottom-5 -right-5 glass px-5 py-4 max-w-[220px]"
              style={{ borderRadius: 2 }}
            >
              <div className="font-display font-black text-xl text-[#FF2E00]">
                Nadine
              </div>
              <div className="text-xs text-white/70 mt-1">
                Stäubli · Fahrlehrerin
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
