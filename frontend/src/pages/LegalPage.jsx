import { useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";
import Editable from "@/components/edit/Editable";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import AdminToolbar from "@/components/edit/AdminToolbar";
import Seo from "@/components/site/Seo";

/**
 * Editable legal page (Impressum / Datenschutz). Reads from
 * content.{pageKey}.* in the global EditContext and writes back via the
 * PATCH /api/content dot-notation endpoint.
 *
 * Props:
 *  - pageKey: "impressum" | "datenschutz"
 *  - titleFallback: { de, en } – used for document.title before content loads
 */
export default function LegalPage({ pageKey, titleFallback }) {
  const { lang, pick } = useLang();
  const { content, editMode, updateField } = useEdit();

  useEffect(() => {
    const titleDe = content?.[pageKey]?.title_de || titleFallback?.de;
    const titleEn = content?.[pageKey]?.title_en || titleFallback?.en;
    if (titleDe || titleEn) {
      document.title = lang === "de" ? `${titleDe} · Safe Ride` : `${titleEn} · Safe Ride`;
    }
  }, [content, lang, pageKey, titleFallback]);

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbf9f6] text-[#0f172a]">
        <span className="text-xs font-semibold tracking-widest uppercase opacity-50">Lade…</span>
      </div>
    );
  }

  const data = content[pageKey] || {};
  const sections = data.sections || [];

  const addSection = () => {
    const prefix = pageKey === "impressum" ? "imp" : "ds";
    const newItem = {
      id: `${prefix}${Date.now()}`,
      title_de: "Neuer Abschnitt",
      title_en: "New section",
      body_de: "Klicken zum Bearbeiten…",
      body_en: "Click to edit…",
    };
    updateField(`${pageKey}.sections`, [...sections, newItem]);
  };
  const removeSection = (id) => () => {
    if (!confirm("Abschnitt löschen?")) return;
    const next = sections.filter((s) => s.id !== id);
    updateField(`${pageKey}.sections`, next);
  };

  return (
    <main
      data-testid={`${pageKey}-page`}
      className="min-h-screen bg-[#fbf9f6] text-[#0f172a] font-sans"
    >
      <Seo
        title={lang === "de"
          ? `${(content?.[pageKey]?.title_de || titleFallback?.de)} · Safe Ride`
          : `${(content?.[pageKey]?.title_en || titleFallback?.en)} · Safe Ride`}
        description={lang === "de"
          ? (content?.[pageKey]?.intro_de || titleFallback?.de)
          : (content?.[pageKey]?.intro_en || titleFallback?.en)}
        path={`/${pageKey}`}
        lang={lang}
        type="website"
      />
      <Header />

      <section className="pt-16 md:pt-24 pb-12 md:pb-16">
        <div className="container-x px-5 md:px-8 lg:px-12 max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-5">
            <span className="dot-accent animate-pulse-accent" />
            <Editable
              path={`${pageKey}.overline_${lang}`}
              value={pick(data.overline_de, data.overline_en)}
              className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]"
            />
          </div>
          <h1
            className="font-display leading-[0.95] tracking-tight"
            style={{ fontSize: "clamp(2.4rem, 5vw, 4.5rem)" }}
          >
            <Editable
              path={`${pageKey}.title_${lang}`}
              value={pick(data.title_de, data.title_en)}
              as="span"
              className="inline-block"
            />
          </h1>
          <Editable
            path={`${pageKey}.intro_${lang}`}
            value={pick(data.intro_de, data.intro_en)}
            as="p"
            multiline
            className="mt-6 max-w-3xl text-lg text-[#475569] leading-relaxed font-medium block"
          />
        </div>
      </section>

      <section className="pb-20 md:pb-28">
        <div className="container-x px-5 md:px-8 lg:px-12 max-w-4xl mx-auto">
          <div className="space-y-8 md:space-y-10">
            {sections.map((s, i) => (
              <article
                key={s.id}
                data-testid={`${pageKey}-section-${i}`}
                className="relative bg-white border border-[#e2e8f0] rounded-3xl p-6 md:p-8"
              >
                {editMode && (
                  <button
                    onClick={removeSection(s.id)}
                    data-testid={`${pageKey}-section-remove-${i}`}
                    className="absolute top-4 right-4 text-[#94a3b8] hover:text-[#ff5a36] transition-colors"
                    aria-label="Abschnitt entfernen"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <Editable
                  path={`${pageKey}.sections.${i}.title_${lang}`}
                  value={pick(s.title_de, s.title_en)}
                  as="h2"
                  className="font-display text-2xl md:text-3xl tracking-tight text-[#0f172a] block"
                />
                <Editable
                  path={`${pageKey}.sections.${i}.body_${lang}`}
                  value={pick(s.body_de, s.body_en)}
                  as="p"
                  multiline
                  className="mt-4 text-base text-[#475569] leading-relaxed font-medium block whitespace-pre-line"
                />
              </article>
            ))}
            {editMode && (
              <button
                onClick={addSection}
                data-testid={`${pageKey}-section-add`}
                className="btn-accent text-sm py-2.5 px-4"
              >
                <Plus size={14} /> Abschnitt
              </button>
            )}
          </div>
        </div>
      </section>

      <Footer data={content?.contact} />
      <AdminToolbar />
    </main>
  );
}
