import { MapPin } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";
import Editable from "@/components/edit/Editable";

export default function LocMeetMap({ loc, updateField }) {
  const { lang, pick } = useLang();
  const { editMode } = useEdit();

  return (
    <section className="section-pad bg-white border-y border-[#e2e8f0]">
      <div className="container-x px-5 md:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={14} className="text-[#ff5a36]" />
              <span className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]">
                Meet
              </span>
            </div>
            <Editable
              path={`meet_title_${lang}`}
              value={pick(loc.meet_title_de, loc.meet_title_en)}
              onUpdate={updateField}
              as="h2"
              className="font-display leading-[0.98] tracking-tight block"
              style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)" }}
            />
            <Editable
              path={`meet_address_${lang}`}
              value={pick(loc.meet_address_de, loc.meet_address_en)}
              onUpdate={updateField}
              as="div"
              className="mt-6 font-display text-xl md:text-2xl tracking-tight text-[#ff5a36] block"
            />
            <Editable
              path={`meet_description_${lang}`}
              value={pick(loc.meet_description_de, loc.meet_description_en)}
              onUpdate={updateField}
              as="p"
              multiline
              className="mt-4 text-base text-[#475569] leading-relaxed font-medium block"
            />
            {editMode && (
              <div className="mt-6">
                <label className="text-[10px] font-semibold tracking-widest uppercase text-[#94a3b8]">
                  Google Maps Embed URL
                </label>
                <input
                  type="text"
                  defaultValue={loc.map_embed_url || ""}
                  onBlur={(e) => updateField("map_embed_url", e.target.value)}
                  placeholder="https://www.google.com/maps?q=…&output=embed"
                  data-testid="loc-map-url"
                  className="mt-1 w-full text-xs bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
                />
              </div>
            )}
          </div>
          <div className="lg:col-span-7">
            <div className="rounded-3xl overflow-hidden border border-[#e2e8f0] h-[360px] md:h-[440px] bg-[#fbf9f6]">
              {loc.map_embed_url && (
                <iframe
                  src={loc.map_embed_url}
                  title={`Karte ${loc.name}`}
                  data-testid="loc-map-iframe"
                  className="w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
