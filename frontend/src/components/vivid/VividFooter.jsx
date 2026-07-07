import { Link } from "react-router-dom";
import { Instagram, Music2, ArrowUpRight } from "lucide-react";

/**
 * Vivid footer – bright cream panel with a big Space-Grotesk brand
 * signature and coloured social pills.
 */
export default function VividFooter() {
  return (
    <footer
      data-testid="vivid-footer"
      className="relative bg-[#fef9f4] border-t-2 border-[#0a0a1f] py-14"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Brand row */}
        <div className="pb-10 border-b-2 border-[#0a0a1f] flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="font-grotesk text-5xl md:text-7xl tracking-[-0.04em] leading-none text-[#0a0a1f]">
              safe<span className="font-instrument italic text-[#ff3b8b] text-6xl md:text-8xl"> ride</span>
              <span className="text-[#3b5bff]">.</span>
            </div>
            <div className="mt-4 font-grotesk text-xs tracking-widest uppercase text-[#7a7a95]">
              Fahrschule · ZH · SZ · SG · GR
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://www.instagram.com/fahrschule.safe.ride/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 rounded-full bg-[#0a0a1f] hover:bg-[#ff3b8b] text-white flex items-center justify-center transition-colors"
              aria-label="Instagram"
            >
              <Instagram size={18} />
            </a>
            <a
              href="https://www.tiktok.com/@nadine_staeubli"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 rounded-full bg-[#0a0a1f] hover:bg-[#3b5bff] text-white flex items-center justify-center transition-colors"
              aria-label="TikTok"
            >
              <Music2 size={18} />
            </a>
            <a
              href="mailto:info@fahrschule-saferide.ch"
              className="inline-flex items-center gap-2 rounded-full bg-[#c8ff4d] border-2 border-[#0a0a1f] text-[#0a0a1f] font-grotesk text-sm font-semibold h-12 px-5 hover:bg-[#ffd60a] transition-colors"
              style={{ boxShadow: "3px 3px 0 #0a0a1f" }}
            >
              <span>Hi sagen</span>
              <ArrowUpRight size={14} strokeWidth={2.5} />
            </a>
          </div>
        </div>

        {/* Contact info */}
        <div className="grid md:grid-cols-3 gap-8 py-10">
          <div>
            <div className="font-grotesk text-xs uppercase tracking-widest text-[#7a7a95] mb-3">Kontakt</div>
            <ul className="space-y-2 font-inter text-sm">
              <li><a href="tel:+41795850085" className="text-[#0a0a1f] hover:text-[#ff3b8b] transition-colors">+41 79 585 00 85</a></li>
              <li><a href="mailto:info@fahrschule-saferide.ch" className="text-[#0a0a1f] hover:text-[#ff3b8b] transition-colors">info@fahrschule-saferide.ch</a></li>
              <li className="text-[#7a7a95]">Mo–Fr · 07–21 Uhr</li>
            </ul>
          </div>
          <div>
            <div className="font-grotesk text-xs uppercase tracking-widest text-[#7a7a95] mb-3">Regionen</div>
            <ul className="space-y-2 font-inter text-sm text-[#0a0a1f]">
              <li>Kanton Zürich</li>
              <li>Kanton Schwyz</li>
              <li>Kanton St. Gallen</li>
              <li>Kanton Graubünden</li>
            </ul>
          </div>
          <div>
            <div className="font-grotesk text-xs uppercase tracking-widest text-[#7a7a95] mb-3">Menu</div>
            <ul className="space-y-2 font-inter text-sm text-[#0a0a1f]">
              <li><a href="#about" className="hover:text-[#ff3b8b] transition-colors">Über mich</a></li>
              <li><a href="#why" className="hover:text-[#ff3b8b] transition-colors">Warum uns</a></li>
              <li><a href="#services" className="hover:text-[#ff3b8b] transition-colors">Angebot</a></li>
              <li><a href="#pricing" className="hover:text-[#ff3b8b] transition-colors">Preise</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom row */}
        <div className="pt-6 border-t border-[#ece4d6] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-inter text-xs text-[#7a7a95]">
          <span>© {new Date().getFullYear()} · Safe Ride · Alle Rechte vorbehalten</span>
          <Link
            to="/"
            className="text-[#0a0a1f] hover:text-[#ff3b8b] transition-colors font-medium"
            data-testid="vivid-footer-back-to-original"
          >
            ← Zurück zum aktuellen Live-Design
          </Link>
        </div>
      </div>
    </footer>
  );
}
