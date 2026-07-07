import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

/**
 * Elegant Fleet showcase – three luxury automotive presentation cards with
 * gold-framed imagery, serif model names and refined italic captions.
 */
export default function ElegantFleet({ content = {} }) {
  const items = content.fleet || [];
  const overline = content.fleet_overline_de || "Fuhrpark · Fleet";
  const title = content.fleet_title_de || "Unsere Flotte";

  const fallback = [
    {
      name: "Audi S3 Sportback",
      description_de: "Rot · das agile Herzstück",
      image_url: "https://images.unsplash.com/photo-1580446623001-3abf670c5c55?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    },
    {
      name: "Opel Astra OPC",
      description_de: "Blau · sportlich, dynamisch",
      image_url: "https://images.unsplash.com/photo-1763048243201-c346f3508bb9?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    },
    {
      name: "Range Rover Sport",
      description_de: "Weiß · souveräne Präsenz",
      image_url: "https://images.unsplash.com/photo-1725815761064-b84c3f4f9b94?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    },
  ];
  const cars = items.length ? items.slice(0, 3) : fallback;

  return (
    <section
      id="fleet"
      data-testid="elegant-fleet-section"
      className="relative py-24 md:py-36 bg-[#0d1b2a] text-[#faf6f0]"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="mb-16 md:mb-20 max-w-3xl">
          <div className="mb-5">
            <span className="inline-flex items-center gap-3 font-manrope text-[10px] tracking-[0.32em] uppercase text-[#c9a961] font-medium">
              <span className="block w-8 h-px bg-[#c9a961]" />
              {overline}
            </span>
          </div>
          <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl leading-[0.95] tracking-tight">
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
          <p className="mt-6 font-manrope text-lg leading-relaxed text-white/70 font-light max-w-xl">
            Drei sorgsam kuratierte Fahrzeuge – für jeden Charakter,
            jede Ausbildungsphase, jeden Anspruch das passende Instrument.
          </p>
        </div>

        {/* Gold hairline */}
        <div className="mb-14 flex items-center gap-4">
          <span className="block flex-1 h-px bg-[#c9a961]/40" />
          <span className="w-2 h-2 rotate-45 bg-[#c9a961]" />
          <span className="block flex-1 h-px bg-[#c9a961]/40" />
        </div>

        <div className="grid md:grid-cols-3 gap-8 md:gap-10">
          {cars.map((c, i) => (
            <motion.article
              key={c.id || i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: i * 0.12 }}
              data-testid={`elegant-fleet-card-${i}`}
              className="group"
            >
              {/* Gold-framed image on navy */}
              <div className="relative p-3 bg-[#faf6f0]/5 border border-white/10 group-hover:border-[#c9a961]/60 transition-colors">
                <div className="relative overflow-hidden">
                  <img
                    src={c.image_url}
                    alt={c.name}
                    loading="lazy"
                    className="w-full h-72 object-cover group-hover:scale-[1.04] transition-transform duration-1000 ease-out"
                  />
                </div>
                {/* Fleet position tag */}
                <div className="absolute top-6 left-6 font-serif italic text-[#c9a961] text-lg">
                  N° {String(i + 1).padStart(2, "0")}
                </div>
              </div>

              <div className="mt-6 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-serif text-3xl leading-tight tracking-tight text-white">
                    {c.name}
                  </h3>
                  <p className="mt-2 font-italic-serif text-lg text-white/70 leading-relaxed">
                    {c.description_de}
                  </p>
                </div>
                <span className="inline-flex items-center justify-center w-9 h-9 border border-white/20 text-white/60 group-hover:border-[#c9a961] group-hover:text-[#c9a961] transition-colors shrink-0">
                  <ArrowUpRight size={14} strokeWidth={1.6} />
                </span>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
