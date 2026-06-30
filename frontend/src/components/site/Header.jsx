import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";

const sections = [
  { id: "about", key: "about" },
  { id: "services", key: "services" },
  { id: "pricing", key: "pricing" },
  { id: "gallery", key: "gallery" },
  { id: "reviews", key: "reviews" },
];

const extraLinks = [
  { to: "/ablauf", label_de: "Ablauf", label_en: "Process" },
  { to: "/vku", label_de: "VKU", label_en: "VKU" },
];

export default function Header() {
  const { t, lang, setLang } = useLang();
  const { content } = useEdit();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isSubPage = loc.pathname !== "/";
  const opaque = scrolled || isSubPage;

  const handleAnchorClick = (e, id) => {
    e.preventDefault();
    if (loc.pathname !== "/") {
      navigate(`/#${id}`);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
    setOpen(false);
  };

  const ctaLabel = lang === "de"
    ? (content?.nav_cta_de || t.nav.ctaShort)
    : (content?.nav_cta_en || t.nav.ctaShort);

  return (
    <header
      data-testid="site-header"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        opaque
          ? "bg-[#fbf9f6]/90 backdrop-blur-md border-b border-[#e2e8f0]"
          : "bg-transparent"
      }`}
    >
      <div className="container-x flex items-center justify-between px-5 md:px-8 lg:px-12 h-16 md:h-18">
        <a
          href="#top"
          data-testid="logo-link"
          onClick={(e) => handleAnchorClick(e, "top")}
          className="flex items-center gap-2"
        >
          <span className="dot-accent" />
          <span className="font-display text-xl tracking-tight">
            Safe<span className="font-serif-i text-[#ff5a36]">Ride</span>
          </span>
        </a>

        <nav className="hidden lg:flex items-center gap-6 xl:gap-7">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => handleAnchorClick(e, s.id)}
              data-testid={`nav-${s.id}`}
              className="text-sm font-semibold text-[#475569] hover:text-[#0f172a] transition-colors"
            >
              {t.nav[s.key]}
            </a>
          ))}
          {extraLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              data-testid={`nav-${l.to.slice(1)}`}
              className="text-sm font-semibold text-[#475569] hover:text-[#ff5a36] transition-colors"
            >
              {lang === "de" ? l.label_de : l.label_en}
            </Link>
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
            onClick={(e) => handleAnchorClick(e, "contact")}
            data-testid="header-cta"
            className="hidden md:inline-flex btn-accent !py-2.5 !px-4 !text-sm"
          >
            {ctaLabel}
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
              onClick={(e) => handleAnchorClick(e, s.id)}
              data-testid={`mobile-nav-${s.id}`}
              className="text-base font-semibold text-[#0f172a]"
            >
              {t.nav[s.key]}
            </a>
          ))}
          {extraLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              data-testid={`mobile-nav-${l.to.slice(1)}`}
              className="text-base font-semibold text-[#ff5a36]"
            >
              {lang === "de" ? l.label_de : l.label_en}
            </Link>
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
            onClick={(e) => handleAnchorClick(e, "contact")}
            data-testid="mobile-header-cta"
            className="btn-accent justify-center mt-2"
          >
            {ctaLabel}
          </a>
        </div>
      )}
    </header>
  );
}
