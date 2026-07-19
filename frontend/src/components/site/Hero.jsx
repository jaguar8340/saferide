import { ArrowRight, Phone, Star, MapPin } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";
import Editable from "@/components/edit/Editable";
import EditableImage from "@/components/edit/EditableImage";

export default function Hero({ data }) {
  const { lang, pick } = useLang();
  const { content } = useEdit();
  if (!data) return null;

  const phone = content?.contact?.phone || "079 585 00 85";

  const scroll = (id) => (e) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="top"
      data-testid="hero-section"
      className="relative bg-[#fbf9f6] pt-28 md:pt-32 pb-12 md:pb-20 overflow-hidden"
    >
      <div className="container-x px-5 md:px-8 lg:px-12 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-2 mb-6">
              <span className="dot-accent animate-pulse-accent" />
              <Editable
                path={`hero.overline_${lang}`}
                value={pick(data.overline_de, data.overline_en)}
                className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]"
              />
            </div>

            <h1
              className="font-display leading-[0.92] text-[#0f172a]"
              style={{ fontSize: "clamp(2.6rem, 6.8vw, 6.5rem)" }}
            >
              <Editable
                path={`hero.title_${lang}`}
                value={pick(data.title_de, data.title_en)}
                as="span"
                className="inline-block"
              />
              <br />
              <Editable
                path={`hero.highlight_${lang}`}
                value={pick(data.highlight_de, data.highlight_en)}
                as="span"
                className="inline-block font-serif-i text-[#dc2626] font-normal"
              />
            </h1>

            <Editable
              path={`hero.subtitle_${lang}`}
              value={pick(data.subtitle_de, data.subtitle_en)}
              as="p"
              multiline
              className="mt-7 max-w-xl text-lg md:text-xl text-[#475569] leading-relaxed font-medium"
            />

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href="#contact"
                onClick={scroll("contact")}
                data-testid="hero-cta-primary"
                className="btn-accent"
              >
                <Editable
                  path={`hero.cta_primary_${lang}`}
                  value={pick(data.cta_primary_de, data.cta_primary_en)}
                />
                <ArrowRight size={16} />
              </a>
              <a
                href="#services"
                onClick={scroll("services")}
                data-testid="hero-cta-secondary"
                className="btn-ghost"
              >
                <Editable
                  path={`hero.cta_secondary_${lang}`}
                  value={pick(data.cta_secondary_de, data.cta_secondary_en)}
                />
              </a>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-[#475569]">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={13} className="text-[#ff5a36]" fill="#ff5a36" />
                  ))}
                </div>
                <Editable
                  path="hero.rating_value"
                  value={data.rating_value}
                  className="font-semibold text-[#0f172a]"
                />
                <span>·</span>
                <Editable
                  path={`hero.rating_label_${lang}`}
                  value={pick(data.rating_label_de, data.rating_label_en)}
                />
              </div>
              <div className="flex items-center gap-2 font-medium">
                <MapPin size={14} className="text-[#ff5a36]" />
                <Editable path="hero.regions" value={data.regions} />
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <EditableImage
              path="hero.image_url"
              src={data.image_url}
              alt="Safe Ride"
              loading="eager"
              fetchPriority="high"
              className="block rounded-3xl overflow-hidden border border-[#e2e8f0]"
              imgClassName="w-full h-[440px] md:h-[540px] object-cover"
            />
            <div className="absolute top-4 left-4 flex gap-2 pointer-events-none">
              <Editable
                path={`hero.tag1_${lang}`}
                value={pick(data.tag1_de, data.tag1_en)}
                className="tag tag-accent pointer-events-auto"
              />
              <Editable
                path={`hero.tag2_${lang}`}
                value={pick(data.tag2_de, data.tag2_en)}
                className="tag tag-light pointer-events-auto"
              />
            </div>

            <a
              href={`tel:${phone.replace(/\s/g, "")}`}
              data-testid="hero-phone"
              className="absolute -bottom-5 left-5 right-5 md:left-auto md:-right-3 md:max-w-[260px] flex items-center gap-3 bg-[#0f172a] text-white rounded-2xl p-4 hover:bg-[#ff5a36] transition-colors group"
            >
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-[#ff5a36] group-hover:bg-white text-white group-hover:text-[#ff5a36] transition-colors shrink-0">
                <Phone size={17} />
              </span>
              <div className="flex flex-col leading-tight">
                <Editable
                  path={`hero.call_label_${lang}`}
                  value={pick(data.call_label_de, data.call_label_en)}
                  className="text-[10px] font-semibold uppercase tracking-widest text-white/60"
                />
                <span className="font-semibold tracking-tight">{phone}</span>
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
