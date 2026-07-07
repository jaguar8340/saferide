import { Phone } from "lucide-react";

/**
 * Fixed navigation. "safe ride" script logo + serif nav + phone CTA.
 * Sits under the fixed PreviewBanner.
 */
export default function LiveryHeader() {
  return (
    <header
      data-testid="livery-header"
      className="fixed top-[52px] inset-x-0 z-[90] bg-[#f2ede4]/90 backdrop-blur-md border-b-2 border-[#0f1419]"
    >
      <div className="max-w-7xl mx-auto h-16 px-4 md:px-8 flex items-center justify-between">
        <a href="#top" className="flex items-baseline gap-1.5 leading-none" data-testid="livery-brand">
          <span className="font-anton text-2xl tracking-wide text-[#0f1419] uppercase">
            Fahrschule
          </span>
          <span className="font-script text-3xl text-[#c9302c] leading-[0.9]">
            safe ride
          </span>
        </a>
        <nav className="hidden md:flex items-center gap-8 font-anton text-sm tracking-[0.18em] uppercase text-[#1a2332]">
          <a href="#about" className="hover:text-[#c9302c] transition-colors">Über mich</a>
          <a href="#why" className="hover:text-[#c9302c] transition-colors">Warum wir</a>
          <a href="#services" className="hover:text-[#c9302c] transition-colors">Angebot</a>
          <a href="#fleet" className="hover:text-[#c9302c] transition-colors">Flotte</a>
          <a href="#pricing" className="hover:text-[#c9302c] transition-colors">Preise</a>
        </nav>
        <a
          href="tel:+41795850085"
          data-testid="livery-header-call"
          className="inline-flex items-center gap-2 bg-[#0f1419] text-white font-anton text-sm tracking-[0.15em] uppercase px-4 h-10 hover:bg-[#c9302c] transition-colors"
        >
          <Phone size={14} strokeWidth={2.5} />
          <span className="hidden sm:inline">+41 79 585 00 85</span>
        </a>
      </div>
    </header>
  );
}
