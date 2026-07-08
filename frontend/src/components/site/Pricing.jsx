import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import Editable from "@/components/edit/Editable";
import { api } from "@/lib/api";

const CANTONS = [
  { code: "ZH", name_de: "Zürich", name_en: "Zurich" },
  { code: "SZ", name_de: "Schwyz", name_en: "Schwyz" },
  { code: "SG", name_de: "St. Gallen", name_en: "St. Gallen" },
  { code: "GR", name_de: "Graubünden", name_en: "Grisons" },
];

/**
 * Site-wide pricing section that reads from `/api/packages` – the single
 * source of truth for prices. Two operating modes:
 *
 *   • standalone (no `lockedCanton`)  → shows a 4-tab canton switcher and
 *     defaults to ZH. Used on the homepage and the /buchung page.
 *   • locked (`lockedCanton="GR"`)    → no tabs, only the packages for that
 *     canton. Used on the location landing pages where the canton is known.
 *
 * `data` still comes from `content.pricing` in the CMS for the editable title
 * / subtitle / cta_text – individual plan cards no longer live in `content`.
 */
export default function Pricing({ data, lockedCanton = null }) {
  const { lang, pick, t } = useLang();
  const [allPackages, setAllPackages] = useState([]);
  const [activeCanton, setActiveCanton] = useState(lockedCanton || "ZH");

  useEffect(() => {
    let ignore = false;
    api.get("/packages").then((r) => {
      if (!ignore) setAllPackages(r.data || []);
    }).catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (lockedCanton) setActiveCanton(lockedCanton);
  }, [lockedCanton]);

  const visible = useMemo(() => {
    const c = activeCanton;
    return allPackages.filter(
      (p) => !p.cantons || p.cantons.length === 0 || p.cantons.includes(c),
    );
  }, [allPackages, activeCanton]);

  if (!data) return null;

  return (
    <section
      id="pricing"
      data-testid="pricing-section"
      className="section-pad bg-[#fbf9f6]"
    >
      <div className="container-x">
        <div className="max-w-2xl mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="dot-accent" />
            <Editable
              path={`pricing.currency_overline_${lang}`}
              value={pick(data.currency_overline_de, data.currency_overline_en) || "CHF · Preise"}
              className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]"
            />
          </div>
          <Editable
            path={`pricing.title_${lang}`}
            value={pick(data.title_de, data.title_en)}
            as="h2"
            className="font-display leading-[0.98] tracking-tight block"
            style={{ fontSize: "clamp(2.1rem, 4.4vw, 4rem)" }}
          />
          <Editable
            path={`pricing.subtitle_${lang}`}
            value={pick(data.subtitle_de, data.subtitle_en)}
            as="p"
            multiline
            className="mt-5 text-lg text-[#475569] leading-relaxed font-medium block"
          />
        </div>

        {/* Canton tabs – hidden on location pages (locked) */}
        {!lockedCanton && (
          <div
            data-testid="pricing-canton-tabs"
            className="mb-8 inline-flex items-center gap-1 p-1 bg-white border border-[#e2e8f0] rounded-full"
          >
            {CANTONS.map((c) => {
              const active = c.code === activeCanton;
              return (
                <button
                  key={c.code}
                  onClick={() => setActiveCanton(c.code)}
                  data-testid={`pricing-canton-tab-${c.code}`}
                  className={`text-xs md:text-sm font-semibold px-4 md:px-5 py-2 rounded-full transition-all ${
                    active
                      ? "bg-[#0f172a] text-white shadow-sm"
                      : "text-[#475569] hover:text-[#0f172a]"
                  }`}
                >
                  {pick(c.name_de, c.name_en)}
                  <span className={`ml-1.5 text-[10px] tracking-widest ${active ? "text-white/60" : "text-[#94a3b8]"}`}>
                    {c.code}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {visible.map((p, i) => {
            const highlight = !!p.popular;
            return (
              <motion.div
                key={p.slug}
                data-testid={`pricing-card-${p.slug}`}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className={`relative rounded-3xl p-7 md:p-8 border transition-transform duration-300 hover:-translate-y-1 ${
                  highlight
                    ? "bg-sunset-band text-white border-transparent ring-accent-soft"
                    : "bg-white text-[#0f172a] border-[#e2e8f0] hover:border-[#ff5a36]/40"
                }`}
              >
                {highlight && (
                  <span className="absolute -top-3 left-7 tag tag-accent">
                    {pick(data.popular_label_de, data.popular_label_en) || "Beliebt"}
                  </span>
                )}
                <div className="flex items-center gap-1.5 mb-2">
                  {(p.cantons || CANTONS.map((c) => c.code)).map((code) => (
                    <span
                      key={code}
                      className={`inline-flex items-center justify-center h-5 min-w-[26px] px-1.5 rounded-full text-[10px] font-bold tracking-wider ${
                        highlight
                          ? "bg-white/20 text-white"
                          : "bg-[#f1f5f9] text-[#475569]"
                      }`}
                    >
                      {code}
                    </span>
                  ))}
                </div>
                <div className="font-display text-xl leading-tight">
                  {pick(p.title_de, p.title_en)}
                </div>
                <div className={`text-xs mt-1 ${highlight ? "text-white/70" : "text-[#94a3b8]"}`}>
                  {pick(p.duration_de, p.duration_en)}
                </div>
                <div className="font-display text-5xl mt-7 tracking-tighter tabular-nums">
                  CHF {p.price_chf}
                </div>
                <a
                  href="/buchung"
                  data-testid={`pricing-cta-${p.slug}`}
                  className={`mt-7 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors ${
                    highlight ? "text-white hover:text-[#0f172a]" : "text-[#0f172a] hover:text-[#ff5a36]"
                  }`}
                >
                  <span>
                    {pick(data.cta_text_de, data.cta_text_en) || t.pricing.ctaText}
                  </span>
                  <ArrowRight size={14} />
                </a>
              </motion.div>
            );
          })}
        </div>

        <div
          data-testid="pricing-insurance-box"
          className="mt-10 flex items-start gap-4 max-w-3xl p-5 md:p-6 rounded-2xl bg-white border-2 border-[#ff5a36] shadow-[0_10px_30px_-15px_rgba(255,90,54,0.35)]"
        >
          <div className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full bg-[#ff5a36] text-white">
            <ShieldCheck size={22} strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-[#ff5a36] mb-1">
              {lang === "de" ? "Wichtiger Hinweis" : "Important note"}
            </div>
            <Editable
              path={`pricing.note_${lang}`}
              value={pick(data.note_de, data.note_en)}
              as="p"
              multiline
              className="text-base md:text-lg text-[#0f172a] leading-snug font-semibold block"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
