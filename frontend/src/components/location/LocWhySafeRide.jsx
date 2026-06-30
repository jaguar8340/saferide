import { Check } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import Editable from "@/components/edit/Editable";

export default function LocWhySafeRide({ loc, updateField }) {
  const { lang, pick } = useLang();
  return (
    <section className="section-pad bg-[#0f172a] text-white" data-testid="loc-why-saferide">
      <div className="container-x px-5 md:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="dot-accent" />
              <Editable
                path={`why_overline2_${lang}`}
                value={pick(loc.why_overline2_de, loc.why_overline2_en)}
                onUpdate={updateField}
                className="text-xs font-semibold tracking-[0.18em] uppercase text-white/65"
              />
            </div>
            <Editable
              path={`why_title2_${lang}`}
              value={pick(loc.why_title2_de, loc.why_title2_en)}
              onUpdate={updateField}
              as="h2"
              className="font-display leading-[0.98] tracking-tight block text-white"
              style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
            />
            <Editable
              path={`why_body2_${lang}`}
              value={pick(loc.why_body2_de, loc.why_body2_en)}
              onUpdate={updateField}
              as="p"
              multiline
              className="mt-6 text-lg text-white/75 leading-relaxed font-medium block"
            />
          </div>
          <div className="lg:col-span-7">
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(loc.why_points2 || []).map((p, i) => (
                <li
                  key={p.id || i}
                  data-testid={`loc-why2-${i}`}
                  className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-2xl p-5"
                >
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#ff5a36] text-white shrink-0">
                    <Check size={14} strokeWidth={2.6} />
                  </span>
                  <Editable
                    path={`why_points2.${i}.text_${lang}`}
                    value={pick(p.text_de, p.text_en)}
                    onUpdate={updateField}
                    as="p"
                    multiline
                    className="text-base text-white leading-relaxed font-medium block flex-1"
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
