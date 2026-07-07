import { useEffect } from "react";
import { useEdit } from "@/contexts/EditContext";
import ElegantPreviewBanner from "@/components/elegant/ElegantPreviewBanner";
import ElegantHeader from "@/components/elegant/ElegantHeader";
import ElegantHero from "@/components/elegant/ElegantHero";
import ElegantAbout from "@/components/elegant/ElegantAbout";
import ElegantWhy from "@/components/elegant/ElegantWhy";
import ElegantServices from "@/components/elegant/ElegantServices";
import ElegantFleet from "@/components/elegant/ElegantFleet";
import ElegantPricing from "@/components/elegant/ElegantPricing";
import ElegantContact from "@/components/elegant/ElegantContact";
import ElegantFooter from "@/components/elegant/ElegantFooter";
import "@/elegant.css";

/**
 * Elegant Premium design variant of the homepage. Reachable only via
 * `/preview/elegant`. Reuses the CMS content read-only (no editing UI). The
 * original `/` homepage stays 100% untouched.
 *
 * Section order (per user brief):
 *   1. Hero – "Fahrschule saferide"
 *   2. About – "über mich"
 *   3. Why – "Warum Fahrschule Saferide"
 *   4. Services – "was du bekommst"
 *   5. Fleet – "unsere flotte"
 *   6. Pricing – "preise"
 */
export default function ElegantPreview() {
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
      <div className="elegant-root min-h-screen flex items-center justify-center">
        <span className="font-manrope text-[11px] tracking-[0.32em] uppercase text-[#7a8595]">
          En route…
        </span>
      </div>
    );
  }

  return (
    <div data-testid="elegant-preview-page" className="elegant-root min-h-screen">
      <ElegantPreviewBanner />
      <ElegantHeader />
      {/* Spacer for fixed banner (44px) + header (80px) */}
      <div className="h-[124px]" aria-hidden="true" />

      <ElegantHero content={content} />
      <ElegantAbout content={content} />
      <ElegantWhy content={content} />
      <ElegantServices content={content} />
      <ElegantFleet content={content} />
      <ElegantPricing content={content} />
      <ElegantContact />
      <ElegantFooter />
    </div>
  );
}
