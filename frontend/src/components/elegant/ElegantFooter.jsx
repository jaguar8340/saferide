import { Link } from "react-router-dom";
import { Instagram, Music2 } from "lucide-react";

/**
 * Elegant footer – refined navy panel with gold hairlines and a signature-
 * like closing typography.
 */
export default function ElegantFooter() {
  return (
    <footer
      data-testid="elegant-footer"
      className="relative bg-[#0d1b2a] text-[#faf6f0] py-16"
    >
      {/* Gold top hairline */}
      <div className="absolute top-0 inset-x-0 flex justify-center">
        <div className="max-w-7xl w-full mx-auto px-4 md:px-8">
          <span className="block h-px bg-[#c9a961]/50" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Big brand row */}
        <div className="text-center pb-14 border-b border-white/10">
          <div className="font-serif text-5xl md:text-7xl tracking-tight leading-none">
            Safe<span className="italic text-[#c9a961]"> ride</span>
          </div>
          <div className="mt-3 font-manrope text-[10px] tracking-[0.4em] uppercase text-[#c9a961]">
            Distinguished Driving School · Est. Switzerland
          </div>
        </div>

        {/* Info grid */}
        <div className="grid md:grid-cols-3 gap-10 py-14">
          <div>
            <div className="font-manrope text-[10px] tracking-[0.3em] uppercase text-[#c9a961] mb-4">
              Kontakt
            </div>
            <ul className="space-y-2.5 font-manrope text-sm text-white/80">
              <li><a href="tel:+41795850085" className="hover:text-[#c9a961] transition-colors">+41 79 585 00 85</a></li>
              <li><a href="mailto:info@fahrschule-saferide.ch" className="hover:text-[#c9a961] transition-colors">info@fahrschule-saferide.ch</a></li>
              <li className="text-white/50">Mo–Fr · 07–21 Uhr</li>
            </ul>
          </div>
          <div>
            <div className="font-manrope text-[10px] tracking-[0.3em] uppercase text-[#c9a961] mb-4">
              Regionen
            </div>
            <ul className="space-y-2.5 font-manrope text-sm text-white/80">
              <li>Kanton Zürich</li>
              <li>Kanton Schwyz</li>
              <li>Kanton St. Gallen</li>
              <li>Kanton Graubünden</li>
            </ul>
          </div>
          <div>
            <div className="font-manrope text-[10px] tracking-[0.3em] uppercase text-[#c9a961] mb-4">
              Journal
            </div>
            <div className="flex items-center gap-3">
              <a
                href="https://www.instagram.com/fahrschule.safe.ride/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-11 h-11 border border-white/20 hover:border-[#c9a961] hover:text-[#c9a961] flex items-center justify-center transition-colors"
              >
                <Instagram size={16} strokeWidth={1.6} />
              </a>
              <a
                href="https://www.tiktok.com/@nadine_staeubli"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="w-11 h-11 border border-white/20 hover:border-[#c9a961] hover:text-[#c9a961] flex items-center justify-center transition-colors"
              >
                <Music2 size={16} strokeWidth={1.6} />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <span className="font-manrope text-[10px] tracking-[0.3em] uppercase text-white/50">
            © {new Date().getFullYear()} · Fahrschule Safe Ride · All Rights Reserved
          </span>
          <Link
            to="/"
            className="font-manrope text-[10px] tracking-[0.3em] uppercase text-[#c9a961] hover:text-white transition-colors"
            data-testid="elegant-footer-back-to-original"
          >
            ← Zurück zum aktuellen Live-Design
          </Link>
        </div>
      </div>
    </footer>
  );
}
