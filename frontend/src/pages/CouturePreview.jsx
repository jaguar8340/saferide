import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Phone,
  Mail,
  MapPin,
  Star,
  Sparkles,
  Instagram,
  Heart,
  Brain,
  ShieldCheck,
  Car,
} from "lucide-react";
import { useEdit } from "@/contexts/EditContext";
import "@/couture.css";

/**
 * Couture – editorial × motorsport design variant.
 * Reachable only via /preview/couture. Reads live CMS content read-only.
 *
 * Vibe: Vogue magazine cover meets F1 pit-lane. Deep noir base, cream
 * parchment, champagne gold, scarlet red + hot pink accents. Playfair
 * italic serif for elegance × Bebas Neue condensed uppercase for sport.
 */
export default function CouturePreview() {
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
      <div className="couture-root min-h-screen flex items-center justify-center bg-[#0b0b0f]">
        <span className="font-sport text-[#c9a961] tracking-[0.4em] uppercase text-sm">
          Loading…
        </span>
      </div>
    );
  }

  return (
    <div data-testid="couture-preview-page" className="couture-root min-h-screen">
      <PreviewBanner />
      <Header />
      <div className="h-[104px]" aria-hidden="true" />
      <Hero content={content} />
      <Marquee />
      <About content={content} />
      <Why content={content} />
      <Fleet content={content} />
      <Pricing content={content} />
      <Contact />
      <Footer />
    </div>
  );
}

/* ============================================================ */
/*  PREVIEW BANNER + HEADER                                     */
/* ============================================================ */
function PreviewBanner() {
  return (
    <div
      data-testid="couture-preview-banner"
      className="fixed top-0 inset-x-0 z-[100]"
    >
      <div className="bg-[#0b0b0f] text-[#f2ecdf] border-b border-[#c9a961]/40">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#e6122e] animate-pulse" />
            <span className="font-sport text-[11px] md:text-[12px] tracking-[0.3em] uppercase truncate text-[#c9a961]">
              Design · <span className="text-[#f2ecdf]">Couture Edition</span> · No. 04
            </span>
          </div>
          <Link
            to="/"
            data-testid="couture-preview-back-to-original"
            className="inline-flex items-center gap-1.5 text-[#f2ecdf] font-sport text-[10px] md:text-[12px] tracking-[0.25em] uppercase px-3 md:px-4 h-6 md:h-7 rounded-full border border-[#c9a961]/50 hover:bg-[#e6122e] hover:text-[#f2ecdf] hover:border-[#e6122e] transition-all shrink-0"
          >
            <ArrowLeft size={11} />
            <span>Zur Live-Site</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header
      data-testid="couture-header"
      className="fixed top-10 inset-x-0 z-[95] bg-[#0b0b0f]/95 backdrop-blur-md border-b border-[#c9a961]/20"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-8">
        <Link to="/preview/couture" className="flex items-center gap-2.5 group">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#e6122e]" />
          <span className="font-sport text-lg md:text-xl tracking-[0.24em] uppercase text-[#f2ecdf] group-hover:text-[#c9a961] transition-colors">
            safe ride
          </span>
          <span className="font-editorial italic text-[#c9a961] text-sm md:text-base">
            couture
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          {[
            ["Über", "#about"],
            ["Warum", "#why"],
            ["Flotte", "#fleet"],
            ["Preise", "#pricing"],
            ["Kontakt", "#contact"],
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="cu-nav-link"
              data-testid={`couture-nav-${label.toLowerCase().replace(/[^a-z]/g, "")}`}
            >
              {label}
            </a>
          ))}
        </nav>
        <a
          href="#contact"
          className="cu-btn text-xs md:text-sm py-2 md:py-2.5 px-4 md:px-5"
          data-testid="couture-header-cta"
        >
          Anfragen
          <ArrowUpRight size={14} strokeWidth={2.5} />
        </a>
      </div>
    </header>
  );
}

