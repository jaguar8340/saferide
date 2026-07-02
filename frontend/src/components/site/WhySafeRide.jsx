import { motion } from "framer-motion";
import {
  Heart,
  Brain,
  Sparkles,
  Car,
  MapPin,
  ShieldCheck,
  Plus,
  Trash2,
  ArrowUpRight,
} from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";
import Editable from "@/components/edit/Editable";

const ICONS = { Heart, Brain, Sparkles, Car, MapPin, ShieldCheck };

// Six pillar cards rendered in a 12-col grid. Each card occupies a varying
// number of columns to break the monotony – wide / narrow / wide pattern.
const SPANS = [
  "lg:col-span-7", // wp1 wide-left
  "lg:col-span-5", // wp2 narrow-right
  "lg:col-span-5", // wp3 narrow-left
  "lg:col-span-7", // wp4 wide-right
  "lg:col-span-7", // wp5 wide-left
  "lg:col-span-5", // wp6 narrow-right
];

const ACCENTS = [
  { iconBg: "bg-gradient-to-br from-[#ff5a36] to-[#ff8c42]", iconFg: "text-white" },
  { iconBg: "bg-white", iconFg: "text-[#ff5a36]", bg: "bg-[#0f172a]", fg: "text-white" },
  { iconBg: "bg-[#ffe4d6]", iconFg: "text-[#e74123]" },
  { iconBg: "bg-gradient-to-br from-[#e74123] to-[#ff5a36]", iconFg: "text-white" },
  { iconBg: "bg-[#fff6ef]", iconFg: "text-[#ff5a36]" },
  { iconBg: "bg-gradient-to-br from-[#ff8c42] to-[#ffb56b]", iconFg: "text-white" },
];

export default function WhySafeRide({ data }) {
  const { lang, pick } = useLang();
  const { editMode, updateField } = useEdit();
  if (!data) return null;
  const pillars = data.pillars || [];

  const addPillar = () => {
    const next = [
      ...pillars,
      {
        id: `wp${Date.now()}`,
        icon: "Sparkles",
        title_de: "Neuer Punkt",
        title_en: "New point",
        body_de: "Klicken zum Bearbeiten…",
        body_en: "Click to edit…",
      },
    ];
    updateField("why_safe_ride.pillars", next);
  };
  const removePillar = (id) => () => {
    if (!confirm("Punkt löschen?")) return;
    updateField(
      "why_safe_ride.pillars",
      pillars.filter((p) => p.id !== id),
    );
  };

  return (
    <section
      id="why-safe-ride"
      data-testid="why-safe-ride-section"
      className="section-pad bg-sunset-soft border-t border-[#e2e8f0]"
    >
      <div className="container-x">
        {/* Header */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end mb-12 md:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7"
          >
            <div className="flex items-center gap-2 mb-5">
              <span className="dot-accent animate-pulse-accent" />
              <Editable
                path={`why_safe_ride.overline_${lang}`}
                value={pick(data.overline_de, data.overline_en)}
                className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]"
              />
            </div>
            <h2
              className="font-display leading-[0.95] tracking-tight text-[#0f172a]"
              style={{ fontSize: "clamp(2.2rem, 5vw, 4.6rem)" }}
            >
              <Editable
                path={`why_safe_ride.title_${lang}`}
                value={pick(data.title_de, data.title_en)}
                as="span"
                className="inline"
              />
            </h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-5"
          >
            <Editable
              path={`why_safe_ride.intro_${lang}`}
              value={pick(data.intro_de, data.intro_en)}
              as="p"
              multiline
              className="text-base md:text-lg text-[#475569] leading-relaxed font-medium block"
            />
          </motion.div>
        </div>

        {/* Pillars grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5">
          {pillars.map((p, i) => {
            const Icon = ICONS[p.icon] || Sparkles;
            const a = ACCENTS[i % ACCENTS.length];
            const span = SPANS[i % SPANS.length];
            const dark = !!a.bg;
            return (
              <motion.article
                key={p.id}
                data-testid={`why-pillar-${i}`}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
                className={`${span} relative rounded-3xl p-7 md:p-9 ${
                  dark
                    ? `${a.bg} ${a.fg}`
                    : "bg-[#fbf9f6] border border-[#e2e8f0] text-[#0f172a]"
                } overflow-hidden`}
              >
                <div className="flex items-start justify-between gap-4">
                  <span
                    className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl ${a.iconBg} ${a.iconFg} shrink-0`}
                  >
                    <Icon size={18} />
                  </span>
                  {editMode && (
                    <button
                      onClick={removePillar(p.id)}
                      data-testid={`why-pillar-remove-${i}`}
                      className={`${dark ? "text-white/40 hover:text-white" : "text-[#94a3b8] hover:text-[#ff5a36]"} transition-colors`}
                      aria-label="Punkt entfernen"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <Editable
                  path={`why_safe_ride.pillars.${i}.title_${lang}`}
                  value={pick(p.title_de, p.title_en)}
                  as="h3"
                  className="font-display text-2xl md:text-3xl leading-tight tracking-tight mt-6 block"
                />
                <Editable
                  path={`why_safe_ride.pillars.${i}.body_${lang}`}
                  value={pick(p.body_de, p.body_en)}
                  as="p"
                  multiline
                  className={`mt-4 text-[15px] leading-relaxed font-medium block ${
                    dark ? "text-white/85" : "text-[#475569]"
                  }`}
                />
              </motion.article>
            );
          })}
        </div>

        {editMode && (
          <div className="mt-6">
            <button
              onClick={addPillar}
              data-testid="why-pillar-add"
              className="btn-accent text-sm py-2.5 px-4"
            >
              <Plus size={14} /> Punkt
            </button>
          </div>
        )}

        {/* Closing + CTA */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-12 md:mt-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end"
        >
          <Editable
            path={`why_safe_ride.closing_${lang}`}
            value={pick(data.closing_de, data.closing_en)}
            as="p"
            multiline
            className="lg:col-span-8 text-xl md:text-2xl font-display leading-snug tracking-tight text-[#0f172a] block"
          />
          <div className="lg:col-span-4 flex lg:justify-end">
            <a
              href="/#contact"
              data-testid="why-safe-ride-cta"
              className="btn-accent group whitespace-nowrap"
            >
              <Editable
                path={`why_safe_ride.cta_${lang}`}
                value={pick(data.cta_de, data.cta_en)}
                className="inline"
              />
              <ArrowUpRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
