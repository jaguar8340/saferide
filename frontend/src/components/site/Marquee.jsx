import FastMarquee from "react-fast-marquee";
import { useLang } from "@/contexts/LanguageContext";

export default function Marquee({ de, en }) {
  const { lang } = useLang();
  const text = lang === "de" ? de : en;
  const items = (text || "").split("·").map((s) => s.trim()).filter(Boolean);

  return (
    <section
      data-testid="marquee-section"
      className="py-8 md:py-10 bg-[#0033ff] overflow-hidden border-y-2 border-[#0a0a0a]"
    >
      <FastMarquee speed={55} gradient={false}>
        {items.concat(items).concat(items).map((word, i) => (
          <span
            key={i}
            className="font-display uppercase tracking-tighter text-6xl md:text-8xl px-6 flex items-center gap-6 font-black"
          >
            <span
              className={
                i % 2 === 0
                  ? "text-[#ccff00]"
                  : "text-outline-lime"
              }
            >
              {word}
            </span>
            <span
              aria-hidden
              className="inline-block w-4 h-4 md:w-6 md:h-6 rounded-full bg-[#ff0055] shrink-0"
            />
          </span>
        ))}
      </FastMarquee>
    </section>
  );
}
