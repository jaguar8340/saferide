import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

/**
 * Vivid Fleet showcase – three vehicles displayed as playful cards with
 * bright coloured backgrounds and bold sticker labels.
 */
export default function VividFleet({ content = {} }) {
  const items = content.fleet || [];
  const overline = content.fleet_overline_de || "Rides · Fleet";
  const title = content.fleet_title_de || "Unsere Flotte";

  const fallback = [
    {
      name: "Audi S3 Sportback",
      description_de: "Rot · agiler Sport-Kompakter · das Herzstück",
      image_url: "https://images.unsplash.com/photo-1580446623001-3abf670c5c55?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    },
    {
      name: "Opel Astra OPC",
      description_de: "Blau · sportlich, dynamisch",
      image_url: "https://images.unsplash.com/photo-1763048243201-c346f3508bb9?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    },
    {
      name: "Range Rover Sport",
      description_de: "Weiß · souveräner Auftritt",
      image_url: "https://images.unsplash.com/photo-1725815761064-b84c3f4f9b94?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    },
  ];
  const cars = items.length ? items.slice(0, 3) : fallback;

  const CAR_TINTS = [
    { bg: "bg-[#ff3b8b]", label: "#01 Herzstück", labelBg: "v-sticker--lime" },
    { bg: "bg-[#3b5bff]", label: "#02 Cruiser", labelBg: "v-sticker--pink" },
    { bg: "bg-[#c8ff4d]", label: "#03 Boss", labelBg: "v-sticker--blue" },
  ];

  return (
    <section
      id="fleet"
      data-testid="vivid-fleet-section"
      className="relative py-24 md:py-32 bg-[#fff4e6] overflow-hidden"
    >
      <div className="v-blob bg-[#c8ff4d]" style={{ bottom: "10%", right: "-100px", width: "300px", height: "300px", opacity: 0.5 }} />

      <div className="relative max-w-7xl mx-auto px-4 md:px-8">
        <div className="mb-14 md:mb-16 max-w-3xl">
          <span className="v-overline inline-flex mb-6" style={{ background: "#ffd60a" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#0a0a1f]" />
            {overline}
          </span>
          <h2 className="font-grotesk text-5xl md:text-6xl lg:text-7xl leading-[0.95] tracking-[-0.035em] text-[#0a0a1f]">
            Drei <span className="v-hl-yellow">Fahrzeuge</span>,<br />
            drei Charaktere<span className="font-instrument not-italic italic text-[#ff3b8b]">.</span>
          </h2>
          <p className="mt-6 font-inter text-lg leading-relaxed text-[#3a3a5a] max-w-xl">
            Vom kompakten Sport-Coupé bis zum SUV — wir stellen dich auf das
            Auto, das zu dir passt und dir richtig Spass macht.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 md:gap-7">
          {cars.map((c, i) => {
            const t = CAR_TINTS[i % CAR_TINTS.length];
            return (
              <motion.article
                key={c.id || i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.55, delay: i * 0.1 }}
                data-testid={`vivid-fleet-card-${i}`}
                className={`group relative ${t.bg} border-2 border-[#0a0a1f] rounded-[32px] overflow-hidden transition-all hover:-translate-y-1`}
                style={{ boxShadow: "6px 6px 0 #0a0a1f" }}
              >
                {/* Image */}
                <div className="relative m-5 rounded-[24px] overflow-hidden border-2 border-[#0a0a1f]">
                  <img
                    src={c.image_url}
                    alt={c.name}
                    loading="lazy"
                    className="w-full h-64 object-cover group-hover:scale-[1.05] transition-transform duration-700"
                  />
                  {/* Sticker */}
                  <div className={`absolute top-4 left-4 v-sticker ${t.labelBg}`} style={{ transform: "rotate(-6deg)" }}>
                    {t.label}
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 md:px-7 pb-7 flex items-start justify-between gap-4">
                  <div className={i === 1 ? "text-white" : "text-[#0a0a1f]"}>
                    <h3 className="font-grotesk text-2xl md:text-3xl leading-tight tracking-[-0.025em]">
                      {c.name}
                    </h3>
                    <p className={`mt-2 font-inter text-[15px] leading-relaxed ${i === 1 ? "text-white/80" : "text-[#3a3a5a]"}`}>
                      {c.description_de}
                    </p>
                  </div>
                  <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full border-2 border-[#0a0a1f] ${i === 1 ? "bg-white text-[#0a0a1f]" : "bg-[#0a0a1f] text-white"} shrink-0 transition-transform group-hover:rotate-45`}>
                    <ArrowUpRight size={16} strokeWidth={2.5} />
                  </span>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
