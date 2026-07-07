import { motion } from "framer-motion";
import { MapPin, Star, Users, Award } from "lucide-react";

const STATS = [
  { icon: MapPin, label: "Standorte", value: "11", unit: "" },
  { icon: Star, label: "Rating", value: "5.0", unit: "/5" },
  { icon: Users, label: "Kantone", value: "04", unit: "" },
  { icon: Award, label: "Erfolgsquote", value: "98", unit: "%" },
];

/**
 * Telemetry-style KPI dashboard. Digital readouts on black surfaces with red
 * accent borders.
 */
export default function SportStatsBar() {
  return (
    <section
      id="stats"
      data-testid="sport-stats-bar"
      className="relative py-16 md:py-24 sport-carbon border-y border-[#27272a]"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="mb-10 flex items-center gap-3">
          <span className="w-8 h-0.5 bg-[#e11d48]" />
          <span className="sport-overline">Live Telemetry</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              data-testid={`sport-stat-${s.label.toLowerCase()}`}
              className="relative p-6 md:p-8 bg-black border border-[#27272a] hover:border-[#e11d48] transition-colors group overflow-hidden"
            >
              {/* Corner tag */}
              <span className="absolute top-3 right-3 font-mono text-[9px] tracking-[0.22em] text-white/30 uppercase">
                #{String(i + 1).padStart(2, "0")}
              </span>
              <s.icon
                size={20}
                strokeWidth={2}
                className="text-[#e11d48] mb-4 group-hover:scale-110 transition-transform"
              />
              <div className="flex items-baseline gap-1">
                <span className="font-mono font-extrabold text-4xl md:text-6xl leading-none tracking-tighter">
                  {s.value}
                </span>
                {s.unit && (
                  <span className="font-mono text-lg md:text-2xl text-white/40">
                    {s.unit}
                  </span>
                )}
              </div>
              <div className="mt-3 font-mono text-[10px] tracking-[0.28em] uppercase text-white/50">
                {s.label}
              </div>
              {/* Bottom red bar reveal on hover */}
              <span className="absolute left-0 bottom-0 h-0.5 w-0 bg-[#e11d48] group-hover:w-full transition-all duration-500" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
