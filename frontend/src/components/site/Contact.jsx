import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, Mail, MapPin, Clock, Send, ArrowRight } from "lucide-react";
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

  return (
    <section
      id="contact"
      data-testid="contact-section"
      className="section-pad bg-[#0033ff] text-white relative overflow-hidden"
    >
      <div
        aria-hidden
        className="absolute -top-32 -right-20 w-[28rem] h-[28rem] rounded-full bg-[#ccff00] mix-blend-difference animate-blob"
      />
      <div
        aria-hidden
        className="absolute -bottom-32 -left-20 w-[24rem] h-[24rem] rounded-full bg-[#ff0055] mix-blend-difference animate-blob"
        style={{ animationDelay: "-4s" }}
      />

      <div className="container-x px-5 md:px-10 lg:px-14 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-5"
          >
            <div className="eyebrow text-[#ccff00] mb-5">{t.contact.overline}</div>
            <h2
              className="font-display font-black uppercase tracking-tighter leading-[0.88]"
              style={{ fontSize: "clamp(2.4rem, 5.5vw, 5.5rem)" }}
            >
              {t.contact.title}
            </h2>
            <p className="mt-6 text-white/85 text-lg md:text-xl font-medium max-w-md">
              {t.contact.sub}
            </p>

            <div className="mt-10 space-y-5">
              <a
                href={`tel:${(data.phone || "").replace(/\s/g, "")}`}
                data-testid="contact-phone"
                className="flex items-start gap-4 group"
              >
                <span className="w-12 h-12 rounded-full bg-[#ccff00] text-[#0a0a0a] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Phone size={18} />
                </span>
                <div>
                  <div className="text-[10px] tracking-widest uppercase text-white/60 mb-1 font-bold">
                    Tel
                  </div>
                  <div className="font-display font-extrabold text-xl">
                    {data.phone}
                  </div>
                </div>
              </a>
              <a
                href={`mailto:${data.email}`}
                data-testid="contact-email"
                className="flex items-start gap-4 group"
              >
                <span className="w-12 h-12 rounded-full bg-white text-[#0033ff] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Mail size={18} />
                </span>
                <div>
                  <div className="text-[10px] tracking-widest uppercase text-white/60 mb-1 font-bold">
                    E-Mail
                  </div>
                  <div className="text-base">{data.email}</div>
                </div>
              </a>
              <div className="flex items-start gap-4">
                <span className="w-12 h-12 rounded-full bg-[#ff0055] text-white flex items-center justify-center">
                  <MapPin size={18} />
                </span>
                <div>
                  <div className="text-[10px] tracking-widest uppercase text-white/60 mb-1 font-bold">
                    {t.contact.address}
                  </div>
                  <div className="text-base">
                    {pick(data.address_de, data.address_en)}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="w-12 h-12 rounded-full bg-white text-[#0033ff] flex items-center justify-center">
                  <Clock size={18} />
                </span>
                <div>
                  <div className="text-[10px] tracking-widest uppercase text-white/60 mb-1 font-bold">
                    {t.contact.hours}
                  </div>
                  <div className="text-base">
                    {pick(data.hours_de, data.hours_en)}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="lg:col-span-7"
          >
            <form
              onSubmit={handleSubmit}
              data-testid="contact-form"
              className="bg-white text-[#0a0a0a] rounded-3xl p-6 md:p-10 space-y-5 border-2 border-[#0a0a0a] shadow-[8px_8px_0_#ccff00]"
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
                <label className="text-[10px] tracking-[0.25em] uppercase text-[#0a0a0a]/60 font-extrabold">
                  {t.contact.message}
                </label>
                <textarea
                  rows={4}
                  value={form.message}
                  onChange={setField("message")}
                  data-testid="contact-message"
                  className="mt-2 w-full bg-transparent border-b-2 border-[#0a0a0a]/20 focus:border-[#0033ff] focus:outline-none py-3 text-[#0a0a0a] placeholder:text-[#0a0a0a]/30 transition-colors resize-none font-medium"
                  placeholder="…"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                data-testid="contact-submit"
                className="btn-pill-primary w-full md:w-auto disabled:opacity-60 justify-center"
              >
                {loading ? t.contact.sending : t.contact.send}
                {!loading ? <Send size={15} /> : <ArrowRight size={15} />}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, type = "text", value, onChange, testid, required }) {
  return (
    <div>
      <label className="text-[10px] tracking-[0.25em] uppercase text-[#0a0a0a]/60 font-extrabold">
        {label}
        {required && <span className="text-[#ff0055]">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        data-testid={testid}
        required={required}
        className="mt-2 w-full bg-transparent border-b-2 border-[#0a0a0a]/20 focus:border-[#0033ff] focus:outline-none py-3 text-[#0a0a0a] placeholder:text-[#0a0a0a]/30 transition-colors font-medium"
      />
    </div>
  );
}
