import FastMarquee from "react-fast-marquee";
import { useLang } from "@/contexts/LanguageContext";

export default function Marquee({ de, en }) {
  const { lang } = useLang();
  const text = lang === "de" ? de : en;
  const items = (text || "").split("·").map((s) => s.trim()).filter(Boolean);

  return (
    <section
      data-testid="marquee-section"
      className="border-y border-white/10 py-8 md:py-10 bg-[#0a0a0a]"
    >
      <FastMarquee speed={45} gradient={false}>
        {items.concat(items).map((word, i) => (
          <span
            key={i}
            className="font-display uppercase tracking-tighter text-5xl md:text-7xl px-8 flex items-center gap-8"
          >
            <span className={i % 2 === 0 ? "text-outline" : "text-[#FF2E00]"}>
              {word}
            </span>
            <span className="text-white/30">/</span>
          </span>
        ))}
      </FastMarquee>
    </section>
  );
}
