import { useState } from "react";
import { motion } from "framer-motion";
import { Send, MapPin, Phone, Mail, Loader2, CheckCircle2 } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * "Boxenstopp" – pit-stop themed contact form on a carbon surface with
 * dark zinc inputs, red focus rings. Reuses the existing public
 * `/api/contact` endpoint so submissions land in the same admin inbox as the
 * main site's contact form.
 */
export default function SportContact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    location: "",
  });
  const [state, setState] = useState("idle"); // idle | loading | success | error
  const [err, setErr] = useState("");

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.name || !form.email || !form.message) {
      setErr("Bitte fülle Name, E-Mail und Nachricht aus.");
      return;
    }
    setState("loading");
    try {
      await axios.post(`${API}/contact`, form);
      setState("success");
      setForm({ name: "", email: "", phone: "", message: "", location: "" });
    } catch (e2) {
      setState("error");
      setErr(e2?.response?.data?.detail || "Etwas ist schiefgelaufen. Bitte versuche es erneut.");
    }
  };

  const input =
    "w-full bg-[#0d0d0f] border border-[#27272a] text-white placeholder:text-white/30 font-mono text-sm py-3 px-4 outline-none focus:border-[#e11d48] focus:ring-2 focus:ring-[#e11d48]/30 transition-all";

  return (
    <section
      id="pit"
      data-testid="sport-contact-section"
      className="relative py-24 md:py-32 sport-carbon border-t border-[#27272a]"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 grid lg:grid-cols-12 gap-10 md:gap-14">
        {/* Left – intro / info column */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-0.5 bg-[#e11d48]" />
            <span className="sport-overline">Pit Stop · Kontakt</span>
          </div>
          <h2 className="font-race text-5xl md:text-7xl uppercase leading-none tracking-wide">
            Boxen<span className="text-[#e11d48]">stopp</span>
          </h2>
          <p className="mt-6 text-white/60 leading-relaxed text-lg max-w-md">
            Kurze Nachricht, wir melden uns innerhalb von 24 Stunden. Kein
            Callcenter, kein Bot — direkt Nadine.
          </p>

          <ul className="mt-10 space-y-5">
            <li className="flex items-start gap-4">
              <span className="w-10 h-10 bg-black border border-[#27272a] flex items-center justify-center shrink-0">
                <Phone size={16} className="text-[#e11d48]" strokeWidth={2.3} />
              </span>
              <div>
                <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/40">Direkt anrufen</div>
                <a
                  href="tel:+41795850085"
                  className="font-race text-2xl text-white hover:text-[#e11d48] transition-colors"
                  data-testid="sport-contact-phone"
                >
                  +41 79 585 00 85
                </a>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <span className="w-10 h-10 bg-black border border-[#27272a] flex items-center justify-center shrink-0">
                <Mail size={16} className="text-[#e11d48]" strokeWidth={2.3} />
              </span>
              <div>
                <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/40">E-Mail</div>
                <a
                  href="mailto:info@fahrschule-saferide.ch"
                  className="font-race text-2xl text-white hover:text-[#e11d48] transition-colors"
                  data-testid="sport-contact-email"
                >
                  info@fahrschule-saferide.ch
                </a>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <span className="w-10 h-10 bg-black border border-[#27272a] flex items-center justify-center shrink-0">
                <MapPin size={16} className="text-[#e11d48]" strokeWidth={2.3} />
              </span>
              <div>
                <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/40">Regionen</div>
                <div className="font-race text-2xl text-white">
                  ZH · SZ · SG · GR
                </div>
              </div>
            </li>
          </ul>
        </motion.div>

        {/* Right – form */}
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="lg:col-span-7 relative bg-black border border-[#27272a] p-6 md:p-10 sport-grid-card"
          data-testid="sport-contact-form"
        >
          {/* Corner tag */}
          <div className="absolute top-4 right-5 font-mono text-[10px] tracking-[0.25em] uppercase text-white/30">
            Form · v1.0
          </div>

          <div className="grid sm:grid-cols-2 gap-4 md:gap-5">
            <div>
              <label className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/50 mb-2 block">
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
                data-testid="sport-contact-name-input"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/50 mb-2 block">
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
                data-testid="sport-contact-email-input"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/50 mb-2 block">
                Telefon
              </label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={onChange}
                className={input}
                placeholder="+41 79 …"
                data-testid="sport-contact-phone-input"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/50 mb-2 block">
                Region
              </label>
              <select
                name="location"
                value={form.location}
                onChange={onChange}
                className={input}
                data-testid="sport-contact-location-input"
              >
                <option value="">Bitte wählen</option>
                <option value="ZH">Zürich (ZH)</option>
                <option value="SZ">Schwyz (SZ)</option>
                <option value="SG">St. Gallen (SG)</option>
                <option value="GR">Graubünden (GR)</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/50 mb-2 block">
                Nachricht *
              </label>
              <textarea
                name="message"
                value={form.message}
                onChange={onChange}
                required
                rows={5}
                className={`${input} resize-none`}
                placeholder="Wann möchtest du starten? Welche Kategorie? Fragen?"
                data-testid="sport-contact-message-input"
              />
            </div>
          </div>

          {err && (
            <div
              className="mt-5 font-mono text-xs text-[#f43f5e] tracking-wider"
              data-testid="sport-contact-error"
            >
              ⚠ {err}
            </div>
          )}

          {state === "success" ? (
            <div
              className="mt-6 flex items-center gap-3 py-4 px-5 bg-[#022c22] border border-emerald-800 text-emerald-300"
              data-testid="sport-contact-success"
            >
              <CheckCircle2 size={20} className="shrink-0" />
              <div className="font-mono text-sm">
                Nachricht abgefeuert. Wir melden uns innerhalb 24 Std. — Green Flag.
              </div>
            </div>
          ) : (
            <div className="mt-8 flex items-center gap-4">
              <button
                type="submit"
                disabled={state === "loading"}
                className="sport-btn"
                data-testid="sport-contact-submit"
              >
                {state === "loading" ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Sende…</span>
                  </>
                ) : (
                  <>
                    <span>Absenden</span>
                    <Send size={16} strokeWidth={2.5} />
                  </>
                )}
              </button>
              <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/40">
                DSGVO · Verschlüsselt
              </span>
            </div>
          )}
        </motion.form>
      </div>
    </section>
  );
}
