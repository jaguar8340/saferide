import { ArrowRight, Phone } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";

export default function Hero({ data }) {
  const { lang, t, pick } = useLang();
  if (!data) return null;

  const handleScroll = (id) => (e) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="top"
      data-testid="hero-section"
      className="relative min-h-[100vh] w-full overflow-hidden flex items-end"
    >
      <img
        src={data.image_url}
        alt="Sports car"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 hero-vignette" />
      <div className="absolute inset-0 noise" />

      <div className="relative z-10 w-full px-6 md:px-12 lg:px-20 pb-20 md:pb-28">
        <div className="max-w-5xl">
          <div className="overline mb-6 animate-fade-up">
            {pick(data.overline_de, data.overline_en)}
          </div>
          <h1
            className="font-display font-black uppercase leading-[0.88] tracking-tighter text-white animate-fade-up"
            style={{ fontSize: "clamp(2.5rem, 8vw, 7rem)" }}
          >
            {pick(data.title_de, data.title_en)}
            <br />
            <span className="text-[#FF2E00]">
              {pick(data.highlight_de, data.highlight_en)}
            </span>
          </h1>
          <p
            className="mt-7 max-w-2xl text-base md:text-lg leading-relaxed text-white/75 animate-fade-up"
            style={{ animationDelay: "120ms" }}
          >
            {pick(data.subtitle_de, data.subtitle_en)}
          </p>
          <div
            className="mt-9 flex flex-wrap items-center gap-4 animate-fade-up"
            style={{ animationDelay: "200ms" }}
          >
            <a
              href="#contact"
              onClick={handleScroll("contact")}
              data-testid="hero-cta-primary"
              className="btn-primary"
              style={{ borderRadius: 2 }}
            >
              {pick(data.cta_primary_de, data.cta_primary_en)}
              <ArrowRight size={16} />
            </a>
            <a
              href="#services"
              onClick={handleScroll("services")}
              data-testid="hero-cta-secondary"
              className="btn-ghost"
              style={{ borderRadius: 2 }}
            >
              {pick(data.cta_secondary_de, data.cta_secondary_en)}
            </a>
          </div>
        </div>

        <div className="mt-14 flex items-center justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-3 text-white/70">
            <div className="w-12 h-px bg-white/30" />
            <span className="text-[10px] tracking-[0.3em] uppercase">
              {t.hero.scroll}
            </span>
          </div>
          <a
            href="tel:+41795850085"
            data-testid="hero-phone"
            className="flex items-center gap-3 text-white/80 hover:text-white transition-colors"
          >
            <Phone size={16} className="text-[#FF2E00]" />
            <span className="font-display font-bold tracking-tight text-sm md:text-base">
              079 585 00 85
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
