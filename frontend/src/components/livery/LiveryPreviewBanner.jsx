import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Fixed top banner for the Livery variant. Yellow safety-tape underneath a
 * dark navy bar with the "safe ride" script accent.
 */
export default function LiveryPreviewBanner() {
  return (
    <div
      data-testid="livery-preview-banner"
      className="fixed top-0 inset-x-0 z-[100]"
    >
      <div className="bg-[#1a2332] text-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-11 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[#f2c94c] shrink-0" />
            <span className="font-anton text-[11px] md:text-[13px] tracking-[0.2em] uppercase truncate">
              Design-Variante · <span className="text-[#f2c94c]">Livery</span>
            </span>
          </div>
          <Link
            to="/"
            data-testid="livery-preview-back-to-original"
            className="inline-flex items-center gap-1.5 bg-[#c9302c] text-white font-anton text-[11px] md:text-[13px] tracking-[0.18em] uppercase px-3 md:px-4 h-7 hover:bg-white hover:text-[#1a2332] transition-colors shrink-0"
          >
            <ArrowLeft size={12} />
            <span>Zur Live-Site</span>
          </Link>
        </div>
      </div>
      {/* Safety-tape strip */}
      <div className="lv-tape h-2" />
    </div>
  );
}
