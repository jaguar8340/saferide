import { motion } from "framer-motion";
import { Car, GraduationCap, Brain, Sparkles, ShieldCheck } from "lucide-react";

const STAGES = [
  {
    icon: GraduationCap,
    lap: "01",
    title: "Nothelferkurs & Sehtest",
    desc: "Der Start jeder Fahrerkarriere. Wir sagen dir wo, wann und wie.",
  },
  {
    icon: Brain,
    lap: "02",
    title: "Theorie & Lernfahrausweis",
    desc: "App-Empfehlung, Lernstrategie, dann direkt auf's Strassenverkehrsamt.",
  },
  {
    icon: Car,
    lap: "03",
    title: "Praxis-Lektionen",
    desc: "Individueller Lernplan. Audi S3, Opel OPC oder Range Rover — deine Wahl.",
  },
  {
    icon: ShieldCheck,
    lap: "04",
    title: "VKU (Verkehrskunde)",
    desc: "8 Stunden praxisnaher Unterricht. Kein Frontal-Bla-Bla, garantiert.",
  },
  {
    icon: Sparkles,
    lap: "05",
    title: "Prüfung & Sieg",
    desc: "Prüfungssimulation, mentale Vorbereitung, Zielflagge — Führerausweis.",
  },
];

/**
 * Race schedule / lap timeline. Vertical rail with red timing markers,
 * numbered laps. Reveals row by row on scroll.
 */
export default function SportServices() {
  return (
    <section
      id="services"
      data-testid="sport-services-section"
      className="relative py-24 md:py-32 bg-[#09090b] border-t border-[#27272a]"
    >
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="mb-16 max-w-3xl">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-0.5 bg-[#e11d48]" />
            <span className="sport-overline">Race Card · 5 Laps</span>
          </div>
          <h2 className="font-race text-5xl md:text-7xl uppercase tracking-wide leading-none">
            Vom Start
            <br />
            zur <span className="text-[#e11d48]">Zielflagge</span>
          </h2>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical track */}
          <div className="absolute left-6 md:left-12 top-3 bottom-3 w-px bg-[#27272a]" />

          <ol className="space-y-8">
            {STAGES.map((stage, i) => (
              <motion.li
                key={stage.lap}
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                data-testid={`sport-service-lap-${stage.lap}`}
                className="relative pl-16 md:pl-28"
              >
                {/* Lap dot */}
                <div className="absolute left-0 top-0 w-12 h-12 md:w-24 md:h-12 flex items-center justify-center">
                  <div className="relative w-12 h-12 bg-[#e11d48] flex items-center justify-center sport-glow-red">
                    <stage.icon size={20} strokeWidth={2.2} className="text-white" />
                  </div>
                  <span className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 font-race text-6xl text-white/[0.07] leading-none">
                    {stage.lap}
                  </span>
                </div>

                {/* Content card */}
                <div className="bg-[#111113] border border-[#27272a] hover:border-[#e11d48] transition-colors p-6 md:p-8 group">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-mono text-[10px] tracking-[0.28em] uppercase text-white/40">
                      Lap {stage.lap} · Stage
                    </span>
                    <span className="hidden sm:block flex-1 h-px bg-[#27272a] group-hover:bg-[#e11d48] transition-colors" />
                  </div>
                  <div className="font-race text-3xl md:text-4xl uppercase tracking-wide leading-tight">
                    {stage.title}
                  </div>
                  <p className="mt-3 text-white/60 leading-relaxed">
                    {stage.desc}
                  </p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
