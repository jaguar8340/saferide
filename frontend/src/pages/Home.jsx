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

export default function Home() {
  const { content, testimonials, gallery } = useEdit();
  const { lang } = useLang();

  useEffect(() => {
    document.title = lang === "de"
      ? "Safe Ride · Fahrschule in ZH · SZ · SG · GR"
      : "Safe Ride · Driving School in ZH · SZ · SG · GR";
  }, [lang]);

  // Smoothly scroll to the section indicated by location.hash on mount/change
  useEffect(() => {
    const hash = window.location.hash?.replace("#", "");
    if (!hash) return;
    // Wait one render frame so the DOM has the section
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

  return (
    <main
      data-testid="home-page"
      className="min-h-screen bg-[#fbf9f6] text-[#0f172a] font-sans"
    >
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
