import { useLang } from "@/contexts/LanguageContext";

export default function Fleet({ items }) {
  const { pick, t } = useLang();

  return (
    <section
      id="fleet"
      data-testid="fleet-section"
      className="section bg-[#0a0a0a]"
    >
      <div className="mb-12">
        <div className="overline mb-4">{t.fleet.overline}</div>
        <h2 className="font-display font-bold uppercase tracking-tight text-3xl md:text-5xl lg:text-6xl leading-[0.95] max-w-3xl">
          {t.fleet.title}
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {items.map((f, i) => (
          <div
            key={f.id || i}
            data-testid={`fleet-card-${i}`}
            className="group relative overflow-hidden card-surface"
            style={{ borderRadius: 2 }}
          >
            <div className="relative h-72 md:h-80 overflow-hidden">
              <img
                src={f.image_url}
                alt={f.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <div className="text-[10px] tracking-[0.3em] uppercase text-[#FF2E00] font-bold">
                  {f.spec}
                </div>
                <div className="font-display font-black text-2xl md:text-3xl mt-1">
                  {f.name}
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-white/65 text-sm leading-relaxed">
                {pick(f.description_de, f.description_en)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