/* ============================================================ */
/*  HERO – magazine cover                                       */
/* ============================================================ */
function Hero({ content }) {
  const h = content.hero || {};
  const a = content.about || {};
  const portrait =
    a.portrait_image_url ||
    h.image_url ||
    "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=900&auto=format&fit=crop&q=85";

  return (
    <section
      data-testid="couture-hero"
      className="relative overflow-hidden cu-paper pt-16 md:pt-24 pb-24 md:pb-32"
    >
      {/* Diagonal scarlet sash */}
      <div className="cu-sash">
        <span className="cu-sash-text" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
          Fresh · Fearless · Fast · Fahrschule · Feb 2026
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 relative">
        {/* Editorial issue-header */}
        <div className="flex items-baseline justify-between gap-4 pb-4 border-b border-[#0b0b0f]/20 mb-10 md:mb-14">
          <div className="flex items-baseline gap-4 md:gap-6">
            <span className="font-editorial italic text-2xl md:text-3xl">Nr. 01</span>
            <span className="hidden md:block cu-hairline-dark w-16 self-center" />
            <span className="font-sport text-xs md:text-sm tracking-[0.3em] uppercase text-[#0b0b0f]/70">
              Feb 2026 · The Driving Issue
            </span>
          </div>
          <span className="font-sport text-xs tracking-[0.3em] uppercase text-[#e6122e]">
            CHF 0.00 · Free
          </span>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 md:gap-14 items-start">
          {/* Left – Editorial headline block */}
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3 mb-6"
            >
              <span className="cu-race-num">01</span>
              <span className="cu-label cu-label--scarlet">
                <Sparkles size={12} /> Cover Story
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6 }}
              className="font-editorial text-[3.4rem] sm:text-[5rem] lg:text-[7rem] leading-[0.92] tracking-tight text-[#0b0b0f]"
              data-testid="couture-hero-title"
            >
              {h.title_de || "Fahrschule mit"}
              <span className="block italic">
                <span className="cu-under">Attitude.</span>
              </span>
              <span className="block font-sport text-[2.4rem] sm:text-[3.6rem] lg:text-[5rem] uppercase tracking-[0.02em] text-[#e6122e] mt-2">
                Anders · Besser · Mutiger.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="mt-8 font-body text-xl md:text-2xl leading-relaxed italic text-[#0b0b0f]/85 max-w-2xl"
              data-testid="couture-hero-subtitle"
            >
              &ldquo;
              {h.subtitle_de ||
                "Persönlich. Ehrlich. Mit den vermutlich sportlichsten Fahrschulautos der Schweiz. Von Nadine – handgemacht, seit 2020."}
              &rdquo;
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.5 }}
              className="mt-10 flex flex-wrap items-center gap-4"
            >
              <a href="#contact" className="cu-btn" data-testid="couture-hero-cta-anfragen">
                Termin sichern
                <ArrowRight size={15} strokeWidth={2.5} />
              </a>
              <a
                href="tel:+41795850085"
                className="cu-btn cu-btn--ghost"
                data-testid="couture-hero-cta-call"
              >
                <Phone size={13} strokeWidth={2.5} />
                +41 79 585 00 85
              </a>
            </motion.div>

            {/* Sub-stat row */}
            <div className="mt-12 grid grid-cols-3 gap-4 md:gap-6 max-w-xl">
              {[
                { v: "5.0", l: "Google" },
                { v: "14", l: "Standorte" },
                { v: "4", l: "Kantone" },
              ].map((s) => (
                <div key={s.l} className="flex flex-col">
                  <span className="font-editorial text-4xl md:text-5xl leading-none text-[#0b0b0f]">
                    {s.v}
                  </span>
                  <span className="font-sport text-[10px] md:text-xs tracking-[0.28em] uppercase text-[#0b0b0f]/60 mt-2">
                    {s.l}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right – portrait with elegant frame + race sticker */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="lg:col-span-5"
          >
            <div className="cu-frame relative">
              <img
                src={portrait}
                alt="Nadine – Fahrschule Safe Ride"
                className="w-full aspect-[3/4] object-cover grayscale-[0.2] contrast-[1.05]"
                loading="eager"
              />
              {/* Bottom label */}
              <div className="absolute bottom-3 left-3 right-3 bg-[#0b0b0f]/85 backdrop-blur-sm px-4 py-3 flex items-baseline justify-between gap-3">
                <div>
                  <div className="font-editorial italic text-[#f2ecdf] text-lg leading-none">
                    Nadine Stäubli
                  </div>
                  <div className="font-sport text-[10px] tracking-[0.28em] uppercase text-[#c9a961] mt-1.5">
                    Founder · Instructor · Mental Coach
                  </div>
                </div>
                <span className="font-sport text-[10px] tracking-[0.24em] uppercase text-[#f2ecdf]/60">
                  Est. 2020
                </span>
              </div>
            </div>

            {/* Below-photo caption */}
            <div className="mt-5 flex items-center gap-3">
              <span className="cu-hairline flex-1" />
              <span className="font-editorial italic text-sm text-[#0b0b0f]/70">
                Portrait: Safe Ride Team
              </span>
              <span className="cu-hairline flex-1" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */
/*  MARQUEE – elegant × sport blend                            */
/* ============================================================ */
function Marquee() {
  const words = [
    "Elegant",
    "Rebellisch",
    "Persönlich",
    "Präzise",
    "Racing",
    "Refined",
    "Bold",
    "Beautiful",
    "Handcrafted",
    "Fast",
  ];
  const all = [...words, ...words];
  return (
    <section
      data-testid="couture-marquee"
      className="bg-[#0b0b0f] text-[#f2ecdf] py-6 md:py-8 overflow-hidden border-y border-[#c9a961]/30"
    >
      <div className="cu-marquee-track">
        {all.map((w, i) => (
          <span key={i} className="flex items-center gap-6 shrink-0">
            <span
              className={
                i % 3 === 0
                  ? "font-editorial italic text-3xl md:text-4xl text-[#c9a961]"
                  : i % 3 === 1
                    ? "font-sport uppercase text-3xl md:text-4xl tracking-[0.15em] text-[#f2ecdf]"
                    : "font-editorial italic text-3xl md:text-4xl text-[#e6122e]"
              }
            >
              {w}
            </span>
            <span
              aria-hidden
              className={`inline-block w-1.5 h-1.5 rounded-full ${
                i % 2 === 0 ? "bg-[#e6122e]" : "bg-[#c9a961]"
              }`}
            />
          </span>
        ))}
      </div>
    </section>
  );
}

/* ============================================================ */
/*  ABOUT                                                       */
/* ============================================================ */
function About({ content }) {
  const a = content.about || {};
  const h = content.hero || {};
  const portrait =
    a.portrait_image_url ||
    h.image_url ||
    "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=900&auto=format&fit=crop&q=85";
  return (
    <section id="about" data-testid="couture-about" className="cu-paper py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <SectionHeader num="02" eyebrow="Feature" title="Die Frau am Steuer" />

        <div className="grid lg:grid-cols-12 gap-10 md:gap-16 items-start">
          <div className="lg:col-span-5">
            <div className="cu-frame relative max-w-md">
              <img
                src={portrait}
                alt="Portrait"
                className="w-full aspect-[4/5] object-cover grayscale-[0.15]"
                loading="lazy"
              />
            </div>
          </div>
          <div className="lg:col-span-7">
            <p className="cu-pull text-4xl md:text-5xl leading-[1.05] mb-8 text-[#0b0b0f]">
              &ldquo;Fahrschule kann elegant sein.
              <span className="text-[#e6122e]"> Und trotzdem</span>
              <span className="font-sport not-italic uppercase text-[#0b0b0f] mx-2">
                schnell.
              </span>
              &rdquo;
            </p>
            <div className="cu-hairline-dark w-24 mb-8" />
            <p className="font-body text-lg md:text-xl leading-relaxed text-[#0b0b0f]/85 mb-6">
              {a.bio_short_de ||
                "Ich bin Nadine – Fahrlehrerin, Mental Coach und seit 2020 die Frau hinter Safe Ride. Ich unterrichte anders: klassische Fahrschule kombiniert mit fundiertem Mental Coaching, in drei sorgfältig ausgewählten Fahrzeugen, an 14 Standorten in 4 Kantonen."}
            </p>
            <p className="font-body text-lg md:text-xl leading-relaxed text-[#0b0b0f]/85 mb-10">
              {a.bio_long_de ||
                "Weiterbildungen in ADHS- und Autismus-freundlichem Unterricht. Erfahrung mit über 200 Schüler:innen. Und ein sehr klares Versprechen: du wirst nicht zum Nächsten in der Warteschlange, sondern zu einem Menschen, den ich mit Namen kenne."}
            </p>

            {/* Stat trio, editorial style */}
            <div className="grid grid-cols-3 gap-6 md:gap-10 pt-8 border-t border-[#0b0b0f]/15">
              {[
                { v: a.stat1_value || "200+", l: a.stat1_label_de || "Schüler:innen" },
                { v: a.stat2_value || "5+", l: a.stat2_label_de || "Jahre" },
                { v: a.stat3_value || "4", l: a.stat3_label_de || "Kantone" },
              ].map((s, i) => (
                <div
                  key={i}
                  data-testid={`couture-about-stat-${i}`}
                  className="relative"
                >
                  <div className="absolute -top-4 -left-2 font-editorial italic text-sm text-[#c9a961]">
                    0{i + 1}.
                  </div>
                  <div className="font-editorial text-5xl md:text-6xl leading-none text-[#e6122e]">
                    {s.v}
                  </div>
                  <div className="mt-3 font-sport text-[10px] md:text-xs tracking-[0.28em] uppercase text-[#0b0b0f]/70">
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */
/*  WHY                                                         */
/* ============================================================ */
function Why({ content }) {
  const w = content.why_safe_ride || {};
  const pillars = w.pillars || [];
  const iconMap = { Heart, Brain, Sparkles, Car, MapPin, ShieldCheck };

  return (
    <section
      id="why"
      data-testid="couture-why"
      className="cu-noir-grain text-[#f2ecdf] py-24 md:py-32 relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 relative">
        <SectionHeader num="03" eyebrow="Manifest" title="Warum Safe Ride" invert />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {pillars.slice(0, 6).map((p, i) => {
            const Icon = iconMap[p.icon] || Sparkles;
            const dark = i === 1 || i === 4;
            return (
              <motion.article
                key={p.id || i}
                data-testid={`couture-why-pillar-${i}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
                className={dark ? "cu-pillar cu-pillar--dark" : "cu-pillar"}
              >
                <div className="flex items-start justify-between mb-6">
                  <span className="cu-race-num cu-race-num--noir text-lg">
                    0{i + 1}
                  </span>
                  <span
                    className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${
                      dark
                        ? "bg-[#c9a961]/15 text-[#c9a961]"
                        : "bg-[#e6122e]/10 text-[#e6122e]"
                    }`}
                  >
                    <Icon size={16} strokeWidth={2} />
                  </span>
                </div>
                <h3
                  className={`font-editorial text-2xl md:text-[1.7rem] leading-tight tracking-tight mb-3 ${
                    dark ? "text-[#f2ecdf]" : "text-[#0b0b0f]"
                  }`}
                >
                  {p.title_de || "Titel"}
                </h3>
                <p
                  className={`font-body text-base md:text-lg leading-snug ${
                    dark ? "text-[#f2ecdf]/80" : "text-[#0b0b0f]/75"
                  }`}
                >
                  {p.body_de || ""}
                </p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */
/*  FLEET                                                       */
/* ============================================================ */
function Fleet({ content }) {
  const cars = content.fleet || [];
  return (
    <section id="fleet" data-testid="couture-fleet" className="cu-paper py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <SectionHeader num="04" eyebrow="Editorial" title="Die Flotte" />

        <div className="grid md:grid-cols-3 gap-5 md:gap-6">
          {cars.slice(0, 3).map((car, i) => (
            <motion.article
              key={car.slug || i}
              data-testid={`couture-fleet-${i}`}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.1 }}
              className="cu-fleet-card"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <img
                  src={
                    car.image_url ||
                    "https://images.unsplash.com/photo-1580446623001-3abf670c5c55?w=900&auto=format&fit=crop&q=85"
                  }
                  alt={car.name_de || "Fahrzeug"}
                  className="w-full h-full object-cover cu-fleet-img"
                  loading="lazy"
                />
                <div className="absolute top-4 left-4">
                  <span className="cu-race-num text-base">0{i + 1}</span>
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0b0b0f] via-[#0b0b0f]/60 to-transparent p-5 md:p-6">
                  <div className="font-editorial italic text-[#c9a961] text-sm mb-1">
                    {(car.tagline_de || "Grand Tour").split(".")[0]}
                  </div>
                  <div className="font-sport text-2xl md:text-3xl uppercase tracking-wide text-[#f2ecdf] leading-none">
                    {car.name_de || `Fahrzeug ${i + 1}`}
                  </div>
                </div>
              </div>
              {/* Spec strip */}
              <div className="bg-[#0b0b0f] text-[#f2ecdf] px-5 py-4 flex items-center justify-between border-t border-[#c9a961]/25">
                <span className="font-body italic text-sm text-[#c9a961]">
                  Chassis
                </span>
                <span className="font-sport text-xs tracking-[0.24em] uppercase">
                  {car.spec_de || car.tagline_de || "Handpicked"}
                </span>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */
/*  PRICING                                                     */
/* ============================================================ */
function Pricing({ content }) {
  const p = content.pricing || {};
  return (
    <section
      id="pricing"
      data-testid="couture-pricing"
      className="cu-noir-grain text-[#f2ecdf] py-24 md:py-32"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <SectionHeader num="05" eyebrow="Investment" title={p.title_de || "Pakete"} invert />

        <div className="grid md:grid-cols-3 gap-5 md:gap-6">
          {[
            { name: "Starter", price: "CHF 95", per: "45 Min. Fahrlektion", features: ["Persönliche Erstberatung", "Modernes Fahrzeug", "24 h Absage-Frist"] },
            { name: "Signature", price: "CHF 480", per: "5er Paket · Best Value", features: ["5 × 45 Min. Lektion", "Mental-Coaching-Sequenz", "Flexible Standorte"], featured: true },
            { name: "Grand Prix", price: "CHF 890", per: "10er Paket · Komplett", features: ["10 × 45 Min. Lektion", "Manöverplatz inklusive", "Prüfungs­vorbereitung"] },
          ].map((plan, i) => (
            <motion.article
              key={plan.name}
              data-testid={`couture-plan-${i}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={
                plan.featured ? "cu-plan cu-plan--featured" : "cu-plan cu-plan--dark"
              }
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="cu-label cu-label--scarlet bg-[#0b0b0f]">
                    <Star size={11} fill="currentColor" strokeWidth={0} />
                    Beliebtestes Paket
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between mb-6">
                <span className="cu-race-num cu-race-num--noir text-base">
                  P{i + 1}
                </span>
                <span
                  className={`font-editorial italic text-sm ${
                    plan.featured ? "text-[#c9a961]" : "text-[#c9a961]/80"
                  }`}
                >
                  0{i + 1}.
                </span>
              </div>
              <h3 className="font-editorial text-3xl md:text-4xl leading-none mb-3">
                {plan.name}
              </h3>
              <div className="cu-plan-price font-sport text-5xl md:text-6xl tracking-[0.02em] text-[#c9a961] leading-none mb-1">
                {plan.price}
              </div>
              <div className="font-body italic text-sm text-[#f2ecdf]/60 mb-6">
                {plan.per}
              </div>
              <div className="cu-hairline mb-6" />
              <ul className="space-y-3 mb-8">
                {plan.features.map((f, j) => (
                  <li
                    key={j}
                    className="flex items-start gap-3 font-body text-base md:text-lg text-[#f2ecdf]/85 leading-snug"
                  >
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#e6122e] shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href="#contact"
                className={
                  plan.featured
                    ? "cu-btn w-full justify-center"
                    : "cu-btn cu-btn--gold w-full justify-center"
                }
                data-testid={`couture-plan-cta-${i}`}
              >
                Anfragen
                <ArrowUpRight size={14} strokeWidth={2.5} />
              </a>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */
/*  CONTACT                                                     */
/* ============================================================ */
function Contact() {
  return (
    <section
      id="contact"
      data-testid="couture-contact"
      className="cu-paper py-24 md:py-32 relative overflow-hidden"
    >
      <div className="absolute inset-y-0 right-0 w-1/3 bg-[#e6122e]/[0.04] pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 md:px-8 relative">
        <SectionHeader num="06" eyebrow="Talk to Nadine" title="Kontakt" />

        <div className="grid lg:grid-cols-12 gap-10 md:gap-16">
          <div className="lg:col-span-6">
            <p className="cu-pull text-4xl md:text-5xl leading-tight mb-8 text-[#0b0b0f]">
              Bereit für die erste
              <span className="text-[#e6122e]"> Lektion?</span>
            </p>
            <p className="font-body text-lg md:text-xl leading-relaxed text-[#0b0b0f]/85 mb-10">
              Ruf durch, schreib eine Nachricht oder buch dir direkt einen Kennenlern-Termin. Ich melde mich innerhalb von 24 Stunden zurück – meistens früher.
            </p>
            <div className="space-y-4">
              <a
                href="tel:+41795850085"
                data-testid="couture-contact-phone"
                className="flex items-center gap-4 group"
              >
                <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-[#0b0b0f] text-[#c9a961] group-hover:bg-[#e6122e] group-hover:text-[#f2ecdf] transition-colors">
                  <Phone size={16} />
                </span>
                <div>
                  <div className="font-sport text-[10px] tracking-[0.28em] uppercase text-[#0b0b0f]/60">
                    Telefon
                  </div>
                  <div className="font-editorial italic text-2xl text-[#0b0b0f]">
                    +41 79 585 00 85
                  </div>
                </div>
              </a>
              <a
                href="mailto:hallo@fahrschule-saferide.ch"
                data-testid="couture-contact-email"
                className="flex items-center gap-4 group"
              >
                <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-[#0b0b0f] text-[#c9a961] group-hover:bg-[#e6122e] group-hover:text-[#f2ecdf] transition-colors">
                  <Mail size={16} />
                </span>
                <div>
                  <div className="font-sport text-[10px] tracking-[0.28em] uppercase text-[#0b0b0f]/60">
                    E-Mail
                  </div>
                  <div className="font-editorial italic text-2xl text-[#0b0b0f]">
                    hallo@fahrschule-saferide.ch
                  </div>
                </div>
              </a>
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-[#0b0b0f] text-[#c9a961]">
                  <MapPin size={16} />
                </span>
                <div>
                  <div className="font-sport text-[10px] tracking-[0.28em] uppercase text-[#0b0b0f]/60">
                    Standorte
                  </div>
                  <div className="font-editorial italic text-2xl text-[#0b0b0f]">
                    14 · ZH · SZ · SG · GR
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="bg-[#0b0b0f] text-[#f2ecdf] p-8 md:p-10 relative">
              <span className="absolute -top-4 -right-4 cu-race-num text-lg">CTA</span>
              <div className="font-sport text-xs tracking-[0.3em] uppercase text-[#c9a961] mb-4">
                Termin sichern
              </div>
              <h3 className="font-editorial text-4xl md:text-5xl leading-tight mb-6">
                Nächste 3 Slots
              </h3>
              <div className="space-y-4 mb-8">
                {[
                  { d: "Mi · 14. Feb", t: "16:30 · Pfäffikon SZ" },
                  { d: "Fr · 16. Feb", t: "10:00 · Wädenswil ZH" },
                  { d: "Sa · 17. Feb", t: "09:00 · Chur GR" },
                ].map((slot, i) => (
                  <div
                    key={i}
                    className="flex items-baseline justify-between gap-4 pb-4 border-b border-[#c9a961]/25 last:border-0"
                  >
                    <div>
                      <div className="font-editorial italic text-xl">{slot.d}</div>
                      <div className="font-sport text-[10px] tracking-[0.26em] uppercase text-[#c9a961]/80 mt-1">
                        {slot.t}
                      </div>
                    </div>
                    <a
                      href="#contact"
                      className="font-sport text-xs tracking-[0.24em] uppercase text-[#e6122e] hover:text-[#f2ecdf] transition-colors"
                    >
                      Buchen →
                    </a>
                  </div>
                ))}
              </div>
              <a
                href="#contact"
                className="cu-btn cu-btn--gold w-full justify-center"
                data-testid="couture-contact-primary-cta"
              >
                Alle Termine ansehen
                <ArrowRight size={14} strokeWidth={2.5} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */
/*  FOOTER                                                      */
/* ============================================================ */
function Footer() {
  return (
    <footer
      data-testid="couture-footer"
      className="bg-[#0b0b0f] text-[#f2ecdf] py-16 md:py-20 border-t border-[#c9a961]/25"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
          <div>
            <div className="font-sport text-2xl md:text-3xl tracking-[0.24em] uppercase text-[#f2ecdf]">
              safe ride
            </div>
            <div className="font-editorial italic text-[#c9a961] text-lg mt-1">
              Couture Edition · Nr. 04
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://instagram.com/fahrschule.saferide"
              target="_blank"
              rel="noreferrer"
              data-testid="couture-footer-instagram"
              className="inline-flex items-center gap-2 font-sport text-xs tracking-[0.24em] uppercase text-[#f2ecdf]/80 hover:text-[#c9a961] transition-colors"
            >
              <Instagram size={14} />
              @fahrschule.saferide
            </a>
            <span className="text-[#c9a961]/40">·</span>
            <a
              href="#top"
              className="font-sport text-xs tracking-[0.24em] uppercase text-[#f2ecdf]/80 hover:text-[#c9a961] transition-colors"
            >
              Nach oben
            </a>
          </div>
        </div>
        <div className="cu-hairline mb-8" />
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
          <div className="font-body italic text-[#f2ecdf]/60 text-sm">
            © {new Date().getFullYear()} Fahrschule Safe Ride · Nadine Stäubli · alle Rechte
            vorbehalten.
          </div>
          <div className="font-sport text-[10px] tracking-[0.28em] uppercase text-[#f2ecdf]/40">
            Design · Couture · v04
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ============================================================ */
/*  Utility – section header                                    */
/* ============================================================ */
function SectionHeader({ num, eyebrow, title, invert }) {
  return (
    <div className="mb-14 md:mb-20">
      <div className="flex items-baseline gap-4 mb-6">
        <span
          className={`font-editorial italic text-lg md:text-xl ${
            invert ? "text-[#c9a961]" : "text-[#c9a961]"
          }`}
        >
          Nr. {num}
        </span>
        <span
          className={`cu-hairline ${
            invert ? "opacity-70" : "opacity-100"
          } w-16 md:w-24 self-center`}
        />
        <span
          className={`font-sport text-xs md:text-sm tracking-[0.3em] uppercase ${
            invert ? "text-[#f2ecdf]/70" : "text-[#0b0b0f]/70"
          }`}
        >
          {eyebrow}
        </span>
      </div>
      <h2
        className={`font-editorial text-5xl md:text-7xl leading-none tracking-tight ${
          invert ? "text-[#f2ecdf]" : "text-[#0b0b0f]"
        }`}
      >
        {title}
      </h2>
    </div>
  );
}
