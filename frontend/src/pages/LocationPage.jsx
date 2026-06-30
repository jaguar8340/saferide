import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  MapPin,
  Phone,
  Plus,
  Trash2,
  ChevronDown,
  Loader2,
  ImagePlus,
  Star,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";
import { api, formatApiError, resolveUrl } from "@/lib/api";
import Editable from "@/components/edit/Editable";
import EditableImage from "@/components/edit/EditableImage";
import GoogleIcon from "@/components/site/GoogleIcon";
import NadineIntroCard from "@/components/site/NadineIntroCard";
import OtherLocationsSection from "@/components/site/OtherLocationsSection";
import SubPageHeader from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import AdminToolbar from "@/components/edit/AdminToolbar";

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
  const { lang, pick, t } = useLang();
  const { content, editMode } = useEdit();
  const [loc, setLoc] = useState(null);
  const [allLocs, setAllLocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);
  const pending = useRef({});
  const flushTimer = useRef(null);
  const galleryFileRef = useRef(null);
  const replaceTargetRef = useRef(null);
  const [uploading, setUploading] = useState(false);

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

  // Fetch list of ALL locations for the "Andere Standorte" cross-link block.
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

  // Gallery actions (admin only)
  const handleAddImage = () => {
    replaceTargetRef.current = null;
    galleryFileRef.current?.click();
  };
  const handleReplaceImage = (id) => () => {
    replaceTargetRef.current = id;
    galleryFileRef.current?.click();
  };
  const handleRemoveImage = (id) => async () => {
    if (!confirm("Bild aus dieser Standort-Galerie entfernen?")) return;
    const next = (loc.gallery || []).filter((g) => g.id !== id);
    updateField("gallery", next);
  };
  const handleGalleryFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Bitte eine Bilddatei wählen");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const url = up.data.url;
      const list = loc.gallery || [];
      if (replaceTargetRef.current) {
        const idx = list.findIndex((g) => g.id === replaceTargetRef.current);
        if (idx >= 0) updateField(`gallery.${idx}.image_url`, url);
      } else {
        const newItem = { id: `lg${Date.now()}`, image_url: url, caption_de: "", caption_en: "" };
        updateField("gallery", [...list, newItem]);
      }
      toast.success("Galerie aktualisiert");
    } catch (err) {
      toast.error(formatApiError(err, "Upload fehlgeschlagen"));
    } finally {
      setUploading(false);
      replaceTargetRef.current = null;
    }
  };

  // FAQ actions
  const addFaq = () => {
    const list = loc.faqs || [];
    const newItem = {
      id: `f${Date.now()}`,
      question_de: "Neue Frage",
      question_en: "New question",
      answer_de: "Klicken zum Bearbeiten…",
      answer_en: "Click to edit…",
    };
    updateField("faqs", [...list, newItem]);
  };
  const removeFaq = (id) => () => {
    if (!confirm("FAQ-Eintrag löschen?")) return;
    const next = (loc.faqs || []).filter((f) => f.id !== id);
    updateField("faqs", next);
  };

  // Routes actions
  const addRoute = () => {
    const list = loc.exam_routes || [];
    updateField("exam_routes", [...list, { id: `r${Date.now()}`, text_de: "Neue Strecke", text_en: "New route" }]);
  };
  const removeRoute = (id) => () => {
    const next = (loc.exam_routes || []).filter((r) => r.id !== id);
    updateField("exam_routes", next);
  };

  // Ideal-for points actions
  const updatePoint = (i) => (val) => {
    const list = lang === "de" ? loc.ideal_for_points_de || [] : loc.ideal_for_points_en || [];
    const next = [...list];
    next[i] = val;
    updateField(`ideal_for_points_${lang}`, next);
  };

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
  const faqs = loc.faqs || [];
  const routes = loc.exam_routes || [];
  const priceItems = loc.price_items || [];
  const gallery = loc.gallery || [];
  const points = lang === "de" ? loc.ideal_for_points_de || [] : loc.ideal_for_points_en || [];

  return (
    <main
      data-testid="location-page"
      data-location-slug={loc.slug}
      className="min-h-screen bg-[#fbf9f6] text-[#0f172a] font-sans"
    >
      <SubPageHeader />

      {/* HERO */}
      <section className="relative pt-16 md:pt-20 pb-12 md:pb-16 overflow-hidden">
        <div className="container-x px-5 md:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-7">
              <div className="flex items-center gap-2 mb-5">
                <span className="dot-accent animate-pulse-accent" />
                <Editable
                  path={`hero_overline_${lang}`}
                  value={pick(loc.hero_overline_de, loc.hero_overline_en)}
                  onUpdate={updateField}
                  className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]"
                />
              </div>
              <h1
                className="font-display leading-[0.92] tracking-tight"
                style={{ fontSize: "clamp(2.6rem, 6.5vw, 6rem)" }}
              >
                <Editable
                  path={`hero_title_${lang}`}
                  value={pick(loc.hero_title_de, loc.hero_title_en)}
                  onUpdate={updateField}
                  as="span"
                  className="inline-block"
                />
              </h1>
              <Editable
                path={`hero_highlight_${lang}`}
                value={pick(loc.hero_highlight_de, loc.hero_highlight_en)}
                onUpdate={updateField}
                as="p"
                className="mt-4 inline-flex items-center gap-2 bg-white border border-[#e2e8f0] rounded-full px-4 py-2 text-sm font-semibold text-[#475569]"
              />
              <Editable
                path={`hero_subtitle_${lang}`}
                value={pick(loc.hero_subtitle_de, loc.hero_subtitle_en)}
                onUpdate={updateField}
                as="p"
                multiline
                className="mt-6 max-w-2xl text-lg md:text-xl text-[#475569] leading-relaxed font-medium block"
              />

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/#contact" data-testid="loc-cta-primary" className="btn-accent">
                  {lang === "de" ? "Probelektion anfragen" : "Request lesson"}
                  <ArrowRight size={16} />
                </Link>
                <a href={`tel:${phone.replace(/\s/g, "")}`} className="btn-ghost">
                  <Phone size={14} /> {phone}
                </a>
              </div>
            </div>
            <div className="lg:col-span-5">
              <NadineIntroCard data={content?.nadine} />
            </div>
          </div>
        </div>
      </section>

      {/* WHY + IDEAL FOR */}
      <section className="section-pad bg-white border-y border-[#e2e8f0]">
        <div className="container-x px-5 md:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
            <div className="lg:col-span-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="dot-accent" />
                <Editable
                  path={`why_overline_${lang}`}
                  value={pick(loc.why_overline_de, loc.why_overline_en)}
                  onUpdate={updateField}
                  className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]"
                />
              </div>
              <Editable
                path={`why_title_${lang}`}
                value={pick(loc.why_title_de, loc.why_title_en)}
                onUpdate={updateField}
                as="h2"
                className="font-display leading-[0.98] tracking-tight block"
                style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
              />
              <Editable
                path={`why_body_${lang}`}
                value={pick(loc.why_body_de, loc.why_body_en)}
                onUpdate={updateField}
                as="p"
                multiline
                className="mt-6 text-lg text-[#475569] leading-relaxed font-medium block"
              />
            </div>
            <div className="lg:col-span-6">
              <Editable
                path={`ideal_for_title_${lang}`}
                value={pick(loc.ideal_for_title_de, loc.ideal_for_title_en)}
                onUpdate={updateField}
                as="h3"
                className="font-display text-2xl md:text-3xl leading-tight block mb-6"
              />
              <ul className="space-y-3">
                {points.map((p, i) => (
                  <li
                    key={i}
                    data-testid={`loc-ideal-${i}`}
                    className="flex items-start gap-3 bg-[#fbf9f6] border border-[#e2e8f0] rounded-2xl p-4"
                  >
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#ff5a36] text-white font-display text-sm shrink-0">
                      {i + 1}
                    </span>
                    {editMode ? (
                      <input
                        type="text"
                        defaultValue={p || ""}
                        onBlur={(e) => updatePoint(i)(e.target.value)}
                        className="flex-1 bg-transparent text-base font-medium leading-relaxed text-[#0f172a] focus:outline-none focus:bg-white rounded-md px-2 -mx-2"
                      />
                    ) : (
                      <span className="text-base font-medium leading-relaxed text-[#0f172a]">{p}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* EXAM ROUTES */}
      <section className="section-pad bg-[#fbf9f6]">
        <div className="container-x px-5 md:px-8 lg:px-12">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="dot-accent" />
                <span className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]">
                  Routes
                </span>
              </div>
              <Editable
                path={`exam_routes_title_${lang}`}
                value={pick(loc.exam_routes_title_de, loc.exam_routes_title_en)}
                onUpdate={updateField}
                as="h2"
                className="font-display leading-[0.98] tracking-tight block"
                style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
              />
              <Editable
                path={`exam_routes_intro_${lang}`}
                value={pick(loc.exam_routes_intro_de, loc.exam_routes_intro_en)}
                onUpdate={updateField}
                as="p"
                multiline
                className="mt-4 max-w-2xl text-base text-[#475569] leading-relaxed font-medium block"
              />
            </div>
            {editMode && (
              <button
                onClick={addRoute}
                data-testid="loc-route-add"
                className="btn-accent text-sm py-2.5 px-4"
              >
                <Plus size={14} /> Strecke
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {routes.map((r, i) => (
              <motion.div
                key={r.id}
                data-testid={`loc-route-${i}`}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: (i % 2) * 0.04 }}
                className="relative bg-white border border-[#e2e8f0] rounded-2xl p-5"
              >
                <div className="flex items-start gap-4">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#0f172a] text-white font-display text-base shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Editable
                    path={`exam_routes.${i}.text_${lang}`}
                    value={pick(r.text_de, r.text_en)}
                    onUpdate={updateField}
                    as="p"
                    className="text-base font-semibold leading-snug text-[#0f172a] flex-1 block"
                  />
                  {editMode && (
                    <button
                      onClick={removeRoute(r.id)}
                      data-testid={`loc-route-remove-${i}`}
                      className="text-[#94a3b8] hover:text-[#ff5a36] transition-colors"
                      aria-label="Strecke entfernen"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                {(editMode || pick(r.description_de, r.description_en)) && (
                  <Editable
                    path={`exam_routes.${i}.description_${lang}`}
                    value={pick(r.description_de, r.description_en)}
                    onUpdate={updateField}
                    as="p"
                    multiline
                    placeholder={lang === "de" ? "Beschreibung der Strecke …" : "Route description …"}
                    className="mt-3 pl-[3.25rem] text-sm text-[#475569] leading-relaxed font-medium block"
                  />
                )}
              </motion.div>
            ))}
          </div>

          <div className="mt-10 max-w-3xl" data-testid="loc-routes-outro">
            <Editable
              path={`exam_routes_outro_${lang}`}
              value={pick(loc.exam_routes_outro_de, loc.exam_routes_outro_en)}
              onUpdate={updateField}
              as="p"
              multiline
              placeholder={lang === "de" ? "Ergänzender Text zu den Prüfungsstrecken …" : "Additional text about the exam routes …"}
              className="text-base text-[#475569] leading-relaxed font-medium block"
            />
          </div>
        </div>
      </section>

      {/* MEETPOINT + MAP */}
      <section className="section-pad bg-white border-y border-[#e2e8f0]">
        <div className="container-x px-5 md:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-5">
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={14} className="text-[#ff5a36]" />
                <span className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]">
                  Meet
                </span>
              </div>
              <Editable
                path={`meet_title_${lang}`}
                value={pick(loc.meet_title_de, loc.meet_title_en)}
                onUpdate={updateField}
                as="h2"
                className="font-display leading-[0.98] tracking-tight block"
                style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)" }}
              />
              <Editable
                path={`meet_address_${lang}`}
                value={pick(loc.meet_address_de, loc.meet_address_en)}
                onUpdate={updateField}
                as="div"
                className="mt-6 font-display text-xl md:text-2xl tracking-tight text-[#ff5a36] block"
              />
              <Editable
                path={`meet_description_${lang}`}
                value={pick(loc.meet_description_de, loc.meet_description_en)}
                onUpdate={updateField}
                as="p"
                multiline
                className="mt-4 text-base text-[#475569] leading-relaxed font-medium block"
              />
              {editMode && (
                <div className="mt-6">
                  <label className="text-[10px] font-semibold tracking-widest uppercase text-[#94a3b8]">
                    Google Maps Embed URL
                  </label>
                  <input
                    type="text"
                    defaultValue={loc.map_embed_url || ""}
                    onBlur={(e) => updateField("map_embed_url", e.target.value)}
                    placeholder="https://www.google.com/maps?q=…&output=embed"
                    data-testid="loc-map-url"
                    className="mt-1 w-full text-xs bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
                  />
                </div>
              )}
            </div>
            <div className="lg:col-span-7">
              <div className="rounded-3xl overflow-hidden border border-[#e2e8f0] h-[360px] md:h-[440px] bg-[#fbf9f6]">
                {loc.map_embed_url && (
                  <iframe
                    src={loc.map_embed_url}
                    title={`Karte ${loc.name}`}
                    data-testid="loc-map-iframe"
                    className="w-full h-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY SAFE RIDE in {name} */}
      <section className="section-pad bg-[#0f172a] text-white" data-testid="loc-why-saferide">
        <div className="container-x px-5 md:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="dot-accent" />
                <Editable
                  path={`why_overline2_${lang}`}
                  value={pick(loc.why_overline2_de, loc.why_overline2_en)}
                  onUpdate={updateField}
                  className="text-xs font-semibold tracking-[0.18em] uppercase text-white/65"
                />
              </div>
              <Editable
                path={`why_title2_${lang}`}
                value={pick(loc.why_title2_de, loc.why_title2_en)}
                onUpdate={updateField}
                as="h2"
                className="font-display leading-[0.98] tracking-tight block text-white"
                style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
              />
              <Editable
                path={`why_body2_${lang}`}
                value={pick(loc.why_body2_de, loc.why_body2_en)}
                onUpdate={updateField}
                as="p"
                multiline
                className="mt-6 text-lg text-white/75 leading-relaxed font-medium block"
              />
            </div>
            <div className="lg:col-span-7">
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(loc.why_points2 || []).map((p, i) => (
                  <li
                    key={p.id || i}
                    data-testid={`loc-why2-${i}`}
                    className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-2xl p-5"
                  >
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#ff5a36] text-white shrink-0">
                      <Check size={14} strokeWidth={2.6} />
                    </span>
                    <Editable
                      path={`why_points2.${i}.text_${lang}`}
                      value={pick(p.text_de, p.text_en)}
                      onUpdate={updateField}
                      as="p"
                      multiline
                      className="text-base text-white leading-relaxed font-medium block flex-1"
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* PRICES */}
      <section className="section-pad bg-[#fbf9f6]">
        <div className="container-x px-5 md:px-8 lg:px-12">
          <div className="max-w-2xl mb-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="dot-accent" />
              <span className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]">
                CHF · Preise
              </span>
            </div>
            <Editable
              path={`price_title_${lang}`}
              value={pick(loc.price_title_de, loc.price_title_en)}
              onUpdate={updateField}
              as="h2"
              className="font-display leading-[0.98] tracking-tight block"
              style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
            />
            <Editable
              path={`price_intro_${lang}`}
              value={pick(loc.price_intro_de, loc.price_intro_en)}
              onUpdate={updateField}
              as="p"
              multiline
              className="mt-4 text-base text-[#475569] leading-relaxed font-medium block"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {priceItems.map((p, i) => (
              <motion.div
                key={p.id || i}
                data-testid={`loc-price-${i}`}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className={`rounded-3xl p-7 md:p-8 border ${
                  i === 1
                    ? "bg-[#0f172a] text-white border-[#0f172a]"
                    : "bg-white text-[#0f172a] border-[#e2e8f0]"
                }`}
              >
                <Editable
                  path={`price_items.${i}.label_${lang}`}
                  value={pick(p.label_de, p.label_en)}
                  onUpdate={updateField}
                  as="div"
                  className="text-sm font-semibold opacity-80 mb-3 block"
                />
                <Editable
                  path={`price_items.${i}.price`}
                  value={p.price}
                  onUpdate={updateField}
                  as="div"
                  className="font-display text-5xl tracking-tighter block"
                />
              </motion.div>
            ))}
          </div>
          <Editable
            path={`price_note_${lang}`}
            value={pick(loc.price_note_de, loc.price_note_en)}
            onUpdate={updateField}
            as="p"
            multiline
            className="mt-8 text-sm text-[#475569] max-w-3xl leading-relaxed font-medium block"
          />
        </div>
      </section>

      {/* GALLERY */}
      <section className="section-pad bg-white border-y border-[#e2e8f0]">
        <div className="container-x px-5 md:px-8 lg:px-12">
          <div className="flex items-end justify-between gap-4 mb-10 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="dot-accent" />
                <span className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]">
                  Gallery
                </span>
              </div>
              <Editable
                path={`gallery_title_${lang}`}
                value={pick(loc.gallery_title_de, loc.gallery_title_en)}
                onUpdate={updateField}
                as="h2"
                className="font-display leading-[0.98] tracking-tight block"
                style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
              />
            </div>
            {editMode && (
              <button
                onClick={handleAddImage}
                disabled={uploading}
                data-testid="loc-gallery-add"
                className="btn-accent text-sm py-2.5 px-4 disabled:opacity-60"
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Bild
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {gallery.map((g, i) => (
              <div
                key={g.id}
                data-testid={`loc-gallery-${i}`}
                className="group relative overflow-hidden rounded-3xl"
              >
                <img
                  src={resolveUrl(g.image_url)}
                  alt={pick(g.caption_de, g.caption_en) || loc.name}
                  className="w-full h-[220px] md:h-[280px] object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {editMode && (
                  <>
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/45 transition-colors flex items-center justify-center gap-2 opacity-0 hover:opacity-100">
                      <button
                        onClick={handleReplaceImage(g.id)}
                        data-testid={`loc-gallery-replace-${i}`}
                        className="inline-flex items-center gap-1.5 bg-white text-[#0f172a] rounded-full px-3 py-2 text-xs font-semibold"
                      >
                        <ImagePlus size={13} /> Ersetzen
                      </button>
                      <button
                        onClick={handleRemoveImage(g.id)}
                        data-testid={`loc-gallery-remove-${i}`}
                        className="inline-flex items-center gap-1.5 bg-[#ff5a36] text-white rounded-full px-3 py-2 text-xs font-semibold"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <input
                        type="text"
                        defaultValue={pick(g.caption_de, g.caption_en) || ""}
                        onBlur={(e) => updateField(`gallery.${i}.caption_${lang}`, e.target.value)}
                        placeholder={lang === "de" ? "Bildtitel…" : "Caption…"}
                        data-testid={`loc-gallery-caption-${i}`}
                        className="w-full bg-white/90 backdrop-blur text-[#0f172a] text-xs font-medium rounded-full px-3 py-1.5 border border-white/50 focus:border-[#ff5a36] focus:outline-none"
                      />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <input
            ref={galleryFileRef}
            type="file"
            accept="image/*"
            onChange={handleGalleryFile}
            className="hidden"
            data-testid="loc-gallery-file"
          />
        </div>
      </section>

      {/* GOOGLE REVIEWS */}
      <section className="section-pad bg-white border-y border-[#e2e8f0]" data-testid="loc-google-reviews">
        <div className="container-x px-5 md:px-8 lg:px-12 text-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-4">
            <GoogleIcon size={20} />
            <Editable
              path={`google_reviews_overline_${lang}`}
              value={pick(loc.google_reviews_overline_de, loc.google_reviews_overline_en)}
              onUpdate={updateField}
              className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]"
            />
          </div>
          <Editable
            path={`google_reviews_title_${lang}`}
            value={pick(loc.google_reviews_title_de, loc.google_reviews_title_en)}
            onUpdate={updateField}
            as="h2"
            className="font-display leading-[0.98] tracking-tight block"
            style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)" }}
          />
          <div className="mt-5 inline-flex items-center gap-3 bg-[#fbf9f6] rounded-full px-5 py-2.5 text-sm">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} className="text-[#ff5a36]" fill="#ff5a36" />
              ))}
            </div>
            <span className="font-semibold text-[#0f172a]">
              {content?.google_reviews_count || "60+"}
            </span>
            <span className="text-[#475569]">
              {lang === "de" ? "5-Sterne-Bewertungen" : "5-star reviews"}
            </span>
          </div>
          <Editable
            path={`google_reviews_subtitle_${lang}`}
            value={pick(loc.google_reviews_subtitle_de, loc.google_reviews_subtitle_en)}
            onUpdate={updateField}
            as="p"
            multiline
            className="mt-6 max-w-xl mx-auto text-base text-[#475569] leading-relaxed font-medium block"
          />
          {editMode && (
            <div className="mt-4 max-w-xl mx-auto">
              <label className="text-[10px] font-semibold tracking-widest uppercase text-[#94a3b8] block text-left mb-1">
                Google-Bewertungen-Link (für diesen Standort)
              </label>
              <input
                type="url"
                defaultValue={loc.google_reviews_url || ""}
                onBlur={(e) => updateField("google_reviews_url", e.target.value)}
                placeholder="https://g.page/r/…"
                data-testid="loc-google-reviews-url"
                className="w-full text-xs bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
              />
            </div>
          )}
          <a
            href={loc.google_reviews_url || content?.google_reviews_url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="loc-google-reviews-cta"
            className="mt-8 inline-flex items-center gap-2 btn-accent"
          >
            <GoogleIcon size={16} />
            <Editable
              path={`google_reviews_cta_${lang}`}
              value={pick(loc.google_reviews_cta_de, loc.google_reviews_cta_en)}
              onUpdate={updateField}
            />
            <ArrowUpRight size={14} />
          </a>
        </div>
      </section>

      {/* OTHER REGIONS */}
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

      {/* FAQ */}
      <section className="section-pad bg-[#fbf9f6]">
        <div className="container-x px-5 md:px-8 lg:px-12">
          <div className="flex items-end justify-between gap-4 mb-10 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="dot-accent" />
                <span className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]">
                  FAQ
                </span>
              </div>
              <Editable
                path={`faq_title_${lang}`}
                value={pick(loc.faq_title_de, loc.faq_title_en)}
                onUpdate={updateField}
                as="h2"
                className="font-display leading-[0.98] tracking-tight block"
                style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
              />
              <Editable
                path={`faq_intro_${lang}`}
                value={pick(loc.faq_intro_de, loc.faq_intro_en)}
                onUpdate={updateField}
                as="p"
                multiline
                className="mt-3 max-w-xl text-base text-[#475569] leading-relaxed font-medium block"
              />
            </div>
            {editMode && (
              <button onClick={addFaq} data-testid="loc-faq-add" className="btn-accent text-sm py-2.5 px-4">
                <Plus size={14} /> Frage
              </button>
            )}
          </div>

          <div className="max-w-3xl mx-auto divide-y divide-[#e2e8f0] border-y border-[#e2e8f0]">
            {faqs.map((f, i) => {
              const isOpen = openFaq === f.id;
              return (
                <div key={f.id} data-testid={`loc-faq-${i}`} className="py-5">
                  <div className="flex items-center justify-between gap-4">
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : f.id)}
                      className="flex-1 flex items-center justify-between gap-4 text-left"
                    >
                      <Editable
                        path={`faqs.${i}.question_${lang}`}
                        value={pick(f.question_de, f.question_en)}
                        onUpdate={updateField}
                        as="span"
                        className="font-display text-lg md:text-xl tracking-tight text-[#0f172a] flex-1"
                      />
                      <ChevronDown
                        size={18}
                        className={`text-[#475569] transition-transform duration-300 shrink-0 ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {editMode && (
                      <button
                        onClick={removeFaq(f.id)}
                        data-testid={`loc-faq-remove-${i}`}
                        className="ml-2 text-[#94a3b8] hover:text-[#ff5a36] shrink-0"
                        aria-label="FAQ löschen"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  {isOpen && (
                    <Editable
                      path={`faqs.${i}.answer_${lang}`}
                      value={pick(f.answer_de, f.answer_en)}
                      onUpdate={updateField}
                      as="p"
                      multiline
                      className="mt-4 text-base text-[#475569] leading-relaxed font-medium block"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
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
              {lang === "de" ? "Probelektion anfragen" : "Request lesson"}
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

      <Footer data={content?.contact} />
      <AdminToolbar />
    </main>
  );
}
