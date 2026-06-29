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
  { id: "contact", key: "contact" },
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
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setOpen(false);
  };

  return (
    <header
      data-testid="site-header"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "py-3" : "py-5"
      }`}
    >
      <div
        className={`mx-3 md:mx-6 flex items-center justify-between px-5 md:px-7 py-3 md:py-3.5 ${
          scrolled ? "glass" : "bg-transparent"
        } transition-all duration-300`}
        style={{ borderRadius: 2 }}
      >
        <a
          href="#top"
          data-testid="logo-link"
          onClick={(e) => handleNavClick(e, "top")}
          className="flex items-center gap-2 group"
        >
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: "#FF2E00", boxShadow: "0 0 10px #FF2E00" }}
          />
          <span className="font-display font-black tracking-tighter text-xl uppercase">
            Safe<span className="text-[#FF2E00]">Ride</span>
          </span>
        </a>

        <nav className="hidden lg:flex items-center gap-7">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => handleNavClick(e, s.id)}
              data-testid={`nav-${s.id}`}
              className="text-xs font-bold tracking-[0.18em] uppercase text-white/70 hover:text-white transition-colors"
            >
              {t.nav[s.key]}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div
            className="hidden md:flex items-center gap-1 border border-white/15 px-1 py-1"
            style={{ borderRadius: 2 }}
          >
            <button
              onClick={() => setLang("de")}
              data-testid="lang-de"
              className={`px-2.5 py-1 text-xs font-bold tracking-widest uppercase transition-colors ${
                lang === "de" ? "bg-[#FF2E00] text-white" : "text-white/70 hover:text-white"
              }`}
            >
              DE
            </button>
            <button
              onClick={() => setLang("en")}
              data-testid="lang-en"
              className={`px-2.5 py-1 text-xs font-bold tracking-widest uppercase transition-colors ${
                lang === "en" ? "bg-[#FF2E00] text-white" : "text-white/70 hover:text-white"
              }`}
            >
              EN
            </button>
          </div>
          <a
            href="#contact"
            onClick={(e) => handleNavClick(e, "contact")}
            data-testid="header-cta"
            className="hidden md:inline-flex btn-primary"
            style={{ borderRadius: 2 }}
          >
            {t.nav.ctaShort}
          </a>
          <button
            onClick={() => setOpen((o) => !o)}
            data-testid="mobile-menu-toggle"
            className="lg:hidden p-2 border border-white/15"
            style={{ borderRadius: 2 }}
            aria-label="menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div
          data-testid="mobile-menu"
          className="lg:hidden mx-3 mt-2 glass p-5 flex flex-col gap-3"
          style={{ borderRadius: 2 }}
        >
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => handleNavClick(e, s.id)}
              data-testid={`mobile-nav-${s.id}`}
              className="text-sm font-bold tracking-widest uppercase text-white/80"
            >
              {t.nav[s.key]}
            </a>
          ))}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => setLang("de")}
              data-testid="mobile-lang-de"
              className={`px-3 py-1.5 text-xs font-bold tracking-widest uppercase ${
                lang === "de" ? "bg-[#FF2E00] text-white" : "border border-white/15 text-white/70"
              }`}
            >
              DE
            </button>
            <button
              onClick={() => setLang("en")}
              data-testid="mobile-lang-en"
              className={`px-3 py-1.5 text-xs font-bold tracking-widest uppercase ${
                lang === "en" ? "bg-[#FF2E00] text-white" : "border border-white/15 text-white/70"
              }`}
            >
              EN
            </button>
          </div>
          <a
            href="#contact"
            onClick={(e) => handleNavClick(e, "contact")}
            data-testid="mobile-header-cta"
            className="btn-primary mt-2 justify-center"
          >
            {t.nav.ctaShort}
          </a>
        </div>
      )}
    </header>
  );
}
