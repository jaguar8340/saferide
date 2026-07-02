import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";
import Editable from "@/components/edit/Editable";

/**
 * Accordion-style FAQ block for the homepage. Reads from the global
 * content.homepage_faqs array and writes back via EditContext.updateField.
 */
export default function HomeFaq({ items = [] }) {
  const { lang, pick } = useLang();
  const { editMode, updateField } = useEdit();
  const [openId, setOpenId] = useState(items[0]?.id || null);

  const toggle = (id) => () => setOpenId((cur) => (cur === id ? null : id));

  const addFaq = () => {
    const next = [
      ...items,
      {
        id: `hf${Date.now()}`,
        question_de: "Neue Frage",
        question_en: "New question",
        answer_de: "Klicken zum Bearbeiten…",
        answer_en: "Click to edit…",
      },
    ];
    updateField("homepage_faqs", next);
  };
  const removeFaq = (id) => () => {
    if (!confirm("Frage löschen?")) return;
    updateField("homepage_faqs", items.filter((f) => f.id !== id));
  };

  return (
    <section
      id="faq"
      data-testid="home-faq-section"
      className="section-pad bg-[#fbf9f6]"
    >
      <div className="container-x">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          {/* Left header */}
          <div className="lg:col-span-5">
            <div className="flex items-center gap-2 mb-5">
              <span className="dot-accent animate-pulse-accent" />
              <span className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]">
                FAQ
              </span>
            </div>
            <h2
              className="font-display leading-[0.95] tracking-tight text-[#0f172a]"
              style={{ fontSize: "clamp(2rem, 4.4vw, 4rem)" }}
            >
              {lang === "de" ? (
                <>
                  Häufige <span className="font-serif-i text-[#ff5a36]">Fragen</span>
                </>
              ) : (
                <>
                  Common <span className="font-serif-i text-[#ff5a36]">questions</span>
                </>
              )}
            </h2>
            <p className="mt-6 text-base md:text-lg text-[#475569] leading-relaxed font-medium max-w-md">
              {lang === "de"
                ? "Alles, was du vor deiner ersten Lektion wissen willst – kurz und ehrlich beantwortet."
                : "Everything you want to know before your first trial lesson – answered short and honest."}
            </p>
            {editMode && (
              <button
                onClick={addFaq}
                data-testid="home-faq-add"
                className="mt-7 btn-accent text-sm py-2.5 px-4"
              >
                <Plus size={14} /> Frage
              </button>
            )}
          </div>

          {/* Right accordion list */}
          <div className="lg:col-span-7">
            <ul className="divide-y divide-[#e2e8f0] border-y border-[#e2e8f0]">
              {items.map((f, i) => {
                const open = openId === f.id;
                return (
                  <motion.li
                    key={f.id}
                    data-testid={`home-faq-${i}`}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-30px" }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    className="relative"
                  >
                    <button
                      type="button"
                      onClick={toggle(f.id)}
                      data-testid={`home-faq-toggle-${i}`}
                      className="w-full text-left py-5 md:py-6 flex items-start justify-between gap-4 group"
                    >
                      <div className="flex-1 min-w-0">
                        <Editable
                          path={`homepage_faqs.${i}.question_${lang}`}
                          value={pick(f.question_de, f.question_en)}
                          as="span"
                          className="font-display text-lg md:text-xl tracking-tight text-[#0f172a] group-hover:text-[#ff5a36] transition-colors block"
                        />
                      </div>
                      <span
                        className={`shrink-0 w-9 h-9 inline-flex items-center justify-center rounded-full border border-[#e2e8f0] bg-white transition-all ${
                          open ? "rotate-180 border-[#ff5a36] text-[#ff5a36]" : "text-[#0f172a]"
                        }`}
                      >
                        <ChevronDown size={14} />
                      </span>
                    </button>
                    <motion.div
                      initial={false}
                      animate={{
                        height: open ? "auto" : 0,
                        opacity: open ? 1 : 0,
                      }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="pb-6 md:pb-7 pr-12">
                        <Editable
                          path={`homepage_faqs.${i}.answer_${lang}`}
                          value={pick(f.answer_de, f.answer_en)}
                          as="p"
                          multiline
                          className="text-base text-[#475569] leading-relaxed font-medium block"
                        />
                      </div>
                    </motion.div>
                    {editMode && (
                      <button
                        type="button"
                        onClick={removeFaq(f.id)}
                        data-testid={`home-faq-remove-${i}`}
                        className="absolute top-5 right-12 text-[#94a3b8] hover:text-[#ff5a36] transition-colors"
                        aria-label="Frage entfernen"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </motion.li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
