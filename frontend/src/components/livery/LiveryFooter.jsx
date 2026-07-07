import { Link } from "react-router-dom";
import { Instagram, Music2 } from "lucide-react";

/**
 * Livery Footer – deep navy panel with a giant script "safe ride" mark and
 * clean columned links. Yellow safety-tape strip on top for continuity.
 */
export default function LiveryFooter() {
  return (
    <footer
      data-testid="livery-footer"
      className="relative bg-[#1a2332] text-white"
    >
      <div className="lv-tape h-2" />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-14 md:py-16">
        {/* Big brand line */}
        <div className="pb-10 border-b-2 border-white/15 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="font-anton text-4xl md:text-5xl uppercase tracking-wide leading-none">
              Fahrschule
            </div>
            <div className="font-script text-6xl md:text-8xl text-[#c9302c] leading-[0.85] mt-1">
              safe ride
              <span className="text-[#f2c94c]">.</span>
            </div>
            <div className="mt-4 font-anton text-[11px] tracking-[0.25em] uppercase text-white/50">
              Since 2020 · ZH · SZ · SG · GR
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://www.instagram.com/fahrschule.safe.ride/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 bg-[#c9302c] hover:bg-[#f2c94c] hover:text-[#0f1419] text-white flex items-center justify-center border-2 border-white/20 transition-colors"
              aria-label="Instagram"
            >
              <Instagram size={16} />
            </a>
            <a
              href="https://www.tiktok.com/@nadine_staeubli"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 bg-[#c9302c] hover:bg-[#f2c94c] hover:text-[#0f1419] text-white flex items-center justify-center border-2 border-white/20 transition-colors"
              aria-label="TikTok"
            >
              <Music2 size={16} />
            </a>
          </div>
        </div>

        {/* Columns */}
        <div className="grid md:grid-cols-3 gap-10 py-10">
          <div>
            <div className="font-anton text-[11px] tracking-[0.28em] uppercase text-[#f2c94c] mb-3">
              Kontakt
            </div>
            <ul className="space-y-2 font-mano text-sm text-white/80">
              <li><a href="tel:+41795850085" className="hover:text-[#f2c94c] transition-colors">+41 79 585 00 85</a></li>
              <li><a href="mailto:info@fahrschule-saferide.ch" className="hover:text-[#f2c94c] transition-colors">info@fahrschule-saferide.ch</a></li>
              <li className="text-white/50">Mo–Fr · 07–21 Uhr</li>
            </ul>
          </div>
          <div>
            <div className="font-anton text-[11px] tracking-[0.28em] uppercase text-[#f2c94c] mb-3">
              Regionen
            </div>
            <ul className="space-y-2 font-mano text-sm text-white/80">
              <li>Kanton Zürich</li>
              <li>Kanton Schwyz</li>
              <li>Kanton St. Gallen</li>
              <li>Kanton Graubünden</li>
            </ul>
          </div>
          <div>
            <div className="font-anton text-[11px] tracking-[0.28em] uppercase text-[#f2c94c] mb-3">
              Menu
            </div>
            <ul className="space-y-2 font-mano text-sm text-white/80">
              <li><a href="#about" className="hover:text-[#f2c94c] transition-colors">Über mich</a></li>
              <li><a href="#why" className="hover:text-[#f2c94c] transition-colors">Warum wir</a></li>
              <li><a href="#services" className="hover:text-[#f2c94c] transition-colors">Angebot</a></li>
              <li><a href="#fleet" className="hover:text-[#f2c94c] transition-colors">Flotte</a></li>
              <li><a href="#pricing" className="hover:text-[#f2c94c] transition-colors">Preise</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-anton text-[11px] tracking-[0.25em] uppercase text-white/50">
          <span>© {new Date().getFullYear()} · Safe Ride · Alle Rechte vorbehalten</span>
          <Link
            to="/"
            className="text-[#f2c94c] hover:text-white transition-colors"
            data-testid="livery-footer-back-to-original"
          >
            ← Zurück zum aktuellen Live-Design
          </Link>
        </div>
      </div>

      <div className="lv-rally-stripes h-2" />
    </footer>
  );
}
