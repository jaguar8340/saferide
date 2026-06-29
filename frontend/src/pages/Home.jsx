import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useLang } from "@/contexts/LanguageContext";
import Header from "@/components/site/Header";
import Hero from "@/components/site/Hero";
import Marquee from "@/components/site/Marquee";
import About from "@/components/site/About";
import Services from "@/components/site/Services";
import Fleet from "@/components/site/Fleet";
import Pricing from "@/components/site/Pricing";
import Gallery from "@/components/site/Gallery";
import Testimonials from "@/components/site/Testimonials";
import Contact from "@/components/site/Contact";
import Footer from "@/components/site/Footer";

export default function Home() {
  useLang();
  const [content, setContent] = useState(null);
  const [testimonials, setTestimonials] = useState([]);
  const [gallery, setGallery] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get("/content"),
      api.get("/testimonials"),
      api.get("/gallery"),
    ]).then(([c, t, g]) => {
      setContent(c.data);
      setTestimonials(t.data);
      setGallery(g.data);
    });
  }, []);

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
        <span className="font-display tracking-widest text-sm uppercase opacity-60">
          Lade…
        </span>
      </div>
    );
  }

  return (
    <main
      data-testid="home-page"
      className="min-h-screen bg-[#0a0a0a] text-white font-body"
    >
      <Header />
      <Hero data={content.hero} />
      <Marquee de={content.marquee_de} en={content.marquee_en} />
      <About data={content.about} />
      <Services items={content.services || []} />
      <Fleet items={content.fleet || []} />
      <Pricing data={content.pricing} />
      <Gallery items={gallery} />
      <Testimonials items={testimonials} />
      <Contact data={content.contact} />
      <Footer data={content.contact} />
    </main>
  );
}
