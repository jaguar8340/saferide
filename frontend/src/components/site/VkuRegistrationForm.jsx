import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Send,
  Loader2,
  CheckCircle2,
  User,
  Mail,
  Phone,
  Cake,
  ClipboardList,
  CalendarDays,
  Upload,
  FileText,
  X,
} from "lucide-react";
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
    permit_file_url: "",
    permit_file_name: "",
  });
  const [state, setState] = useState("idle"); // idle | loading | success
  const [err, setErr] = useState("");
  const [permitState, setPermitState] = useState("idle"); // idle | uploading | uploaded | error
  const fileInputRef = useRef(null);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onPermitSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Client-side size guard: 8 MB.
    if (file.size > 8 * 1024 * 1024) {
      setPermitState("error");
      toast.error(
        lang === "en"
          ? "File too large (max 8 MB)."
          : "Datei zu gross (max. 8 MB).",
      );
      e.target.value = "";
      return;
    }
    setPermitState("uploading");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post("/vku/permit-upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((f) => ({
        ...f,
        permit_file_url: r.data.url,
        permit_file_name: r.data.filename || file.name,
      }));
      setPermitState("uploaded");
      toast.success(
        lang === "en" ? "Learner permit uploaded" : "Lernfahrerausweis hochgeladen",
      );
    } catch (err2) {
      setPermitState("error");
      toast.error(formatApiError(err2));
    } finally {
      // Reset the input so re-selecting the same file re-triggers change.
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const clearPermit = () => {
    setForm((f) => ({ ...f, permit_file_url: "", permit_file_name: "" }));
    setPermitState("idle");
  };

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
        permit_file_url: "",
        permit_file_name: "",
      });
      setPermitState("idle");
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
            <FileText size={11} />{" "}
            {lang === "en"
              ? "Learner permit (photo or PDF)"
              : "Lernfahrerausweis (Foto oder PDF)"}
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={onPermitSelect}
            className="hidden"
            data-testid="vku-form-permit-input"
          />
          {form.permit_file_url ? (
            <div
              className="flex items-center gap-3 bg-[#f0fdf4] border border-[#a7f3d0] rounded-2xl px-4 py-3"
              data-testid="vku-form-permit-uploaded"
            >
              <CheckCircle2
                size={18}
                className="text-[#065f46] shrink-0"
                strokeWidth={2.2}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[#065f46] truncate">
                  {form.permit_file_name || (lang === "en" ? "Uploaded" : "Hochgeladen")}
                </div>
                <div className="text-[10px] tracking-widest uppercase font-semibold text-[#065f46]/70">
                  {lang === "en" ? "Attached to your registration" : "An deine Anmeldung angehängt"}
                </div>
              </div>
              <button
                type="button"
                onClick={clearPermit}
                className="text-[#065f46] hover:text-[#dc2626] p-1 rounded-full transition-colors"
                data-testid="vku-form-permit-clear"
                aria-label={lang === "en" ? "Remove file" : "Datei entfernen"}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={permitState === "uploading"}
              data-testid="vku-form-permit-upload-btn"
              className="w-full flex items-center gap-3 bg-white border-2 border-dashed border-[#e2e8f0] hover:border-[#ff5a36] hover:bg-[#fff7f3] rounded-2xl px-4 py-3.5 text-left transition-all disabled:opacity-60 disabled:cursor-wait"
            >
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#ff5a36]/10 text-[#ff5a36] shrink-0">
                {permitState === "uploading" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Upload size={16} strokeWidth={2.2} />
                )}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-[#0f172a]">
                  {permitState === "uploading"
                    ? lang === "en"
                      ? "Uploading…"
                      : "Wird hochgeladen…"
                    : lang === "en"
                      ? "Choose file to upload"
                      : "Datei zum Hochladen wählen"}
                </span>
                <span className="block text-[10px] tracking-widest uppercase font-semibold text-[#94a3b8] mt-0.5">
                  JPG · PNG · PDF · {lang === "en" ? "max 8 MB" : "max. 8 MB"}
                </span>
              </span>
            </button>
          )}
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
