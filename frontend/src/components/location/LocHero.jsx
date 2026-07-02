import { Link } from "react-router-dom";
import { ArrowRight, Phone } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import Editable from "@/components/edit/Editable";
import EditableImage from "@/components/edit/EditableImage";

export default function LocHero({ loc, updateField, phone }) {
  const { lang, pick } = useLang();
  return (
    <section className="relative pt-16 md:pt-20 pb-12 md:pb-16 overflow-hidden">
      <div className="container-x px-5 md:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-2 mb-5">
              <span className="dot-accent animate-pulse-accent" />
              <Editable
                path={`hero_overline_${lang}`}
                value={pick(loc.hero_overline_de, loc.hero_overline_en)}
                onUpdate={updateField}
                className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]"
              />
            </div>
            <h1
              className="font-display leading-[0.92] tracking-tight"
              style={{ fontSize: "clamp(2.6rem, 6.5vw, 6rem)" }}
            >
              <Editable
                path={`hero_title_${lang}`}
                value={pick(loc.hero_title_de, loc.hero_title_en)}
                onUpdate={updateField}
                as="span"
                className="inline-block"
              />
            </h1>
            <Editable
              path={`hero_highlight_${lang}`}
              value={pick(loc.hero_highlight_de, loc.hero_highlight_en)}
              onUpdate={updateField}
              as="p"
              className="mt-4 inline-flex items-center gap-2 bg-white border border-[#e2e8f0] rounded-full px-4 py-2 text-sm font-semibold text-[#475569]"
            />
            <Editable
              path={`hero_subtitle_${lang}`}
              value={pick(loc.hero_subtitle_de, loc.hero_subtitle_en)}
              onUpdate={updateField}
              as="p"
              multiline
              className="mt-6 max-w-2xl text-lg md:text-xl text-[#475569] leading-relaxed font-medium block"
            />

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/#contact" data-testid="loc-cta-primary" className="btn-accent">
                {lang === "de" ? "Lektion anfragen" : "Request lesson"}
                <ArrowRight size={16} />
              </Link>
              <a href={`tel:${phone.replace(/\s/g, "")}`} className="btn-ghost">
                <Phone size={14} /> {phone}
              </a>
            </div>
          </div>
          <div className="lg:col-span-5">
            <EditableImage
              path="hero_image_url"
              src={loc.hero_image_url}
              onUpdate={updateField}
              alt={loc.name}
              className="block rounded-3xl overflow-hidden border border-[#e2e8f0]"
              imgClassName="w-full h-[320px] md:h-[460px] object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
