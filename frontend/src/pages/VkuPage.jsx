import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Phone, MapPin, Calendar, AlertCircle, ArrowRight } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";
import Editable from "@/components/edit/Editable";
import EditableImage from "@/components/edit/EditableImage";
import SubPageHeader from "@/components/site/SubPageHeader";
import Footer from "@/components/site/Footer";
import AdminToolbar from "@/components/edit/AdminToolbar";

export default function VkuPage() {
  const { lang, pick } = useLang();
  const { content } = useEdit();

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbf9f6] text-[#0f172a]">
        <span className="text-xs font-semibold tracking-widest uppercase opacity-50">Lade…</span>
      </div>
    );
  }

  const data = content.vku || {};
  const months = data.months || [];
  const infoItems = data.info_items || [];

  return (
    <main data-testid="vku-page" className="min-h-screen bg-[#fbf9f6] text-[#0f172a] font-sans">
      <SubPageHeader />

      {/* Hero */}
      <section className="relative pt-16 md:pt-20 pb-12 md:pb-16 overflow-hidden">
        <div className="container-x px-5 md:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-7">
              <div className="flex items-center gap-2 mb-5">
                <span className="dot-accent" />
                <Editable
                  path={`vku.overline_${lang}`}
                  value={pick(data.overline_de, data.overline_en)}
                  className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]"
                />
              </div>
              <h1
                className="font-display leading-[0.95] tracking-tight break-words"
                style={{ fontSize: "clamp(2.2rem, 5vw, 4.5rem)" }}
              >
                <Editable
                  path={`vku.title_${lang}`}
                  value={pick(data.title_de, data.title_en)}
                  as="span"
                  className="inline-block"
                />
              </h1>
              <Editable
                path={`vku.subtitle_${lang}`}
                value={pick(data.subtitle_de, data.subtitle_en)}
                as="p"
                multiline
                className="mt-6 max-w-2xl text-lg md:text-xl text-[#475569] leading-relaxed font-medium block"
              />
              <a
                href={data.cta_link || "tel:+41795850085"}
                data-testid="vku-cta-primary"
                className="mt-8 inline-flex items-center gap-2 btn-accent"
              >
                <Editable
                  path={`vku.cta_label_${lang}`}
                  value={pick(data.cta_label_de, data.cta_label_en)}
                />
                <Phone size={14} />
              </a>
            </div>
            <div className="lg:col-span-5">
              <EditableImage
                path="vku.hero_image_url"
                src={data.hero_image_url}
                alt="VKU"
                className="block rounded-3xl overflow-hidden border border-[#e2e8f0]"
                imgClassName="w-full h-[320px] md:h-[420px] object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Price & location */}
      <section className="section-pad bg-white border-y border-[#e2e8f0]">
        <div className="container-x px-5 md:px-8 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5 }}
              className="bg-[#ff5a36] text-white rounded-3xl p-8 md:p-10"
            >
              <span className="text-[10px] font-semibold tracking-widest uppercase opacity-80">
                {lang === "de" ? "Preis" : "Price"}
              </span>
              <Editable
                path="vku.price_value"
                value={data.price_value}
                as="div"
                className="font-display text-6xl md:text-7xl tracking-tighter mt-3 block"
              />
              <Editable
                path={`vku.price_label_${lang}`}
                value={pick(data.price_label_de, data.price_label_en)}
                as="p"
                multiline
                className="mt-4 text-base font-medium opacity-95 block"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.07 }}
              className="bg-[#0f172a] text-white rounded-3xl p-8 md:p-10"
            >
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={14} className="text-[#ff5a36]" />
                <Editable
                  path={`vku.location_label_${lang}`}
                  value={pick(data.location_label_de, data.location_label_en)}
                  className="text-[10px] font-semibold tracking-widest uppercase opacity-80"
                />
              </div>
              <Editable
                path={`vku.location_address_${lang}`}
                value={pick(data.location_address_de, data.location_address_en)}
                as="div"
                className="font-display text-2xl md:text-3xl tracking-tight leading-tight block"
              />
              <Editable
                path={`vku.location_note_${lang}`}
                value={pick(data.location_note_de, data.location_note_en)}
                as="p"
                multiline
                className="mt-4 text-base text-white/75 leading-relaxed font-medium block"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Dates */}
      <section className="section-pad bg-[#fbf9f6]">
        <div className="container-x px-5 md:px-8 lg:px-12">
          <div className="flex items-end justify-between gap-4 mb-12 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={14} className="text-[#ff5a36]" />
                <Editable
                  path={`vku.dates_subtitle_${lang}`}
                  value={pick(data.dates_subtitle_de, data.dates_subtitle_en)}
                  className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]"
                />
              </div>
              <Editable
                path={`vku.dates_title_${lang}`}
                value={pick(data.dates_title_de, data.dates_title_en)}
                as="h2"
                className="font-display leading-[0.98] tracking-tight block"
                style={{ fontSize: "clamp(2.1rem, 4.4vw, 4rem)" }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {months.map((m, i) => (
              <motion.div
                key={m.id || i}
                data-testid={`vku-month-${i}`}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.45, delay: (i % 3) * 0.05 }}
                className="bg-white border border-[#e2e8f0] rounded-3xl p-6 md:p-7 hover:-translate-y-1 transition-transform duration-300"
              >
                <Editable
                  path={`vku.months.${i}.name_${lang}`}
                  value={pick(m.name_de, m.name_en)}
                  as="div"
                  className="font-display text-2xl md:text-3xl tracking-tight mb-4 block"
                />
                <Editable
                  path={`vku.months.${i}.sessions_${lang}`}
                  value={pick(m.sessions_de, m.sessions_en)}
                  as="div"
                  multiline
                  className="text-sm font-medium text-[#475569] leading-relaxed whitespace-pre-line block"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Info */}
      <section className="section-pad bg-white border-t border-[#e2e8f0]">
        <div className="container-x px-5 md:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle size={14} className="text-[#ff5a36]" />
                <span className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]">
                  {lang === "de" ? "Achtung" : "Heads up"}
                </span>
              </div>
              <Editable
                path={`vku.info_title_${lang}`}
                value={pick(data.info_title_de, data.info_title_en)}
                as="h2"
                className="font-display leading-[0.98] tracking-tight block"
                style={{ fontSize: "clamp(2.1rem, 4.4vw, 4rem)" }}
              />
            </div>
            <ul className="lg:col-span-7 space-y-4">
              {infoItems.map((it, i) => (
                <motion.li
                  key={it.id || i}
                  data-testid={`vku-info-${i}`}
                  initial={{ opacity: 0, x: 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="flex items-start gap-4 bg-[#fbf9f6] border border-[#e2e8f0] rounded-2xl p-5"
                >
                  <span className="inline-flex shrink-0 items-center justify-center w-9 h-9 rounded-full bg-[#ff5a36] text-white font-display text-base">
                    {i + 1}
                  </span>
                  <Editable
                    path={`vku.info_items.${i}.text_${lang}`}
                    value={pick(it.text_de, it.text_en)}
                    as="p"
                    multiline
                    className="text-base font-medium leading-relaxed text-[#0f172a] block flex-1"
                  />
                </motion.li>
              ))}
            </ul>
          </div>

          <div className="mt-12 text-center">
            <a
              href={data.cta_link || "tel:+41795850085"}
              data-testid="vku-cta-bottom"
              className="inline-flex items-center gap-2 btn-accent"
            >
              <Editable
                path={`vku.cta_label_${lang}`}
                value={pick(data.cta_label_de, data.cta_label_en)}
              />
              <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </section>

      <Footer data={content.contact} />
      <AdminToolbar />
    </main>
  );
}
