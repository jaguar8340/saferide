/**
 * Fahrschul-Settings — global business identity used on every generated
 * invoice PDF. Auto-loaded via GET /api/settings/business, autosaved
 * via PATCH on blur so Nadine can nachtragen ohne "Speichern"-Button.
 * Includes logo upload + backup helper section.
 */
import { useEffect, useRef, useState } from "react";
import { Loader2, Building2, Info, Upload, RefreshCw, Download, Copy, ShieldCheck, Mail, PlugZap } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";

const SECTIONS = [
  {
    title: "Firmenname & Adresse",
    fields: [
      { key: "business_name",  label: "Firmenname", cols: 2 },
      { key: "address_line1",  label: "Strasse" },
      { key: "address_line2",  label: "Zusatz (optional)" },
      { key: "zip",            label: "PLZ" },
      { key: "city",           label: "Ort" },
      { key: "country",        label: "Land" },
    ],
  },
  {
    title: "Kontakt",
    fields: [
      { key: "phone",   label: "Telefon" },
      { key: "email",   label: "E-Mail",  type: "email" },
      { key: "website", label: "Website" },
    ],
  },
  {
    title: "Bank / IBAN",
    fields: [
      { key: "iban",           label: "IBAN", cols: 2 },
      { key: "bank",           label: "Bank" },
      { key: "bic",            label: "BIC / SWIFT" },
      { key: "account_holder", label: "Kontoinhaber", cols: 2 },
    ],
  },
  {
    title: "MWST & Rechnungs-Einstellungen",
    fields: [
      { key: "mwst_number", label: "MWST-Nummer (leer = nicht MWST-pflichtig)", cols: 2 },
      { key: "mwst_rate",   label: "MWST-Satz in %", type: "number", step: "0.1" },
      { key: "invoice_prefix", label: "Rechnungs-Präfix (z. B. RE)" },
      { key: "invoice_footer_note", label: "Fusszeile / Zahlungshinweis", cols: 2, textarea: true },
    ],
  },
];

