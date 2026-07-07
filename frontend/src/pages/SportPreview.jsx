import { useEffect } from "react";
import { useEdit } from "@/contexts/EditContext";
import PreviewBanner from "@/components/sport/PreviewBanner";
import SportHeader from "@/components/sport/SportHeader";
import SportHero from "@/components/sport/SportHero";
import SportMarquee from "@/components/sport/SportMarquee";
import SportStatsBar from "@/components/sport/SportStatsBar";
import SportFleet from "@/components/sport/SportFleet";
import SportServices from "@/components/sport/SportServices";
import SportContact from "@/components/sport/SportContact";
import SportFooter from "@/components/sport/SportFooter";
import "@/sport.css";

/**
 * Motorsport / Racing design variant of the homepage. Reachable only via
 * `/preview/sport`. Reuses the CMS content read-only (no editing UI). The
 * original `/` homepage stays 100% untouched.
 */
export default function SportPreview() {
  const { content } = useEdit();

  // Force <html> lang for consistency with the copy (German content).
  useEffect(() => {
    const prev = document.documentElement.lang;
    document.documentElement.lang = "de";
    return () => {
      document.documentElement.lang = prev;
    };
  }, []);

  if (!content) {
    return (
      <div className="sport-root min-h-screen flex items-center justify-center">
        <span className="font-mono text-[11px] tracking-[0.28em] uppercase text-white/40">
          Loading Telemetry…
        </span>
      </div>
    );
  }

  return (
    <div data-testid="sport-preview-page" className="sport-root min-h-screen">
      <PreviewBanner />
      <SportHeader />
      {/* Spacer for fixed banner (44px) + header (64px) */}
      <div className="h-[108px]" aria-hidden="true" />

      <SportHero content={content} />
      <SportMarquee />
      <SportStatsBar />
      <SportFleet content={content} />
      <SportServices />
      <SportContact />
      <SportFooter />
    </div>
  );
}
