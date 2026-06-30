import { motion } from "framer-motion";
import { useLang } from "@/contexts/LanguageContext";
import Editable from "@/components/edit/Editable";
import EditableImage from "@/components/edit/EditableImage";

export default function Fleet({ items }) {
  const { lang, pick, t } = useLang();

  return (
    <section
      id="fleet"
      data-testid="fleet-section"
      className="section-pad bg-[#0f172a] text-white"
    >
      <div className="container-x">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="dot-accent" />
              <span className="text-xs font-semibold tracking-[0.18em] uppercase text-white/65">
                {t.fleet.overline}
              </span>
            </div>
            <h2
              className="font-display leading-[0.98] tracking-tight max-w-2xl"
              style={{ fontSize: "clamp(2.1rem, 4.4vw, 4rem)" }}
            >
              {t.fleet.title.split(" ").map((w, i, arr) =>
                i === arr.length - 1 ? (
                  <span key={i} className="font-serif-i text-[#ff5a36] font-normal">{w}</span>
                ) : (
                  <span key={i}>{w} </span>
                ),
              )}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {items.map((f, i) => (
            <motion.div
              key={f.id || i}
              data-testid={`fleet-card-${i}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              className="group bg-[#1e293b] rounded-3xl overflow-hidden border border-white/10 hover:border-[#ff5a36] transition-colors"
            >
              <div className="relative h-72 overflow-hidden">
                <EditableImage
                  path={`fleet.${i}.image_url`}
                  src={f.image_url}
                  alt={f.name}
                  className="block w-full h-full"
                  imgClassName="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute top-4 left-4 right-4 flex items-start justify-between pointer-events-none">
                  <Editable
                    path={`fleet.${i}.spec`}
                    value={f.spec}
                    className="tag tag-accent pointer-events-auto"
                  />
                  <span className="text-xs font-semibold text-white/70 tabular-nums bg-black/40 backdrop-blur px-2.5 py-1 rounded-full">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
              </div>
              <div className="p-6 md:p-7">
                <Editable
                  path={`fleet.${i}.name`}
                  value={f.name}
                  as="h3"
                  className="font-display text-2xl md:text-3xl tracking-tight block"
                />
                <Editable
                  path={`fleet.${i}.description_${lang}`}
                  value={pick(f.description_de, f.description_en)}
                  as="p"
                  multiline
                  className="mt-3 text-white/70 leading-relaxed font-medium text-sm block"
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
