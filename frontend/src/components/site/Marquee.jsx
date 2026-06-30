import FastMarquee from "react-fast-marquee";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";
import { useState, useEffect } from "react";

export default function Marquee({ de, en }) {
  const { lang } = useLang();
  const { editMode, updateField } = useEdit();
  const text = lang === "de" ? de : en;
  const items = (text || "").split("·").map((s) => s.trim()).filter(Boolean);

  // Local-only state when editing
  const [draft, setDraft] = useState(text || "");
  useEffect(() => setDraft(text || ""), [text]);

  if (editMode) {
    return (
      <section
        data-testid="marquee-section"
        className="bg-[#0f172a] text-white py-6 md:py-7 px-5 md:px-10 lg:px-14"
      >
        <label className="flex items-center gap-3 max-w-5xl mx-auto">
          <span className="text-[10px] tracking-widest uppercase font-semibold text-white/60 shrink-0">
            Marquee {lang.toUpperCase()}
          </span>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              if (draft !== text) updateField(`marquee_${lang}`, draft);
            }}
            data-testid={`marquee-input-${lang}`}
            className="flex-1 bg-transparent border-b border-white/30 focus:border-[#ff5a36] focus:outline-none py-2 font-display text-2xl md:text-3xl"
            placeholder="Wörter mit · trennen"
          />
        </label>
      </section>
    );
  }

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
