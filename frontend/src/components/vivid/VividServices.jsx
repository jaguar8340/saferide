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

// Playful colour combos for the service cards
const TINTS = [
  { bg: "bg-white", icon: "bg-[#3b5bff] text-white" },
  { bg: "bg-[#c8ff4d]", icon: "bg-[#0a0a1f] text-[#c8ff4d]" },
  { bg: "bg-white", icon: "bg-[#ff3b8b] text-white" },
  { bg: "bg-[#ffd60a]", icon: "bg-[#0a0a1f] text-[#ffd60a]" },
  { bg: "bg-white", icon: "bg-[#0a0a1f] text-[#a3f7bf]" },
  { bg: "bg-[#e2d5ff]", icon: "bg-[#0a0a1f] text-[#e2d5ff]" },
];

/**
 * Vivid Services / "Was du bekommst" – colourful card grid with big numbers
 * and hand-drawn dashed borders on hover.
 */
export default function VividServices({ content = {} }) {
  const items = content.services || [];
  const overline = content.services_overline_de || "Was drin ist";
  const title = content.services_title_de || "Was du bekommst";

  if (!items.length) return null;

  return (
    <section
      id="services"
      data-testid="vivid-services-section"
      className="relative py-24 md:py-32 bg-[#fef9f4]"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="grid lg:grid-cols-12 gap-8 mb-14 md:mb-16 items-end">
          <div className="lg:col-span-8">
            <span className="v-overline inline-flex mb-6" style={{ background: "#3b5bff", color: "#fff" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              {overline}
            </span>
            <h2 className="font-grotesk text-5xl md:text-6xl lg:text-7xl leading-[0.95] tracking-[-0.035em] text-[#0a0a1f]">
              {title.split(" ").map((w, i, arr) => {
                const isFocus = w.toLowerCase().includes("bekommst");
                return (
                  <span key={i} className={isFocus ? "v-hl-pink text-white" : ""}>
                    {w}
                    {i < arr.length - 1 ? " " : ""}
                  </span>
                );
              })}
            </h2>
          </div>
          <div className="lg:col-span-4 text-right">
            <span className="v-sticker v-sticker--lime inline-flex">
              {String(items.length).padStart(2, "0")} Angebote
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {items.map((s, i) => {
            const Icon = ICONS[s.icon] || Sparkles;
            const t = TINTS[i % TINTS.length];
            return (
              <motion.article
                key={s.id || i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
                data-testid={`vivid-service-card-${i}`}
                className={`group relative ${t.bg} border-2 border-[#0a0a1f] rounded-[28px] p-7 md:p-8 transition-all hover:-translate-y-1`}
                style={{ boxShadow: "5px 5px 0 #0a0a1f" }}
              >
                <div className="flex items-start justify-between mb-6">
                  <span className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl ${t.icon}`}>
                    <Icon size={20} strokeWidth={2.2} />
                  </span>
                  <span className="font-grotesk text-[2.4rem] font-bold text-[#0a0a1f]/10 leading-none tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="font-grotesk text-2xl md:text-[1.75rem] leading-tight tracking-[-0.025em] text-[#0a0a1f]">
                  {s.title_de}
                </h3>
                <p className="mt-3 font-inter text-[15px] leading-relaxed text-[#3a3a5a] whitespace-pre-line">
                  {s.description_de}
                </p>
                <ArrowUpRight
                  size={22}
                  strokeWidth={2.2}
                  className="absolute bottom-6 right-6 text-[#0a0a1f] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
                />
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
