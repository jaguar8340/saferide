/**
 * EmailSettingsManager – dedicated tab for SMTP configuration.
 * Extracted from BusinessSettingsManager so admins can find it easily.
 */
import { useEffect, useState } from "react";
import { Loader2, Mail, Info, PlugZap } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";

const SMTP_FIELDS = [
  { key: "smtp_host",       label: "SMTP-Server (Host)",      placeholder: "z. B. smtp.gmail.com", cols: 2 },
  { key: "smtp_port",       label: "Port",                    type: "number", placeholder: "587" },
  { key: "smtp_username",   label: "Benutzername",            placeholder: "z. B. name@gmail.com" },
  { key: "smtp_password",   label: "Passwort / App-Passwort", type: "password", cols: 2 },
  { key: "smtp_from_email", label: "Absender-E-Mail",         placeholder: "z. B. rechnungen@saferide.ch" },
  { key: "smtp_from_name",  label: "Absender-Name",           placeholder: "z. B. Fahrschule Safe Ride" },
];

const IMAP_FIELDS = [
  { key: "imap_host",     label: "IMAP-Server (Host)",       placeholder: "z. B. imap.gmail.com", cols: 2 },
  { key: "imap_port",     label: "Port",                     type: "number", placeholder: "993" },
  { key: "imap_user",     label: "Benutzername",             placeholder: "z. B. name@gmail.com" },
  { key: "imap_password", label: "Passwort / App-Passwort",  type: "password", cols: 2 },
];

export default function EmailSettingsManager() {
  const [data, setData] = useState(null);
  const [savingKey, setSavingKey] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get("/settings/business");
        setData(r.data);
      } catch (e) {
        toast.error(formatApiError(e));
      }
    })();
  }, []);

  const save = async (key, value) => {
    if (!data) return;
    let normalized = value;
    if (key === "smtp_port") normalized = parseInt(value, 10) || 0;
    if (String(normalized) === String(data[key])) return;
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

  if (!data) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#78716c]">
        <Loader2 size={14} className="animate-spin" /> Lade …
      </div>
    );
  }

  return (
    <div data-testid="email-settings-manager" className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-[#0f172a] text-white flex items-center justify-center">
          <Mail size={18} />
        </div>
        <div>
          <h2 className="font-display text-3xl md:text-4xl leading-none tracking-tight">
            E-Mail-Versand
          </h2>
          <p className="text-xs text-[#78716c] mt-1">
            SMTP-Konto einrichten, damit du Rechnungen direkt aus dem System per E-Mail versenden kannst.
          </p>
        </div>
      </div>

      <div className="mb-6 flex items-start gap-3 p-3 bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl">
        <Info size={16} className="text-[#1d4ed8] shrink-0 mt-0.5" />
        <div className="text-xs text-[#1e3a8a] leading-relaxed">
          Zwei Wege stehen zur Verfügung: <strong>Resend</strong> (empfohlen — funktioniert
          zuverlässig auch wenn dein Provider unsere Cloud-IP blockiert)
          oder <strong>eigener SMTP-Server</strong>.
          Wenn ein Resend-API-Key gesetzt ist, wird Resend automatisch verwendet.
          Änderungen werden beim Verlassen des Felds gespeichert.
        </div>
      </div>

      {/* Resend section — recommended relay */}
      <div className="bg-white border-2 border-[#ff5a36] rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="text-[10px] font-semibold tracking-widest uppercase text-[#475569]">
            Resend (Mail-Relay)
          </div>
          <span className="text-[10px] font-semibold tracking-widest uppercase bg-[#ff5a36] text-white px-2 py-0.5 rounded-full">
            Empfohlen
          </span>
        </div>
        <p className="text-xs text-[#78716c] mb-4 leading-relaxed">
          Gratis-Account auf <a href="https://resend.com" target="_blank" rel="noreferrer" className="underline text-[#ff5a36]">resend.com</a> erstellen →
          Domain <code className="font-mono bg-[#f1f5f9] px-1 rounded">saferide.ch</code> im
          Dashboard verifizieren (drei DNS-Einträge bei Hostpoint hinzufügen) →
          API-Key erzeugen und hier eintragen. Sobald der Key gesetzt ist, gehen
          Rechnungen, Buchungsbestätigungen etc. automatisch über Resend statt SMTP.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-[11px] font-semibold text-[#475569] block mb-1">
              Resend API-Key
              {savingKey === "resend_api_key" && (
                <Loader2 size={10} className="inline-block ml-2 animate-spin text-[#ff5a36]" />
              )}
            </label>
            <input
              type="password"
              defaultValue={data.resend_api_key ?? ""}
              onBlur={(e) => save("resend_api_key", e.target.value)}
              placeholder="re_..."
              data-testid="bs-resend_api_key"
              autoComplete="off"
              className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36] font-mono"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-[11px] font-semibold text-[#475569] block mb-1">
              Absender-E-Mail (verifizierte Domain)
              {savingKey === "resend_from_email" && (
                <Loader2 size={10} className="inline-block ml-2 animate-spin text-[#ff5a36]" />
              )}
            </label>
            <input
              type="email"
              defaultValue={data.resend_from_email ?? ""}
              onBlur={(e) => save("resend_from_email", e.target.value)}
              placeholder="no-reply@saferide.ch"
              data-testid="bs-resend_from_email"
              autoComplete="off"
              className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
            />
            <p className="text-[11px] text-[#94a3b8] mt-1">
              Muss auf einer bei Resend verifizierten Domain liegen. Leer lassen = Absender-E-Mail aus dem SMTP-Feld unten wird verwendet.
            </p>
          </div>
        </div>
        {data.resend_api_key && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase bg-[#dcfce7] text-[#166534] px-3 py-1 rounded-full">
            <PlugZap size={11} /> Resend aktiv — SMTP wird umgangen
          </div>
        )}
      </div>

      <div className="bg-white border border-[#e7e5e4] rounded-2xl p-5 mb-4">
        <div className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] mb-4">
          Server-Zugangsdaten
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <label className="inline-flex items-start gap-2 text-xs text-[#475569] cursor-pointer">
              <input
                type="checkbox"
                defaultChecked={data.smtp_use_tls !== false}
                onChange={(e) => saveBool("smtp_use_tls", e.target.checked)}
                data-testid="bs-smtp_use_tls"
                className="accent-[#ff5a36] mt-0.5"
              />
              <span>
                STARTTLS aktivieren <span className="text-[#94a3b8]">(empfohlen bei Port 587 · deaktivieren nur bei Port 465 mit implizitem SSL)</span>
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* IMAP settings (for the Posteingang / webmail) */}
      <div className="bg-white border border-[#e7e5e4] rounded-2xl p-5 mb-4">
        <div className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] mb-4">
          IMAP · Posteingang lesen
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {IMAP_FIELDS.map((f) => (
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
            <label className="inline-flex items-start gap-2 text-xs text-[#475569] cursor-pointer">
              <input
                type="checkbox"
                defaultChecked={data.imap_use_ssl !== false}
                onChange={(e) => saveBool("imap_use_ssl", e.target.checked)}
                data-testid="bs-imap_use_ssl"
                className="accent-[#ff5a36] mt-0.5"
              />
              <span>
                SSL/TLS aktivieren <span className="text-[#94a3b8]">(empfohlen · Port 993)</span>
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#e7e5e4] rounded-2xl p-5 mb-4">
        <div className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] mb-4">
          Nachrichten-Vorlagen
        </div>
        <div className="space-y-3">
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
              rows={6}
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
