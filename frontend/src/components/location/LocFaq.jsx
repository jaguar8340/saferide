import { useState } from "react";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";
import Editable from "@/components/edit/Editable";

export default function LocFaq({ loc, updateField }) {
  const { lang, pick } = useLang();
  const { editMode } = useEdit();
  const faqs = loc.faqs || [];
  const [openFaq, setOpenFaq] = useState(null);

  const addFaq = () => {
    const list = loc.faqs || [];
    const newItem = {
      id: `f${Date.now()}`,
      question_de: "Neue Frage",
      question_en: "New question",
      answer_de: "Klicken zum Bearbeiten…",
      answer_en: "Click to edit…",
    };
    updateField("faqs", [...list, newItem]);
  };
  const removeFaq = (id) => () => {
    if (!confirm("FAQ-Eintrag löschen?")) return;
    const next = (loc.faqs || []).filter((f) => f.id !== id);
    updateField("faqs", next);
  };

  return (
    <section className="section-pad bg-[#fbf9f6]">
      <div className="container-x px-5 md:px-8 lg:px-12">
        <div className="flex items-end justify-between gap-4 mb-10 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="dot-accent" />
              <span className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]">
                FAQ
              </span>
            </div>
            <Editable
              path={`faq_title_${lang}`}
              value={pick(loc.faq_title_de, loc.faq_title_en)}
              onUpdate={updateField}
              as="h2"
              className="font-display leading-[0.98] tracking-tight block"
              style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
            />
            <Editable
              path={`faq_intro_${lang}`}
              value={pick(loc.faq_intro_de, loc.faq_intro_en)}
              onUpdate={updateField}
              as="p"
              multiline
              className="mt-3 max-w-xl text-base text-[#475569] leading-relaxed font-medium block"
            />
          </div>
          {editMode && (
            <button onClick={addFaq} data-testid="loc-faq-add" className="btn-accent text-sm py-2.5 px-4">
              <Plus size={14} /> Frage
            </button>
          )}
        </div>

        <div className="max-w-3xl mx-auto divide-y divide-[#e2e8f0] border-y border-[#e2e8f0]">
          {faqs.map((f, i) => {
            const isOpen = openFaq === f.id;
            return (
              <div key={f.id} data-testid={`loc-faq-${i}`} className="py-5">
                <div className="flex items-center justify-between gap-4">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : f.id)}
                    className="flex-1 flex items-center justify-between gap-4 text-left"
                  >
                    <Editable
                      path={`faqs.${i}.question_${lang}`}
                      value={pick(f.question_de, f.question_en)}
                      onUpdate={updateField}
                      as="span"
                      className="font-display text-lg md:text-xl tracking-tight text-[#0f172a] flex-1"
                    />
                    <ChevronDown
                      size={18}
                      className={`text-[#475569] transition-transform duration-300 shrink-0 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {editMode && (
                    <button
                      onClick={removeFaq(f.id)}
                      data-testid={`loc-faq-remove-${i}`}
                      className="ml-2 text-[#94a3b8] hover:text-[#ff5a36] shrink-0"
                      aria-label="FAQ löschen"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                {isOpen && (
                  <Editable
                    path={`faqs.${i}.answer_${lang}`}
                    value={pick(f.answer_de, f.answer_en)}
                    onUpdate={updateField}
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
