import { Link } from "react-router-dom";
import { ArrowRight, Phone } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import Editable from "@/components/edit/Editable";

export default function LocCta({ loc, updateField, phone }) {
  const { lang, pick } = useLang();
  return (
    <section className="section-pad bg-[#0f172a] text-white">
      <div className="container-x px-5 md:px-8 lg:px-12 text-center">
        <Editable
          path={`cta_title_${lang}`}
          value={pick(loc.cta_title_de, loc.cta_title_en)}
          onUpdate={updateField}
          as="h2"
          className="font-display leading-[1.0] tracking-tight max-w-3xl mx-auto block"
          style={{ fontSize: "clamp(2.1rem, 4.8vw, 4rem)" }}
        />
        <Editable
          path={`cta_body_${lang}`}
          value={pick(loc.cta_body_de, loc.cta_body_en)}
          onUpdate={updateField}
          as="p"
          multiline
          className="mt-6 max-w-2xl mx-auto text-lg text-white/75 leading-relaxed font-medium block"
        />
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link to="/#contact" data-testid="loc-cta-bottom" className="btn-accent">
            {lang === "de" ? "Lektion anfragen" : "Request lesson"}
            <ArrowRight size={16} />
          </Link>
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/15 px-5 py-3 text-sm font-semibold transition-colors"
          >
            <Phone size={14} /> {phone}
          </a>
        </div>
      </div>
    </section>
  );
}
