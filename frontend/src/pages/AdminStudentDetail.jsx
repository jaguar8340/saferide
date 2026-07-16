/**
 * AdminStudentDetail — full-page view for one student. Six sub-tabs:
 *   1. Übersicht          – headline info + editable master data
 *   2. Fahrstunden        – flat list of lessons with autosave
 *   3. Rechnungen         – invoice CRUD with status pills
 *   4. Aktivitäten        – auto-logged read-only audit trail
 *   5. Dokumente          – file uploads scoped to the student
 *   6. Fahrkontrolle      – the main matrix module
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Loader2,
  ArrowLeft,
  UserRound,
  Save,
  Calendar as CalendarIcon,
  Receipt,
  Activity,
  FolderOpen,
  ClipboardList,
  LayoutDashboard,
  Send,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";
import FahrkontrolleTab from "@/components/admin/students/FahrkontrolleTab";
import LessonsTab from "@/components/admin/students/LessonsTab";
import InvoicesTab from "@/components/admin/students/InvoicesTab";
import ActivitiesTab from "@/components/admin/students/ActivitiesTab";
import DocumentsTab from "@/components/admin/students/DocumentsTab";

const SUB_TABS = [
  { id: "overview",     icon: LayoutDashboard, label: "Übersicht" },
  { id: "lessons",      icon: CalendarIcon,    label: "Fahrstunden" },
  { id: "invoices",     icon: Receipt,         label: "Rechnungen" },
  { id: "activities",   icon: Activity,        label: "Aktivitäten" },
  { id: "documents",    icon: FolderOpen,      label: "Dokumente" },
  { id: "fahrkontrolle",icon: ClipboardList,   label: "Fahrkontrolle" },
];

export default function AdminStudentDetail() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [student, setStudent] = useState(null);
  // Initialize the active sub-tab from the ?tab=... query param so deep
  // links (e.g. /admin/students/{id}?tab=invoices) work on first paint.
  const validIds = SUB_TABS.map((t) => t.id);
  const initialTab = validIds.includes(searchParams.get("tab"))
    ? searchParams.get("tab")
    : "fahrkontrolle";
  const [tab, setTab] = useState(initialTab);
  const [saving, setSaving] = useState(false);

  const changeTab = (next) => {
    setTab(next);
    // Keep the URL in sync so refresh / back-forward preserves the tab.
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params, { replace: true });
  };

  const load = async () => {
    try {
      const r = await api.get(`/students/${studentId}`);
      setStudent(r.data);
    } catch (e) {
      toast.error(formatApiError(e));
      navigate("/admin?tab=students");
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
  }, [studentId]);

  const saveField = async (field, value) => {
    if (!student) return;
    if (student[field] === value) return;
    setSaving(true);
    try {
      const r = await api.patch(`/students/${studentId}`, { [field]: value });
      setStudent(r.data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  if (!student) {
    return (
      <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#78716c]" size={22} />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#fafaf9] text-[#0f172a]"
      data-testid="admin-student-detail"
    >
      {/* Header (same style as AdminDashboard) */}
      <header className="border-b border-[#e7e5e4] bg-white px-4 md:px-8 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/admin?tab=students"
            data-testid="admin-student-back"
            className="w-9 h-9 flex items-center justify-center rounded-full border border-[#e7e5e4] hover:bg-[#fafaf9]"
          >
            <ArrowLeft size={14} />
          </Link>
          <div className="w-10 h-10 rounded-full bg-[#ff5a36]/10 text-[#ff5a36] flex items-center justify-center shrink-0">
            <UserRound size={17} />
          </div>
          <div className="min-w-0">
            <div className="font-display text-xl leading-tight truncate">
              {student.first_name} {student.last_name}
            </div>
            <div className="text-xs text-[#78716c] truncate">
              {[
                student.category && `Kat. ${student.category}`,
                student.city,
                student.instructor,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saving && (
            <span className="text-[10px] tracking-widest uppercase text-[#78716c] mr-2 hidden sm:inline">
              <Save size={11} className="inline mr-1" /> Speichere …
            </span>
          )}
          <InviteStudentButton student={student} />
          <Link
            to="/admin?tab=students"
            className="text-xs font-semibold tracking-widest uppercase text-[#475569] px-3 py-2 hover:text-[#0f172a]"
          >
            Alle Schüler
          </Link>
        </div>
      </header>

      {/* Sub-tab nav */}
      <nav
        className="border-b border-[#e7e5e4] bg-white px-4 md:px-8 flex overflow-x-auto"
        data-testid="admin-student-tabs"
      >
        {SUB_TABS.map((tb) => {
          const Icon = tb.icon;
          const active = tab === tb.id;
          return (
            <button
              key={tb.id}
              onClick={() => changeTab(tb.id)}
              data-testid={`admin-student-tab-${tb.id}`}
              className={`flex items-center gap-2 px-3.5 py-3 text-xs font-semibold tracking-widest uppercase whitespace-nowrap border-b-2 transition-colors ${
                active
                  ? "border-[#ff5a36] text-[#0f172a]"
                  : "border-transparent text-[#78716c] hover:text-[#0f172a]"
              }`}
            >
              <Icon size={13} strokeWidth={2} />
              {tb.label}
            </button>
          );
        })}
      </nav>

      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        {tab === "overview" && <OverviewTab student={student} onSave={saveField} onRefresh={load} />}
        {tab === "lessons" && <LessonsTab student={student} />}
        {tab === "invoices" && <InvoicesTab student={student} />}
        {tab === "activities" && <ActivitiesTab student={student} />}
        {tab === "documents" && <DocumentsTab student={student} />}
        {tab === "fahrkontrolle" && <FahrkontrolleTab student={student} />}
      </main>
    </div>
  );
}

