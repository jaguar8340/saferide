import { Phone } from "lucide-react";

/**
 * Minimal sticky top navigation for the Vivid variant.
 */
export default function VividHeader() {
  return (
    <header
      data-testid="vivid-header"
      className="fixed top-11 inset-x-0 z-[90] bg-[#fef9f4]/85 backdrop-blur-md border-b border-[#ece4d6]"
    >
      <div className="max-w-7xl mx-auto h-16 px-4 md:px-8 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2.5" data-testid="vivid-brand">
          <span className="w-8 h-8 rounded-full bg-[#3b5bff] border-2 border-[#0a0a1f] flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-[#c8ff4d]" />
          </span>
          <span className="font-grotesk text-xl font-bold tracking-tight text-[#0a0a1f] leading-none">
            safe<span className="font-instrument text-[#ff3b8b] text-2xl"> ride</span>
          </span>
        </a>
        <nav className="hidden md:flex items-center gap-8 font-grotesk text-sm font-medium text-[#0a0a1f]/70">
          <a href="#about" className="hover:text-[#ff3b8b] transition-colors">Über mich</a>
          <a href="#why" className="hover:text-[#ff3b8b] transition-colors">Warum uns</a>
          <a href="#services" className="hover:text-[#ff3b8b] transition-colors">Angebot</a>
          <a href="#fleet" className="hover:text-[#ff3b8b] transition-colors">Flotte</a>
          <a href="#pricing" className="hover:text-[#ff3b8b] transition-colors">Preise</a>
        </nav>
        <a
          href="tel:+41795850085"
          data-testid="vivid-header-call"
          className="inline-flex items-center gap-2 rounded-full bg-[#0a0a1f] text-white font-grotesk text-xs font-semibold px-4 h-9 hover:bg-[#3b5bff] transition-colors"
        >
          <Phone size={13} strokeWidth={2.5} />
          <span className="hidden sm:inline">+41 79 585 00 85</span>
        </a>
      </div>
    </header>
  );
}
