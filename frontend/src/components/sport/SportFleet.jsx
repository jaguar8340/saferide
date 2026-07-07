import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

/**
 * "Starting grid" card. Big race position number, image, model name.
 * Card is diagonal-clipped and gets a red glow on hover.
 */
function GridCard({ position, name, tagline, image, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay, duration: 0.6, ease: "easeOut" }}
      className="group relative sport-grid-card bg-[#111113] border border-[#27272a] hover:border-[#e11d48] transition-all overflow-hidden"
      data-testid={`sport-fleet-card-${position}`}
    >
      {/* Position number (huge, watermark) */}
      <div className="absolute top-4 left-5 font-race text-[8rem] leading-none text-white/[0.04] pointer-events-none select-none z-0">
        {position}
      </div>

      {/* Content wrapper */}
      <div className="relative z-10 p-6 md:p-8 flex flex-col h-full min-h-[440px]">
        {/* Grid slot label */}
        <div className="flex items-center justify-between mb-6">
          <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/50">
            Grid Slot · P{position}
          </span>
          <span className="w-8 h-8 rounded-full border border-[#27272a] flex items-center justify-center text-white/40 group-hover:border-[#e11d48] group-hover:text-white transition-colors">
            <ArrowUpRight size={14} />
          </span>
        </div>

        {/* Car image */}
        <div className="relative flex-1 flex items-center justify-center mb-6">
          <img
            src={image}
            alt={name}
            loading="lazy"
            className="w-full h-56 object-cover rounded-sm ring-1 ring-white/5 group-hover:scale-[1.03] transition-transform duration-500"
          />
        </div>

        {/* Text */}
        <div className="mt-auto">
          <div className="font-race text-3xl md:text-4xl leading-tight uppercase tracking-wide">
            {name}
          </div>
          <div className="mt-2 text-sm text-white/60 leading-relaxed">
            {tagline}
          </div>
        </div>

        {/* Red bottom bar */}
        <span className="absolute left-0 bottom-0 h-1 w-0 bg-[#e11d48] group-hover:w-full transition-all duration-500" />
      </div>
    </motion.div>
  );
}

/**
 * Starting-grid style fleet showcase. Uses fallback assets from the design
 * blueprint when the CMS `content.fleet` field is empty.
 */
export default function SportFleet({ content = {} }) {
  const fleet = content.fleet || [];
  const fallback = [
    {
      name: "Audi S3 Sportback",
      tagline: "Rot · agiler Sport-Kompakter · das Herzstück",
      image: "https://images.unsplash.com/photo-1580446623001-3abf670c5c55?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    },
    {
      name: "Opel Astra OPC",
      tagline: "Blau · sportlich · für lange Autobahn-Etappen",
      image: "https://images.unsplash.com/photo-1763048243201-c346f3508bb9?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    },
    {
      name: "Range Rover Sport",
      tagline: "Weiss · Premium-Kategorie · Komfort auf höchstem Niveau",
      image: "https://images.unsplash.com/photo-1725815761064-b84c3f4f9b94?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    },
  ];

  const cards = fleet.length
    ? fleet.slice(0, 3).map((item, i) => ({
        name: item.title_de || fallback[i].name,
        tagline: item.description_de || fallback[i].tagline,
        image: item.image_url || fallback[i].image,
      }))
    : fallback;

  return (
    <section
      id="fleet"
      data-testid="sport-fleet-section"
      className="relative py-24 md:py-32 bg-[#09090b]"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="mb-14 md:mb-16 max-w-3xl">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-0.5 bg-[#e11d48]" />
            <span className="sport-overline">The Starting Grid</span>
          </div>
          <h2 className="font-race text-5xl md:text-7xl uppercase tracking-wide leading-none">
            Deine Wahl
            <span className="text-[#e11d48]">.</span>
            <br />
            Deine Maschine
            <span className="text-[#e11d48]">.</span>
          </h2>
          <p className="mt-6 text-white/60 text-lg leading-relaxed max-w-xl">
            Drei Fahrzeuge, drei Charaktere. Vom kompakten Sport-Coupé bis zum
            SUV — wir stellen dich auf das Auto, das zu dir passt.
          </p>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-3 gap-5 md:gap-6">
          {cards.map((c, i) => (
            <GridCard
              key={c.name}
              position={i + 1}
              name={c.name}
              tagline={c.tagline}
              image={c.image}
              delay={i * 0.12}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
