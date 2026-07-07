import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, CheckCircle2, User, Mail, Phone, Cake, ClipboardList, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";

/**
 * VKU course registration form. Automatically populates the "Kursauswahl"
 * dropdown from the VKU months data (each session on its own line becomes a
 * selectable slot). Submissions go to /api/vku/registrations and appear in
 * the admin dashboard under the "VKU-Anmeldungen" tab.
 *
 * Props:
 *   - months: content.vku.months array (each with sessions_de/sessions_en)
 *   - lang: current UI language
 */
export default function VkuRegistrationForm({ months = [], lang = "de" }) {
  // Flatten the CMS months into a flat list of {label, value} for the dropdown.
  // Each `sessions_de` field is a multi-line string, one session per line.
  const courseOptions = useMemo(() => {
    const opts = [];
    for (const m of months) {
      const monthName = lang === "en" ? (m.name_en || m.name_de) : (m.name_de || m.name_en);
      const sessionsText =
        (lang === "en" ? m.sessions_en : m.sessions_de) ||
        m.sessions_de ||
        "";
      const lines = String(sessionsText)
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const line of lines) {
        const val = `${monthName} · ${line}`;
        opts.push({ label: val, value: val });
      }
    }
    return opts;
  }, [months, lang]);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    birth_date: "",
    course_slot: "",
    notes: "",
  });
  const [state, setState] = useState("idle"); // idle | loading | success
  const [err, setErr] = useState("");

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (
      !form.first_name ||
      !form.last_name ||
      !form.email ||
      !form.phone ||
      !form.birth_date ||
      !form.course_slot
    ) {
      setErr(
        lang === "en"
          ? "Please fill in first name, last name, email, phone, birth date and course."
          : "Bitte Vorname, Name, E-Mail, Telefon, Geburtsdatum und Kurs ausfüllen.",
      );
      return;
    }
    setState("loading");
    try {
      await api.post("/vku/registrations", form);
      setState("success");
      setForm({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        birth_date: "",
        course_slot: "",
        notes: "",
      });
      toast.success(
        lang === "en"
          ? "Registration received – we'll reach out within 24h."
          : "Anmeldung erhalten – wir melden uns innerhalb 24 Std.",
      );
    } catch (e2) {
      setState("idle");
      setErr(formatApiError(e2));
    }
  };

  const input =
    "w-full bg-white border border-[#e2e8f0] rounded-2xl px-4 py-3 text-sm text-[#0f172a] placeholder:text-[#94a3b8] outline-none focus:border-[#ff5a36] focus:ring-2 focus:ring-[#ff5a36]/20 transition-all";
  const label =
    "flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.18em] uppercase text-[#475569] mb-1.5";

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55 }}
      className="bg-white border border-[#e2e8f0] rounded-3xl p-6 md:p-10 relative"
      data-testid="vku-registration-form"
    >
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="dot-accent" />
          <span className="text-xs font-semibold tracking-[0.18em] uppercase text-[#ff5a36]">
            {lang === "en" ? "Registration" : "Anmeldung"}
          </span>
        </div>
        <h3 className="font-display text-3xl md:text-4xl leading-[0.98] tracking-tight">
          {lang === "en" ? "Sign up for the VKU" : "Zum VKU anmelden"}
        </h3>
        <p className="mt-3 text-sm text-[#475569] font-medium max-w-xl">
          {lang === "en"
            ? "Pick a date from the calendar above, tell us your details and we'll confirm within 24 hours."
            : "Wähle einen Termin aus dem Kalender oben, hinterlasse deine Daten und wir bestätigen dir die Anmeldung innerhalb von 24 Stunden."}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 md:gap-5">
        <div>
          <label className={label}>
            <User size={11} /> {lang === "en" ? "First name *" : "Vorname *"}
          </label>
          <input
            type="text"
            name="first_name"
            value={form.first_name}
            onChange={onChange}
            required
            className={input}
            placeholder="Max"
            data-testid="vku-form-first-name"
          />
        </div>
        <div>
          <label className={label}>
            <User size={11} /> {lang === "en" ? "Last name *" : "Name *"}
          </label>
          <input
            type="text"
            name="last_name"
            value={form.last_name}
            onChange={onChange}
            required
            className={input}
            placeholder="Muster"
            data-testid="vku-form-last-name"
          />
        </div>
        <div>
          <label className={label}>
            <Phone size={11} /> {lang === "en" ? "Phone *" : "Telefon *"}
          </label>
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={onChange}
            required
            className={input}
            placeholder="+41 79 …"
            data-testid="vku-form-phone"
          />
        </div>
        <div>
          <label className={label}>
            <Mail size={11} /> {lang === "en" ? "Email *" : "E-Mail *"}
          </label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={onChange}
            required
            className={input}
            placeholder="max@example.ch"
            data-testid="vku-form-email"
          />
        </div>
        <div>
          <label className={label}>
            <Cake size={11} /> {lang === "en" ? "Date of birth *" : "Geburtsdatum *"}
          </label>
          <input
            type="date"
            name="birth_date"
            value={form.birth_date}
            onChange={onChange}
            required
            className={input}
            data-testid="vku-form-birth-date"
          />
        </div>
        <div>
          <label className={label}>
            <CalendarDays size={11} /> {lang === "en" ? "Course *" : "Kursauswahl *"}
          </label>
          <select
            name="course_slot"
            value={form.course_slot}
            onChange={onChange}
            required
            className={input}
            data-testid="vku-form-course"
          >
            <option value="">
              {lang === "en"
                ? courseOptions.length
                  ? "Please choose a date"
                  : "No dates available – contact us"
                : courseOptions.length
                  ? "Bitte Termin wählen"
                  : "Keine Termine verfügbar – bitte kontaktieren"}
            </option>
            {courseOptions.map((o, i) => (
              <option key={o.value + i} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={label}>
            <ClipboardList size={11} /> {lang === "en" ? "Notes" : "Bemerkungen"}
          </label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={onChange}
            rows={4}
            className={`${input} resize-none`}
            placeholder={
              lang === "en"
                ? "Allergies, questions, special requests…"
                : "Allergien, Fragen, besondere Wünsche…"
            }
            data-testid="vku-form-notes"
          />
        </div>
      </div>

      {err && (
        <div
          className="mt-5 text-sm text-[#e11d48] font-medium"
          data-testid="vku-form-error"
        >
          {err}
        </div>
      )}

      {state === "success" ? (
        <div
          className="mt-8 flex items-center gap-3 py-4 px-5 bg-[#f0fdf4] border border-[#a7f3d0] text-[#065f46] rounded-2xl"
          data-testid="vku-form-success"
        >
          <CheckCircle2 size={20} className="shrink-0" strokeWidth={2.2} />
          <div className="font-semibold text-sm">
            {lang === "en"
              ? "Registration received – we'll reach out within 24 hours."
              : "Anmeldung erhalten – wir melden uns innerhalb von 24 Stunden."}
          </div>
        </div>
      ) : (
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={state === "loading"}
            className="btn-accent"
            data-testid="vku-form-submit"
          >
            {state === "loading" ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>{lang === "en" ? "Sending…" : "Sende…"}</span>
              </>
            ) : (
              <>
                <span>{lang === "en" ? "Register" : "Anmelden"}</span>
                <Send size={14} strokeWidth={2.5} />
              </>
            )}
          </button>
          <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-[#94a3b8]">
            DSGVO · {lang === "en" ? "Encrypted" : "Verschlüsselt"}
          </span>
        </div>
      )}
    </motion.form>
  );
}
