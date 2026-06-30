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
import Contact from "@/components/site/Contact";
import Footer from "@/components/site/Footer";
import AdminToolbar from "@/components/edit/AdminToolbar";
import Seo from "@/components/site/Seo";

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
        jsonLd={faqJsonLd}
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
      <Contact data={content.contact} />
      <Footer data={content.contact} />
      <AdminToolbar />
    </main>
  );
}
