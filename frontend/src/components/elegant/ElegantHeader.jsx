import { Phone } from "lucide-react";

/**
 * Minimalist top navigation inspired by luxury automotive brand websites.
 * Sticky under the ElegantPreviewBanner.
 */
export default function ElegantHeader() {
  return (
    <header
      data-testid="elegant-header"
      className="fixed top-11 inset-x-0 z-[90] bg-[#faf6f0]/85 backdrop-blur-md border-b border-[#e5ded1]"
    >
      <div className="max-w-7xl mx-auto h-20 px-4 md:px-8 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-3" data-testid="elegant-brand">
          <div className="flex flex-col leading-none">
            <span className="font-serif text-3xl tracking-tight text-[#0d1b2a]">
              Safe<span className="italic text-[#c9a961]"> ride</span>
            </span>
            <span className="mt-1 font-manrope text-[9px] tracking-[0.32em] uppercase text-[#7a8595]">
              Distinguished Driving School
            </span>
          </div>
        </a>
        <nav className="hidden md:flex items-center gap-10 font-manrope text-xs tracking-[0.2em] uppercase text-[#37475a] font-medium">
          <a href="#about" className="hover:text-[#c9a961] transition-colors">Über mich</a>
          <a href="#why" className="hover:text-[#c9a961] transition-colors">Philosophie</a>
          <a href="#fleet" className="hover:text-[#c9a961] transition-colors">Flotte</a>
          <a href="#pricing" className="hover:text-[#c9a961] transition-colors">Preise</a>
        </nav>
        <a
          href="tel:+41795850085"
          data-testid="elegant-header-call"
          className="hidden sm:inline-flex items-center gap-2 font-manrope text-xs tracking-[0.2em] uppercase text-[#0d1b2a] hover:text-[#c9a961] transition-colors font-medium"
        >
          <Phone size={14} strokeWidth={1.8} />
          <span>+41 79 585 00 85</span>
        </a>
      </div>
    </header>
  );
}
