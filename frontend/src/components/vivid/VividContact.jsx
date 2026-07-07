import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Phone, Mail, MapPin, Loader2, CheckCircle2, Sparkles } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Vivid Contact – friendly, playful "Sag Hallo" form on a punchy lime panel.
 * Posts to the same /api/contact endpoint as the main site.
 */
export default function VividContact() {
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
      setErr("Name, E-Mail und Nachricht bitte ausfüllen ✨");
      return;
    }
    setState("loading");
    try {
      await axios.post(`${API}/contact`, form);
      setState("success");
      setForm({ name: "", email: "", phone: "", message: "", location: "" });
    } catch (e2) {
      setState("error");
      setErr(e2?.response?.data?.detail || "Da lief was schief. Probier's nochmal.");
    }
  };

  const input =
    "w-full bg-white border-2 border-[#0a0a1f] rounded-2xl text-[#0a0a1f] placeholder:text-[#7a7a95] font-inter text-sm py-3 px-4 outline-none focus:ring-4 focus:ring-[#3b5bff]/30 transition-all";

  return (
    <section
      id="contact"
      data-testid="vivid-contact-section"
      className="relative py-24 md:py-32 bg-[#c8ff4d] overflow-hidden"
    >
      <div className="v-blob bg-[#ff3b8b]" style={{ top: "10%", right: "-100px", width: "280px", height: "280px", opacity: 0.4 }} />
      <div className="v-blob bg-[#3b5bff]" style={{ bottom: "-40px", left: "20%", width: "260px", height: "260px", opacity: 0.35 }} />

      <div className="relative max-w-7xl mx-auto px-4 md:px-8 grid lg:grid-cols-12 gap-10 lg:gap-14">
        {/* Left – intro */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-5"
        >
          <div className="v-sticker v-sticker--pink inline-flex mb-6" style={{ transform: "rotate(-3deg)" }}>
            <Sparkles size={12} /> Sag Hallo
          </div>
          <h2 className="font-grotesk text-5xl md:text-6xl lg:text-7xl leading-[0.95] tracking-[-0.035em] text-[#0a0a1f]">
            Bereit? <br />
            Dann <span className="v-hl-blue text-white">schreib mir</span>
            <span className="font-instrument not-italic italic text-[#ff3b8b]">.</span>
          </h2>
          <p className="mt-8 font-inter text-lg leading-relaxed text-[#0a0a1f]/80 max-w-md">
            Kurze Nachricht, wir melden uns innerhalb von 24 Stunden.
            Kein Bot, kein Callcenter — direkt Nadine.
          </p>

          <ul className="mt-10 space-y-4">
            <li className="flex items-start gap-3">
              <span className="w-11 h-11 rounded-2xl bg-[#0a0a1f] text-white flex items-center justify-center shrink-0">
                <Phone size={16} strokeWidth={2.2} />
              </span>
              <div>
                <div className="font-grotesk text-xs uppercase tracking-wider text-[#0a0a1f]/60">Direkt anrufen</div>
                <a href="tel:+41795850085" className="font-grotesk text-xl text-[#0a0a1f] hover:text-[#ff3b8b] transition-colors" data-testid="vivid-contact-phone">
                  +41 79 585 00 85
                </a>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-11 h-11 rounded-2xl bg-[#0a0a1f] text-white flex items-center justify-center shrink-0">
                <Mail size={16} strokeWidth={2.2} />
              </span>
              <div>
                <div className="font-grotesk text-xs uppercase tracking-wider text-[#0a0a1f]/60">E-Mail</div>
                <a href="mailto:info@fahrschule-saferide.ch" className="font-grotesk text-lg text-[#0a0a1f] hover:text-[#ff3b8b] transition-colors" data-testid="vivid-contact-email">
                  info@fahrschule-saferide.ch
                </a>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-11 h-11 rounded-2xl bg-[#0a0a1f] text-white flex items-center justify-center shrink-0">
                <MapPin size={16} strokeWidth={2.2} />
              </span>
              <div>
                <div className="font-grotesk text-xs uppercase tracking-wider text-[#0a0a1f]/60">Regionen</div>
                <div className="font-grotesk text-lg text-[#0a0a1f]">
                  ZH · SZ · SG · GR
                </div>
              </div>
            </li>
          </ul>
        </motion.div>

        {/* Right – form */}
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="lg:col-span-7 bg-white border-2 border-[#0a0a1f] rounded-[32px] p-6 md:p-10"
          data-testid="vivid-contact-form"
          style={{ boxShadow: "8px 8px 0 #0a0a1f" }}
        >
          <div className="grid sm:grid-cols-2 gap-4 md:gap-5">
            <div>
              <label className="font-grotesk text-xs font-semibold uppercase tracking-wider text-[#0a0a1f]/60 mb-2 block">
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
                data-testid="vivid-contact-name-input"
              />
            </div>
            <div>
              <label className="font-grotesk text-xs font-semibold uppercase tracking-wider text-[#0a0a1f]/60 mb-2 block">
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
                data-testid="vivid-contact-email-input"
              />
            </div>
            <div>
              <label className="font-grotesk text-xs font-semibold uppercase tracking-wider text-[#0a0a1f]/60 mb-2 block">
                Telefon
              </label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={onChange}
                className={input}
                placeholder="+41 79 …"
                data-testid="vivid-contact-phone-input"
              />
            </div>
            <div>
              <label className="font-grotesk text-xs font-semibold uppercase tracking-wider text-[#0a0a1f]/60 mb-2 block">
                Region
              </label>
              <select
                name="location"
                value={form.location}
                onChange={onChange}
                className={input}
                data-testid="vivid-contact-location-input"
              >
                <option value="">Bitte wählen</option>
                <option value="ZH">Zürich</option>
                <option value="SZ">Schwyz</option>
                <option value="SG">St. Gallen</option>
                <option value="GR">Graubünden</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="font-grotesk text-xs font-semibold uppercase tracking-wider text-[#0a0a1f]/60 mb-2 block">
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
                data-testid="vivid-contact-message-input"
              />
            </div>
          </div>

          {err && (
            <div className="mt-5 font-inter text-sm text-[#ff3b8b] font-medium" data-testid="vivid-contact-error">
              {err}
            </div>
          )}

          {state === "success" ? (
            <div
              className="mt-6 flex items-center gap-3 py-4 px-5 bg-[#c8ff4d] border-2 border-[#0a0a1f] rounded-2xl text-[#0a0a1f]"
              data-testid="vivid-contact-success"
            >
              <CheckCircle2 size={20} className="shrink-0" strokeWidth={2.2} />
              <div className="font-grotesk text-sm font-semibold">
                Yes! Nachricht ist bei uns. Wir melden uns innerhalb 24h ✨
              </div>
            </div>
          ) : (
            <div className="mt-8 flex items-center gap-4">
              <button
                type="submit"
                disabled={state === "loading"}
                className="v-btn v-btn--pink"
                data-testid="vivid-contact-submit"
              >
                {state === "loading" ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Sende…</span>
                  </>
                ) : (
                  <>
                    <span>Absenden</span>
                    <Send size={14} strokeWidth={2.5} />
                  </>
                )}
              </button>
              <span className="font-inter text-xs text-[#7a7a95]">
                DSGVO · Verschlüsselt
              </span>
            </div>
          )}
        </motion.form>
      </div>
    </section>
  );
}
