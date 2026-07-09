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
import { Link, useNavigate, useParams } from "react-router-dom";
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
  const [student, setStudent] = useState(null);
  const [tab, setTab] = useState("fahrkontrolle");
  const [saving, setSaving] = useState(false);

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
              onClick={() => setTab(tb.id)}
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
        {tab === "overview" && <OverviewTab student={student} onSave={saveField} />}
        {tab === "lessons" && <LessonsTab student={student} />}
        {tab === "invoices" && <InvoicesTab student={student} />}
        {tab === "activities" && <ActivitiesTab student={student} />}
        {tab === "documents" && <DocumentsTab student={student} />}
        {tab === "fahrkontrolle" && <FahrkontrolleTab student={student} />}
      </main>
    </div>
  );
}

function OverviewTab({ student, onSave }) {
  return (
    <div className="max-w-3xl">
      <h2 className="font-display text-3xl md:text-4xl leading-none tracking-tight mb-6">
        Übersicht
      </h2>
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
        <EditField label="Datum Vorprüfung"  value={student.prep_exam_date} type="date" onSave={(v) => onSave("prep_exam_date", v)} />
        <EditField label="Datum Prüfung"     value={student.exam_date}     type="date" onSave={(v) => onSave("exam_date", v)} />
      </div>
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
