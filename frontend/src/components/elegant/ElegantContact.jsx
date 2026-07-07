import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Phone, Mail, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Elegant Contact – refined "Persönlicher Kontakt" form. Posts to the same
 * public /api/contact endpoint so submissions appear in the main admin inbox.
 */
export default function ElegantContact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    location: "",
  });
  const [state, setState] = useState("idle");
  const [err, setErr] = useState("");

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.name || !form.email || !form.message) {
      setErr("Bitte Name, E-Mail und Nachricht ausfüllen.");
      return;
    }
    setState("loading");
    try {
      await axios.post(`${API}/contact`, form);
      setState("success");
      setForm({ name: "", email: "", phone: "", message: "", location: "" });
    } catch (e2) {
      setState("error");
      setErr(e2?.response?.data?.detail || "Etwas ist schiefgelaufen.");
    }
  };

  const input =
    "w-full bg-white border border-[#e5ded1] focus:border-[#c9a961] focus:ring-2 focus:ring-[#c9a961]/20 text-[#0d1b2a] placeholder:text-[#7a8595]/60 font-manrope text-sm py-3.5 px-4 outline-none transition-all";

  return (
    <section
      id="contact"
      data-testid="elegant-contact-section"
      className="relative py-24 md:py-36 bg-[#f3ecdf] border-t border-[#e5ded1]"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 grid lg:grid-cols-12 gap-12 lg:gap-16">
        {/* Left – info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-5"
        >
          <div className="mb-5">
            <span className="el-overline el-overline--start">
              <span className="block w-8 h-px bg-[#c9a961]" />
              Persönlicher Kontakt
            </span>
          </div>
          <h2 className="font-serif text-5xl md:text-6xl leading-[0.95] tracking-tight text-[#0d1b2a]">
            Ein <span className="italic text-[#c9a961]">Gespräch</span>
            <br />genügt.
          </h2>

          <p className="mt-8 font-manrope text-lg leading-[1.75] text-[#37475a] font-light max-w-md">
            Hinterlassen Sie mir kurz Ihre Kontaktdaten – ich melde mich
            persönlich innerhalb von 24 Stunden. Diskret. Unverbindlich.
          </p>

          <ul className="mt-10 space-y-6">
            <li className="flex items-start gap-5">
              <span className="w-11 h-11 border border-[#c9a961] text-[#c9a961] flex items-center justify-center shrink-0">
                <Phone size={16} strokeWidth={1.6} />
              </span>
              <div>
                <div className="font-manrope text-[10px] tracking-[0.3em] uppercase text-[#7a8595] mb-1">Direkt</div>
                <a
                  href="tel:+41795850085"
                  className="font-serif text-2xl text-[#0d1b2a] el-link"
                  data-testid="elegant-contact-phone"
                >
                  +41 79 585 00 85
                </a>
              </div>
            </li>
            <li className="flex items-start gap-5">
              <span className="w-11 h-11 border border-[#c9a961] text-[#c9a961] flex items-center justify-center shrink-0">
                <Mail size={16} strokeWidth={1.6} />
              </span>
              <div>
                <div className="font-manrope text-[10px] tracking-[0.3em] uppercase text-[#7a8595] mb-1">E-Mail</div>
                <a
                  href="mailto:info@fahrschule-saferide.ch"
                  className="font-serif text-xl text-[#0d1b2a] el-link"
                  data-testid="elegant-contact-email"
                >
                  info@fahrschule-saferide.ch
                </a>
              </div>
            </li>
            <li className="flex items-start gap-5">
              <span className="w-11 h-11 border border-[#c9a961] text-[#c9a961] flex items-center justify-center shrink-0">
                <MapPin size={16} strokeWidth={1.6} />
              </span>
              <div>
                <div className="font-manrope text-[10px] tracking-[0.3em] uppercase text-[#7a8595] mb-1">Regionen</div>
                <div className="font-serif text-xl text-[#0d1b2a]">
                  Zürich · Schwyz · St. Gallen · Graubünden
                </div>
              </div>
            </li>
          </ul>
        </motion.div>

        {/* Right – form */}
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="lg:col-span-7 bg-white border border-[#e5ded1] p-8 md:p-12 relative"
          data-testid="elegant-contact-form"
        >
          {/* Gold inner frame */}
          <span className="absolute inset-4 border border-[#c9a961]/25 pointer-events-none" />

          <div className="relative grid sm:grid-cols-2 gap-5">
            <div>
              <label className="font-manrope text-[10px] tracking-[0.3em] uppercase text-[#7a8595] mb-2 block">
                Name *
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={onChange}
                required
                className={input}
                placeholder="Max Muster"
                data-testid="elegant-contact-name-input"
              />
            </div>
            <div>
              <label className="font-manrope text-[10px] tracking-[0.3em] uppercase text-[#7a8595] mb-2 block">
                E-Mail *
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={onChange}
                required
                className={input}
                placeholder="max@example.ch"
                data-testid="elegant-contact-email-input"
              />
            </div>
            <div>
              <label className="font-manrope text-[10px] tracking-[0.3em] uppercase text-[#7a8595] mb-2 block">
                Telefon
              </label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={onChange}
                className={input}
                placeholder="+41 79 …"
                data-testid="elegant-contact-phone-input"
              />
            </div>
            <div>
              <label className="font-manrope text-[10px] tracking-[0.3em] uppercase text-[#7a8595] mb-2 block">
                Region
              </label>
              <select
                name="location"
                value={form.location}
                onChange={onChange}
                className={input}
                data-testid="elegant-contact-location-input"
              >
                <option value="">Bitte wählen</option>
                <option value="ZH">Zürich</option>
                <option value="SZ">Schwyz</option>
                <option value="SG">St. Gallen</option>
                <option value="GR">Graubünden</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="font-manrope text-[10px] tracking-[0.3em] uppercase text-[#7a8595] mb-2 block">
                Nachricht *
              </label>
              <textarea
                name="message"
                value={form.message}
                onChange={onChange}
                required
                rows={5}
                className={`${input} resize-none`}
                placeholder="Wann möchten Sie starten? Welche Kategorie? Fragen?"
                data-testid="elegant-contact-message-input"
              />
            </div>
          </div>

          {err && (
            <div className="relative mt-5 font-manrope text-xs text-[#9d823f] italic" data-testid="elegant-contact-error">
              {err}
            </div>
          )}

          {state === "success" ? (
            <div
              className="relative mt-6 flex items-center gap-3 py-4 px-5 bg-[#faf6f0] border border-[#c9a961]/40 text-[#0d1b2a]"
              data-testid="elegant-contact-success"
            >
              <CheckCircle2 size={20} className="shrink-0 text-[#c9a961]" strokeWidth={1.8} />
              <div className="font-italic-serif text-base">
                Vielen Dank – wir melden uns innerhalb von 24 Stunden persönlich bei Ihnen.
              </div>
            </div>
          ) : (
            <div className="relative mt-8 flex items-center gap-5">
              <button
                type="submit"
                disabled={state === "loading"}
                className="el-btn el-btn--gold"
                data-testid="elegant-contact-submit"
              >
                {state === "loading" ? (
                  <>
                    <Loader2 size={14} className="animate-spin" strokeWidth={1.8} />
                    <span>Sende…</span>
                  </>
                ) : (
                  <>
                    <span>Absenden</span>
                    <Send size={14} strokeWidth={1.8} />
                  </>
                )}
              </button>
              <span className="font-manrope text-[10px] tracking-[0.28em] uppercase text-[#7a8595]">
                DSGVO · Verschlüsselt
              </span>
            </div>
          )}
        </motion.form>
      </div>
    </section>
  );
}
