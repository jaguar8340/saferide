/**
 * TermsManager — AGB-Editor + Versand-Übersicht.
 *  - Textarea (Markdown) für terms_de + terms_en, Autosave on blur
 *  - Tabelle aller Schüler mit AGB-Status (offen / gesendet / bestätigt)
 *  - Send-Button pro Schüler (generiert Token + E-Mail)
 */
import { useEffect, useMemo, useState } from "react";
import {
  Loader2, Save, Send, Copy, Check, CheckCircle2,
  Clock, AlertCircle, FileText, X,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";

export default function TermsManager() {
  const [terms, setTerms] = useState({ terms_de: "", terms_en: "", terms_updated_at: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState([]);
  const [sending, setSending] = useState(null);
  const [inviteResult, setInviteResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [t, s] = await Promise.all([
          api.get("/terms"),
          api.get("/students"),
        ]);
        setTerms(t.data);
        setStudents(s.data);
      } catch (e) {
        toast.error(formatApiError(e));
      } finally { setLoading(false); }
    })();
  }, []);

  const save = async (patch) => {
    setSaving(true);
    try {
      const r = await api.patch("/terms", patch);
      setTerms(r.data);
      toast.success("AGB gespeichert");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally { setSaving(false); }
  };

  const sendTo = async (student) => {
    if (!student.email) return toast.error("Kein E-Mail hinterlegt");
    setSending(student.id);
    try {
      const r = await api.post(`/terms/send/${student.id}`);
      setInviteResult({ ...r.data, student });
      if (r.data.sent) toast.success("AGB per E-Mail versendet");
      else toast.message("Link erstellt", { description: r.data.detail });
      // Refresh students to update sent_at
      const s = await api.get("/students");
      setStudents(s.data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally { setSending(null); }
  };

  const copyLink = async () => {
    if (!inviteResult?.confirm_url) return;
    await navigator.clipboard.writeText(inviteResult.confirm_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stats = useMemo(() => {
    const confirmed = students.filter((s) => s.agb_confirmed_at).length;
    const sent = students.filter((s) => s.agb_sent_at && !s.agb_confirmed_at).length;
    const open = students.length - confirmed - sent;
    return { confirmed, sent, open };
  }, [students]);

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-sm text-[#475569]">
        <Loader2 size={14} className="animate-spin" /> Lädt AGB …
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="terms-manager">
      {/* Editor card */}
      <div className="bg-white border border-[#e7e5e4] rounded-2xl p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={16} className="text-[#ff5a36]" />
          <h2 className="font-display text-lg">AGB bearbeiten</h2>
          {saving && (
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase text-[#475569]">
              <Loader2 size={11} className="animate-spin" /> Speichert
            </span>
          )}
          {terms.terms_updated_at && !saving && (
            <span className="ml-auto text-[10px] text-[#78716c]">
              Letzte Änderung: {new Date(terms.terms_updated_at).toLocaleString("de-CH")}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TermsField
            label="AGB — Deutsch (Markdown)"
            testid="terms-textarea-de"
            initialValue={terms.terms_de}
            onSave={(v) => save({ terms_de: v })}
            placeholder="# Allgemeine Geschäftsbedingungen&#10;&#10;## 1. Anwendungsbereich&#10;..."
          />
          <TermsField
            label="AGB — English (Markdown, optional)"
            testid="terms-textarea-en"
            initialValue={terms.terms_en}
            onSave={(v) => save({ terms_en: v })}
            placeholder="# Terms &amp; Conditions&#10;&#10;## 1. Scope&#10;..."
          />
        </div>
      </div>

      {/* Stats + send table */}
      <div className="bg-white border border-[#e7e5e4] rounded-2xl p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Send size={16} className="text-[#ff5a36]" />
          <h2 className="font-display text-lg">Versand & Bestätigung</h2>
          <div className="ml-auto flex flex-wrap gap-2 text-[10px] font-semibold tracking-widest uppercase">
            <StatChip icon={<CheckCircle2 size={11} />} label={`Bestätigt ${stats.confirmed}`} tone="green" />
            <StatChip icon={<Clock size={11} />} label={`Gesendet ${stats.sent}`} tone="amber" />
            <StatChip icon={<AlertCircle size={11} />} label={`Offen ${stats.open}`} tone="red" />
          </div>
        </div>

        <ul className="divide-y divide-[#f3f0eb]">
          {students.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 py-2.5" data-testid={`terms-row-${s.id}`}>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[#0f172a]">
                  {s.first_name} {s.last_name}
                </div>
                <div className="text-xs text-[#78716c]">{s.email || "keine E-Mail"}</div>
              </div>
              <AgbBadge student={s} />
              <button
                type="button"
                onClick={() => sendTo(s)}
                disabled={sending === s.id || !s.email}
                data-testid={`terms-send-${s.id}`}
                className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase bg-[#0f172a] text-white px-3 py-2 rounded-full hover:opacity-90 disabled:opacity-40"
              >
                {sending === s.id ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                Senden
              </button>
            </li>
          ))}
        </ul>
      </div>

      {inviteResult && (
        <div
          data-testid="terms-invite-result"
          className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-3rem)] bg-white border border-[#e7e5e4] rounded-2xl p-4 shadow-2xl z-50"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-[#0f172a]">
              {inviteResult.sent ? "E-Mail versendet" : "Link erstellt"}
            </div>
            <button onClick={() => setInviteResult(null)}>
              <X size={14} className="text-[#78716c]" />
            </button>
          </div>
          <div className="text-xs text-[#475569] mb-2">
            An: {inviteResult.email}
          </div>
          <div className="text-[10px] font-mono bg-[#fafaf9] rounded p-2 break-all mb-2">
            {inviteResult.confirm_url}
          </div>
          <button
            onClick={copyLink}
            data-testid="terms-copy-link"
            className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase text-[#ff5a36]"
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? "Kopiert" : "Link kopieren"}
          </button>
        </div>
      )}
    </div>
  );
}


function TermsField({ label, initialValue, onSave, placeholder, testid }) {
  const [value, setValue] = useState(initialValue || "");
  useEffect(() => setValue(initialValue || ""), [initialValue]);
  return (
    <label className="block">
      <span className="text-xs font-semibold tracking-widest uppercase text-[#475569] mb-1.5 block">
        {label}
      </span>
      <textarea
        rows={16}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => value !== initialValue && onSave(value)}
        placeholder={placeholder}
        data-testid={testid}
        className="w-full bg-[#fafaf9] border border-[#e7e5e4] rounded-xl px-3 py-2 text-sm font-mono leading-relaxed focus:outline-none focus:border-[#ff5a36] resize-y min-h-[300px]"
      />
    </label>
  );
}


function StatChip({ icon, label, tone }) {
  const tones = {
    green: "bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]",
    amber: "bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]",
    red: "bg-[#fef2f2] text-[#991b1b] border-[#fecaca]",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${tones[tone]}`}>
      {icon}{label}
    </span>
  );
}


function AgbBadge({ student }) {
  if (student.agb_confirmed_at) {
    return (
      <span
        title={`Bestätigt: ${new Date(student.agb_confirmed_at).toLocaleString("de-CH")}`}
        className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase bg-[#f0fdf4] text-[#166534] px-2 py-1 rounded-full"
      >
        <CheckCircle2 size={11} /> Bestätigt
      </span>
    );
  }
  if (student.agb_sent_at) {
    return (
      <span
        title={`Gesendet: ${new Date(student.agb_sent_at).toLocaleString("de-CH")}`}
        className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase bg-[#fff7ed] text-[#c2410c] px-2 py-1 rounded-full"
      >
        <Clock size={11} /> Gesendet
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase bg-[#fef2f2] text-[#991b1b] px-2 py-1 rounded-full">
      <AlertCircle size={11} /> Offen
    </span>
  );
}
