import { motion } from "framer-motion";

/**
 * Livery Fleet – photo-forward "team roster" layout. Each vehicle takes a
 * full-width row with a large photo panel + car-wrap-style typography.
 * Team-livery colours cycle (red / navy / white) matching the actual cars.
 */
export default function LiveryFleet({ content = {} }) {
  const items = content.fleet || [];
  const title = content.fleet_title_de || "Unsere Flotte";

  const fallback = [
    {
      name: "Audi S3 Sportback",
      description_de: "Rot · agiler Sport-Kompakter · das Herzstück",
      spec: "Kat. B",
      image_url: "https://images.unsplash.com/photo-1580446623001-3abf670c5c55?w=1000&auto=format&fit=crop&q=85",
    },
    {
      name: "Opel Astra OPC",
      description_de: "Blau · sportlich, dynamisch",
      spec: "Kat. B",
      image_url: "https://images.unsplash.com/photo-1763048243201-c346f3508bb9?w=1000&auto=format&fit=crop&q=85",
    },
    {
      name: "Range Rover Sport",
      description_de: "Weiß · souveräner Auftritt",
      spec: "Kat. B",
      image_url: "https://images.unsplash.com/photo-1725815761064-b84c3f4f9b94?w=1000&auto=format&fit=crop&q=85",
    },
  ];
  const cars = items.length ? items.slice(0, 3) : fallback;

  // Wrap-inspired colour rows
  const ROWS = [
    { bg: "bg-[#c9302c]", ink: "text-white", accent: "text-[#f2c94c]", num: "lv-race-num--navy" },
    { bg: "bg-[#1a2332]", ink: "text-white", accent: "text-[#f2c94c]", num: "lv-race-num--red" },
    { bg: "bg-[#fefdfb]", ink: "text-[#0f1419]", accent: "text-[#c9302c]", num: "" },
  ];

  return (
    <section
      id="fleet"
      data-testid="livery-fleet-section"
      className="relative bg-[#f2ede4]"
    >
      {/* Header block */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-20 md:py-24">
        <div className="grid lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-8">
            <div className="mb-5 flex items-center gap-3">
              <span className="lv-label lv-label--red">Fleet · 2026</span>
              <span className="font-script text-3xl text-[#c9302c] leading-none">— das Team</span>
            </div>
            <h2 className="font-anton text-6xl md:text-7xl lg:text-8xl uppercase leading-[0.88] tracking-tight text-[#0f1419]">
              {title}
              <span className="text-[#c9302c]">.</span>
            </h2>
            <p className="mt-6 max-w-xl font-mano text-lg leading-relaxed text-[#3a4553]">
              Drei Fahrzeuge im gleichen Wrap-Design. Ein Team. Wähle deinen
              Charakter — vom kompakten Sport-Coupé bis zum Premium-SUV.
            </p>
          </div>
        </div>
      </div>

      {/* Vehicle rows */}
      <div className="border-t-2 border-[#0f1419]">
        {cars.map((c, i) => {
          const s = ROWS[i % ROWS.length];
          const flip = i % 2 === 1;
          return (
            <motion.div
              key={c.id || i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6 }}
              data-testid={`livery-fleet-row-${i}`}
              className={`${s.bg} ${s.ink} border-b-2 border-[#0f1419] relative overflow-hidden`}
            >
              <div className={`max-w-7xl mx-auto grid lg:grid-cols-12 items-stretch min-h-[440px] ${flip ? "" : ""}`}>
                {/* Photo panel */}
                <div className={`lg:col-span-7 relative ${flip ? "lg:order-2" : ""}`}>
                  <img
                    src={c.image_url}
                    alt={c.name}
                    loading="lazy"
                    className="w-full h-full min-h-[380px] object-cover"
                  />
                  {/* Diagonal wrap stripe overlay */}
                  <div
                    className={`absolute inset-y-0 w-40 opacity-70 ${flip ? "-right-10" : "-left-10"} ${s.ink === "text-white" ? "bg-white/15" : "bg-black/20"}`}
                    style={{ transform: "skewX(-14deg)" }}
                  />
                </div>

                {/* Copy panel */}
                <div className={`lg:col-span-5 px-6 md:px-10 py-10 md:py-16 flex flex-col justify-center relative ${flip ? "lg:order-1" : ""}`}>
                  {/* Race number sticker floating in corner */}
                  <div className={`absolute top-8 ${flip ? "right-8" : "left-8"} lg:${flip ? "-left-12" : "-right-12"} z-10 hidden lg:block`}>
                    <span className={`lv-race-num ${s.num}`}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <span className={`font-anton text-xs tracking-[0.28em] uppercase ${s.accent}`}>
                      Grid P{i + 1} · {c.spec || "Kat. B"}
                    </span>
                    <span className={`flex-1 h-px ${s.ink === "text-white" ? "bg-white/30" : "bg-[#0f1419]/30"}`} />
                  </div>

                  <h3 className="font-anton text-5xl md:text-6xl uppercase leading-[0.88] tracking-tight">
                    {c.name}
                  </h3>

                  <p className={`mt-6 font-mano text-lg leading-relaxed max-w-md ${s.ink === "text-white" ? "text-white/80" : "text-[#3a4553]"}`}>
                    {c.description_de}
                  </p>

                  <div className="mt-8 flex items-center gap-3">
                    <span className={`w-14 h-3 ${s.ink === "text-white" ? "lv-tape" : "lv-tape-red"}`} />
                    <span className={`font-script text-2xl leading-none ${s.accent}`}>
                      safe ride
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
