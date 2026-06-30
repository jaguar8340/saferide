import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import Editable from "@/components/edit/Editable";
import EditableMedia from "@/components/edit/EditableMedia";

/**
 * Right-side "Ich bin Nadine" intro card – used at the top of every
 * location landing page so the hero side never looks empty.
 *
 * Reads from content.nadine.* and writes through the global EditContext
 * (the consumer is responsible for wrapping NadineIntroCard inside
 * <EditProvider/>, which is provided at the App level).
 */
export default function NadineIntroCard({ data }) {
  const { lang, pick } = useLang();
  if (!data) return null;

  return (
    <motion.div
      data-testid="nadine-intro-card"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
      className="relative bg-white border border-[#e2e8f0] rounded-3xl overflow-hidden shadow-[0_18px_45px_-22px_rgba(15,23,42,0.25)]"
    >
      <EditableMedia
        pathUrl="nadine.media_url"
        pathType="nadine.media_type"
        src={data.media_url}
        type={data.media_type || "image"}
        alt="Nadine Stäubli"
        className="block w-full"
        mediaClassName="h-[300px] md:h-[360px]"
      />
      <div className="p-6 md:p-7">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#ff5a36] text-white">
            <Sparkles size={13} />
          </span>
          <Editable
            path={`nadine.intro_title_${lang}`}
            value={pick(data.intro_title_de, data.intro_title_en)}
            className="font-display text-lg md:text-xl tracking-tight text-[#0f172a]"
          />
        </div>
        <Editable
          path={`nadine.intro_text_${lang}`}
          value={pick(data.intro_text_de, data.intro_text_en)}
          as="p"
          multiline
          className="text-sm text-[#475569] leading-relaxed font-medium block"
        />
        <div className="mt-5 pt-5 border-t border-[#e2e8f0] grid grid-cols-2 gap-4">
          <div>
            <Editable
              path="nadine.stat1_value"
              value={data.stat1_value}
              className="font-display text-2xl tracking-tight text-[#ff5a36] block"
            />
            <Editable
              path={`nadine.stat1_label_${lang}`}
              value={pick(data.stat1_label_de, data.stat1_label_en)}
              className="text-[10px] font-semibold tracking-widest uppercase text-[#94a3b8] block mt-1"
            />
          </div>
          <div>
            <Editable
              path="nadine.stat2_value"
              value={data.stat2_value}
              className="font-display text-2xl tracking-tight text-[#0f172a] block"
            />
            <Editable
              path={`nadine.stat2_label_${lang}`}
              value={pick(data.stat2_label_de, data.stat2_label_en)}
              className="text-[10px] font-semibold tracking-widest uppercase text-[#94a3b8] block mt-1"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
