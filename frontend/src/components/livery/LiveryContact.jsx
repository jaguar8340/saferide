import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Phone, Mail, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Livery Contact – "Pit-lane" style form on a warm cream panel with a big
 * navy left rail. Posts to /api/contact so submissions land in the same
 * admin inbox as the main site.
 */
export default function LiveryContact() {
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
      setErr(e2?.response?.data?.detail || "Da lief was schief. Bitte nochmal versuchen.");
    }
  };

  const input =
    "w-full bg-white border-2 border-[#0f1419] focus:border-[#c9302c] text-[#0f1419] placeholder:text-[#7a8595] font-mano text-sm py-3 px-4 outline-none transition-colors";

  return (
    <section
      id="contact"
      data-testid="livery-contact-section"
      className="relative bg-[#f2ede4] pt-24 md:pt-32 pb-0"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 grid lg:grid-cols-12 gap-10 lg:gap-14">
        {/* Left – navy panel with big script "Anfragen" */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-5 relative bg-[#1a2332] text-white border-2 border-[#0f1419] p-8 md:p-10"
        >
          {/* Tape top-right corner */}
          <span className="absolute top-0 right-0 w-24 h-2 lv-tape" />

          <div className="mb-6 flex items-center gap-3">
            <span className="lv-label lv-label--red">Kontakt</span>
            <span className="font-script text-3xl text-[#f2c94c] leading-none">— hi</span>
          </div>

          <h2 className="font-anton text-5xl md:text-6xl lg:text-7xl uppercase leading-[0.88] tracking-tight">
            Sag <br /> Hallo
            <span className="text-[#c9302c]">.</span>
          </h2>

          <p className="mt-8 font-mano text-base leading-relaxed text-white/70 max-w-sm">
            Kurze Nachricht — wir melden uns innerhalb 24 Stunden. Kein
            Callcenter, kein Bot. Direkt Nadine.
          </p>

          <ul className="mt-10 space-y-5">
            <li className="flex items-center gap-4">
              <span className="w-11 h-11 bg-[#c9302c] flex items-center justify-center border-2 border-white/20">
                <Phone size={16} className="text-white" strokeWidth={2.4} />
              </span>
              <div>
                <div className="font-anton text-[10px] tracking-[0.24em] uppercase text-white/50">Direkt</div>
                <a href="tel:+41795850085" className="font-anton text-xl text-white hover:text-[#f2c94c] transition-colors" data-testid="livery-contact-phone">
                  +41 79 585 00 85
                </a>
              </div>
            </li>
            <li className="flex items-center gap-4">
              <span className="w-11 h-11 bg-[#c9302c] flex items-center justify-center border-2 border-white/20">
                <Mail size={16} className="text-white" strokeWidth={2.4} />
              </span>
              <div>
                <div className="font-anton text-[10px] tracking-[0.24em] uppercase text-white/50">E-Mail</div>
                <a href="mailto:info@fahrschule-saferide.ch" className="font-anton text-lg text-white hover:text-[#f2c94c] transition-colors" data-testid="livery-contact-email">
                  info@fahrschule-saferide.ch
                </a>
              </div>
            </li>
            <li className="flex items-center gap-4">
              <span className="w-11 h-11 bg-[#c9302c] flex items-center justify-center border-2 border-white/20">
                <MapPin size={16} className="text-white" strokeWidth={2.4} />
              </span>
              <div>
                <div className="font-anton text-[10px] tracking-[0.24em] uppercase text-white/50">Regionen</div>
                <div className="font-anton text-lg text-white">
                  ZH · SZ · SG · GR
                </div>
              </div>
            </li>
          </ul>
        </motion.div>

        {/* Right – form on cream */}
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="lg:col-span-7 bg-white border-2 border-[#0f1419] p-6 md:p-10 relative"
          data-testid="livery-contact-form"
        >
          {/* Race number corner */}
          <div className="absolute -top-6 -left-6 z-10 hidden md:block">
            <span className="lv-race-num lv-race-num--red">GO</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 md:gap-5">
            <div>
              <label className="font-anton text-[10px] tracking-[0.22em] uppercase text-[#3a4553] mb-2 block">Name *</label>
              <input type="text" name="name" value={form.name} onChange={onChange} required className={input} placeholder="Max Muster" data-testid="livery-contact-name-input" />
            </div>
            <div>
              <label className="font-anton text-[10px] tracking-[0.22em] uppercase text-[#3a4553] mb-2 block">E-Mail *</label>
              <input type="email" name="email" value={form.email} onChange={onChange} required className={input} placeholder="max@example.ch" data-testid="livery-contact-email-input" />
            </div>
            <div>
              <label className="font-anton text-[10px] tracking-[0.22em] uppercase text-[#3a4553] mb-2 block">Telefon</label>
              <input type="tel" name="phone" value={form.phone} onChange={onChange} className={input} placeholder="+41 79 …" data-testid="livery-contact-phone-input" />
            </div>
            <div>
              <label className="font-anton text-[10px] tracking-[0.22em] uppercase text-[#3a4553] mb-2 block">Region</label>
              <select name="location" value={form.location} onChange={onChange} className={input} data-testid="livery-contact-location-input">
                <option value="">Bitte wählen</option>
                <option value="ZH">Zürich</option>
                <option value="SZ">Schwyz</option>
                <option value="SG">St. Gallen</option>
                <option value="GR">Graubünden</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="font-anton text-[10px] tracking-[0.22em] uppercase text-[#3a4553] mb-2 block">Nachricht *</label>
              <textarea name="message" value={form.message} onChange={onChange} required rows={5} className={`${input} resize-none`} placeholder="Wann möchtest du starten? Welche Kategorie? Fragen?" data-testid="livery-contact-message-input" />
            </div>
          </div>

          {err && (
            <div className="mt-4 font-mano text-sm text-[#c9302c] font-medium" data-testid="livery-contact-error">
              {err}
            </div>
          )}

          {state === "success" ? (
            <div className="mt-6 flex items-center gap-3 py-4 px-5 bg-[#f2c94c] border-2 border-[#0f1419] text-[#0f1419]" data-testid="livery-contact-success">
              <CheckCircle2 size={20} className="shrink-0" strokeWidth={2.3} />
              <div className="font-anton text-sm tracking-wide">
                Green Flag — Nachricht ist bei uns. Rückmeldung innerhalb 24h.
              </div>
            </div>
          ) : (
            <div className="mt-8 flex items-center gap-4">
              <button type="submit" disabled={state === "loading"} className="lv-btn" data-testid="livery-contact-submit">
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
              <span className="font-anton text-[10px] tracking-[0.22em] uppercase text-[#7a8595]">DSGVO · Verschlüsselt</span>
            </div>
          )}
        </motion.form>
      </div>

      {/* Bottom rally stripe */}
      <div className="lv-rally-stripes h-3 mt-24" />
    </section>
  );
}
