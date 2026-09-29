/**
 * StudentsManager – admin tab body listing all students with a
 * "+ Neuer Schüler" inline form. Each row navigates to the student's
 * profile page (`/admin/students/:id`).
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Loader2,
  Plus,
  Search,
  Trash2,
  ChevronRight,
  UserRound,
  ShieldCheck,
  Clock,
  Circle,
  Send,
  AlertTriangle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  street: "",
  zip: "",
  city: "",
  phone: "",
  email: "",
  category: "B",
  instructor: "",
  start_date: "",
  birthdate: "",
  prep_exam_date: "",
  exam_date: "",
  guardian_name: "",
  guardian_email: "",
  region: "",
  notes: "",
};

/** Kanton-Gruppierung für die Tab-Navigation. */
const REGION_TABS = [
  { key: "gr",     label: "Graubünden",     match: "gr" },
  { key: "sz_zh",  label: "Schwyz / Zürich", match: "sz_zh" },
  { key: "other",  label: "Übrige",          match: "other" },
  { key: "done",   label: "Fertige",         match: "done" },
];

const REGION_OPTIONS = [
  { value: "",       label: "— nicht zugewiesen" },
  { value: "gr",     label: "Graubünden (GR)" },
  { value: "sz_zh",  label: "Schwyz / Zürich (SZ · ZH)" },
  { value: "other",  label: "Übrige" },
];

