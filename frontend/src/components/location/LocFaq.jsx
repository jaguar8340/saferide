import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";
import Editable from "@/components/edit/Editable";

/**
 * LocFaq — reads FAQs from the CENTRAL template `content.location_faq_template`
 * (shared across every location page). The template contains `{name}`
 * placeholders that get substituted with the location's name at render time.
 *
 * When the admin edits an answer here in the inline CMS, the change is
 * persisted to the shared template so it appears on ALL 16+ location pages
 * simultaneously.
 *
 * Falls back to `loc.faqs` (legacy per-location array) if the central
 * template is missing – ensures existing pages never break.
 */
export default function LocFaq({ loc }) {
  const { lang, pick } = useLang();
  const { editMode, content } = useEdit();
  const [openFaq, setOpenFaq] = useState(null);

  const tpl = content?.location_faq_template;
  const template = tpl?.faqs || [];
  const usingTemplate = template.length > 0;

  // Legacy per-location FAQs (fallback if the template is not yet seeded).
  const legacy = loc.faqs || [];
  const faqs = usingTemplate ? template : legacy;
  const name = loc.name || "";

  // Substitute `{name}` with the actual location name.
  const substitute = (str) => (str || "").replace(/\{name\}/g, name);

  const title =
    pick(tpl?.title_de, tpl?.title_en) ||
    pick(loc.faq_title_de, loc.faq_title_en) ||
    (lang === "en" ? "Frequently asked questions" : "Häufige Fragen");
  const intro =
    substitute(pick(tpl?.intro_de, tpl?.intro_en)) ||
    pick(loc.faq_intro_de, loc.faq_intro_en) ||
    "";

  return (
    <section className="section-pad bg-[#fbf9f6]" data-testid="loc-faq-section">
      <div className="container-x px-5 md:px-8 lg:px-12">
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="dot-accent" />
            <span className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]">
              FAQ
            </span>
          </div>
          <Editable
            path={
              usingTemplate ? `location_faq_template.title_${lang}` : `faq_title_${lang}`
            }
            value={title}
            as="h2"
            className="font-display leading-[0.98] tracking-tight block"
            style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
          />
          {(intro || editMode) && (
            <Editable
              path={
                usingTemplate
                  ? `location_faq_template.intro_${lang}`
                  : `faq_intro_${lang}`
              }
              value={intro || pick(loc.faq_intro_de, loc.faq_intro_en)}
              as="p"
              multiline
              className="mt-3 max-w-xl text-base text-[#475569] leading-relaxed font-medium block"
            />
          )}
          {editMode && usingTemplate && (
            <p
              className="mt-4 max-w-2xl text-xs italic text-[#94a3b8]"
              data-testid="loc-faq-template-hint"
            >
              Diese Fragen &amp; Antworten sind zentral gepflegt – dein Edit
              hier erscheint automatisch auf allen Standort-Seiten. Der
              Ortsname wird pro Seite via <code>{"{name}"}</code>-Platzhalter
              ersetzt.
            </p>
          )}
        </div>

        <div className="max-w-3xl mx-auto divide-y divide-[#e2e8f0] border-y border-[#e2e8f0]">
          {faqs.map((f, i) => {
            const isOpen = openFaq === f.id;
            const questionPath = usingTemplate
              ? `location_faq_template.faqs.${i}.question_${lang}`
              : `faqs.${i}.question_${lang}`;
            const answerPath = usingTemplate
              ? `location_faq_template.faqs.${i}.answer_${lang}`
              : `faqs.${i}.answer_${lang}`;
            // In edit mode we show the RAW template (with {name}), so the
            // admin sees the placeholder and can preserve it in edits.
            // In read mode we substitute for the visitor.
            const rawQ = pick(f.question_de, f.question_en) || "";
            const rawA = pick(f.answer_de, f.answer_en) || "";
            const displayQ = editMode ? rawQ : substitute(rawQ);
            const displayA = editMode ? rawA : substitute(rawA);
            return (
              <div key={f.id} data-testid={`loc-faq-${i}`} className="py-5">
                <div className="flex items-center justify-between gap-4">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : f.id)}
                    className="flex-1 flex items-center justify-between gap-4 text-left"
                  >
                    <Editable
                      path={questionPath}
                      value={displayQ}
                      as="span"
                      className="font-display text-lg md:text-xl tracking-tight text-[#0f172a] flex-1"
                    />
                    <ChevronDown
                      size={18}
                      className={`text-[#475569] transition-transform duration-300 shrink-0 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>
                {isOpen && (
                  <Editable
                    path={answerPath}
                    value={displayA}
                    as="p"
                    multiline
                    className="mt-4 text-base text-[#475569] leading-relaxed font-medium block"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
