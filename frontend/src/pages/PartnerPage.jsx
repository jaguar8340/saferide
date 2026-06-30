import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, Plus, Trash2, Loader2, ImagePlus, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";
import { api, formatApiError, resolveUrl } from "@/lib/api";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import AdminToolbar from "@/components/edit/AdminToolbar";
import CanonicalLink from "@/components/site/CanonicalLink";

function PartnerCard({ partner, onPatch, onRemove }) {
  const { lang, pick } = useLang();
  const { editMode } = useEdit();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const setField = (field, value) => {
    if (value === (partner[field] || "")) return;
    onPatch(partner.slug, { [field]: value });
  };

  const uploadLogo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await api.post("/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onPatch(partner.slug, { logo_url: up.data.url });
    } catch (err) {
      toast.error(formatApiError(err, "Upload fehlgeschlagen"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.article
      layout
      data-testid={`partner-card-${partner.slug}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.35 }}
      className="group relative bg-white border border-[#e2e8f0] rounded-3xl p-7 md:p-8 hover:-translate-y-1 hover:border-[#ff5a36] transition-all duration-300"
    >
      {/* Logo */}
      <div className="relative w-28 h-28 rounded-2xl bg-[#fbf9f6] overflow-hidden flex items-center justify-center mb-6">
        {partner.logo_url ? (
          <img
            src={resolveUrl(partner.logo_url)}
            alt={partner.name}
            className="max-w-[80%] max-h-[80%] object-contain"
          />
        ) : (
          <span className="font-display text-3xl text-[#0f172a]/30 tracking-tight">
            {partner.name?.charAt(0) || "P"}
          </span>
        )}
        {editMode && (
          <>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              data-testid={`partner-logo-upload-${partner.slug}`}
              className="absolute -bottom-2 -right-2 inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#ff5a36] text-white shadow-md hover:opacity-90 disabled:opacity-50"
              aria-label="Logo hochladen"
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={uploadLogo}
              className="hidden"
            />
          </>
        )}
      </div>

      {/* Category */}
      {editMode ? (
        <input
          type="text"
          defaultValue={pick(partner.category_de, partner.category_en) || ""}
          onBlur={(e) => setField(`category_${lang}`, e.target.value)}
          data-testid={`partner-category-${partner.slug}`}
          placeholder="Kategorie"
          className="w-full bg-transparent text-xs font-semibold tracking-[0.18em] uppercase text-[#ff5a36] focus:outline-none border-b border-transparent focus:border-[#ff5a36] mb-2"
        />
      ) : (
        <div className="text-xs font-semibold tracking-[0.18em] uppercase text-[#ff5a36] mb-2">
          {pick(partner.category_de, partner.category_en)}
        </div>
      )}

      {/* Name */}
      {editMode ? (
        <input
          type="text"
          defaultValue={partner.name || ""}
          onBlur={(e) => setField("name", e.target.value)}
          data-testid={`partner-name-${partner.slug}`}
          placeholder="Name"
          className="w-full bg-transparent font-display text-2xl tracking-tight focus:outline-none border-b border-transparent focus:border-[#ff5a36]"
        />
      ) : (
        <h3 data-testid={`partner-name-${partner.slug}`} className="font-display text-2xl tracking-tight text-[#0f172a]">
          {partner.name}
        </h3>
      )}

      {/* Description */}
      {editMode ? (
        <textarea
          rows={4}
          defaultValue={pick(partner.description_de, partner.description_en) || ""}
          onBlur={(e) => setField(`description_${lang}`, e.target.value)}
          data-testid={`partner-description-${partner.slug}`}
          placeholder="Beschreibung…"
          className="mt-3 w-full bg-transparent text-sm text-[#475569] leading-relaxed font-medium focus:outline-none border-b border-transparent focus:border-[#ff5a36] resize-none"
        />
      ) : (
        <p className="mt-3 text-sm text-[#475569] leading-relaxed font-medium">
          {pick(partner.description_de, partner.description_en)}
        </p>
      )}

      {/* Website link */}
      {editMode ? (
        <input
          type="url"
          defaultValue={partner.website_url || ""}
          onBlur={(e) => setField("website_url", e.target.value)}
          data-testid={`partner-website-${partner.slug}`}
          placeholder="https://…"
          className="mt-5 w-full bg-transparent text-xs font-semibold text-[#0f172a] focus:outline-none border-b border-transparent focus:border-[#ff5a36]"
        />
      ) : (
        partner.website_url && (
          <a
            href={partner.website_url}
            target="_blank"
            rel="noreferrer noopener"
            data-testid={`partner-link-${partner.slug}`}
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0f172a] hover:text-[#ff5a36] transition-colors"
          >
            Website besuchen <ExternalLink size={12} />
          </a>
        )
      )}

      {editMode && (
        <button
          type="button"
          onClick={() => onRemove(partner.slug)}
          data-testid={`partner-remove-${partner.slug}`}
          className="absolute top-4 right-4 text-[#94a3b8] hover:text-[#ff5a36] transition-colors"
          aria-label="Partner entfernen"
        >
          <Trash2 size={13} />
        </button>
      )}

      <span className="absolute bottom-6 right-6 inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#fbf9f6] text-[#0f172a] group-hover:bg-[#ff5a36] group-hover:text-white transition-colors opacity-0 group-hover:opacity-100">
        <ArrowUpRight size={14} />
      </span>
    </motion.article>
  );
}

export default function PartnerPage() {
  const { lang, pick } = useLang();
  const { editMode, content } = useEdit();
  const [partners, setPartners] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    document.title = lang === "de" ? "Partner · Safe Ride" : "Partners · Safe Ride";
    let cancel = false;
    api
      .get("/partners")
      .then((r) => !cancel && setPartners(r.data || []))
      .catch(() => !cancel && setPartners([]));
    return () => {
      cancel = true;
    };
  }, [lang]);

  const onPatch = async (slug, delta) => {
    try {
      const r = await api.patch(`/partners/${slug}`, delta);
      setPartners((cur) => cur.map((p) => (p.slug === slug ? r.data : p)));
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const onRemove = async (slug) => {
    if (!confirm("Partner wirklich löschen?")) return;
    try {
      await api.delete(`/partners/${slug}`);
      setPartners((cur) => cur.filter((p) => p.slug !== slug));
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const addPartner = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const slug = `partner-${Date.now()}`;
      const r = await api.post("/partners", {
        slug,
        name: "Neuer Partner",
        category_de: "Partner-Kategorie",
        category_en: "Partner category",
        description_de: "Klicke zum Bearbeiten…",
        description_en: "Click to edit…",
        logo_url: "",
        website_url: "",
        order: partners.length,
      });
      setPartners((cur) => [...cur, r.data]);
      toast.success("Partner hinzugefügt");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setCreating(false);
    }
  };

  if (partners === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbf9f6] text-[#0f172a]">
        <span className="text-xs font-semibold tracking-widest uppercase opacity-50">Lade…</span>
      </div>
    );
  }

  return (
    <main data-testid="partner-page" className="min-h-screen bg-[#fbf9f6] text-[#0f172a] font-sans">
      <CanonicalLink path="/partner" />
      <Header />

      {/* Hero */}
      <section className="pt-28 md:pt-36 pb-12 md:pb-16">
        <div className="container-x px-5 md:px-8 lg:px-12">
          <div className="flex items-center gap-2 mb-5">
            <span className="dot-accent animate-pulse-accent" />
            <span className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]">
              {lang === "de" ? "Unsere Partner" : "Our partners"}
            </span>
          </div>
          <h1
            className="font-display leading-[0.92] tracking-tight max-w-4xl"
            style={{ fontSize: "clamp(2.6rem, 6vw, 5.6rem)" }}
          >
            {lang === "de" ? (
              <>
                Stark durch <span className="font-serif-i text-[#ff5a36]">Partnerschaft</span>.
              </>
            ) : (
              <>
                Strong through <span className="font-serif-i text-[#ff5a36]">partnership</span>.
              </>
            )}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-[#475569] leading-relaxed font-medium">
            {lang === "de"
              ? "Safe Ride arbeitet mit den besten Verbänden, Behörden und Fachpartnern der Schweiz zusammen, damit du eine ausgezeichnete Ausbildung bekommst."
              : "Safe Ride works with the best Swiss associations, authorities and specialist partners to give you an outstanding education."}
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className="pb-24 md:pb-32">
        <div className="container-x px-5 md:px-8 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            <AnimatePresence>
              {partners.map((p) => (
                <PartnerCard key={p.slug} partner={p} onPatch={onPatch} onRemove={onRemove} />
              ))}
            </AnimatePresence>
          </div>

          {editMode && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={addPartner}
                disabled={creating}
                data-testid="partner-add"
                className="btn-accent text-sm"
              >
                {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Neuer Partner
              </button>
            </div>
          )}

          {partners.length === 0 && !editMode && (
            <div className="text-center text-sm text-[#475569] font-medium py-12">
              {lang === "de" ? "Noch keine Partner erfasst." : "No partners listed yet."}
            </div>
          )}
        </div>
      </section>

      <Footer data={content?.contact} />
      <AdminToolbar />
    </main>
  );
}
