import { useEffect } from "react";
import { useEdit } from "@/contexts/EditContext";
import { useLang } from "@/contexts/LanguageContext";
import Header from "@/components/site/Header";
import Hero from "@/components/site/Hero";
import Marquee from "@/components/site/Marquee";
import About from "@/components/site/About";
import WhySafeRide from "@/components/site/WhySafeRide";
import Services from "@/components/site/Services";
import Fleet from "@/components/site/Fleet";
import Pricing from "@/components/site/Pricing";
import Gallery from "@/components/site/Gallery";
import Testimonials from "@/components/site/Testimonials";
import HomeFaq from "@/components/site/HomeFaq";
import SocialFeed from "@/components/site/SocialFeed";
import Contact from "@/components/site/Contact";
import Footer from "@/components/site/Footer";
import AdminToolbar from "@/components/edit/AdminToolbar";
import Seo from "@/components/site/Seo";

/** Convert "Juni 2026" or "März 2026" → "2026-06-01" ISO date.
 *  Also handles English months + returns undefined if nothing parseable. */
function parseGermanMonth(str) {
  if (!str || typeof str !== "string") return undefined;
  const s = str.trim();
  const map = {
    januar: 1, jan: 1, january: 1,
    februar: 2, feb: 2, february: 2,
    märz: 3, marz: 3, mar: 3, march: 3,
    april: 4, apr: 4,
    mai: 5, may: 5,
    juni: 6, jun: 6, june: 6,
    juli: 7, jul: 7, july: 7,
    august: 8, aug: 8,
    september: 9, sep: 9, sept: 9,
    oktober: 10, okt: 10, oct: 10, october: 10,
    november: 11, nov: 11,
    dezember: 12, dez: 12, dec: 12, december: 12,
  };
  const m = s.toLowerCase().match(/([a-zäöü]+)[.\s]+(\d{4})/);
  if (!m) {
    // Also accept an already ISO string
    const iso = /^\d{4}-\d{2}(-\d{2})?$/.exec(s);
    return iso ? (iso[1] ? s : `${s}-01`) : undefined;
  }
  const monthNum = map[m[1]];
  if (!monthNum) return undefined;
  return `${m[2]}-${String(monthNum).padStart(2, "0")}-01`;
}

