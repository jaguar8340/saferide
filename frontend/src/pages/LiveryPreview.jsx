import { useEffect } from "react";
import { useEdit } from "@/contexts/EditContext";
import LiveryPreviewBanner from "@/components/livery/LiveryPreviewBanner";
import LiveryHeader from "@/components/livery/LiveryHeader";
import LiveryHero from "@/components/livery/LiveryHero";
import LiveryAbout from "@/components/livery/LiveryAbout";
import LiveryWhy from "@/components/livery/LiveryWhy";
import LiveryServices from "@/components/livery/LiveryServices";
import LiveryFleet from "@/components/livery/LiveryFleet";
import LiveryPricing from "@/components/livery/LiveryPricing";
import LiveryContact from "@/components/livery/LiveryContact";
import LiveryFooter from "@/components/livery/LiveryFooter";
import "@/livery.css";

/**
 * Livery – wrap/rally-team inspired design variant of the homepage.
 * Reachable only via `/preview/livery`. Reuses CMS content read-only.
 * Palette + typography pulled from the actual driving-school fleet wrap.
 *
 * Section order: Hero → About → Why → Services → Fleet → Pricing → Contact → Footer
 */
export default function LiveryPreview() {
  const { content } = useEdit();

  useEffect(() => {
    const prev = document.documentElement.lang;
    document.documentElement.lang = "de";
    return () => {
      document.documentElement.lang = prev;
    };
  }, []);

  if (!content) {
    return (
      <div className="livery-root min-h-screen flex items-center justify-center">
        <span className="font-anton text-sm tracking-[0.28em] uppercase text-[#7a8595]">
          Loading…
        </span>
      </div>
    );
  }

  return (
    <div data-testid="livery-preview-page" className="livery-root min-h-screen">
      <LiveryPreviewBanner />
      <LiveryHeader />
      {/* Spacer for fixed banner (52px = 44+8 tape) + header (64px) */}
      <div className="h-[116px]" aria-hidden="true" />

      <LiveryHero content={content} />
      <LiveryAbout content={content} />
      <LiveryWhy content={content} />
      <LiveryServices content={content} />
      <LiveryFleet content={content} />
      <LiveryPricing content={content} />
      <LiveryContact />
      <LiveryFooter />
    </div>
  );
}
