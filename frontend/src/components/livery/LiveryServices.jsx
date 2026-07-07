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
 * Livery Services – Editorial spec-sheet style. Two-column list of the
 * services with large chapter-numbers, an icon, and thick rule lines.
 */
export default function LiveryServices({ content = {} }) {
  const items = content.services || [];
  const title = content.services_title_de || "Was du bekommst";

  if (!items.length) return null;

  return (
    <section
      id="services"
      data-testid="livery-services-section"
      className="relative py-24 md:py-32 bg-[#f2ede4]"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid lg:grid-cols-12 gap-8 mb-14 items-end">
          <div className="lg:col-span-8">
            <div className="mb-5 flex items-center gap-3">
              <span className="lv-label lv-label--navy">Was drin ist</span>
              <span className="font-script text-3xl text-[#c9302c] leading-none">— dein Paket</span>
            </div>
            <h2 className="font-anton text-6xl md:text-7xl lg:text-8xl uppercase leading-[0.88] tracking-tight text-[#0f1419]">
              {title}
              <span className="text-[#c9302c]">.</span>
            </h2>
          </div>
          <div className="lg:col-span-4 text-right">
            <span className="lv-label">
              {String(items.length).padStart(2, "0")} · Services
            </span>
          </div>
        </div>

        {/* Alternating spec-sheet rows */}
        <div className="border-t-2 border-b-2 border-[#0f1419] divide-y-2 divide-[#0f1419]/70">
          {items.map((s, i) => {
            const Icon = ICONS[s.icon] || Sparkles;
            const isRed = i % 3 === 1;
            const bg = isRed ? "bg-[#c9302c] text-white" : "bg-transparent text-[#0f1419]";
            return (
              <motion.div
                key={s.id || i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: (i % 3) * 0.05 }}
                data-testid={`livery-service-row-${i}`}
                className={`${bg} group py-8 md:py-10 px-4 md:px-6 grid md:grid-cols-12 gap-6 md:gap-10 items-center hover:bg-[#1a2332] hover:text-white transition-colors`}
              >
                {/* Big chapter number */}
                <div className="md:col-span-2 flex items-center gap-4">
                  <span className="font-anton text-6xl md:text-7xl leading-none tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                {/* Icon + Title */}
                <div className="md:col-span-4 flex items-center gap-5">
                  <span className={`inline-flex items-center justify-center w-12 h-12 border-2 ${isRed ? "border-white/60" : "border-[#0f1419]"} group-hover:border-white/60 transition-colors`}>
                    <Icon size={20} strokeWidth={2.2} />
                  </span>
                  <h3 className="font-anton text-2xl md:text-3xl uppercase leading-tight tracking-wide">
                    {s.title_de}
                  </h3>
                </div>

                {/* Description */}
                <p className={`md:col-span-5 font-mano text-[15px] leading-relaxed whitespace-pre-line ${isRed ? "text-white/90" : "text-[#3a4553] group-hover:text-white/90"}`}>
                  {s.description_de}
                </p>

                {/* Arrow */}
                <div className="md:col-span-1 md:text-right">
                  <ArrowUpRight
                    size={22}
                    strokeWidth={2.2}
                    className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all inline-block"
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
