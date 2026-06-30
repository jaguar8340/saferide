import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useEffect } from "react";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";
import Editable from "@/components/edit/Editable";
import EditableImage from "@/components/edit/EditableImage";
import SubPageHeader from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import AdminToolbar from "@/components/edit/AdminToolbar";
import CanonicalLink from "@/components/site/CanonicalLink";
import Seo from "@/components/site/Seo";

export default function AblaufPage() {
  const { lang, pick } = useLang();
  const { content } = useEdit();

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbf9f6] text-[#0f172a]">
        <span className="text-xs font-semibold tracking-widest uppercase opacity-50">Lade…</span>
      </div>
    );
  }

  const data = content.ablauf || {};
  const steps = data.steps || [];

  return (
    <main data-testid="ablauf-page" className="min-h-screen bg-[#fbf9f6] text-[#0f172a] font-sans">
      <CanonicalLink path="/ablauf-zum-fuehrerschein" />
      <Seo
        title={lang === "de" ? "Ablauf zum Führerausweis · Safe Ride" : "Process to your driving licence · Safe Ride"}
        description={pick(data.subtitle_de, data.subtitle_en) || (lang === "de"
          ? "Der ehrliche Weg zum Schweizer Führerausweis: Nothelferkurs, Lernfahrausweis, VKU, Fahrstunden, Praxisprüfung. Alle Schritte transparent erklärt."
          : "The honest path to your Swiss driving licence: first-aid course, learner permit, theory course, lessons, exam. All steps transparently explained.")}
        path="/ablauf-zum-fuehrerschein"
        lang={lang}
        type="article"
        image={data.hero_image_url}
        imageAlt="Ablauf zum Führerausweis"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: lang === "de" ? "Ablauf zum Schweizer Führerausweis" : "Process to the Swiss driving licence",
          description: pick(data.subtitle_de, data.subtitle_en),
          step: steps.map((s, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            name: lang === "de" ? s.title_de : (s.title_en || s.title_de),
            text: lang === "de" ? s.body_de : (s.body_en || s.body_de),
          })),
        }}
      />
      <SubPageHeader />

      {/* Hero */}
      <section className="relative pt-16 md:pt-20 pb-12 md:pb-20 overflow-hidden">
        <div className="container-x px-5 md:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-7">
              <div className="flex items-center gap-2 mb-5">
                <span className="dot-accent animate-pulse-accent" />
                <Editable
                  path={`ablauf.overline_${lang}`}
                  value={pick(data.overline_de, data.overline_en)}
                  className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]"
                />
              </div>
              <h1
                className="font-display leading-[0.95] tracking-tight"
                style={{ fontSize: "clamp(2.4rem, 6vw, 5.5rem)" }}
              >
                <Editable
                  path={`ablauf.title_${lang}`}
                  value={pick(data.title_de, data.title_en)}
                  as="span"
                  className="inline-block font-serif-i text-[#ff5a36] font-normal"
                />
              </h1>
              <Editable
                path={`ablauf.subtitle_${lang}`}
                value={pick(data.subtitle_de, data.subtitle_en)}
                as="p"
                multiline
                className="mt-6 max-w-2xl text-lg md:text-xl text-[#475569] leading-relaxed font-medium block"
              />
            </div>

            <div className="lg:col-span-5">
              <EditableImage
                path="ablauf.hero_image_url"
                src={data.hero_image_url}
                alt="Ablauf"
                className="block rounded-3xl overflow-hidden border border-[#e2e8f0]"
                imgClassName="w-full h-[300px] md:h-[420px] object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="section-pad bg-white border-y border-[#e2e8f0]">
        <div className="container-x px-5 md:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {steps.map((s, i) => (
              <motion.div
                key={s.id || i}
                data-testid={`ablauf-step-${i}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: (i % 2) * 0.05 }}
                className={`group relative rounded-3xl border ${
                  i === 1
                    ? "bg-[#0f172a] text-white border-[#0f172a]"
                    : i === 3
                    ? "bg-[#ff5a36] text-white border-[#ff5a36]"
                    : "bg-[#fbf9f6] text-[#0f172a] border-[#e2e8f0]"
                } p-8 md:p-10`}
              >
                <div className="flex items-start justify-between mb-6">
                  <span
                    className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl font-display text-2xl ${
                      i === 1 || i === 3
                        ? "bg-white/15 text-white"
                        : "bg-[#0f172a] text-white"
                    }`}
                  >
                    <Editable path={`ablauf.steps.${i}.gear`} value={s.gear} className="leading-none" />
                  </span>
                  <span className="text-[10px] font-semibold opacity-50 tabular-nums tracking-widest">
                    {String(i + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
                  </span>
                </div>

                <Editable
                  path={`ablauf.steps.${i}.title_${lang}`}
                  value={pick(s.title_de, s.title_en)}
                  as="h3"
                  className="font-display text-2xl md:text-3xl leading-tight mb-4 block"
                />
                <Editable
                  path={`ablauf.steps.${i}.body_${lang}`}
                  value={pick(s.body_de, s.body_en)}
                  as="p"
                  multiline
                  className="text-base md:text-lg leading-relaxed opacity-90 font-medium block"
                />

                {s.links && s.links.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {s.links.map((l, li) => (
                      <a
                        key={li}
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                        data-testid={`ablauf-link-${i}-${li}`}
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1.5 transition-colors ${
                          i === 1 || i === 3
                            ? "bg-white/15 text-white hover:bg-white hover:text-[#0f172a]"
                            : "bg-white text-[#0f172a] border border-[#e2e8f0] hover:border-[#ff5a36] hover:text-[#ff5a36]"
                        }`}
                      >
                        {pick(l.label_de, l.label_en)}
                        <ArrowUpRight size={12} />
                      </a>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Outro */}
      <section className="section-pad bg-[#fbf9f6]">
        <div className="container-x px-5 md:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5 order-2 lg:order-1">
              <EditableImage
                path="ablauf.outro_image_url"
                src={data.outro_image_url}
                alt="Safe Ride"
                className="block rounded-3xl overflow-hidden"
                imgClassName="w-full h-[320px] md:h-[440px] object-cover"
              />
            </div>
            <div className="lg:col-span-7 order-1 lg:order-2">
              <Editable
                path={`ablauf.outro_${lang}`}
                value={pick(data.outro_de, data.outro_en)}
                as="p"
                multiline
                className="font-display leading-[1.0] tracking-tight text-[#0f172a] block"
                style={{ fontSize: "clamp(1.8rem, 3.6vw, 3.2rem)" }}
              />
              <Link
                to="/#contact"
                data-testid="ablauf-cta"
                className="mt-8 inline-flex items-center gap-2 btn-accent"
              >
                {lang === "de" ? "Jetzt Probelektion anfragen" : "Request trial lesson"}
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer data={content.contact} />
      <AdminToolbar />
    </main>
  );
}
