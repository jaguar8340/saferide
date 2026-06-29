import { useLang } from "@/contexts/LanguageContext";

export default function Gallery({ items }) {
  const { pick, t } = useLang();
  if (!items?.length) return null;

  return (
    <section
      id="gallery"
      data-testid="gallery-section"
      className="section bg-[#0a0a0a]"
    >
      <div className="mb-12">
        <div className="overline mb-4">{t.gallery.overline}</div>
        <h2 className="font-display font-bold uppercase tracking-tight text-3xl md:text-5xl lg:text-6xl leading-[0.95]">
          {t.gallery.title}
        </h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {items.map((g, i) => (
          <div
            key={g.id || i}
            data-testid={`gallery-item-${i}`}
            className={`group relative overflow-hidden ${
              i % 5 === 0 ? "col-span-2 row-span-2" : ""
            }`}
            style={{ borderRadius: 2 }}
          >
            <img
              src={g.image_url}
              alt={pick(g.caption_de, g.caption_en) || "gallery"}
              className="w-full h-full min-h-[180px] md:min-h-[220px] object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            {(g.caption_de || g.caption_en) && (
              <div className="absolute bottom-3 left-3 text-xs text-white/90 opacity-0 group-hover:opacity-100 transition-opacity tracking-wide">
                {pick(g.caption_de, g.caption_en)}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
