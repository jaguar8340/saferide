import { ArrowRight, Phone, Star, MapPin } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";

export default function Hero({ data }) {
  const { pick, t } = useLang();
  if (!data) return null;

  const scroll = (id) => (e) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const highlight = pick(data.highlight_de, data.highlight_en) || "";
  const highlightParts = highlight.replace(/\./g, "").trim().split(/\s+/);

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
              <span className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]">
                {pick(data.overline_de, data.overline_en)}
              </span>
            </div>

            <h1
              className="font-display leading-[0.92] text-[#0f172a]"
              style={{ fontSize: "clamp(2.6rem, 6.8vw, 6.5rem)" }}
            >
              {pick(data.title_de, data.title_en)}
              <br />
              {highlightParts.map((w, i) => (
                <span key={i}>
                  {i === 1 ? (
                    <span className="font-serif-i text-[#ff5a36] font-normal">
                      {w}
                    </span>
                  ) : (
                    <span>{w}</span>
                  )}
                  {i < highlightParts.length - 1 ? " " : "."}
                </span>
              ))}
            </h1>

            <p className="mt-7 max-w-xl text-lg md:text-xl text-[#475569] leading-relaxed font-medium">
              {pick(data.subtitle_de, data.subtitle_en)}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href="#contact"
                onClick={scroll("contact")}
                data-testid="hero-cta-primary"
                className="btn-accent"
              >
                {pick(data.cta_primary_de, data.cta_primary_en)}
                <ArrowRight size={16} />
              </a>
              <a
                href="#services"
                onClick={scroll("services")}
                data-testid="hero-cta-secondary"
                className="btn-ghost"
              >
                {pick(data.cta_secondary_de, data.cta_secondary_en)}
              </a>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-[#475569]">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={13} className="text-[#ff5a36]" fill="#ff5a36" />
                  ))}
                </div>
                <span className="font-semibold text-[#0f172a]">5.0</span>
                <span>· {t.reviews.rating}</span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <MapPin size={14} className="text-[#ff5a36]" />
                ZH · SZ · SG · GR
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl overflow-hidden border border-[#e2e8f0]">
              <img
                src={data.image_url}
                alt="Safe Ride"
                className="w-full h-[440px] md:h-[540px] object-cover"
              />
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="tag tag-accent">Live</span>
                <span className="tag tag-light">Saison 2026</span>
              </div>
            </div>

            <a
              href="tel:+41795850085"
              data-testid="hero-phone"
              className="absolute -bottom-5 left-5 right-5 md:left-auto md:-right-3 md:max-w-[260px] flex items-center gap-3 bg-[#0f172a] text-white rounded-2xl p-4 hover:bg-[#ff5a36] transition-colors group"
            >
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-[#ff5a36] group-hover:bg-white text-white group-hover:text-[#ff5a36] transition-colors shrink-0">
                <Phone size={17} />
              </span>
              <div className="flex flex-col leading-tight">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
                  Call Nadine
                </span>
                <span className="font-semibold tracking-tight">
                  079 585 00 85
                </span>
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
