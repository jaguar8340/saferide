import { useEffect } from "react";
import { useEdit } from "@/contexts/EditContext";
import VividPreviewBanner from "@/components/vivid/VividPreviewBanner";
import VividHeader from "@/components/vivid/VividHeader";
import VividHero from "@/components/vivid/VividHero";
import VividAbout from "@/components/vivid/VividAbout";
import VividWhy from "@/components/vivid/VividWhy";
import VividServices from "@/components/vivid/VividServices";
import VividFleet from "@/components/vivid/VividFleet";
import VividPricing from "@/components/vivid/VividPricing";
import VividContact from "@/components/vivid/VividContact";
import VividFooter from "@/components/vivid/VividFooter";
import "@/vivid.css";

/**
 * Vivid (young, colourful, modern) design variant of the homepage.
 * Reachable only via `/preview/vivid`. Reuses CMS content read-only.
 * Bright cream background — NEVER black — with electric colour accents.
 *
 * Section order (per user brief):
 *   1. Hero – "Fahrschule saferide"
 *   2. About – "über mich"
 *   3. Why – "Warum Fahrschule Saferide"
 *   4. Services – "was du bekommst"
 *   5. Fleet – "unsere flotte"
 *   6. Pricing – "preise"
 */
export default function VividPreview() {
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
      <div className="vivid-root min-h-screen flex items-center justify-center">
        <span className="font-grotesk text-sm font-semibold text-[#7a7a95]">
          Loading…
        </span>
      </div>
    );
  }

  return (
    <div data-testid="vivid-preview-page" className="vivid-root min-h-screen">
      <VividPreviewBanner />
      <VividHeader />
      {/* Spacer for fixed banner (44px) + header (64px) */}
      <div className="h-[108px]" aria-hidden="true" />

      <VividHero content={content} />
      <VividAbout content={content} />
      <VividWhy content={content} />
      <VividServices content={content} />
      <VividFleet content={content} />
      <VividPricing content={content} />
      <VividContact />
      <VividFooter />
    </div>
  );
}
