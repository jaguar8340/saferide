import { Phone } from "lucide-react";

/**
 * Minimal, high-contrast top navigation for the racing variant.
 * Sticky under the PreviewBanner (top-11).
 */
export default function SportHeader() {
  return (
    <header
      data-testid="sport-header"
      className="fixed top-11 inset-x-0 z-[90] bg-black/90 backdrop-blur-md border-b border-[#27272a]"
    >
      <div className="max-w-7xl mx-auto h-16 px-4 md:px-8 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-3" data-testid="sport-brand">
          <span className="w-9 h-9 sport-checker rounded-sm ring-1 ring-white/10" />
          <span className="font-race text-2xl tracking-[0.08em] text-white leading-none">
            SAFE<span className="text-[#e11d48]">·</span>RIDE
          </span>
        </a>
        <nav className="hidden md:flex items-center gap-9 font-mono text-[11px] tracking-[0.22em] uppercase text-white/70">
          <a href="#fleet" className="hover:text-white transition-colors">Fleet</a>
          <a href="#services" className="hover:text-white transition-colors">Race Card</a>
          <a href="#stats" className="hover:text-white transition-colors">Telemetry</a>
          <a href="#pit" className="hover:text-white transition-colors">Boxenstopp</a>
        </nav>
        <a
          href="tel:+41795850085"
          data-testid="sport-header-call"
          className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase text-white/80 hover:text-[#e11d48] transition-colors"
        >
          <Phone size={14} />
          <span className="hidden sm:inline">+41 79 585 00 85</span>
        </a>
      </div>
    </header>
  );
}