export default function Home() {
  const { content, testimonials, gallery } = useEdit();
  const { lang } = useLang();
  useEffect(() => {
    // Smoothly scroll to the section indicated by location.hash on mount/change
    const hash = window.location.hash?.replace("#", "");
    if (!hash) return;
    const t = setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
    return () => clearTimeout(t);
  }, [content]);

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbf9f6] text-[#0f172a]">
        <span className="text-xs font-semibold tracking-widest uppercase opacity-50">
          Lade…
        </span>
      </div>
    );
  }

  // ---------- SEO ----------
  const title = lang === "de"
    ? "Safe Ride · Fahrschule in ZH · SZ · SG · GR – Anders. Besser. Mutiger."
    : "Safe Ride · Driving School in ZH · SZ · SG · GR – Different. Better. Bolder.";
  const description = lang === "de"
    ? (content.hero?.subtitle_de || "Moderne Fahrschule in den Kantonen Zürich, Schwyz, St. Gallen und Graubünden mit Mental-Coaching und Spezialisierung auf ADHS & Autismus.")
    : (content.hero?.subtitle_en || "Modern driving school in the cantons of Zurich, Schwyz, St. Gallen and Graubünden with mental coaching and specialisation in ADHD & autism.");
  const ogImage = content.hero?.image_url || content.logo_url;

  const faqJsonLd = (content.homepage_faqs || []).length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: (content.homepage_faqs || []).map((f) => ({
          "@type": "Question",
          name: lang === "de" ? f.question_de : (f.question_en || f.question_de),
          acceptedAnswer: {
            "@type": "Answer",
            text: lang === "de" ? f.answer_de : (f.answer_en || f.answer_de),
          },
        })),
      }
    : null;

  // DrivingSchool structured data — feeds Google Rich Results (map card,
  // stars, hours) and Google Business Profile enhancement.
  const origin = typeof window !== "undefined" ? window.location.origin : "https://saferide.ch";
  const absLogo = (() => {
    const l = content.logo_url || "";
    if (!l) return `${origin}/favicon.jpg`;
    return l.startsWith("http") ? l : `${origin}${l.startsWith("/") ? l : `/${l}`}`;
  })();
  const absHeroImg = (() => {
    const h = content.hero?.image_url || content.logo_url || "";
    if (!h) return absLogo;
    return h.startsWith("http") ? h : `${origin}${h.startsWith("/") ? h : `/${h}`}`;
  })();
  const socialSameAs = [
    content.contact?.instagram,
    content.contact?.tiktok,
    content.contact?.facebook,
    "https://www.google.com/search?q=Fahrschule+Safe+Ride+Nadine+St%C3%A4ubli",
  ].filter(Boolean);

  const drivingSchoolJsonLd = {
    "@context": "https://schema.org",
    "@type": "DrivingSchool",
    "@id": `${origin}/#organization`,
    name: "Fahrschule Safe Ride",
    alternateName: "Safe Ride",
    url: `${origin}/`,
    logo: absLogo,
    image: absHeroImg,
    description:
      "Persönliche Fahrschule in ZH, SZ, SG und GR mit Mental Coaching und Spezialisierung auf ADHS & Autismus.",
    telephone: content.contact?.phone || "+41 79 585 00 85",
    email: content.contact?.email || "info@fahrschule-saferide.ch",
    priceRange: "CHF 90 – CHF 120",
    currenciesAccepted: "CHF",
    paymentAccepted: "Bar, Bank, TWINT, Kreditkarte",
    address: {
      "@type": "PostalAddress",
      addressCountry: "CH",
      addressRegion: "ZH",
    },
    areaServed: [
      { "@type": "AdministrativeArea", name: "Zürich" },
      { "@type": "AdministrativeArea", name: "Schwyz" },
      { "@type": "AdministrativeArea", name: "St. Gallen" },
      { "@type": "AdministrativeArea", name: "Graubünden" },
    ],
    // Mo–Fr 07:00–20:00 (Sa nach Absprache = kein festes Fenster → weglassen)
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "07:00",
        closes: "20:00",
      },
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: content.rating_avg ?? "5.0",
      bestRating: "5",
      worstRating: "1",
      ratingCount: content.rating_count ?? Math.max((testimonials || []).length, 6),
      reviewCount: content.rating_count ?? Math.max((testimonials || []).length, 6),
    },
    review: (testimonials || []).slice(0, 6).map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.name },
      // Fallback auf heutiges Datum, wenn r.date fehlt / nicht parsebar ist –
      // Google verlangt ein gültiges ISO-Datum, sonst wird das Snippet verworfen.
      datePublished: parseGermanMonth(r.date) || new Date().toISOString().slice(0, 10),
      reviewBody: lang === "de" ? (r.text_de || r.text_en) : (r.text_en || r.text_de),
      reviewRating: {
        "@type": "Rating",
        ratingValue: String(r.rating || 5),
        bestRating: "5",
        worstRating: "1",
      },
    })),
    founder: {
      "@type": "Person",
      name: "Nadine Stäubli",
      jobTitle: "Fahrlehrerin FMB",
    },
    sameAs: socialSameAs,
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Fahrstunden & Kurse",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: "Fahrstunde PKW · 45 Min." },
          price: "90",
          priceCurrency: "CHF",
        },
        {
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: "Fahrstunde PKW · 60 Min." },
          price: "120",
          priceCurrency: "CHF",
        },
        {
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: "Anhänger · 45 Min." },
          price: "120",
          priceCurrency: "CHF",
        },
        {
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: "Verkehrskundeunterricht (VKU)" },
        },
      ],
    },
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${origin}/#website`,
    url: `${origin}/`,
    name: "Fahrschule Safe Ride",
    inLanguage: lang === "en" ? "en" : "de-CH",
    publisher: { "@id": `${origin}/#organization` },
  };

  const jsonLd = [drivingSchoolJsonLd, websiteJsonLd, faqJsonLd].filter(Boolean);

  return (
    <main
      data-testid="home-page"
      className="min-h-screen bg-[#fbf9f6] text-[#0f172a] font-sans"
    >
      <Seo
        title={title}
        description={description}
        path="/"
        lang={lang}
        type="website"
        image={ogImage}
        imageAlt="Fahrschule Safe Ride – Audi S3"
        keywords={lang === "de"
          ? "Fahrschule, Führerschein, Fahrlehrerin, Zürich, Schwyz, St. Gallen, Graubünden, VKU, ADHS, Mental Coaching, Audi S3"
          : "driving school, driver license, instructor, Zurich, Schwyz, St. Gallen, Graubünden, theory, ADHD, mental coaching"}
        jsonLd={jsonLd}
      />
      <Header />
      <Hero data={content.hero} />
      <Marquee de={content.marquee_de} en={content.marquee_en} />
      <About data={content.about} />
      <WhySafeRide data={content.why_safe_ride} />
      <Services items={content.services || []} />
      <Fleet items={content.fleet || []} />
      <Pricing data={content.pricing} />
      <Gallery items={gallery} />
      <Testimonials items={testimonials} />
      <HomeFaq items={content.homepage_faqs || []} />
      <SocialFeed />
      <Contact data={content.contact} />
      <Footer data={content.contact} />
      <AdminToolbar />
    </main>
  );
}