export default function BusinessSettingsManager() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api.get("/settings/business");
        if (!cancelled) setData(r.data);
      } catch (e) {
        if (!cancelled) toast.error(formatApiError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async (key, value) => {
    if (!data) return;
    const original = data[key];
    let normalized = value;
    if (key === "mwst_rate") normalized = parseFloat(value) || 0;
    if (String(normalized) === String(original)) return;
    setSavingKey(key);
    try {
      const r = await api.patch("/settings/business", { [key]: normalized });
      setData(r.data);
      toast.success("Gespeichert");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSavingKey(null);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#78716c]">
        <Loader2 size={14} className="animate-spin" /> Lade Fahrschul-Einstellungen …
      </div>
    );
  }

  return (
    <div data-testid="business-settings" className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-[#0f172a] text-white flex items-center justify-center">
          <Building2 size={18} />
        </div>
        <div>
          <h2 className="font-display text-3xl md:text-4xl leading-none tracking-tight">
            Fahrschul-Daten
          </h2>
          <p className="text-xs text-[#78716c] mt-1">
            Diese Daten erscheinen auf jeder generierten Rechnung.
          </p>
        </div>
      </div>

      <div className="mb-6 flex items-start gap-3 p-3 bg-[#fef9c3] border border-[#eab308] rounded-2xl">
        <Info size={16} className="text-[#a16207] shrink-0 mt-0.5" />
        <div className="text-xs text-[#854d0e] leading-relaxed">
          Änderungen werden automatisch gespeichert, sobald du das Feld verlässt.
          IBAN / Bank / BIC / MWST-Nummer kannst du jederzeit ergänzen.
        </div>
      </div>

      <LogoSection data={data} setData={setData} />

      <div className="space-y-6">
        {SECTIONS.map((section) => (
          <div key={section.title} className="bg-white border border-[#e7e5e4] rounded-2xl p-5">
            <div className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] mb-4">
              {section.title}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.fields.map((f) => (
                <div key={f.key} className={f.cols === 2 ? "md:col-span-2" : ""}>
                  <label className="text-[11px] font-semibold text-[#475569] block mb-1">
                    {f.label}
                    {savingKey === f.key && (
                      <Loader2 size={10} className="inline-block ml-2 animate-spin text-[#ff5a36]" />
                    )}
                  </label>
                  {f.textarea ? (
                    <textarea
                      rows={3}
                      defaultValue={data[f.key] ?? ""}
                      onBlur={(e) => save(f.key, e.target.value)}
                      data-testid={`bs-${f.key}`}
                      className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36] resize-none"
                    />
                  ) : (
                    <input
                      type={f.type || "text"}
                      step={f.step}
                      defaultValue={data[f.key] ?? ""}
                      onBlur={(e) => save(f.key, e.target.value)}
                      data-testid={`bs-${f.key}`}
                      className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <BackupSection />
      <SmtpSection data={data} setData={setData} />
    </div>
  );
}

// -----------------------------------------------------------------------------
//  Logo section
// -----------------------------------------------------------------------------
function LogoSection({ data, setData }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const doUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post("/settings/business/logo", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setData(r.data);
      toast.success("Logo aktualisiert");
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setUploading(false);
    }
  };

  const doReset = async () => {
    if (!window.confirm("Auf das Standard-Safe-Ride-Logo zurücksetzen?")) return;
    setResetting(true);
    try {
      const r = await api.delete("/settings/business/logo");
      setData(r.data);
      toast.success("Auf Standard-Logo zurückgesetzt");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setResetting(false);
    }
  };

  const logoSrc = data.logo_url?.startsWith("/api/")
    ? `${process.env.REACT_APP_BACKEND_URL}${data.logo_url}`
    : data.logo_url;

  return (
    <div className="bg-white border border-[#e7e5e4] rounded-2xl p-5 mb-6">
      <div className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] mb-3">
        Firmen-Logo (erscheint oben links auf jeder Rechnung)
      </div>
      <div className="flex items-center gap-5 flex-wrap">
        <div
          data-testid="bs-logo-preview"
          className="w-40 h-24 rounded-xl bg-[#0f172a] flex items-center justify-center overflow-hidden shrink-0"
        >
          {logoSrc ? (
            <img
              src={logoSrc}
              alt="Logo Vorschau"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <span className="text-white text-xs opacity-70">Kein Logo</span>
          )}
        </div>
        <div className="flex-1 min-w-[220px]">
          <p className="text-xs text-[#475569] leading-relaxed mb-3">
            PNG oder JPG, empfohlen mit transparentem Hintergrund und mindestens
            400 × 200 px. Wird proportional skaliert.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label
              className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-[#ff5a36] text-white px-4 py-2 rounded-full cursor-pointer hover:opacity-90"
              data-testid="bs-logo-upload"
            >
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              {uploading ? "Lade…" : "Neues Logo hochladen"}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(e) => e.target.files?.[0] && doUpload(e.target.files[0])}
                disabled={uploading}
                className="hidden"
              />
            </label>
            <button
              onClick={doReset}
              disabled={resetting}
              data-testid="bs-logo-reset"
              className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-[#475569] bg-white border border-[#e2e8f0] px-4 py-2 rounded-full hover:border-[#ff5a36]"
            >
              {resetting ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Standard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
//  Backup section — download once + set up daily auto-backup
// -----------------------------------------------------------------------------
function BackupSection() {
  const [status, setStatus] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [scripts, setScripts] = useState(null);
  const [showScripts, setShowScripts] = useState(false);
  const [os, setOs] = useState("windows_batch");

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get("/backup/status");
        setStatus(r.data);
      } catch {
        /* ignore, we still show the download button */
      }
    })();
  }, []);

  const downloadNow = async () => {
    setDownloading(true);
    try {
      const res = await api.get("/backup/mongo", { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/gzip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `saferide-backup-${stamp}.json.gz`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Backup wurde heruntergeladen");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setDownloading(false);
    }
  };

  const openScripts = async () => {
    if (!scripts) {
      try {
        const r = await api.get("/backup/scripts");
        setScripts(r.data);
      } catch (e) {
        toast.error(formatApiError(e));
        return;
      }
    }
    setShowScripts(true);
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Script kopiert");
    } catch {
      toast.error("Kopieren fehlgeschlagen — bitte manuell auswählen");
    }
  };

  return (
    <div
      className="mt-8 bg-white border border-[#e7e5e4] rounded-2xl p-5"
      data-testid="bs-backup-section"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-2xl bg-[#0f172a] text-white flex items-center justify-center shrink-0">
          <ShieldCheck size={14} />
        </div>
        <div>
          <div className="text-[10px] font-semibold tracking-widest uppercase text-[#475569]">
            Datenbank-Sicherung
          </div>
          <div className="text-sm text-[#0f172a] leading-tight mt-0.5">
            Backup manuell laden oder täglich automatisch auf deinem PC speichern.
          </div>
        </div>
      </div>

      {status && (
        <div className="text-xs text-[#78716c] mb-4">
          <span className="font-semibold text-[#0f172a]">{status.total_documents}</span>{" "}
          Datensätze in{" "}
          <span className="font-semibold text-[#0f172a]">{status.collection_count}</span>{" "}
          Sammlungen bereit.
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={downloadNow}
          disabled={downloading}
          data-testid="bs-backup-download"
          className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-[#ff5a36] text-white px-4 py-2.5 rounded-full hover:opacity-90 disabled:opacity-50"
        >
          {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
          Backup jetzt herunterladen
        </button>
        <button
          onClick={openScripts}
          data-testid="bs-backup-schedule"
          className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-[#0f172a] bg-white border border-[#0f172a] px-4 py-2.5 rounded-full hover:bg-[#0f172a] hover:text-white transition-colors"
        >
          Tägliche Auto-Sicherung einrichten
        </button>
      </div>

      {showScripts && scripts && (
        <div className="mt-5 bg-[#0f172a] rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <div className="text-[10px] font-semibold tracking-widest uppercase text-white/60">
              Backup-Script
            </div>
            <div className="inline-flex gap-1 bg-white/10 rounded-full p-1">
              {[
                ["windows_batch", "Windows"],
                ["mac_bash", "macOS"],
                ["linux_bash", "Linux"],
              ].map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setOs(k)}
                  className={`text-[10px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full transition-colors ${
                    os === k ? "bg-white text-[#0f172a]" : "text-white/70 hover:text-white"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <button
              onClick={() => copyToClipboard(scripts[os])}
              data-testid="bs-backup-copy-script"
              className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase bg-white/10 text-white px-3 py-1.5 rounded-full hover:bg-white/20"
            >
              <Copy size={11} /> Kopieren
            </button>
          </div>
          <pre className="text-[11px] font-mono whitespace-pre-wrap leading-relaxed text-white/80 max-h-80 overflow-y-auto">
            {scripts[os]}
          </pre>
          <div className="mt-3 text-[11px] text-white/70 leading-relaxed">
            <strong className="text-white">Hinweis:</strong> {scripts.auth_hint}
          </div>
        </div>
      )}
    </div>
  );
}


// -----------------------------------------------------------------------------
//  SMTP / E-Mail-Versand
// -----------------------------------------------------------------------------
const SMTP_FIELDS = [
  { key: "smtp_host",       label: "SMTP-Server (Host)", placeholder: "z. B. smtp.gmail.com", cols: 2 },
  { key: "smtp_port",       label: "Port",               type: "number",     placeholder: "587" },
  { key: "smtp_username",   label: "Benutzername",       placeholder: "z. B. name@gmail.com" },
  { key: "smtp_password",   label: "Passwort / App-Passwort", type: "password", cols: 2 },
  { key: "smtp_from_email", label: "Absender-E-Mail",    placeholder: "z. B. rechnungen@saferide.ch" },
  { key: "smtp_from_name",  label: "Absender-Name",      placeholder: "z. B. Fahrschule Safe Ride" },
];

function SmtpSection({ data, setData }) {
  const [savingKey, setSavingKey] = useState(null);
  const [testing, setTesting] = useState(false);

  const save = async (key, value) => {
    const original = data[key];
    let normalized = value;
    if (key === "smtp_port") normalized = parseInt(value, 10) || 0;
    if (String(normalized) === String(original)) return;
    setSavingKey(key);
    try {
      const r = await api.patch("/settings/business", { [key]: normalized });
      setData(r.data);
      toast.success("Gespeichert");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSavingKey(null);
    }
  };

  const saveBool = async (key, value) => {
    setSavingKey(key);
    try {
      const r = await api.patch("/settings/business", { [key]: value });
      setData(r.data);
      toast.success("Gespeichert");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSavingKey(null);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      await api.post("/settings/business/smtp/test", {});
      toast.success("SMTP-Verbindung erfolgreich");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div
      className="mt-8 bg-white border border-[#e7e5e4] rounded-2xl p-5"
      data-testid="bs-smtp-section"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-2xl bg-[#0f172a] text-white flex items-center justify-center shrink-0">
          <Mail size={14} />
        </div>
        <div>
          <div className="text-[10px] font-semibold tracking-widest uppercase text-[#475569]">
            E-Mail-Versand (SMTP)
          </div>
          <div className="text-sm text-[#0f172a] leading-tight mt-0.5">
            Rechnungen direkt per E-Mail an Schüler:innen senden.
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-start gap-3 p-3 bg-[#eff6ff] border border-[#bfdbfe] rounded-xl">
        <Info size={14} className="text-[#1d4ed8] shrink-0 mt-0.5" />
        <div className="text-xs text-[#1e3a8a] leading-relaxed">
          Diese Zugangsdaten bekommst du von deinem E-Mail-Anbieter (IMAP-/SMTP-Einstellungen).
          Bei Gmail brauchst du ein <strong>App-Passwort</strong> – kein normales Passwort.
          Änderungen werden beim Verlassen des Felds gespeichert.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {SMTP_FIELDS.map((f) => (
          <div key={f.key} className={f.cols === 2 ? "md:col-span-2" : ""}>
            <label className="text-[11px] font-semibold text-[#475569] block mb-1">
              {f.label}
              {savingKey === f.key && (
                <Loader2 size={10} className="inline-block ml-2 animate-spin text-[#ff5a36]" />
              )}
            </label>
            <input
              type={f.type || "text"}
              defaultValue={data[f.key] ?? ""}
              onBlur={(e) => save(f.key, e.target.value)}
              placeholder={f.placeholder}
              data-testid={`bs-${f.key}`}
              autoComplete="off"
              className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
            />
          </div>
        ))}
        <div className="md:col-span-2 flex items-center gap-2">
          <label className="inline-flex items-center gap-2 text-xs text-[#475569] cursor-pointer">
            <input
              type="checkbox"
              defaultChecked={data.smtp_use_tls !== false}
              onChange={(e) => saveBool("smtp_use_tls", e.target.checked)}
              data-testid="bs-smtp_use_tls"
              className="accent-[#ff5a36]"
            />
            STARTTLS aktivieren (empfohlen bei Port 587 · deaktivieren nur bei Port 465 mit implizitem SSL)
          </label>
        </div>
      </div>

      <div className="mt-3 space-y-3 mb-4">
        <div>
          <label className="text-[11px] font-semibold text-[#475569] block mb-1">
            Betreff-Vorlage
            {savingKey === "email_subject_template" && (
              <Loader2 size={10} className="inline-block ml-2 animate-spin text-[#ff5a36]" />
            )}
          </label>
          <input
            type="text"
            defaultValue={data.email_subject_template ?? ""}
            onBlur={(e) => save("email_subject_template", e.target.value)}
            placeholder="Rechnung {number} – {business_name}"
            data-testid="bs-email_subject_template"
            className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-[#475569] block mb-1">
            Nachrichten-Vorlage
            {savingKey === "email_body_template" && (
              <Loader2 size={10} className="inline-block ml-2 animate-spin text-[#ff5a36]" />
            )}
          </label>
          <textarea
            rows={5}
            defaultValue={data.email_body_template ?? ""}
            onBlur={(e) => save("email_body_template", e.target.value)}
            data-testid="bs-email_body_template"
            className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36] resize-none"
          />
          <div className="text-[10px] text-[#94a3b8] mt-1">
            Platzhalter: <code>{"{first_name}"}</code>, <code>{"{last_name}"}</code>, <code>{"{number}"}</code>, <code>{"{total}"}</code>, <code>{"{lesson_date}"}</code>, <code>{"{business_name}"}</code>
          </div>
        </div>
      </div>

      <button
        onClick={testConnection}
        disabled={testing || !data.smtp_host}
        data-testid="bs-smtp-test"
        className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-[#0f172a] text-white px-4 py-2.5 rounded-full hover:opacity-90 disabled:opacity-40"
      >
        {testing ? <Loader2 size={12} className="animate-spin" /> : <PlugZap size={12} />}
        Verbindung testen
      </button>
    </div>
  );
}
