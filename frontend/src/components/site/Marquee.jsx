import FastMarquee from "react-fast-marquee";
import { useLang } from "@/contexts/LanguageContext";

export default function Marquee({ de, en }) {
  const { lang } = useLang();
  const text = lang === "de" ? de : en;
  const items = (text || "").split("·").map((s) => s.trim()).filter(Boolean);

  return (
    <section
      data-testid="marquee-section"
      className="bg-[#0f172a] text-white py-6 md:py-7 overflow-hidden"
    >
      <FastMarquee speed={45} gradient={false}>
        {items.concat(items).concat(items).map((word, i) => (
          <span
            key={i}
            className="flex items-center gap-5 px-5 font-display text-3xl md:text-4xl"
          >
            <span className={i % 3 === 1 ? "font-serif-i text-[#ff5a36] font-normal" : ""}>
              {word}
            </span>
            <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full bg-[#ff5a36]" />
          </span>
        ))}
      </FastMarquee>
    </section>
  );
}
