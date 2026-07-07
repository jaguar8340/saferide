import { Link } from "react-router-dom";
import { Instagram, Music2 } from "lucide-react";

/**
 * Minimal racing footer — same content pillars as the main site but styled
 * as a pit-crew closing card.
 */
export default function SportFooter() {
  return (
    <footer
      data-testid="sport-footer"
      className="relative sport-carbon border-t border-[#27272a] py-14"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Top row */}
        <div className="grid md:grid-cols-3 gap-10 pb-10 border-b border-[#27272a]">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-9 h-9 sport-checker rounded-sm ring-1 ring-white/10" />
              <span className="font-race text-2xl tracking-[0.08em] text-white">
                SAFE<span className="text-[#e11d48]">·</span>RIDE
              </span>
            </div>
            <p className="text-white/50 text-sm leading-relaxed max-w-xs">
              Deine moderne Fahrschule in den Kantonen Zürich, Schwyz, St. Gallen
              und Graubünden. Anders. Besser. Mutiger.
            </p>
          </div>

          <div>
            <div className="sport-overline mb-4">Kontakt</div>
            <ul className="space-y-2 text-white/70 text-sm">
              <li><a href="tel:+41795850085" className="hover:text-[#e11d48] transition-colors">+41 79 585 00 85</a></li>
              <li><a href="mailto:info@fahrschule-saferide.ch" className="hover:text-[#e11d48] transition-colors">info@fahrschule-saferide.ch</a></li>
              <li className="text-white/40">Mo–Fr · 07–21 Uhr</li>
            </ul>
          </div>

          <div>
            <div className="sport-overline mb-4">Follow the Race</div>
            <div className="flex items-center gap-3">
              <a
                href="https://www.instagram.com/fahrschule.safe.ride/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 border border-[#27272a] hover:border-[#e11d48] hover:bg-[#e11d48]/10 transition-colors flex items-center justify-center"
                aria-label="Instagram"
              >
                <Instagram size={18} className="text-white" />
              </a>
              <a
                href="https://www.tiktok.com/@nadine_staeubli"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 border border-[#27272a] hover:border-[#e11d48] hover:bg-[#e11d48]/10 transition-colors flex items-center justify-center"
                aria-label="TikTok"
              >
                <Music2 size={18} className="text-white" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono text-[10px] tracking-[0.25em] uppercase text-white/40">
          <span>© {new Date().getFullYear()} · Safe Ride · All Rights Reserved</span>
          <Link
            to="/"
            className="text-white/60 hover:text-[#e11d48] transition-colors"
            data-testid="sport-footer-back-to-original"
          >
            ← Zurück zum aktuellen Live-Design
          </Link>
        </div>
      </div>
    </footer>
  );
}
