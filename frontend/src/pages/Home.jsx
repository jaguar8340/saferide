import { useEdit } from "@/contexts/EditContext";
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
import AdminToolbar from "@/components/edit/AdminToolbar";

export default function Home() {
  const { content, testimonials, gallery } = useEdit();

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
      <Services items={content.services || []} />
      <Fleet items={content.fleet || []} />
      <Pricing data={content.pricing} />
      <Gallery items={gallery} />
      <Testimonials items={testimonials} />
      <Contact data={content.contact} />
      <Footer data={content.contact} />
      <AdminToolbar />
    </main>
  );
}
