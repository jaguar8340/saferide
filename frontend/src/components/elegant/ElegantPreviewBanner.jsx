import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Fixed top banner across the Elegant Premium preview so the user always
 * knows this is an alternative design and can jump back to the live site.
 */
export default function ElegantPreviewBanner() {
  return (
    <div
      data-testid="elegant-preview-banner"
      className="fixed top-0 inset-x-0 z-[100] bg-[#0d1b2a] text-[#faf6f0] border-b border-[#c9a961]/40"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-11 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#c9a961]" />
          <span className="font-manrope text-[10px] md:text-[11px] tracking-[0.3em] uppercase text-[#c9a961] font-medium truncate">
            Design-Variante · Elegant Premium
          </span>
        </div>
        <Link
          to="/"
          data-testid="elegant-preview-back-to-original"
          className="inline-flex items-center gap-2 border border-[#c9a961]/60 hover:border-[#c9a961] hover:bg-[#c9a961] hover:text-[#0d1b2a] font-manrope text-[10px] md:text-[11px] tracking-[0.28em] uppercase px-3 md:px-4 h-7 transition-all shrink-0"
        >
          <ArrowLeft size={12} />
          <span>Zur Live-Site</span>
        </Link>
      </div>
    </div>
  );
}
