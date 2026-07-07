import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";

/**
 * Fixed top banner across the Vivid preview so the user always knows this
 * is the young/modern design variant and can jump back in one click.
 */
export default function VividPreviewBanner() {
  return (
    <div
      data-testid="vivid-preview-banner"
      className="fixed top-0 inset-x-0 z-[100] bg-[#c8ff4d] text-[#0a0a1f] border-b-2 border-[#0a0a1f]"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-11 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <Sparkles size={14} className="shrink-0" />
          <span className="font-grotesk text-[11px] md:text-[12px] font-semibold tracking-wide truncate">
            Design-Variante · Vivid & Modern
          </span>
        </div>
        <Link
          to="/"
          data-testid="vivid-preview-back-to-original"
          className="inline-flex items-center gap-1.5 bg-[#0a0a1f] text-white font-grotesk text-[11px] font-semibold px-3 md:px-4 h-7 rounded-full hover:bg-[#ff3b8b] transition-colors shrink-0"
        >
          <ArrowLeft size={12} />
          <span>Zur Live-Site</span>
        </Link>
      </div>
    </div>
  );
}