export default function StudentsManager() {
  const [items, setItems] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState(null);   // { matches: [...], form: {...} }
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === "undefined") return "gr";
    return window.localStorage.getItem("admin.students.region_tab") || "gr";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("admin.students.region_tab", activeTab);
    }
  }, [activeTab]);

  const load = async () => {
    try {
      const r = await api.get("/students");
      setItems(r.data || []);
    } catch (e) {
      toast.error(formatApiError(e));
      setItems([]);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e?.preventDefault?.();
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error("Vor- und Nachname sind Pflicht");
      return;
    }
    // Duplicate check BEFORE hitting POST — server-side check would only
    // reject after insert, we want the admin to make an informed choice.
    try {
      const r = await api.get("/students/check-duplicate", {
        params: { first_name: form.first_name.trim(), last_name: form.last_name.trim() },
      });
      const matches = r.data?.matches || [];
      if (matches.length > 0) {
        setDuplicateWarning({ matches, form: { ...form } });
        return;
      }
    } catch (err) {
      // Non-blocking — fall through to create if the check fails.
      console.warn("duplicate check failed", err);
    }
    await createActual(form);
  };

  const createActual = async (formData) => {
    setCreating(true);
    try {
      const r = await api.post("/students", formData);
      setItems((cur) => [...(cur || []), r.data]);
      setForm(EMPTY_FORM);
      setShowForm(false);
      setDuplicateWarning(null);
      toast.success("Schüler angelegt");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setCreating(false);
    }
  };

  const removeStudent = async (student) => {
    if (
      !confirm(
        `Schüler ${student.first_name} ${student.last_name} löschen? Alle Lektionen und Bewertungen werden mitgelöscht.`,
      )
    )
      return;
    try {
      await api.delete(`/students/${student.id}`);
      setItems((cur) => cur.filter((s) => s.id !== student.id));
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const sendAgb = async (student) => {
    if (!student.email) {
      toast.error("Kein E-Mail hinterlegt");
      return;
    }
    const extra = student.guardian_email
      ? ` und ${student.guardian_email}`
      : "";
    if (!confirm(`AGB an ${student.email}${extra} ${student.agb_sent_at ? "erneut " : ""}senden?`)) return;
    try {
      const r = await api.post(`/terms/send/${student.id}`);
      if (r.data.sent) {
        toast.success(`AGB an ${student.email}${extra} versendet`);
      } else {
        toast.warning(`Link erstellt (SMTP: ${r.data.detail}). Manuell weiterleiten: ${r.data.confirm_url}`);
      }
      // Refresh badge state
      const list = await api.get("/students");
      setItems(list.data || []);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  if (items === null) {
    return (
      <div className="flex items-center justify-center py-16 text-[#78716c]">
        <Loader2 className="animate-spin" size={18} />
      </div>
    );
  }

  const filtered = query
    ? items.filter((s) =>
        `${s.first_name} ${s.last_name} ${s.city} ${s.email}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
    : items;

  // Region-Bucket-Berechnung für jeden Schüler:
  //  – archived === true  → landet IMMER im "Fertige"-Tab (unabhängig von Region)
  //  – wenn `region` gesetzt ist ("gr" / "sz_zh" / "other")  → respektieren
  //  – leerer / unbekannter Wert                             → "Übrige"
  const bucketOf = (s) => {
    if (s.archived === true) return "done";
    const r = (s.region || "").trim().toLowerCase();
    if (r === "gr" || r === "sz_zh" || r === "other") return r;
    return "other";
  };
  const countsPerTab = REGION_TABS.reduce((acc, t) => {
    acc[t.key] = filtered.filter((s) => bucketOf(s) === t.match).length;
    return acc;
  }, {});
  const tabFiltered = filtered.filter((s) => bucketOf(s) === activeTab);

  return (
    <div className="max-w-6xl">
      <div className="mb-7 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display leading-[0.98] tracking-tight text-3xl md:text-4xl">
            Schüler
          </h2>
          <p className="text-[#475569] text-sm mt-1 font-medium">
            {items.length} Schüler:in{items.length === 1 ? "" : "nen"} — Klick auf einen Eintrag öffnet die Fahrkontrolle.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          data-testid="admin-student-add-toggle"
          className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-[#ff5a36] text-white px-4 py-2 rounded-full hover:opacity-90"
        >
          <Plus size={12} /> {showForm ? "Abbrechen" : "Neuer Schüler"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={create}
          data-testid="admin-student-add-form"
          className="mb-6 bg-white border-2 border-[#ff5a36]/40 rounded-2xl p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          <FormField
            label="Vorname *"
            value={form.first_name}
            onChange={(v) => setForm((f) => ({ ...f, first_name: v }))}
            testid="admin-student-first-name"
          />
          <FormField
            label="Nachname *"
            value={form.last_name}
            onChange={(v) => setForm((f) => ({ ...f, last_name: v }))}
            testid="admin-student-last-name"
          />
          <FormField
            label="Strasse"
            value={form.street}
            onChange={(v) => setForm((f) => ({ ...f, street: v }))}
            testid="admin-student-street"
          />
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <FormField
                label="PLZ"
                value={form.zip}
                onChange={(v) => setForm((f) => ({ ...f, zip: v }))}
                testid="admin-student-zip"
              />
            </div>
            <div className="col-span-2">
              <FormField
                label="Ort"
                value={form.city}
                onChange={(v) => setForm((f) => ({ ...f, city: v }))}
                testid="admin-student-city"
              />
            </div>
          </div>
          <FormField
            label="Telefon"
            value={form.phone}
            onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
            testid="admin-student-phone"
          />
          <FormField
            label="E-Mail"
            value={form.email}
            onChange={(v) => setForm((f) => ({ ...f, email: v }))}
            testid="admin-student-email"
          />
          <FormField
            label="Kategorie"
            value={form.category}
            onChange={(v) => setForm((f) => ({ ...f, category: v }))}
            testid="admin-student-category"
          />
          <FormField
            label="Fahrlehrer"
            value={form.instructor}
            onChange={(v) => setForm((f) => ({ ...f, instructor: v }))}
            testid="admin-student-instructor"
          />
          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] block mb-1">
              Region (Tab-Zuordnung)
            </label>
            <select
              value={form.region}
              onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
              data-testid="admin-student-region"
              className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#ff5a36]"
            >
              {REGION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <FormField
            label="Beginn Ausbildung"
            type="date"
            value={form.start_date}
            onChange={(v) => setForm((f) => ({ ...f, start_date: v }))}
            testid="admin-student-start-date"
          />
          <FormField
            label="Geburtsdatum"
            type="date"
            value={form.birthdate}
            onChange={(v) => setForm((f) => ({ ...f, birthdate: v }))}
            testid="admin-student-birthdate"
          />
          <FormField
            label="Datum Vorprüfung"
            type="date"
            value={form.prep_exam_date}
            onChange={(v) => setForm((f) => ({ ...f, prep_exam_date: v }))}
            testid="admin-student-prep-date"
          />
          <FormField
            label="Datum Prüfung"
            type="date"
            value={form.exam_date}
            onChange={(v) => setForm((f) => ({ ...f, exam_date: v }))}
            testid="admin-student-exam-date"
          />
          <div className="md:col-span-2 mt-2 pt-3 border-t border-[#f3f0eb]">
            <div className="text-[10px] font-semibold tracking-widest uppercase text-[#78716c] mb-2">
              Erziehungsberechtigte:r (freiwillig · empfohlen für Schüler:innen unter 18)
            </div>
          </div>
          <FormField
            label="Name Erziehungsberechtigte:r"
            value={form.guardian_name}
            onChange={(v) => setForm((f) => ({ ...f, guardian_name: v }))}
            testid="admin-student-guardian-name"
          />
          <FormField
            label="E-Mail Erziehungsberechtigte:r"
            value={form.guardian_email}
            onChange={(v) => setForm((f) => ({ ...f, guardian_email: v }))}
            testid="admin-student-guardian-email"
          />
          <div className="md:col-span-2 pt-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={creating}
              data-testid="admin-student-add-submit"
              className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-[#0f172a] text-white px-4 py-2 rounded-full hover:opacity-90 disabled:opacity-50"
            >
              {creating ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Plus size={12} />
              )}
              Anlegen
            </button>
            <span className="text-xs text-[#475569]">
              Adresse und weitere Details kannst du im Profil ergänzen.
            </span>
          </div>
        </form>
      )}

      <div className="mb-4 flex items-center gap-2 max-w-md">
        <Search size={14} className="text-[#a8a29e]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suchen (Name, Ort, E-Mail …)"
          data-testid="admin-students-search"
          className="flex-1 text-sm bg-transparent border-b border-[#e7e5e4] focus:border-[#ff5a36] focus:outline-none py-1.5"
        />
      </div>

      {/* Region tabs – filter students by their assigned region */}
      <div
        className="mb-5 flex items-center gap-1 border-b border-[#e7e5e4]"
        data-testid="admin-students-region-tabs"
      >
        {REGION_TABS.map((t) => {
          const active = activeTab === t.key;
          const count = countsPerTab[t.key] || 0;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              data-testid={`admin-students-region-tab-${t.key}`}
              className={`relative -mb-px px-4 py-2.5 text-xs font-semibold tracking-widest uppercase transition-colors ${
                active
                  ? "text-[#0f172a] border-b-2 border-[#ff5a36]"
                  : "text-[#78716c] hover:text-[#0f172a]"
              }`}
            >
              {t.label}
              <span
                className={`ml-2 inline-flex items-center justify-center min-w-[20px] h-[18px] px-1 rounded-full text-[10px] tracking-normal ${
                  active
                    ? "bg-[#ff5a36] text-white"
                    : "bg-[#f1f5f9] text-[#64748b]"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {tabFiltered.length === 0 ? (
        <div
          className="py-16 text-center bg-white border border-dashed border-[#e7e5e4] rounded-2xl text-[#78716c] text-sm"
          data-testid="admin-students-empty"
        >
          {items.length === 0
            ? "Noch keine Schüler:innen angelegt."
            : query
              ? "Kein Treffer für die Suche in diesem Tab."
              : activeTab === "done"
                ? `Noch keine Schüler:innen archiviert. Wenn jemand die Prüfung bestanden hat, klick im Schülerdetail oben rechts auf "Archivieren".`
                : `Keine Schüler:innen in dieser Region. Zuweisung im Schülerprofil unter „Region".`}
        </div>
      ) : (
        <div className="space-y-2">
          {tabFiltered.map((s) => (
            <div
              key={s.id}
              data-testid={`admin-student-row-${s.id}`}
              className={`bg-white border rounded-2xl p-4 flex items-center gap-4 hover:border-[#ff5a36] transition-colors ${
                s.archived ? "border-[#166534]/30 bg-[#f0fdf4]" : "border-[#e7e5e4]"
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                s.archived ? "bg-[#166534]/10 text-[#166534]" : "bg-[#ff5a36]/10 text-[#ff5a36]"
              }`}>
                <UserRound size={17} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-lg leading-tight truncate">
                  {s.first_name} {s.last_name}
                  {s.archived && (
                    <span
                      className="ml-2 inline-flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase bg-[#166534] text-white px-2 py-0.5 rounded-full align-middle"
                      data-testid={`admin-student-passed-badge-${s.id}`}
                    >
                      ✓ Bestanden{s.passed_date ? ` · ${s.passed_date.split("-").reverse().join(".")}` : ""}
                    </span>
                  )}
                </div>
                <div className="text-xs text-[#78716c] mt-0.5 truncate">
                  {[s.city, s.category && `Kat. ${s.category}`, s.instructor]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
              <AgbBadge student={s} />
              {s.email && (
                <button
                  type="button"
                  onClick={() => sendAgb(s)}
                  data-testid={`admin-student-send-agb-${s.id}`}
                  title={
                    s.agb_confirmed_at
                      ? "AGB erneut senden (bereits bestätigt)"
                      : s.agb_sent_at
                      ? "AGB neu senden"
                      : "AGB senden"
                  }
                  className="w-9 h-9 flex items-center justify-center rounded-full text-[#78716c] hover:text-[#ff5a36] hover:bg-[#fff7ed] transition-colors"
                  aria-label="AGB senden"
                >
                  <Send size={13} />
                </button>
              )}
              <Link
                to={`/admin/students/${s.id}`}
                data-testid={`admin-student-open-${s.id}`}
                className="inline-flex items-center gap-1 text-xs font-semibold tracking-widest uppercase bg-[#0f172a] text-white px-3.5 py-2 rounded-full hover:opacity-90"
              >
                Öffnen <ChevronRight size={12} />
              </Link>
              <button
                type="button"
                onClick={() => removeStudent(s)}
                data-testid={`admin-student-delete-${s.id}`}
                className="w-9 h-9 flex items-center justify-center rounded-full text-[#78716c] hover:text-[#dc2626] hover:bg-[#fee2e2] transition-colors"
                aria-label="Löschen"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
      {duplicateWarning && (
        <DuplicateStudentWarning
          matches={duplicateWarning.matches}
          form={duplicateWarning.form}
          onCancel={() => setDuplicateWarning(null)}
          onCreate={() => createActual(duplicateWarning.form)}
          creating={creating}
        />
      )}
    </div>
  );
}

/** Modal shown when creating a student whose Vor+Nachname already exists. */
function DuplicateStudentWarning({ matches, form, onCancel, onCreate, creating }) {
  const fmt = (iso) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("de-CH");
    } catch {
      return iso.slice(0, 10);
    }
  };
  return (
    <div
      data-testid="student-duplicate-warning-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#fef3c7] text-[#b45309] flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-xl leading-tight text-[#0f172a]">
              Achtung: möglicher Doppeleintrag
            </h3>
            <p className="text-sm text-[#475569] mt-1">
              Es existiert bereits {matches.length === 1 ? "ein Schüler" : `${matches.length} Schüler`} mit dem Namen{" "}
              <strong className="text-[#0f172a]">{form.first_name} {form.last_name}</strong>.
            </p>
          </div>
          <button
            onClick={onCancel}
            data-testid="student-duplicate-close"
            className="text-[#94a3b8] hover:text-[#0f172a] p-1"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-2 mb-5 max-h-64 overflow-y-auto">
          {matches.map((m) => (
            <div
              key={m.id}
              data-testid={`student-duplicate-match-${m.id}`}
              className="border border-[#fde68a] bg-[#fffbeb] rounded-xl p-3 text-sm"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="font-semibold text-[#0f172a]">
                  {m.first_name} {m.last_name}
                  {m.category && (
                    <span className="ml-2 text-[10px] font-semibold tracking-widest uppercase text-[#94a3b8]">
                      Kat. {m.category}
                    </span>
                  )}
                  {m.archived && (
                    <span className="ml-2 text-[10px] font-semibold tracking-widest uppercase bg-[#e2e8f0] text-[#475569] px-2 py-0.5 rounded-full">
                      Archiv
                    </span>
                  )}
                </div>
                <Link
                  to={`/admin/students/${m.id}`}
                  data-testid={`student-duplicate-open-${m.id}`}
                  className="text-[10px] font-semibold tracking-widest uppercase text-[#ff5a36] hover:underline"
                >
                  Öffnen →
                </Link>
              </div>
              <div className="text-xs text-[#78716c] mt-1">
                {[m.email, m.phone, m.city].filter(Boolean).join(" · ") || "keine Kontaktdaten"}
                {m.created_at && <span className="ml-2 text-[#a8a29e]">· angelegt {fmt(m.created_at)}</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 flex-wrap">
          <button
            onClick={onCancel}
            data-testid="student-duplicate-cancel"
            className="text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-full text-[#475569] hover:bg-[#f1f5f9]"
          >
            Abbrechen
          </button>
          <button
            onClick={onCreate}
            disabled={creating}
            data-testid="student-duplicate-confirm"
            className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-[#ff5a36] text-white px-4 py-2 rounded-full hover:opacity-90 disabled:opacity-50"
          >
            {creating && <Loader2 size={12} className="animate-spin" />}
            Trotzdem anlegen
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, testid, type = "text" }) {
  return (
    <div>
      <label className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] block mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testid}
        className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#ff5a36]"
      />
    </div>
  );
}

/** Small pill showing where the student is in the AGB flow. */
function AgbBadge({ student }) {
  if (student.agb_confirmed_at) {
    return (
      <span
        data-testid={`admin-student-agb-badge-${student.id}`}
        className="hidden md:inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase bg-[#dcfce7] text-[#15803d] border border-[#86efac] px-2.5 py-1 rounded-full"
        title={`AGB akzeptiert am ${new Date(student.agb_confirmed_at).toLocaleString("de-CH")}`}
      >
        <ShieldCheck size={11} /> AGB ok
      </span>
    );
  }
  if (student.agb_sent_at) {
    return (
      <span
        data-testid={`admin-student-agb-badge-${student.id}`}
        className="hidden md:inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase bg-[#fef3c7] text-[#92400e] border border-[#fde68a] px-2.5 py-1 rounded-full"
        title={`AGB gesendet am ${new Date(student.agb_sent_at).toLocaleString("de-CH")} — noch keine Bestätigung`}
      >
        <Clock size={11} /> AGB offen
      </span>
    );
  }
  return (
    <span
      data-testid={`admin-student-agb-badge-${student.id}`}
      className="hidden md:inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase bg-[#f8fafc] text-[#64748b] border border-[#e2e8f0] px-2.5 py-1 rounded-full"
      title="AGB noch nicht gesendet"
    >
      <Circle size={11} /> AGB —
    </span>
  );
}
