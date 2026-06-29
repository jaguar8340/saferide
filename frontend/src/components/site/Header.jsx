import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";

const sections = [
  { id: "about", key: "about" },
  { id: "services", key: "services" },
  { id: "fleet", key: "fleet" },
  { id: "pricing", key: "pricing" },
  { id: "gallery", key: "gallery" },
  { id: "reviews", key: "reviews" },
];

export default function Header() {
  const { t, lang, setLang } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (e, id) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setOpen(false);
  };

  return (
    <header
      data-testid="site-header"
      className="fixed top-4 md:top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-6xl"
    >
      <div
        className={`flex items-center justify-between gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-full transition-all duration-300 ${
          scrolled
            ? "bg-white/90 backdrop-blur-xl border-2 border-[#0a0a0a]/10 shadow-[0_10px_40px_rgba(0,0,0,0.08)]"
            : "bg-white/70 backdrop-blur-md border-2 border-white/50"
        }`}
      >
        <a
          href="#top"
          data-testid="logo-link"
          onClick={(e) => handleNavClick(e, "top")}
          className="flex items-center gap-2 pl-3 md:pl-4 shrink-0"
        >
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#0033ff] animate-pulse" />
          <span className="font-display font-black tracking-tighter text-lg md:text-xl uppercase">
            Safe<span className="text-[#0033ff]">Ride</span>
          </span>
        </a>

        <nav className="hidden lg:flex items-center gap-6">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => handleNavClick(e, s.id)}
              data-testid={`nav-${s.id}`}
              className="text-[11px] font-bold tracking-[0.15em] uppercase text-[#0a0a0a]/70 hover:text-[#0033ff] transition-colors"
            >
              {t.nav[s.key]}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center bg-[#0a0a0a]/5 rounded-full p-0.5">
            <button
              onClick={() => setLang("de")}
              data-testid="lang-de"
              className={`px-3 py-1 text-[11px] font-bold tracking-widest uppercase rounded-full transition-all ${
                lang === "de"
                  ? "bg-[#0033ff] text-[#ccff00] shadow-sm"
                  : "text-[#0a0a0a]/60 hover:text-[#0a0a0a]"
              }`}
            >
              DE
            </button>
            <button
              onClick={() => setLang("en")}
              data-testid="lang-en"
              className={`px-3 py-1 text-[11px] font-bold tracking-widest uppercase rounded-full transition-all ${
                lang === "en"
                  ? "bg-[#0033ff] text-[#ccff00] shadow-sm"
                  : "text-[#0a0a0a]/60 hover:text-[#0a0a0a]"
              }`}
            >
              EN
            </button>
          </div>
          <a
            href="#contact"
            onClick={(e) => handleNavClick(e, "contact")}
            data-testid="header-cta"
            className="hidden md:inline-flex items-center gap-2 bg-[#0033ff] text-[#ccff00] rounded-full px-5 py-2 text-[11px] font-extrabold uppercase tracking-widest hover:bg-[#0022cc] transition-all hover:scale-105"
          >
            {t.nav.ctaShort}
          </a>
          <button
            onClick={() => setOpen((o) => !o)}
            data-testid="mobile-menu-toggle"
            className="lg:hidden p-2 rounded-full hover:bg-[#0a0a0a]/5 transition-colors"
            aria-label="menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div
          data-testid="mobile-menu"
          className="lg:hidden mt-3 bg-white border-2 border-[#0a0a0a]/10 rounded-3xl p-5 flex flex-col gap-2 shadow-xl"
        >
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => handleNavClick(e, s.id)}
              data-testid={`mobile-nav-${s.id}`}
              className="text-sm font-bold tracking-wider uppercase text-[#0a0a0a]/80 py-1"
            >
              {t.nav[s.key]}
            </a>
          ))}
          <div className="flex items-center gap-2 pt-3 border-t border-[#0a0a0a]/10 mt-2">
            <button
              onClick={() => setLang("de")}
              data-testid="mobile-lang-de"
              className={`px-3 py-1.5 text-xs font-bold tracking-widest uppercase rounded-full ${
                lang === "de"
                  ? "bg-[#0033ff] text-[#ccff00]"
                  : "border-2 border-[#0a0a0a]/15 text-[#0a0a0a]/60"
              }`}
            >
              DE
            </button>
            <button
              onClick={() => setLang("en")}
              data-testid="mobile-lang-en"
              className={`px-3 py-1.5 text-xs font-bold tracking-widest uppercase rounded-full ${
                lang === "en"
                  ? "bg-[#0033ff] text-[#ccff00]"
                  : "border-2 border-[#0a0a0a]/15 text-[#0a0a0a]/60"
              }`}
            >
              EN
            </button>
          </div>
          <a
            href="#contact"
            onClick={(e) => handleNavClick(e, "contact")}
            data-testid="mobile-header-cta"
            className="bg-[#0033ff] text-[#ccff00] rounded-full px-5 py-3 text-xs font-extrabold uppercase tracking-widest text-center mt-2"
          >
            {t.nav.ctaShort}
          </a>
        </div>
      )}
    </header>
  );
}
