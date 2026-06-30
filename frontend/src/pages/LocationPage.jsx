import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";
import { api, formatApiError } from "@/lib/api";

import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import AdminToolbar from "@/components/edit/AdminToolbar";
import OtherLocationsSection from "@/components/site/OtherLocationsSection";

import LocHero from "@/components/location/LocHero";
import LocWhyIdeal from "@/components/location/LocWhyIdeal";
import LocRoutes from "@/components/location/LocRoutes";
import LocMeetMap from "@/components/location/LocMeetMap";
import LocWhySafeRide from "@/components/location/LocWhySafeRide";
import LocPrices from "@/components/location/LocPrices";
import LocGallery from "@/components/location/LocGallery";
import LocGoogleReviews from "@/components/location/LocGoogleReviews";
import LocFaq from "@/components/location/LocFaq";
import LocCta from "@/components/location/LocCta";

function setNestedPath(obj, path, value) {
  const next = JSON.parse(JSON.stringify(obj || {}));
  const parts = path.split(".");
  let cur = next;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = /^\d+$/.test(parts[i]) ? parseInt(parts[i], 10) : parts[i];
    if (cur[key] === undefined || cur[key] === null) {
      cur[key] = /^\d+$/.test(parts[i + 1]) ? [] : {};
    }
    cur = cur[key];
  }
  const last = parts[parts.length - 1];
  const lastKey = /^\d+$/.test(last) ? parseInt(last, 10) : last;
  cur[lastKey] = value;
  return next;
}

export default function LocationPage() {
  const { fullSlug } = useParams();
  const slug = fullSlug && fullSlug.startsWith("fahrschule-")
    ? fullSlug.slice("fahrschule-".length)
    : fullSlug;
  const { lang } = useLang();
  const { content } = useEdit();
  const [loc, setLoc] = useState(null);
  const [allLocs, setAllLocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pending = useRef({});
  const flushTimer = useRef(null);

  const reload = useCallback(async () => {
    try {
      const r = await api.get(`/locations/${slug}`);
      setLoc(r.data);
      setError(null);
    } catch (err) {
      setError(formatApiError(err, "Standort nicht gefunden"));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    setLoading(true);
    reload();
  }, [reload]);

  useEffect(() => {
    let mounted = true;
    api.get("/locations")
      .then((r) => mounted && setAllLocs(r.data || []))
      .catch(() => mounted && setAllLocs([]));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (loc?.seo_title_de) {
      document.title = lang === "de" ? loc.seo_title_de : loc.seo_title_en || loc.seo_title_de;
    }
  }, [loc, lang]);

  const flush = useCallback(async () => {
    const updates = { ...pending.current };
    pending.current = {};
    if (Object.keys(updates).length === 0) return;
    try {
      const r = await api.patch(`/locations/${slug}`, updates);
      setLoc(r.data);
    } catch (err) {
      toast.error(formatApiError(err, "Speichern fehlgeschlagen"));
      await reload();
    }
  }, [reload, slug]);

  const updateField = useCallback(
    (path, value) => {
      setLoc((prev) => setNestedPath(prev, path, value));
      pending.current[path] = value;
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = setTimeout(flush, 400);
    },
    [flush],
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbf9f6] text-[#0f172a]">
        <span className="text-xs font-semibold tracking-widest uppercase opacity-50">Lade…</span>
      </div>
    );
  }
  if (error || !loc) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fbf9f6] text-[#0f172a] gap-4">
        <span className="text-xs font-semibold tracking-widest uppercase text-[#94a3b8]">404</span>
        <h1 className="font-display text-3xl">Standort nicht gefunden</h1>
        <Link to="/" className="btn-accent">Zur Startseite</Link>
      </div>
    );
  }

  const phone = content?.contact?.phone || "+41 79 585 00 85";

  return (
    <main
      data-testid="location-page"
      data-location-slug={loc.slug}
      className="min-h-screen bg-[#fbf9f6] text-[#0f172a] font-sans"
    >
      <Header />
      <LocHero loc={loc} updateField={updateField} phone={phone} />
      <LocWhyIdeal loc={loc} updateField={updateField} nadineData={content?.nadine} />
      <LocRoutes loc={loc} updateField={updateField} />
      <LocMeetMap loc={loc} updateField={updateField} />
      <LocWhySafeRide loc={loc} updateField={updateField} />
      <LocPrices loc={loc} updateField={updateField} />
      <LocGallery loc={loc} updateField={updateField} />
      <LocGoogleReviews
        loc={loc}
        updateField={updateField}
        globalReviewsUrl={content?.google_reviews_url}
        globalReviewsCount={content?.google_reviews_count}
      />
      <OtherLocationsSection
        currentSlug={loc.slug}
        currentName={loc.name}
        allLocations={allLocs}
        texts={{
          overline_de: loc.other_regions_overline_de,
          overline_en: loc.other_regions_overline_en,
          title_de: loc.other_regions_title_de,
          title_en: loc.other_regions_title_en,
          intro_de: loc.other_regions_intro_de,
          intro_en: loc.other_regions_intro_en,
        }}
        onUpdate={updateField}
      />
      <LocFaq loc={loc} updateField={updateField} />
      <LocCta loc={loc} updateField={updateField} phone={phone} />
      <Footer data={content?.contact} />
      <AdminToolbar />
    </main>
  );
}
