import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Clock, MapPin, Loader2, ArrowRight, Sparkles, Plus } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";
import { api, formatApiError } from "@/lib/api";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import AdminToolbar from "@/components/edit/AdminToolbar";
import CanonicalLink from "@/components/site/CanonicalLink";
import Seo from "@/components/site/Seo";
import Editable from "@/components/edit/Editable";
import EditablePackageCard from "@/components/site/EditablePackageCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatPrice(chf) {
  if (chf == null) return "—";
  return `CHF ${chf}`;
}

export default function BuchungPage() {
  const { lang, pick } = useLang();
  const { content, editMode } = useEdit();
  const [packages, setPackages] = useState(null);
  const [locations, setLocations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [creatingPackage, setCreatingPackage] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    preferred_date: "",
    preferred_time: "",
    location_slug: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    document.title = lang === "de" ? "Buchung · Safe Ride" : "Booking · Safe Ride";
  }, [lang]);

  useEffect(() => {
    let cancel = false;
    Promise.all([api.get("/packages"), api.get("/locations")])
      .then(([p, l]) => {
        if (cancel) return;
        setPackages(p.data || []);
        setLocations(l.data || []);
        // Auto-select popular package by default
        const popular = (p.data || []).find((x) => x.popular) || (p.data || [])[0];
        if (popular) setSelected(popular.slug);
      })
      .catch(() => {
        if (cancel) return;
        setPackages([]);
        setLocations([]);
      });
    return () => {
      cancel = true;
    };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!selected) {
      toast.error(lang === "de" ? "Bitte ein Paket wählen" : "Please choose a package");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/bookings", {
        ...form,
        package_slug: selected,
        location_slug: form.location_slug || null,
      });
      setSuccess({ ...form, package_slug: selected });
      // Reset form on success
      setForm({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        preferred_date: "",
        preferred_time: "",
        location_slug: "",
        message: "",
      });
      toast.success(lang === "de" ? "Buchung gesendet" : "Booking sent");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const today = new Date().toISOString().slice(0, 10);

  const handleAddPackage = async () => {
    if (creatingPackage) return;
    setCreatingPackage(true);
    try {
      const slug = `paket-${Date.now()}`;
      const r = await api.post("/packages", {
        slug,
        title_de: "Neues Paket",
        title_en: "New package",
        subtitle_de: "Kurzbeschreibung…",
        subtitle_en: "Short description…",
        service_type: "auto",
        lesson_count: 1,
        duration_minutes: 50,
        price_chf: 100,
        features_de: ["Feature 1", "Feature 2"],
        features_en: ["Feature 1", "Feature 2"],
        color_class: "bg-[#dbeafe]",
        active: true,
        order: packages.length,
      });
      setPackages((cur) => [...cur, r.data]);
      toast.success("Paket erstellt");
    } catch (err) {
      console.error("[BuchungPage] Paket erstellen fehlgeschlagen", err);
      toast.error(formatApiError(err, "Paket konnte nicht erstellt werden"));
    } finally {
      setCreatingPackage(false);
    }
  };

  if (packages === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbf9f6] text-[#0f172a]">
        <span className="text-xs font-semibold tracking-widest uppercase opacity-50">Lade…</span>
      </div>
    );
  }

  return (
    <main data-testid="buchung-page" className="min-h-screen bg-[#fbf9f6] text-[#0f172a] font-sans">
      <CanonicalLink path="/buchung" />
      <Seo
        title={lang === "de" ? "Buchung · Fahrstunden Pakete · Safe Ride" : "Booking · Driving Lesson Packages · Safe Ride"}
        description={lang === "de"
          ? "Buche jetzt dein Fahrstunden-Paket bei Safe Ride – flexibel, fair und ohne versteckte Kosten. Pakete für PKW, Probelektion und Mental-Coaching ab CHF 90 pro Lektion."
          : "Book your driving lesson package at Safe Ride – flexible, fair and without hidden costs. Packages for car, trial lesson and mental coaching from CHF 90 per lesson."}
        path="/buchung"
        lang={lang}
        type="website"
        jsonLd={(packages || []).length ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: lang === "de" ? "Safe Ride Pakete" : "Safe Ride packages",
          itemListElement: (packages || []).map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "Product",
              name: lang === "de" ? p.title_de : (p.title_en || p.title_de),
              description: lang === "de" ? (p.subtitle_de || "") : (p.subtitle_en || p.subtitle_de || ""),
              offers: {
                "@type": "Offer",
                priceCurrency: "CHF",
                price: String(p.price_chf || 0),
                availability: "https://schema.org/InStock",
                url: `https://www.fahrschule-saferide.ch/buchung#${p.slug}`,
              },
            },
          })),
        } : null}
      />
      <Header />

      {/* Hero */}
      <section className="pt-16 md:pt-24 pb-12 md:pb-16">
        <div className="container-x px-5 md:px-8 lg:px-12">
          <div className="flex items-center gap-2 mb-5">
            <span className="dot-accent animate-pulse-accent" />
            <Editable
              path={`buchung_overline_${lang}`}
              value={
                pick(content?.buchung_overline_de, content?.buchung_overline_en) ||
                (lang === "de" ? "Online-Buchung" : "Online booking")
              }
              className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]"
            />
          </div>
          <h1
            className="font-display leading-[0.92] tracking-tight max-w-4xl"
            style={{ fontSize: "clamp(2.6rem, 6vw, 5.6rem)" }}
          >
            <Editable
              path={`buchung_title_${lang}`}
              value={
                pick(content?.buchung_title_de, content?.buchung_title_en) ||
                (lang === "de" ? "Such dir dein Paket aus." : "Pick your package.")
              }
              as="span"
              className="inline"
            />
          </h1>
          <Editable
            path={`buchung_intro_${lang}`}
            value={
              pick(content?.buchung_intro_de, content?.buchung_intro_en) ||
              (lang === "de"
                ? "Wähle das Paket, das zu dir passt, sag mir deinen Wunschtermin und ich melde mich innerhalb von 24 Stunden zur Bestätigung."
                : "Choose the package that fits you, tell me your preferred date and I'll get back to you within 24 hours to confirm.")
            }
            as="p"
            multiline
            className="mt-6 max-w-2xl text-lg text-[#475569] leading-relaxed font-medium block"
          />
        </div>
      </section>

      {/* Package selection */}
      <section className="pb-16 md:pb-20">
        <div className="container-x px-5 md:px-8 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {packages.map((pkg, i) => (
              <motion.div
                key={pkg.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
              >
                <EditablePackageCard
                  pkg={pkg}
                  index={i}
                  isSelected={selected === pkg.slug}
                  onSelect={setSelected}
                  onPatched={(updated) =>
                    setPackages((cur) => cur.map((p) => (p.slug === updated.slug ? updated : p)))
                  }
                  onRemoved={(slug) => {
                    setPackages((cur) => cur.filter((p) => p.slug !== slug));
                    if (selected === slug) setSelected(packages[0]?.slug || null);
                  }}
                />
              </motion.div>
            ))}
          </div>
          {editMode && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={handleAddPackage}
                disabled={creatingPackage}
                data-testid="package-add"
                className="btn-accent text-sm"
              >
                {creatingPackage ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Neues Paket
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Booking form */}
      <section className="pb-24 md:pb-32">
        <div className="container-x px-5 md:px-8 lg:px-12 max-w-3xl mx-auto">
          {success ? (
            <div
              data-testid="booking-success"
              className="bg-white border border-[#d1fae5] rounded-3xl p-10 md:p-12 text-center"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#d1fae5] text-[#065f46] mb-5">
                <Check size={22} />
              </div>
              <h2 className="font-display text-3xl md:text-4xl tracking-tight">
                {lang === "de" ? "Buchung gesendet" : "Booking sent"}
              </h2>
              <p className="mt-4 text-base text-[#475569] leading-relaxed font-medium max-w-md mx-auto">
                {lang === "de"
                  ? "Vielen Dank! Ich melde mich innerhalb von 24 Stunden bei dir, um den Termin zu bestätigen."
                  : "Thank you! I'll get back to you within 24 hours to confirm the appointment."}
              </p>
              <button
                type="button"
                onClick={() => setSuccess(null)}
                className="mt-7 btn-accent text-sm"
                data-testid="booking-new"
              >
                {lang === "de" ? "Weitere Buchung" : "New booking"}
              </button>
            </div>
          ) : (
            <form
              data-testid="booking-form"
              onSubmit={submit}
              className="bg-white border border-[#e2e8f0] rounded-3xl p-7 md:p-10"
            >
              <h2 className="font-display text-3xl md:text-4xl tracking-tight">
                {lang === "de" ? "Deine Angaben" : "Your details"}
              </h2>
              <p className="mt-2 text-sm text-[#475569] font-medium">
                {lang === "de"
                  ? "Alle Felder mit * sind Pflicht."
                  : "All fields with * are required."}
              </p>

              <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={lang === "de" ? "Vorname *" : "First name *"}>
                  <input
                    required
                    type="text"
                    data-testid="booking-first-name"
                    value={form.first_name}
                    onChange={update("first_name")}
                    className="input-field"
                  />
                </Field>
                <Field label={lang === "de" ? "Nachname *" : "Last name *"}>
                  <input
                    required
                    type="text"
                    data-testid="booking-last-name"
                    value={form.last_name}
                    onChange={update("last_name")}
                    className="input-field"
                  />
                </Field>
                <Field label="E-Mail *">
                  <input
                    required
                    type="email"
                    data-testid="booking-email"
                    value={form.email}
                    onChange={update("email")}
                    className="input-field"
                  />
                </Field>
                <Field label={lang === "de" ? "Telefon *" : "Phone *"}>
                  <input
                    required
                    type="tel"
                    data-testid="booking-phone"
                    value={form.phone}
                    onChange={update("phone")}
                    className="input-field"
                  />
                </Field>
                <Field label={lang === "de" ? "Wunschtermin *" : "Preferred date *"}>
                  <input
                    required
                    type="date"
                    min={today}
                    data-testid="booking-date"
                    value={form.preferred_date}
                    onChange={update("preferred_date")}
                    className="input-field"
                  />
                </Field>
                <Field label={lang === "de" ? "Wunschzeit" : "Preferred time"}>
                  <input
                    type="time"
                    data-testid="booking-time"
                    value={form.preferred_time}
                    onChange={update("preferred_time")}
                    className="input-field"
                  />
                </Field>
                <Field label={lang === "de" ? "Standort" : "Location"} className="sm:col-span-2">
                  <Select
                    value={form.location_slug || "__any"}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, location_slug: v === "__any" ? "" : v }))
                    }
                  >
                    <SelectTrigger
                      data-testid="booking-location"
                      className="input-field h-auto"
                    >
                      <SelectValue
                        placeholder={
                          lang === "de" ? "Beliebig / keine Präferenz" : "Any / no preference"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__any" data-testid="booking-location-option-any">
                        {lang === "de" ? "Beliebig / keine Präferenz" : "Any / no preference"}
                      </SelectItem>
                      {locations.map((l) => (
                        <SelectItem
                          key={l.slug}
                          value={l.slug}
                          data-testid={`booking-location-option-${l.slug}`}
                        >
                          {`Fahrschule ${l.name} (${l.canton})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={lang === "de" ? "Nachricht (optional)" : "Message (optional)"} className="sm:col-span-2">
                  <textarea
                    rows={3}
                    data-testid="booking-message"
                    value={form.message}
                    onChange={update("message")}
                    className="input-field resize-none"
                    placeholder={lang === "de" ? "z.B. Vorerfahrung, Wunschfahrzeug, Besonderheiten…" : "e.g. prior experience, preferred car, special notes…"}
                  />
                </Field>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <p className="text-xs text-[#94a3b8] max-w-md leading-relaxed">
                  {lang === "de"
                    ? "Die Online-Buchung ist eine Reservation. Nach Eingang melde ich mich persönlich zur Terminbestätigung."
                    : "The online booking is a reservation. I'll personally confirm the appointment after submission."}
                </p>
                <button
                  type="submit"
                  data-testid="booking-submit"
                  disabled={submitting || !selected}
                  className="btn-accent group disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> {lang === "de" ? "Wird gesendet…" : "Sending…"}
                    </>
                  ) : (
                    <>
                      {lang === "de" ? "Buchung senden" : "Send booking"}
                      <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      <Footer data={content?.contact} />
      <AdminToolbar />
    </main>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-semibold tracking-widest uppercase text-[#475569] mb-2 block">
        {label}
      </span>
      {children}
    </label>
  );
}
