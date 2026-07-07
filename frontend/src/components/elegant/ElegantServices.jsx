import { motion } from "framer-motion";
import {
  Car,
  Truck,
  BookOpen,
  Brain,
  Heart,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const ICONS = { Car, Truck, BookOpen, Brain, Heart, ShieldCheck, Sparkles };

/**
 * Elegant Services / "Was du bekommst" – displayed as a refined index/list
 * with numbered entries and thin hairline dividers. Feels like the table of
 * contents in a fine automotive brochure.
 */
export default function ElegantServices({ content = {} }) {
  const items = content.services || [];
  const overline = content.services_overline_de || "Manufaktur · Leistungen";
  const title = content.services_title_de || "Was du bekommst";

  if (!items.length) return null;

  return (
    <section
      id="services"
      data-testid="elegant-services-section"
      className="relative py-24 md:py-36 bg-[#faf6f0]"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="grid lg:grid-cols-12 gap-8 mb-16 md:mb-20 items-end">
          <div className="lg:col-span-8">
            <div className="mb-5">
              <span className="el-overline el-overline--start">
                <span className="block w-8 h-px bg-[#c9a961]" />
                {overline}
              </span>
            </div>
            <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl leading-[0.95] tracking-tight text-[#0d1b2a]">
              {title.split(" ").map((w, i, arr) => (
                <span key={i}>
                  {w}
                  {i === arr.length - 1 ? (
                    <span className="italic text-[#c9a961]">.</span>
                  ) : (
                    " "
                  )}
                </span>
              ))}
            </h2>
          </div>
          <div className="lg:col-span-4 text-right">
            <span className="font-manrope text-[10px] tracking-[0.32em] uppercase text-[#7a8595]">
              {String(items.length).padStart(2, "0")} · Leistungen
            </span>
          </div>
        </div>

        {/* Two-column list (alternating index style) */}
        <div className="grid md:grid-cols-2 gap-x-16 lg:gap-x-24 gap-y-14">
          {items.map((s, i) => {
            const Icon = ICONS[s.icon] || Sparkles;
            return (
              <motion.div
                key={s.id || i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.55, delay: (i % 2) * 0.1 }}
                data-testid={`elegant-service-card-${i}`}
                className="group relative"
              >
                {/* Index row */}
                <div className="flex items-center gap-4 mb-4">
                  <span className="font-serif italic text-2xl text-[#c9a961]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 h-px bg-[#e5ded1] group-hover:bg-[#c9a961] transition-colors duration-500" />
                  <span className="inline-flex items-center justify-center w-10 h-10 border border-[#c9a961]/50 text-[#c9a961]">
                    <Icon size={16} strokeWidth={1.6} />
                  </span>
                </div>

                <h3 className="font-serif text-3xl md:text-4xl leading-tight tracking-tight text-[#0d1b2a]">
                  {s.title_de}
                </h3>
                <p className="mt-4 font-manrope text-[15px] leading-[1.8] text-[#37475a] font-light whitespace-pre-line">
                  {s.description_de}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
