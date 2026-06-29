import { motion } from "framer-motion";
import { useLang } from "@/contexts/LanguageContext";

export default function Fleet({ items }) {
  const { pick, t } = useLang();

  return (
    <section
      id="fleet"
      data-testid="fleet-section"
      className="section-pad bg-[#0a0a0a] text-white overflow-hidden"
    >
      <div className="container-x px-5 md:px-10 lg:px-14">
        <div className="mb-12">
          <div className="eyebrow text-[#ccff00] mb-4">{t.fleet.overline}</div>
          <h2
            className="font-display font-black uppercase tracking-tighter leading-[0.9]"
            style={{ fontSize: "clamp(2.4rem, 5.5vw, 5rem)" }}
          >
            {t.fleet.title}
          </h2>
        </div>
      </div>

      <div className="px-5 md:px-10 lg:px-14 grid grid-cols-1 lg:grid-cols-3 gap-5">
        {items.map((f, i) => (
          <motion.div
            key={f.id || i}
            data-testid={`fleet-card-${i}`}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: i * 0.1 }}
            className="group relative overflow-hidden rounded-3xl border-2 border-white/15 bg-[#141414] hover:border-[#ccff00] transition-colors duration-300"
          >
            <div className="relative h-80 overflow-hidden">
              <img
                src={f.image_url}
                alt={f.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#ccff00]">
                  {f.spec}
                </div>
                <div className="font-display font-black text-3xl md:text-4xl mt-1 uppercase tracking-tighter">
                  {f.name}
                </div>
              </div>
              <div className="absolute top-5 right-5 w-12 h-12 rounded-full bg-[#ccff00] text-[#0a0a0a] font-display font-black flex items-center justify-center text-sm">
                {String(i + 1).padStart(2, "0")}
              </div>
            </div>
            <div className="p-7">
              <p className="text-white/75 leading-relaxed font-medium">
                {pick(f.description_de, f.description_en)}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
