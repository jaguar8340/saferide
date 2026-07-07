import { motion } from "framer-motion";
import {
  Car,
  Truck,
  BookOpen,
  Brain,
  Heart,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

const ICONS = { Car, Truck, BookOpen, Brain, Heart, ShieldCheck, Sparkles };

/**
 * Sport variant of Services ("Was du bekommst"). Reads content.services
 * from the CMS and renders each item as a technical spec card.
 */
export default function SportServices({ content = {} }) {
  const items = content.services || [];
  const overline =
    content.services_overline_de || "Race Manifest · Was du bekommst";
  const title = content.services_title_de || "Was du bekommst";

  if (!items.length) return null;

  return (
    <section
      id="services"
      data-testid="sport-services-section"
      className="relative py-24 md:py-32 bg-[#09090b] border-t border-[#27272a]"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="mb-14 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-0.5 bg-[#e11d48]" />
              <span className="sport-overline">{overline}</span>
            </div>
            <h2 className="font-race text-5xl md:text-7xl uppercase leading-none tracking-wide">
              {title}
              <span className="text-[#e11d48]">.</span>
            </h2>
          </div>
          <span className="font-mono text-[10px] tracking-[0.28em] uppercase text-white/40 self-end">
            {String(items.length).padStart(2, "0")} Services · Season 26
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {items.map((s, i) => {
            const Icon = ICONS[s.icon] || Sparkles;
            const highlight = i === 1; // second card acts as accent
            return (
              <motion.article
                key={s.id || i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
                data-testid={`sport-service-card-${i}`}
                className={`group relative border p-7 md:p-8 transition-all overflow-hidden ${
                  highlight
                    ? "bg-[#e11d48] border-[#e11d48] text-white sport-glow-red"
                    : "bg-[#111113] border-[#27272a] text-white hover:border-[#e11d48]"
                }`}
              >
                <div className="flex items-start justify-between mb-6">
                  <span
                    className={`w-11 h-11 flex items-center justify-center border transition-colors ${
                      highlight
                        ? "bg-black/20 border-white/30"
                        : "bg-black border-[#27272a] group-hover:border-[#e11d48]"
                    }`}
                  >
                    <Icon
                      size={18}
                      strokeWidth={2.2}
                      className={highlight ? "text-white" : "text-[#e11d48]"}
                    />
                  </span>
                  <span
                    className={`font-mono text-[10px] tracking-[0.25em] uppercase ${
                      highlight ? "text-white/70" : "text-white/40"
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="font-race text-2xl md:text-3xl uppercase tracking-wide leading-tight">
                  {s.title_de}
                </h3>
                <p
                  className={`mt-3 text-sm leading-relaxed whitespace-pre-line ${
                    highlight ? "text-white/85" : "text-white/60"
                  }`}
                >
                  {s.description_de}
                </p>
                <ArrowUpRight
                  size={18}
                  className={`absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity ${
                    highlight ? "text-white" : "text-[#e11d48]"
                  }`}
                />
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
