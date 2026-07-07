import { Link } from "react-router-dom";
import { ArrowLeft, Flag } from "lucide-react";

/**
 * Fixed top banner shown across the entire Sport preview so the user always
 * knows they are looking at the alternative design and can jump back in one
 * click to the original ("Coral") homepage.
 */
export default function PreviewBanner() {
  return (
    <div
      data-testid="preview-banner"
      className="fixed top-0 inset-x-0 z-[100] bg-[#e11d48] text-white border-b-2 border-black"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-11 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <Flag size={14} className="shrink-0" />
          <span className="font-mono text-[10px] md:text-[11px] tracking-[0.25em] uppercase truncate">
            Design-Variante · Motorsport / Racing Preview
          </span>
        </div>
        <Link
          to="/"
          data-testid="preview-back-to-original"
          className="inline-flex items-center gap-1.5 bg-black text-white font-mono text-[10px] md:text-[11px] tracking-[0.22em] uppercase px-3 md:px-4 h-7 hover:bg-white hover:text-black transition-colors shrink-0"
        >
          <ArrowLeft size={12} />
          <span>Zur Live-Site</span>
        </Link>
      </div>
    </div>
  );
}
