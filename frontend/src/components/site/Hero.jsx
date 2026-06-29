import { motion } from "framer-motion";
import { ArrowRight, Phone } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";

export default function Hero({ data }) {
  const { pick, t } = useLang();
  if (!data) return null;

  const scroll = (id) => (e) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="top"
      data-testid="hero-section"
      className="relative min-h-[100vh] w-full overflow-hidden bg-[#f4f5f0] pt-28 md:pt-32"
    >
      {/* Decorative blobs */}
      <div
        aria-hidden
        className="absolute top-20 right-[-10rem] w-[36rem] h-[36rem] rounded-full bg-[#ccff00] opacity-90 animate-blob blur-sm"
      />
      <div
        aria-hidden
        className="absolute bottom-[-12rem] left-[-8rem] w-[28rem] h-[28rem] rounded-full bg-[#0033ff] opacity-95 animate-blob"
        style={{ animationDelay: "-6s" }}
      />
      <div
        aria-hidden
        className="absolute top-[40%] left-[45%] w-32 h-32 rounded-full bg-[#ff0055] opacity-90 animate-float blur-[1px]"
      />

      <div className="container-x px-5 md:px-10 lg:px-14 relative z-10">
        <div className="mt-6 md:mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-8">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="eyebrow text-[#ff0055] mb-5 md:mb-7"
            >
              <span className="inline-block w-8 h-px bg-[#ff0055] align-middle mr-3" />
              {pick(data.overline_de, data.overline_en)}
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="font-display font-black uppercase leading-[0.84] tracking-tighter text-[#0a0a0a]"
              style={{ fontSize: "clamp(3rem, 9vw, 9rem)" }}
            >
              {pick(data.title_de, data.title_en)}
              <br />
              <span className="text-outline-ink">
                {pick(data.highlight_de, data.highlight_en).split(".")[0]}.
              </span>{" "}
              <span className="text-[#0033ff]">
                {pick(data.highlight_de, data.highlight_en).split(".")[1]}.
              </span>{" "}
              <span className="text-[#ff0055]">
                {pick(data.highlight_de, data.highlight_en).split(".")[2]}.
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-8 max-w-2xl text-lg md:text-xl leading-relaxed text-[#4b5563] font-medium"
            >
              {pick(data.subtitle_de, data.subtitle_en)}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-10 flex flex-wrap items-center gap-4"
            >
              <a
                href="#contact"
                onClick={scroll("contact")}
                data-testid="hero-cta-primary"
                className="btn-pill-primary"
              >
                {pick(data.cta_primary_de, data.cta_primary_en)}
                <ArrowRight size={16} />
              </a>
              <a
                href="#services"
                onClick={scroll("services")}
                data-testid="hero-cta-secondary"
                className="btn-pill-ghost"
              >
                {pick(data.cta_secondary_de, data.cta_secondary_en)}
              </a>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-4 relative"
          >
            <div className="relative h-[360px] md:h-[420px] rounded-3xl overflow-hidden border-2 border-[#0a0a0a]">
              <img
                src={data.image_url}
                alt="Safe Ride"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <span className="bg-white/95 backdrop-blur rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-[#0a0a0a]">
                  Saison &apos;26
                </span>
                <span className="bg-[#ccff00] rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-[#0a0a0a]">
                  Live
                </span>
              </div>
            </div>
            <a
              href="tel:+41795850085"
              data-testid="hero-phone"
              className="mt-5 flex items-center gap-3 bg-white border-2 border-[#0a0a0a] rounded-2xl p-4 hover:bg-[#0a0a0a] hover:text-white transition-colors group"
            >
              <span className="w-10 h-10 rounded-full bg-[#0033ff] group-hover:bg-[#ccff00] flex items-center justify-center text-[#ccff00] group-hover:text-[#0a0a0a] transition-colors">
                <Phone size={16} />
              </span>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                  Call Nadine
                </span>
                <span className="font-display font-bold tracking-tight text-lg">
                  079 585 00 85
                </span>
              </div>
            </a>
          </motion.div>
        </div>

        <div className="mt-16 md:mt-20 pt-8 border-t-2 border-[#0a0a0a] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-[#0a0a0a]/60">
            <div className="w-8 h-px bg-[#0a0a0a]/30" />
            <span className="eyebrow">{t.hero.scroll}</span>
          </div>
          <div className="flex items-center gap-6 text-[#0a0a0a]/60 text-xs uppercase tracking-widest font-bold">
            <span>ZH</span>
            <span>·</span>
            <span>SZ</span>
            <span>·</span>
            <span>SG</span>
            <span>·</span>
            <span>GR</span>
          </div>
        </div>
      </div>
    </section>
  );
}