function OverviewTab({ student, onSave, onRefresh }) {
  const [summary, setSummary] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get(`/students/${student.id}/summary`);
        setSummary(r.data);
      } catch {
        /* summary is optional – tolerate failures */
      }
    })();
  }, [student.id]);

  return (
    <div className="max-w-4xl">
      <h2 className="font-display text-3xl md:text-4xl leading-none tracking-tight mb-6">
        Übersicht
      </h2>

      {/* Dashboard tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6" data-testid="student-summary-tiles">
        <SummaryTile
          label="Offene Rechnungen"
          value={summary ? summary.open_invoices_count : "—"}
          sub={summary && summary.open_invoices_sum_chf > 0
            ? `CHF ${summary.open_invoices_sum_chf.toFixed(2)}`
            : (summary ? "Alles bezahlt" : "")}
          testid="summary-open-invoices"
          accent={summary && summary.open_invoices_count > 0 ? "warning" : "muted"}
        />
        <SummaryTile
          label="Kommende Termine"
          value={summary ? summary.upcoming_appointments_count : "—"}
          sub={summary && summary.next_appointment
            ? new Date(summary.next_appointment.start_datetime).toLocaleString("de-CH", {
                day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
              })
            : (summary ? "Nichts geplant" : "")}
          testid="summary-upcoming"
          accent="primary"
        />
        <SummaryTile
          label="Erledigte Termine"
          value={summary ? summary.completed_appointments_count : "—"}
          sub={summary
            ? (summary.completed_appointments_count > 0 ? "Bereits durchgeführt" : "Noch keine")
            : ""}
          testid="summary-completed"
          accent="muted"
        />
        <SummaryTile
          label="Geloggte Lektionen"
          value={summary ? summary.logged_lessons_count : "—"}
          sub="Fahrkontrolle-Journal"
          testid="summary-lessons"
          accent="muted"
        />
      </div>

      <div className="bg-white border border-[#e7e5e4] rounded-2xl p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <EditField label="Vorname"           value={student.first_name}    onSave={(v) => onSave("first_name", v)} />
        <EditField label="Nachname"          value={student.last_name}     onSave={(v) => onSave("last_name", v)} />
        <EditField label="Strasse"           value={student.street}        onSave={(v) => onSave("street", v)} />
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <EditField label="PLZ"           value={student.zip}           onSave={(v) => onSave("zip", v)} />
          </div>
          <div className="col-span-2">
            <EditField label="Ort"           value={student.city}          onSave={(v) => onSave("city", v)} />
          </div>
        </div>
        <EditField label="Telefon"           value={student.phone}         onSave={(v) => onSave("phone", v)} />
        <EditField label="E-Mail"            value={student.email}         onSave={(v) => onSave("email", v)} />
        <EditField label="Kategorie"         value={student.category}      onSave={(v) => onSave("category", v)} />
        <EditField label="Fahrlehrer"        value={student.instructor}    onSave={(v) => onSave("instructor", v)} />
        <EditField label="Beginn Ausbildung" value={student.start_date}    type="date" onSave={(v) => onSave("start_date", v)} />
        <EditField label="Geburtsdatum"      value={student.birthdate}     type="date" onSave={(v) => onSave("birthdate", v)} />
        <EditField label="Datum Vorprüfung"  value={student.prep_exam_date} type="date" onSave={(v) => onSave("prep_exam_date", v)} />
        <EditField label="Datum Prüfung"     value={student.exam_date}     type="date" onSave={(v) => onSave("exam_date", v)} />
        <div className="md:col-span-2 mt-2 pt-3 border-t border-[#f3f0eb]">
          <div className="text-[10px] font-semibold tracking-widest uppercase text-[#78716c]">
            Erziehungsberechtigte:r (freiwillig · empfohlen bei Schüler:innen unter 18)
          </div>
        </div>
        <EditField label="Name Erziehungsberechtigte:r"    value={student.guardian_name}    onSave={(v) => onSave("guardian_name", v)} />
        <EditField label="E-Mail Erziehungsberechtigte:r"  value={student.guardian_email}   onSave={(v) => onSave("guardian_email", v)} />
      </div>

      <AgbSection student={student} onRefresh={onRefresh} />
    </div>
  );
}

function AgbSection({ student, onRefresh }) {
  const [sending, setSending] = useState(null);
  const send = async (target) => {
    setSending(target);
    try {
      const r = await api.post(`/terms/send/${student.id}`, null, { params: { target } });
      if (r.data.sent) {
        toast.success(`AGB an ${r.data.email} versendet`);
      } else {
        toast.message("Link erstellt", { description: r.data.detail });
      }
      onRefresh?.();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSending(null);
    }
  };

  return (
    <div
      data-testid="student-agb-section"
      className="bg-white border border-[#e7e5e4] rounded-2xl p-5 md:p-6 space-y-3"
    >
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck size={16} className="text-[#ff5a36]" />
        <h3 className="font-display text-lg">AGB / Einwilligung</h3>
      </div>
      <AgbRow
        label="Schüler:in"
        email={student.email}
        sentAt={student.agb_student_sent_at || student.agb_sent_at}
        confirmedAt={student.agb_student_confirmed_at || student.agb_confirmed_at}
        onSend={() => send("student")}
        isSending={sending === "student"}
        testid="student-agb-send-student"
      />
      <AgbRow
        label="Erziehungsberechtigte:r"
        email={student.guardian_email}
        sentAt={student.agb_guardian_sent_at}
        confirmedAt={student.agb_guardian_confirmed_at}
        onSend={() => send("guardian")}
        isSending={sending === "guardian"}
        testid="student-agb-send-guardian"
      />
    </div>
  );
}


function AgbRow({ label, email, sentAt, confirmedAt, onSend, isSending, testid }) {
  const disabled = !email || isSending;
  return (
    <div className="flex items-center gap-3 bg-[#fafaf9] border border-[#f3f0eb] rounded-xl px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-semibold tracking-widest uppercase text-[#78716c]">
          {label}
        </div>
        <div className="text-sm text-[#334155] truncate">
          {email || <span className="text-[#a8a29e] italic text-xs">keine E-Mail hinterlegt</span>}
        </div>
      </div>
      <AgbStatePill sentAt={sentAt} confirmedAt={confirmedAt} />
      <button
        type="button"
        onClick={onSend}
        disabled={disabled}
        data-testid={testid}
        className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase bg-[#0f172a] text-white px-3.5 py-2 rounded-full hover:opacity-90 disabled:bg-[#e7e5e4] disabled:text-[#a8a29e] disabled:cursor-not-allowed"
      >
        {isSending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
        Senden
      </button>
    </div>
  );
}


function AgbStatePill({ sentAt, confirmedAt }) {
  if (confirmedAt) {
    return (
      <span
        title={`Bestätigt am ${new Date(confirmedAt).toLocaleString("de-CH")}`}
        className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase bg-[#f0fdf4] text-[#166534] px-2.5 py-1 rounded-full whitespace-nowrap"
      >
        <ShieldCheck size={11} /> Bestätigt
      </span>
    );
  }
  if (sentAt) {
    return (
      <span
        title={`Gesendet am ${new Date(sentAt).toLocaleString("de-CH")}`}
        className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase bg-[#fff7ed] text-[#c2410c] px-2.5 py-1 rounded-full whitespace-nowrap"
      >
        <Clock size={11} /> Gesendet
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase bg-[#fef2f2] text-[#991b1b] px-2.5 py-1 rounded-full whitespace-nowrap">
      <AlertCircle size={11} /> Offen
    </span>
  );
}


function SummaryTile({ label, value, sub, testid, accent = "muted" }) {
  const palette = {
    primary: "bg-[#ff5a36]/10 text-[#ff5a36] border-[#ff5a36]/20",
    warning: "bg-[#fef3c7] text-[#92400e] border-[#fde68a]",
    muted:   "bg-white text-[#0f172a] border-[#e7e5e4]",
  }[accent];
  return (
    <div
      data-testid={testid}
      className={`rounded-2xl border p-4 ${palette}`}
    >
      <div className="text-[10px] font-semibold tracking-widest uppercase opacity-80">
        {label}
      </div>
      <div className="font-display text-3xl leading-none mt-1">
        {value}
      </div>
      {sub && (
        <div className="text-xs opacity-70 mt-1 truncate" title={sub}>
          {sub}
        </div>
      )}
    </div>
  );
}

function EditField({ label, value, onSave, type = "text" }) {
  const [draft, setDraft] = useState(value || "");
  useEffect(() => {
    setDraft(value || "");
  }, [value]);
  return (
    <div>
      <label className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] block mb-1">
        {label}
      </label>
      <input
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onSave(draft)}
        data-testid={`overview-field-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
        className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-xl px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
      />
    </div>
  );
}




/* ---------------------------------------------------------------------- */
/*  Invite student to the portal — one click generates a magic-link,      */
/*  triggers an SMTP invitation e-mail (if SMTP is configured) and lets   */
/*  the admin copy the link as fallback.                                  */
/* ---------------------------------------------------------------------- */
function InviteStudentButton({ student }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const invite = async () => {
    if (!student?.email) {
      toast.error("Schüler hat keine E-Mail-Adresse");
      return;
    }
    setBusy(true);
    try {
      const r = await api.post(`/portal/students/${student.id}/invite`);
      setResult(r.data);
      if (r.data.sent) {
        toast.success("Einladung per E-Mail versendet");
      } else {
        toast.message("Setup-Link erstellt", {
          description: r.data.detail || "SMTP nicht konfiguriert — Link unten kopieren.",
        });
      }
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!result?.setup_url) return;
    try {
      await navigator.clipboard.writeText(result.setup_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Zwischenablage nicht verfügbar");
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={invite}
        disabled={busy || !student?.email}
        data-testid="student-invite-portal"
        title={student?.email ? "Portal-Zugang einladen" : "Kein E-Mail hinterlegt"}
        className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-[#475569] px-3 py-2 rounded-lg hover:bg-[#fafaf9] hover:text-[#ff5a36] disabled:opacity-40 border border-[#e7e5e4]"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
        Portal-Zugang
      </button>
      {result && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-[#e7e5e4] rounded-2xl p-4 shadow-lg z-50" data-testid="invite-result">
          <div className="text-xs font-semibold text-[#0f172a] mb-1.5">
            {result.sent ? "E-Mail wurde gesendet an" : "Setup-Link (bitte manuell teilen)"}
          </div>
          <div className="text-xs text-[#475569] mb-2 truncate">{result.email}</div>
          <div className="flex items-center gap-1.5 bg-[#fafaf9] rounded-lg p-2 text-[10px] font-mono break-all mb-2">
            {result.setup_url}
          </div>
          <button
            type="button"
            onClick={copyLink}
            data-testid="invite-copy-link"
            className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase text-[#ff5a36] hover:underline"
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? "Kopiert" : "Link kopieren"}
          </button>
          <button
            type="button"
            onClick={() => setResult(null)}
            className="float-right text-[10px] tracking-widest uppercase text-[#78716c] hover:text-[#0f172a]"
          >
            Schliessen
          </button>
        </div>
      )}
    </div>
  );
}
