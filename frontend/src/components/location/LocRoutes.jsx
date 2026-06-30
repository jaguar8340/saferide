import { motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";
import Editable from "@/components/edit/Editable";

export default function LocRoutes({ loc, updateField }) {
  const { lang, pick } = useLang();
  const { editMode } = useEdit();
  const routes = loc.exam_routes || [];

  const addRoute = () => {
    const list = loc.exam_routes || [];
    updateField("exam_routes", [
      ...list,
      { id: `r${Date.now()}`, text_de: "Neue Strecke", text_en: "New route", description_de: "", description_en: "" },
    ]);
  };
  const removeRoute = (id) => () => {
    const next = (loc.exam_routes || []).filter((r) => r.id !== id);
    updateField("exam_routes", next);
  };

  return (
    <section className="section-pad bg-[#fbf9f6]">
      <div className="container-x px-5 md:px-8 lg:px-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="dot-accent" />
              <span className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]">
                Routes
              </span>
            </div>
            <Editable
              path={`exam_routes_title_${lang}`}
              value={pick(loc.exam_routes_title_de, loc.exam_routes_title_en)}
              onUpdate={updateField}
              as="h2"
              className="font-display leading-[0.98] tracking-tight block"
              style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
            />
            <Editable
              path={`exam_routes_intro_${lang}`}
              value={pick(loc.exam_routes_intro_de, loc.exam_routes_intro_en)}
              onUpdate={updateField}
              as="p"
              multiline
              className="mt-4 max-w-2xl text-base text-[#475569] leading-relaxed font-medium block"
            />
          </div>
          {editMode && (
            <button onClick={addRoute} data-testid="loc-route-add" className="btn-accent text-sm py-2.5 px-4">
              <Plus size={14} /> Strecke
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {routes.map((r, i) => (
            <motion.div
              key={r.id}
              data-testid={`loc-route-${i}`}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: (i % 2) * 0.04 }}
              className="relative bg-white border border-[#e2e8f0] rounded-2xl p-5"
            >
              <div className="flex items-start gap-4">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#0f172a] text-white font-display text-base shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Editable
                  path={`exam_routes.${i}.text_${lang}`}
                  value={pick(r.text_de, r.text_en)}
                  onUpdate={updateField}
                  as="p"
                  className="text-base font-semibold leading-snug text-[#0f172a] flex-1 block"
                />
                {editMode && (
                  <button
                    onClick={removeRoute(r.id)}
                    data-testid={`loc-route-remove-${i}`}
                    className="text-[#94a3b8] hover:text-[#ff5a36] transition-colors"
                    aria-label="Strecke entfernen"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {(editMode || pick(r.description_de, r.description_en)) && (
                <Editable
                  path={`exam_routes.${i}.description_${lang}`}
                  value={pick(r.description_de, r.description_en)}
                  onUpdate={updateField}
                  as="p"
                  multiline
                  placeholder={lang === "de" ? "Beschreibung der Strecke …" : "Route description …"}
                  className="mt-3 pl-[3.25rem] text-sm text-[#475569] leading-relaxed font-medium block"
                />
              )}
            </motion.div>
          ))}
        </div>

        <div className="mt-10" data-testid="loc-routes-outro">
          <Editable
            path={`exam_routes_outro_${lang}`}
            value={pick(loc.exam_routes_outro_de, loc.exam_routes_outro_en)}
            onUpdate={updateField}
            as="p"
            multiline
            placeholder={lang === "de" ? "Ergänzender Text zu den Prüfungsstrecken …" : "Additional text about the exam routes …"}
            className="text-base text-[#475569] leading-relaxed font-medium block"
          />
        </div>
      </div>
    </section>
  );
}
