import { motion } from "framer-motion";
import { useLang } from "@/contexts/LanguageContext";
import Editable from "@/components/edit/Editable";

export default function LocPrices({ loc, updateField }) {
  const { lang, pick } = useLang();
  const priceItems = loc.price_items || [];

  return (
    <section className="section-pad bg-[#fbf9f6]">
      <div className="container-x px-5 md:px-8 lg:px-12">
        <div className="max-w-2xl mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="dot-accent" />
            <span className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]">
              CHF · Preise
            </span>
          </div>
          <Editable
            path={`price_title_${lang}`}
            value={pick(loc.price_title_de, loc.price_title_en)}
            onUpdate={updateField}
            as="h2"
            className="font-display leading-[0.98] tracking-tight block"
            style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
          />
          <Editable
            path={`price_intro_${lang}`}
            value={pick(loc.price_intro_de, loc.price_intro_en)}
            onUpdate={updateField}
            as="p"
            multiline
            className="mt-4 text-base text-[#475569] leading-relaxed font-medium block"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {priceItems.map((p, i) => (
            <motion.div
              key={p.id || i}
              data-testid={`loc-price-${i}`}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className={`rounded-3xl p-7 md:p-8 border ${
                i === 1
                  ? "bg-[#0f172a] text-white border-[#0f172a]"
                  : "bg-white text-[#0f172a] border-[#e2e8f0]"
              }`}
            >
              <Editable
                path={`price_items.${i}.label_${lang}`}
                value={pick(p.label_de, p.label_en)}
                onUpdate={updateField}
                as="div"
                className="text-sm font-semibold opacity-80 mb-3 block"
              />
              <Editable
                path={`price_items.${i}.price`}
                value={p.price}
                onUpdate={updateField}
                as="div"
                className="font-display text-5xl tracking-tighter block"
              />
            </motion.div>
          ))}
        </div>
        <Editable
          path={`price_note_${lang}`}
          value={pick(loc.price_note_de, loc.price_note_en)}
          onUpdate={updateField}
          as="p"
          multiline
          className="mt-8 text-sm text-[#475569] max-w-3xl leading-relaxed font-medium block"
        />
      </div>
    </section>
  );
}
