import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";
import Editable from "@/components/edit/Editable";
import NadineIntroCard from "@/components/site/NadineIntroCard";

export default function LocWhyIdeal({ loc, updateField, nadineData }) {
  const { lang, pick } = useLang();
  const { editMode } = useEdit();
  const points = lang === "de" ? loc.ideal_for_points_de || [] : loc.ideal_for_points_en || [];

  const updatePoint = (i) => (val) => {
    const list = lang === "de" ? loc.ideal_for_points_de || [] : loc.ideal_for_points_en || [];
    const next = [...list];
    next[i] = val;
    updateField(`ideal_for_points_${lang}`, next);
  };

  return (
    <section className="section-pad bg-white border-y border-[#e2e8f0]">
      <div className="container-x px-5 md:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          <div className="lg:col-span-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="dot-accent" />
              <Editable
                path={`why_overline_${lang}`}
                value={pick(loc.why_overline_de, loc.why_overline_en)}
                onUpdate={updateField}
                className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]"
              />
            </div>
            <Editable
              path={`why_title_${lang}`}
              value={pick(loc.why_title_de, loc.why_title_en)}
              onUpdate={updateField}
              as="h2"
              className="font-display leading-[0.98] tracking-tight block"
              style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
            />
            <Editable
              path={`why_body_${lang}`}
              value={pick(loc.why_body_de, loc.why_body_en)}
              onUpdate={updateField}
              as="p"
              multiline
              className="mt-6 text-lg text-[#475569] leading-relaxed font-medium block"
            />
          </div>
          <div className="lg:col-span-6">
            <Editable
              path={`ideal_for_title_${lang}`}
              value={pick(loc.ideal_for_title_de, loc.ideal_for_title_en)}
              onUpdate={updateField}
              as="h3"
              className="font-display text-2xl md:text-3xl leading-tight block mb-6"
            />
            <ul className="space-y-3">
              {points.map((p, i) => (
                <li
                  key={i}
                  data-testid={`loc-ideal-${i}`}
                  className="flex items-start gap-3 bg-[#fbf9f6] border border-[#e2e8f0] rounded-2xl p-4"
                >
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#ff5a36] text-white font-display text-sm shrink-0">
                    {i + 1}
                  </span>
                  {editMode ? (
                    <input
                      type="text"
                      defaultValue={p || ""}
                      onBlur={(e) => updatePoint(i)(e.target.value)}
                      className="flex-1 bg-transparent text-base font-medium leading-relaxed text-[#0f172a] focus:outline-none focus:bg-white rounded-md px-2 -mx-2"
                    />
                  ) : (
                    <span className="text-base font-medium leading-relaxed text-[#0f172a]">{p}</span>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <NadineIntroCard data={nadineData} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
