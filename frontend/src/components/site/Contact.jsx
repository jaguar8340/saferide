import { useState } from "react";
import { Phone, Mail, MapPin, Clock, Send } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/contexts/LanguageContext";
import { api, formatApiError } from "@/lib/api";

export default function Contact({ data }) {
  const { t, pick } = useLang();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);

  if (!data) return null;

  const setField = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/contact", form);
      toast.success(t.contact.success);
      setForm({ first_name: "", last_name: "", email: "", phone: "", message: "" });
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const infoItem = "flex items-start gap-3 text-white/75";

  return (
    <section
      id="contact"
      data-testid="contact-section"
      className="section bg-[#050505] border-t border-white/5"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5">
          <div className="overline mb-4">{t.contact.overline}</div>
          <h2 className="font-display font-bold uppercase tracking-tight text-3xl md:text-5xl lg:text-6xl leading-[0.92]">
            {t.contact.title}
          </h2>
          <p className="mt-5 text-white/65 text-base md:text-lg max-w-md">
            {t.contact.sub}
          </p>

          <div className="mt-10 space-y-5">
            <a
              href={`tel:${(data.phone || "").replace(/\s/g, "")}`}
              data-testid="contact-phone"
              className={infoItem + " hover:text-white"}
            >
              <Phone size={18} className="text-[#FF2E00] mt-0.5" />
              <div>
                <div className="text-[10px] tracking-widest uppercase text-white/45 mb-1">
                  Tel
                </div>
                <div className="font-display font-bold text-lg">{data.phone}</div>
              </div>
            </a>
            <a
              href={`mailto:${data.email}`}
              data-testid="contact-email"
              className={infoItem + " hover:text-white"}
            >
              <Mail size={18} className="text-[#FF2E00] mt-0.5" />
              <div>
                <div className="text-[10px] tracking-widest uppercase text-white/45 mb-1">
                  E-Mail
                </div>
                <div className="text-sm">{data.email}</div>
              </div>
            </a>
            <div className={infoItem}>
              <MapPin size={18} className="text-[#FF2E00] mt-0.5" />
              <div>
                <div className="text-[10px] tracking-widest uppercase text-white/45 mb-1">
                  {t.contact.address}
                </div>
                <div className="text-sm">
                  {pick(data.address_de, data.address_en)}
                </div>
              </div>
            </div>
            <div className={infoItem}>
              <Clock size={18} className="text-[#FF2E00] mt-0.5" />
              <div>
                <div className="text-[10px] tracking-widest uppercase text-white/45 mb-1">
                  {t.contact.hours}
                </div>
                <div className="text-sm">
                  {pick(data.hours_de, data.hours_en)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <form
            onSubmit={handleSubmit}
            data-testid="contact-form"
            className="card-surface p-6 md:p-10 space-y-5"
            style={{ borderRadius: 2 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field
                label={t.contact.firstName}
                testid="contact-first-name"
                value={form.first_name}
                onChange={setField("first_name")}
                required
              />
              <Field
                label={t.contact.lastName}
                testid="contact-last-name"
                value={form.last_name}
                onChange={setField("last_name")}
                required
              />
              <Field
                label={t.contact.email}
                type="email"
                testid="contact-email-input"
                value={form.email}
                onChange={setField("email")}
                required
              />
              <Field
                label={t.contact.phone}
                type="tel"
                testid="contact-phone-input"
                value={form.phone}
                onChange={setField("phone")}
                required
              />
            </div>
            <div>
              <label className="text-[10px] tracking-[0.25em] uppercase text-white/55 font-bold">
                {t.contact.message}
              </label>
              <textarea
                rows={5}
                value={form.message}
                onChange={setField("message")}
                data-testid="contact-message"
                className="mt-2 w-full bg-transparent border-b border-white/20 focus:border-[#FF2E00] focus:outline-none py-3 text-white placeholder:text-white/30 transition-colors resize-none"
                placeholder="…"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              data-testid="contact-submit"
              className="btn-primary w-full md:w-auto disabled:opacity-60"
              style={{ borderRadius: 2 }}
            >
              {loading ? t.contact.sending : t.contact.send}
              {!loading && <Send size={15} />}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function Field({ label, type = "text", value, onChange, testid, required }) {
  return (
    <div>
      <label className="text-[10px] tracking-[0.25em] uppercase text-white/55 font-bold">
        {label}
        {required && <span className="text-[#FF2E00]">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        data-testid={testid}
        required={required}
        className="mt-2 w-full bg-transparent border-b border-white/20 focus:border-[#FF2E00] focus:outline-none py-3 text-white placeholder:text-white/30 transition-colors"
      />
    </div>
  );
}
