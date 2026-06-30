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
    const onScroll = () => setScrolled(window.scrollY > 20);
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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#fbf9f6]/90 backdrop-blur-md border-b border-[#e2e8f0]"
          : "bg-transparent"
      }`}
    >
      <div className="container-x flex items-center justify-between px-5 md:px-8 lg:px-12 h-16 md:h-18">
        <a
          href="#top"
          data-testid="logo-link"
          onClick={(e) => handleNavClick(e, "top")}
          className="flex items-center gap-2"
        >
          <span className="dot-accent" />
          <span className="font-display text-xl tracking-tight">
            Safe<span className="font-serif-i text-[#ff5a36]">Ride</span>
          </span>
        </a>

        <nav className="hidden lg:flex items-center gap-7">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => handleNavClick(e, s.id)}
              data-testid={`nav-${s.id}`}
              className="text-sm font-semibold text-[#475569] hover:text-[#0f172a] transition-colors"
            >
              {t.nav[s.key]}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1 text-xs font-semibold text-[#94a3b8]">
            <button
              onClick={() => setLang("de")}
              data-testid="lang-de"
              className={`px-1.5 transition-colors ${lang === "de" ? "text-[#0f172a]" : "hover:text-[#0f172a]"}`}
            >
              DE
            </button>
            <span className="opacity-40">/</span>
            <button
              onClick={() => setLang("en")}
              data-testid="lang-en"
              className={`px-1.5 transition-colors ${lang === "en" ? "text-[#0f172a]" : "hover:text-[#0f172a]"}`}
            >
              EN
            </button>
          </div>
          <a
            href="#contact"
            onClick={(e) => handleNavClick(e, "contact")}
            data-testid="header-cta"
            className="hidden md:inline-flex btn-accent !py-2.5 !px-4 !text-sm"
          >
            {t.nav.ctaShort}
          </a>
          <button
            onClick={() => setOpen((o) => !o)}
            data-testid="mobile-menu-toggle"
            className="lg:hidden p-2 rounded-full hover:bg-[#0f172a]/5"
            aria-label="menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div
          data-testid="mobile-menu"
          className="lg:hidden bg-[#fbf9f6] border-t border-[#e2e8f0] px-5 py-6 flex flex-col gap-3"
        >
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => handleNavClick(e, s.id)}
              data-testid={`mobile-nav-${s.id}`}
              className="text-base font-semibold text-[#0f172a]"
            >
              {t.nav[s.key]}
            </a>
          ))}
          <div className="flex items-center gap-3 pt-3 border-t border-[#e2e8f0] text-sm font-semibold text-[#94a3b8]">
            <button
              onClick={() => setLang("de")}
              data-testid="mobile-lang-de"
              className={lang === "de" ? "text-[#0f172a]" : ""}
            >
              DE
            </button>
            <span className="opacity-40">/</span>
            <button
              onClick={() => setLang("en")}
              data-testid="mobile-lang-en"
              className={lang === "en" ? "text-[#0f172a]" : ""}
            >
              EN
            </button>
          </div>
          <a
            href="#contact"
            onClick={(e) => handleNavClick(e, "contact")}
            data-testid="mobile-header-cta"
            className="btn-accent justify-center mt-2"
          >
            {t.nav.ctaShort}
          </a>
        </div>
      )}
    </header>
  );
}
