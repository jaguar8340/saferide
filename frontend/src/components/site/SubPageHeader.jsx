import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";

/**
 * Minimal site-header for the sub-pages (Ablauf / VKU / Locations).
 * Always-visible, light theme. Links back to "/" + section anchors.
 */
export default function SubPageHeader() {
  const { t, lang, setLang } = useLang();
  const { content } = useEdit();
  const [open, setOpen] = useState(false);
  const loc = useLocation();

  const navItems = [
    { href: "/", label_de: "Startseite", label_en: "Home" },
    { href: "/ablauf", label_de: "Ablauf", label_en: "Process" },
    { href: "/vku", label_de: "VKU", label_en: "VKU" },
    { href: "/#pricing", label_de: "Preise", label_en: "Pricing" },
    { href: "/#contact", label_de: "Kontakt", label_en: "Contact" },
  ];

  return (
    <header
      data-testid="subpage-header"
      className="sticky top-0 left-0 right-0 z-50 bg-[#fbf9f6]/90 backdrop-blur-md border-b border-[#e2e8f0]"
    >
      <div className="container-x flex items-center justify-between px-5 md:px-8 lg:px-12 h-16 md:h-18">
        <Link to="/" data-testid="subpage-logo" className="flex items-center gap-2">
          <span className="dot-accent" />
          <span className="font-display text-xl tracking-tight">
            Safe<span className="font-serif-i text-[#ff5a36]">Ride</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-7">
          {navItems.map((n) => {
            const isActive = loc.pathname === n.href;
            return (
              <Link
                key={n.href}
                to={n.href}
                data-testid={`subnav-${n.href.replace(/[^a-z]/g, "") || "home"}`}
                className={`text-sm font-semibold transition-colors ${isActive ? "text-[#ff5a36]" : "text-[#475569] hover:text-[#0f172a]"}`}
              >
                {lang === "de" ? n.label_de : n.label_en}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1 text-xs font-semibold text-[#94a3b8]">
            <button
              onClick={() => setLang("de")}
              data-testid="sub-lang-de"
              className={`px-1.5 transition-colors ${lang === "de" ? "text-[#0f172a]" : "hover:text-[#0f172a]"}`}
            >
              DE
            </button>
            <span className="opacity-40">/</span>
            <button
              onClick={() => setLang("en")}
              data-testid="sub-lang-en"
              className={`px-1.5 transition-colors ${lang === "en" ? "text-[#0f172a]" : "hover:text-[#0f172a]"}`}
            >
              EN
            </button>
          </div>
          <Link
            to="/#contact"
            data-testid="subheader-cta"
            className="hidden md:inline-flex btn-accent !py-2.5 !px-4 !text-sm"
          >
            {content?.nav_cta_de && lang === "de"
              ? content.nav_cta_de
              : content?.nav_cta_en && lang === "en"
              ? content.nav_cta_en
              : t.nav.ctaShort}
          </Link>
          <button
            onClick={() => setOpen((o) => !o)}
            data-testid="subpage-menu-toggle"
            className="lg:hidden p-2 rounded-full hover:bg-[#0f172a]/5"
            aria-label="menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden bg-[#fbf9f6] border-t border-[#e2e8f0] px-5 py-6 flex flex-col gap-3">
          {navItems.map((n) => (
            <Link
              key={n.href}
              to={n.href}
              onClick={() => setOpen(false)}
              className="text-base font-semibold text-[#0f172a]"
            >
              {lang === "de" ? n.label_de : n.label_en}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
