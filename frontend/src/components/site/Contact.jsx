import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, Mail, MapPin, Clock, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/contexts/LanguageContext";
import { api, formatApiError } from "@/lib/api";
import Editable from "@/components/edit/Editable";
import SectionTitle from "@/components/site/SectionTitle";

export default function Contact({ data }) {
  const { lang, t, pick } = useLang();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);

  if (!data) return null;

  const overline = pick(data.overline_de, data.overline_en) || t.contact.overline;
  const title = pick(data.title_de, data.title_en) || t.contact.title;
  const sub = pick(data.sub_de, data.sub_en) || t.contact.sub;

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

  return (
    <section
      id="contact"
      data-testid="contact-section"
      className="section-pad bg-[#fbf9f6]"
    >
      <div className="container-x">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="dot-accent" />
              <Editable
                path={`contact.overline_${lang}`}
                value={overline}
                className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]"
              />
            </div>
            <SectionTitle
              path={`contact.title_${lang}`}
              value={title}
              style={{ fontSize: "clamp(2.1rem, 4.4vw, 4rem)" }}
            />
            <Editable
              path={`contact.sub_${lang}`}
              value={sub}
              as="p"
              multiline
              className="mt-5 text-lg text-[#475569] leading-relaxed font-medium max-w-md block"
            />

            <div className="mt-10 space-y-4">
              <InfoRow
                icon={Phone}
                label="Tel"
                path="contact.phone"
                value={data.phone}
                href={`tel:${(data.phone || "").replace(/\s/g, "")}`}
                testid="contact-phone"
              />
              <InfoRow
                icon={Mail}
                label="E-Mail"
                path="contact.email"
                value={data.email}
                href={`mailto:${data.email}`}
                testid="contact-email"
              />
              <InfoRow
                icon={MapPin}
                label={t.contact.address}
                path={`contact.address_${lang}`}
                value={pick(data.address_de, data.address_en)}
              />
              <InfoRow
                icon={Clock}
                label={t.contact.hours}
                path={`contact.hours_${lang}`}
                value={pick(data.hours_de, data.hours_en)}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-7"
          >
            <form
              onSubmit={handleSubmit}
              data-testid="contact-form"
              className="bg-white border border-[#e2e8f0] rounded-3xl p-7 md:p-10 space-y-6 shadow-[0_18px_50px_-25px_rgba(15,23,42,0.18)]"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <Field label={t.contact.firstName} testid="contact-first-name" value={form.first_name} onChange={setField("first_name")} required />
                <Field label={t.contact.lastName} testid="contact-last-name" value={form.last_name} onChange={setField("last_name")} required />
                <Field label={t.contact.email} type="email" testid="contact-email-input" value={form.email} onChange={setField("email")} required />
                <Field label={t.contact.phone} type="tel" testid="contact-phone-input" value={form.phone} onChange={setField("phone")} required />
              </div>
              <div>
                <label className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]">
                  {t.contact.message}
                </label>
                <textarea
                  rows={4}
                  value={form.message}
                  onChange={setField("message")}
                  data-testid="contact-message"
                  className="input-underline resize-none mt-2"
                  placeholder="…"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                data-testid="contact-submit"
                className="btn-accent disabled:opacity-60"
              >
                {loading ? t.contact.sending : t.contact.send}
                <ArrowRight size={14} />
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function InfoRow({ icon: Icon, label, value, href, testid, path }) {
  return (
    <div className="flex items-start gap-4" data-testid={testid}>
      <span className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-white border border-[#e2e8f0] text-[#ff5a36] shrink-0">
        <Icon size={15} />
      </span>
      <div>
        <div className="text-[10px] font-semibold tracking-widest uppercase text-[#94a3b8]">{label}</div>
        {href ? (
          <a href={href} className="block mt-1">
            <Editable
              path={path}
              value={value}
              className="text-[#0f172a] font-semibold hover:text-[#ff5a36] transition-colors"
            />
          </a>
        ) : (
          <Editable
            path={path}
            value={value}
            className="text-[#0f172a] mt-1 font-semibold block"
          />
        )}
      </div>
    </div>
  );
}

function Field({ label, type = "text", value, onChange, testid, required }) {
  return (
    <div>
      <label className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]">
        {label}
        {required && <span className="text-[#ff5a36]">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        data-testid={testid}
        required={required}
        className="input-underline mt-2"
      />
    </div>
  );
}
