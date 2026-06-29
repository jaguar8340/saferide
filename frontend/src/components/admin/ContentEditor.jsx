import { useEffect, useState } from "react";
import { Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";
import { useLang } from "@/contexts/LanguageContext";

function Field({ label, value, onChange, multiline, testid, type = "text" }) {
  return (
    <label className="block">
      <span className="text-[10px] tracking-[0.25em] uppercase text-white/55 font-bold block mb-2">
        {label}
      </span>
      {multiline ? (
        <textarea
          rows={3}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          data-testid={testid}
          className="w-full bg-[#0f0f0f] border border-white/10 focus:border-[#FF2E00] focus:outline-none px-3 py-2.5 text-sm text-white transition-colors resize-y"
          style={{ borderRadius: 2 }}
        />
      ) : (
        <input
          type={type}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          data-testid={testid}
          className="w-full bg-[#0f0f0f] border border-white/10 focus:border-[#FF2E00] focus:outline-none px-3 py-2.5 text-sm text-white transition-colors"
          style={{ borderRadius: 2 }}
        />
      )}
    </label>
  );
}

function Block({ title, children, testid }) {
  return (
    <section
      data-testid={testid}
      className="card-surface p-6 md:p-7"
      style={{ borderRadius: 2 }}
    >
      <h3 className="font-display font-bold uppercase tracking-tight text-xl mb-5">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export default function ContentEditor() {
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const r = await api.get("/content");
      setData(r.data);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const set = (path) => (val) => {
    setData((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const parts = path.split(".");
      let cur = next;
      for (let i = 0; i < parts.length - 1; i++) {
        cur[parts[i]] = cur[parts[i]] || {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = val;
      return next;
    });
  };

  const setArrayItem = (key, idx, field, val) => {
    setData((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next[key] = next[key] || [];
      next[key][idx] = { ...next[key][idx], [field]: val };
      return next;
    });
  };

  const setPlan = (idx, field, val) => {
    setData((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next.pricing = next.pricing || { plans: [] };
      next.pricing.plans = next.pricing.plans || [];
      next.pricing.plans[idx] = { ...next.pricing.plans[idx], [field]: val };
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/content", data);
      toast.success(t.admin.saved);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !data) {
    return <div className="text-white/50 text-sm">Lade…</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display font-bold uppercase tracking-tight text-2xl md:text-3xl">
            {t.admin.tabs.content}
          </h2>
          <p className="text-white/55 text-sm mt-1">
            Alle Inhalte deiner Website auf einen Blick.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchContent}
            data-testid="content-refresh"
            className="btn-ghost text-[10px] py-2 px-3"
            style={{ borderRadius: 2 }}
          >
            <RefreshCw size={13} /> Reload
          </button>
          <button
            onClick={save}
            disabled={saving}
            data-testid="content-save-btn"
            className="btn-primary text-[10px] py-2 px-4 disabled:opacity-60"
            style={{ borderRadius: 2 }}
          >
            <Save size={13} />
            {saving ? t.admin.saving : t.admin.save}
          </button>
        </div>
      </div>

      <Block title="Hero" testid="block-hero">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Overline DE" value={data.hero?.overline_de} onChange={set("hero.overline_de")} testid="hero-overline-de" />
          <Field label="Overline EN" value={data.hero?.overline_en} onChange={set("hero.overline_en")} testid="hero-overline-en" />
          <Field label="Titel DE" value={data.hero?.title_de} onChange={set("hero.title_de")} testid="hero-title-de" />
          <Field label="Titel EN" value={data.hero?.title_en} onChange={set("hero.title_en")} testid="hero-title-en" />
          <Field label="Highlight DE" value={data.hero?.highlight_de} onChange={set("hero.highlight_de")} testid="hero-highlight-de" />
          <Field label="Highlight EN" value={data.hero?.highlight_en} onChange={set("hero.highlight_en")} testid="hero-highlight-en" />
          <Field label="Untertitel DE" value={data.hero?.subtitle_de} onChange={set("hero.subtitle_de")} testid="hero-subtitle-de" multiline />
          <Field label="Untertitel EN" value={data.hero?.subtitle_en} onChange={set("hero.subtitle_en")} testid="hero-subtitle-en" multiline />
          <Field label="CTA primär DE" value={data.hero?.cta_primary_de} onChange={set("hero.cta_primary_de")} testid="hero-cta-primary-de" />
          <Field label="CTA primär EN" value={data.hero?.cta_primary_en} onChange={set("hero.cta_primary_en")} testid="hero-cta-primary-en" />
          <Field label="Hintergrundbild URL" value={data.hero?.image_url} onChange={set("hero.image_url")} testid="hero-image-url" />
        </div>
      </Block>

      <Block title="Marquee" testid="block-marquee">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Text DE (mit · trennen)" value={data.marquee_de} onChange={set("marquee_de")} testid="marquee-de" />
          <Field label="Text EN (mit · trennen)" value={data.marquee_en} onChange={set("marquee_en")} testid="marquee-en" />
        </div>
      </Block>

      <Block title="Über mich" testid="block-about">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Overline DE" value={data.about?.overline_de} onChange={set("about.overline_de")} testid="about-overline-de" />
          <Field label="Overline EN" value={data.about?.overline_en} onChange={set("about.overline_en")} testid="about-overline-en" />
          <Field label="Titel DE" value={data.about?.title_de} onChange={set("about.title_de")} testid="about-title-de" />
          <Field label="Titel EN" value={data.about?.title_en} onChange={set("about.title_en")} testid="about-title-en" />
          <Field label="Text DE" value={data.about?.body_de} onChange={set("about.body_de")} testid="about-body-de" multiline />
          <Field label="Text EN" value={data.about?.body_en} onChange={set("about.body_en")} testid="about-body-en" multiline />
          <Field label="Bild URL" value={data.about?.image_url} onChange={set("about.image_url")} testid="about-image-url" />
          <div className="grid grid-cols-3 gap-3 md:col-span-2">
            <Field label="Stat 1 Wert" value={data.about?.stat1_value} onChange={set("about.stat1_value")} testid="about-stat1-value" />
            <Field label="Stat 1 Label DE" value={data.about?.stat1_label_de} onChange={set("about.stat1_label_de")} testid="about-stat1-de" />
            <Field label="Stat 1 Label EN" value={data.about?.stat1_label_en} onChange={set("about.stat1_label_en")} testid="about-stat1-en" />
            <Field label="Stat 2 Wert" value={data.about?.stat2_value} onChange={set("about.stat2_value")} testid="about-stat2-value" />
            <Field label="Stat 2 Label DE" value={data.about?.stat2_label_de} onChange={set("about.stat2_label_de")} testid="about-stat2-de" />
            <Field label="Stat 2 Label EN" value={data.about?.stat2_label_en} onChange={set("about.stat2_label_en")} testid="about-stat2-en" />
            <Field label="Stat 3 Wert" value={data.about?.stat3_value} onChange={set("about.stat3_value")} testid="about-stat3-value" />
            <Field label="Stat 3 Label DE" value={data.about?.stat3_label_de} onChange={set("about.stat3_label_de")} testid="about-stat3-de" />
            <Field label="Stat 3 Label EN" value={data.about?.stat3_label_en} onChange={set("about.stat3_label_en")} testid="about-stat3-en" />
          </div>
        </div>
      </Block>

      <Block title="Angebote" testid="block-services">
        <div className="space-y-4">
          {(data.services || []).map((s, i) => (
            <div
              key={s.id || i}
              data-testid={`service-edit-${i}`}
              className="grid grid-cols-1 md:grid-cols-2 gap-3 border border-white/10 p-4"
              style={{ borderRadius: 2 }}
            >
              <Field label={`#${i + 1} Titel DE`} value={s.title_de} onChange={(v) => setArrayItem("services", i, "title_de", v)} testid={`service-${i}-title-de`} />
              <Field label="Titel EN" value={s.title_en} onChange={(v) => setArrayItem("services", i, "title_en", v)} testid={`service-${i}-title-en`} />
              <Field label="Beschreibung DE" value={s.description_de} onChange={(v) => setArrayItem("services", i, "description_de", v)} testid={`service-${i}-desc-de`} multiline />
              <Field label="Beschreibung EN" value={s.description_en} onChange={(v) => setArrayItem("services", i, "description_en", v)} testid={`service-${i}-desc-en`} multiline />
              <Field label="Icon (Car/Truck/BookOpen/Brain/Heart/ShieldCheck)" value={s.icon} onChange={(v) => setArrayItem("services", i, "icon", v)} testid={`service-${i}-icon`} />
            </div>
          ))}
        </div>
      </Block>

      <Block title="Flotte" testid="block-fleet">
        <div className="space-y-4">
          {(data.fleet || []).map((f, i) => (
            <div
              key={f.id || i}
              data-testid={`fleet-edit-${i}`}
              className="grid grid-cols-1 md:grid-cols-2 gap-3 border border-white/10 p-4"
              style={{ borderRadius: 2 }}
            >
              <Field label={`#${i + 1} Name`} value={f.name} onChange={(v) => setArrayItem("fleet", i, "name", v)} testid={`fleet-${i}-name`} />
              <Field label="Spec" value={f.spec} onChange={(v) => setArrayItem("fleet", i, "spec", v)} testid={`fleet-${i}-spec`} />
              <Field label="Beschreibung DE" value={f.description_de} onChange={(v) => setArrayItem("fleet", i, "description_de", v)} testid={`fleet-${i}-desc-de`} multiline />
              <Field label="Beschreibung EN" value={f.description_en} onChange={(v) => setArrayItem("fleet", i, "description_en", v)} testid={`fleet-${i}-desc-en`} multiline />
              <Field label="Bild URL" value={f.image_url} onChange={(v) => setArrayItem("fleet", i, "image_url", v)} testid={`fleet-${i}-image`} />
            </div>
          ))}
        </div>
      </Block>

      <Block title="Preise" testid="block-pricing">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Titel DE" value={data.pricing?.title_de} onChange={set("pricing.title_de")} testid="pricing-title-de" />
          <Field label="Titel EN" value={data.pricing?.title_en} onChange={set("pricing.title_en")} testid="pricing-title-en" />
          <Field label="Untertitel DE" value={data.pricing?.subtitle_de} onChange={set("pricing.subtitle_de")} testid="pricing-subtitle-de" multiline />
          <Field label="Untertitel EN" value={data.pricing?.subtitle_en} onChange={set("pricing.subtitle_en")} testid="pricing-subtitle-en" multiline />
          <Field label="Hinweis DE" value={data.pricing?.note_de} onChange={set("pricing.note_de")} testid="pricing-note-de" multiline />
          <Field label="Hinweis EN" value={data.pricing?.note_en} onChange={set("pricing.note_en")} testid="pricing-note-en" multiline />
        </div>
        <div className="space-y-3 mt-3">
          {(data.pricing?.plans || []).map((p, i) => (
            <div
              key={p.id || i}
              data-testid={`plan-edit-${i}`}
              className="grid grid-cols-1 md:grid-cols-3 gap-3 border border-white/10 p-4"
              style={{ borderRadius: 2 }}
            >
              <Field label={`#${i + 1} Region DE`} value={p.region_de} onChange={(v) => setPlan(i, "region_de", v)} testid={`plan-${i}-region-de`} />
              <Field label="Region EN" value={p.region_en} onChange={(v) => setPlan(i, "region_en", v)} testid={`plan-${i}-region-en`} />
              <Field label="Preis" value={p.price} onChange={(v) => setPlan(i, "price", v)} testid={`plan-${i}-price`} />
              <Field label="Name DE" value={p.name_de} onChange={(v) => setPlan(i, "name_de", v)} testid={`plan-${i}-name-de`} />
              <Field label="Name EN" value={p.name_en} onChange={(v) => setPlan(i, "name_en", v)} testid={`plan-${i}-name-en`} />
              <Field label="Dauer DE" value={p.duration_de} onChange={(v) => setPlan(i, "duration_de", v)} testid={`plan-${i}-dur-de`} />
              <Field label="Dauer EN" value={p.duration_en} onChange={(v) => setPlan(i, "duration_en", v)} testid={`plan-${i}-dur-en`} />
              <label className="flex items-center gap-2 text-xs mt-7">
                <input
                  type="checkbox"
                  checked={!!p.highlight}
                  onChange={(e) => setPlan(i, "highlight", e.target.checked)}
                  data-testid={`plan-${i}-highlight`}
                />
                Hervorheben
              </label>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Kontakt" testid="block-contact">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Telefon" value={data.contact?.phone} onChange={set("contact.phone")} testid="contact-phone-edit" />
          <Field label="E-Mail" value={data.contact?.email} onChange={set("contact.email")} testid="contact-email-edit" />
          <Field label="Adresse DE" value={data.contact?.address_de} onChange={set("contact.address_de")} testid="contact-addr-de" />
          <Field label="Adresse EN" value={data.contact?.address_en} onChange={set("contact.address_en")} testid="contact-addr-en" />
          <Field label="Öffnungszeiten DE" value={data.contact?.hours_de} onChange={set("contact.hours_de")} testid="contact-hours-de" />
          <Field label="Öffnungszeiten EN" value={data.contact?.hours_en} onChange={set("contact.hours_en")} testid="contact-hours-en" />
          <Field label="Instagram URL" value={data.contact?.instagram} onChange={set("contact.instagram")} testid="contact-instagram" />
          <Field label="TikTok URL" value={data.contact?.tiktok} onChange={set("contact.tiktok")} testid="contact-tiktok" />
        </div>
      </Block>

      <div className="sticky bottom-3 bg-[#0a0a0a]/95 backdrop-blur p-3 border border-white/10 flex justify-end" style={{ borderRadius: 2 }}>
        <button
          onClick={save}
          disabled={saving}
          data-testid="content-save-btn-bottom"
          className="btn-primary text-[10px] py-2 px-4 disabled:opacity-60"
          style={{ borderRadius: 2 }}
        >
          <Save size={13} />
          {saving ? t.admin.saving : t.admin.save}
        </button>
      </div>
    </div>
  );
}
