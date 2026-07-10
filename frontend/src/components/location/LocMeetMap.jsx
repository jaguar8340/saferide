import { MapPin } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";
import Editable from "@/components/edit/Editable";
import EditableImage from "@/components/edit/EditableImage";

export default function LocMeetMap({ loc, updateField }) {
  const { lang, pick } = useLang();
  const { editMode } = useEdit();

  return (
    <section className="section-pad bg-white border-y border-[#e2e8f0]">
      <div className="container-x px-5 md:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Info column */}
          <div className="lg:col-span-4">
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

          {/* Map + Photo side-by-side */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {/* Map */}
            <div
              className="relative rounded-3xl overflow-hidden border border-[#e2e8f0] h-[300px] md:h-[440px] bg-[#fbf9f6]"
              data-testid="loc-meet-map-wrap"
            >
              {loc.map_embed_url ? (
                <iframe
                  src={loc.map_embed_url}
                  title={`Karte ${loc.name}`}
                  data-testid="loc-map-iframe"
                  className="w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-medium text-[#94a3b8] text-center px-6">
                  {editMode
                    ? "Google-Maps-Embed-URL im Info-Feld links einfügen"
                    : "Karte folgt in Kürze"}
                </div>
              )}
              <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-white/95 backdrop-blur-sm border border-[#e2e8f0] rounded-full px-3 py-1.5 text-[10px] font-semibold tracking-widest uppercase text-[#0f172a]">
                <MapPin size={11} className="text-[#ff5a36]" /> Karte
              </span>
            </div>

            {/* Photo of meeting point */}
            <div
              className="relative rounded-3xl overflow-hidden border border-[#e2e8f0] h-[300px] md:h-[440px] bg-[#fbf9f6]"
              data-testid="loc-meet-photo-wrap"
            >
              {loc.meet_image_url || editMode ? (
                <EditableImage
                  path="meet_image_url"
                  src={loc.meet_image_url}
                  alt={`Treffpunkt ${loc.name}`}
                  onUpdate={(url) => updateField("meet_image_url", url)}
                  className="block w-full h-full"
                  imgClassName="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-medium text-[#94a3b8] text-center px-6">
                  Foto folgt in Kürze
                </div>
              )}
              <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-white/95 backdrop-blur-sm border border-[#e2e8f0] rounded-full px-3 py-1.5 text-[10px] font-semibold tracking-widest uppercase text-[#0f172a]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff5a36]" /> Treffpunkt
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
