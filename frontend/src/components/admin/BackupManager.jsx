/**
 * BackupManager – Datensicherung.
 *
 * Bietet drei Aktionen für Nadine:
 *
 *   1. Vollständiges Backup als .zip (MongoDB + Hetzner-Dateien)
 *   2. Nur MongoDB als .json.gz (leichter Snapshot ohne Fotos/PDFs)
 *   3. Wiederherstellung aus einem hochgeladenen .zip (mit Confirm-Dialog)
 *
 * Backend-Endpunkte: /api/backup/{status,full.zip,mongo,restore,scripts}
 */
import { useEffect, useState, useRef } from "react";
import {
  HardDriveDownload,
  Loader2,
  Download,
  Copy,
  ShieldCheck,
  Info,
  Clock,
  ChevronDown,
  ChevronUp,
  Archive,
  Upload,
  AlertTriangle,
  X,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";

const fmtBytes = (n) => {
  const bytes = Number(n) || 0;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

export default function BackupManager() {
  const [status, setStatus] = useState(null);
  const [downloading, setDownloading] = useState(null);         // "mongo" | "full" | null
  const [scripts, setScripts] = useState(null);
  const [showScripts, setShowScripts] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [os, setOs] = useState(() => {
    if (typeof navigator !== "undefined") {
      const p = (navigator.platform || "").toLowerCase();
      if (p.includes("mac")) return "mac_bash";
      if (p.includes("linux")) return "linux_bash";
    }
    return "windows_batch";
  });

  const loadStatus = async () => {
    try {
      const r = await api.get("/backup/status");
      setStatus(r.data);
    } catch { /* ignore – downloads still work */ }
  };
  useEffect(() => { loadStatus(); }, []);

  const download = async (kind) => {
    setDownloading(kind);
    try {
      const isFull = kind === "full";
      const path = isFull ? "/backup/full.zip" : "/backup/mongo";
      const res = await api.get(path, { responseType: "blob" });
      const type = isFull ? "application/zip" : "application/gzip";
      const stamp = new Date().toISOString().slice(0, 10);
      const name = isFull
        ? `saferide-full-backup-${stamp}.zip`
        : `saferide-backup-${stamp}.json.gz`;
      const blob = new Blob([res.data], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(isFull ? "Vollständiges Backup wurde heruntergeladen" : "MongoDB-Backup wurde heruntergeladen");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setDownloading(null);
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
    setShowScripts((v) => !v);
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
    <div data-testid="backup-manager" className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-[#0f172a] text-white flex items-center justify-center">
          <HardDriveDownload size={18} />
        </div>
        <div>
          <h2 className="font-display text-3xl md:text-4xl leading-none tracking-tight">
            Datensicherung
          </h2>
          <p className="text-xs text-[#78716c] mt-1">
            Datenbank + Dateien herunterladen oder aus einer Sicherung wiederherstellen.
          </p>
        </div>
      </div>

      <div className="mb-6 flex items-start gap-3 p-3 bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl">
        <Info size={16} className="text-[#1d4ed8] shrink-0 mt-0.5" />
        <div className="text-xs text-[#1e3a8a] leading-relaxed">
          Das <strong>Vollständige Backup (.zip)</strong> enthält die Datenbank
          (Schüler, Rechnungen, Fahrkontrolle …) <em>und</em> alle Dateien
          (Rechnungs-PDFs, Fahrkontrolle-Fotos, Belege). Damit kannst du im
          Notfall alles wiederherstellen. Das <strong>MongoDB-Backup (.json.gz)</strong>
          ist der leichte Nur-Datenbank-Snapshot für die Auto-Sicherung.
          Die Sicherung bei Hetzner läuft davon unabhängig weiter.
        </div>
      </div>

      {status && (
        <div className="bg-white border border-[#e7e5e4] rounded-2xl p-5 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-6">
          <Stat label="Datensätze" value={status.total_documents ?? "—"} />
          <Stat label="Sammlungen" value={status.collection_count ?? "—"} />
          <Stat label="Dateien" value={status.files_count ?? "—"} />
          <Stat label="Speicher" value={status.files_bytes != null ? fmtBytes(status.files_bytes) : "—"} />
        </div>
      )}

      {/* Full backup — the most important one */}
      <div className="bg-white border-2 border-[#ff5a36] rounded-2xl p-5 mb-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-2xl bg-[#ff5a36] text-white flex items-center justify-center shrink-0">
            <Archive size={14} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-[#0f172a] leading-tight">
              Vollständiges Backup (.zip)
              <span className="ml-2 text-[10px] font-semibold tracking-widest uppercase bg-[#ff5a36] text-white px-2 py-0.5 rounded-full">
                Empfohlen
              </span>
            </div>
            <div className="text-xs text-[#78716c] mt-1 leading-relaxed">
              Alles-in-einem-Download: Datenbank + jede Rechnungs-PDF + jedes
              Fahrkontrolle-Foto + Belege + Bilder. Diese eine Datei sicher
              aufbewahren = du kannst im Notfall alles wiederherstellen.
              {status?.files_count > 0 && (
                <span className="block mt-1 text-[#94a3b8]">
                  ≈ {status.files_count} Dateien · ca. {fmtBytes(status.files_bytes)} vor Kompression
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => download("full")}
          disabled={downloading != null}
          data-testid="backup-download-full"
          className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-[#ff5a36] text-white px-5 py-2.5 rounded-full hover:opacity-90 disabled:opacity-50"
        >
          {downloading === "full" ? <Loader2 size={12} className="animate-spin" /> : <Archive size={12} />}
          Vollständiges ZIP herunterladen
        </button>
      </div>

      {/* Mongo-only backup (lightweight, for auto-cron) */}
      <div className="bg-white border border-[#e7e5e4] rounded-2xl p-5 mb-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-2xl bg-[#ff5a36]/10 text-[#ff5a36] flex items-center justify-center shrink-0">
            <Download size={14} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-[#0f172a] leading-tight">
              Nur MongoDB-Backup (.json.gz)
            </div>
            <div className="text-xs text-[#78716c] mt-0.5">
              Klein und schnell — nur die Datenbank ohne Dateien. Für die tägliche Auto-Sicherung.
            </div>
          </div>
        </div>
        <button
          onClick={() => download("mongo")}
          disabled={downloading != null}
          data-testid="backup-download-now"
          className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-white border border-[#0f172a] text-[#0f172a] px-5 py-2.5 rounded-full hover:bg-[#0f172a] hover:text-white disabled:opacity-50"
        >
          {downloading === "mongo" ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
          Jetzt herunterladen
        </button>
      </div>

      {/* Restore section */}
      <div className="bg-white border border-[#e7e5e4] rounded-2xl p-5 mb-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-2xl bg-[#dc2626]/10 text-[#dc2626] flex items-center justify-center shrink-0">
            <Upload size={14} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-[#0f172a] leading-tight">
              Wiederherstellen aus Backup
              <span className="ml-2 text-[10px] font-semibold tracking-widest uppercase bg-[#fee2e2] text-[#991b1b] px-2 py-0.5 rounded-full">
                Nur im Notfall
              </span>
            </div>
            <div className="text-xs text-[#78716c] mt-1 leading-relaxed">
              Lade eine .zip-Sicherung hoch. Die aktuelle Datenbank wird durch die
              Sicherung ersetzt. Ein automatischer Zwischen-Snapshot der jetzigen
              Daten wird intern angelegt, falls du zurückspringen musst.
            </div>
          </div>
        </div>
        <button
          onClick={() => setRestoreOpen(true)}
          data-testid="backup-restore-open"
          className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-white border border-[#dc2626] text-[#dc2626] px-5 py-2.5 rounded-full hover:bg-[#dc2626] hover:text-white"
        >
          <Upload size={12} />
          Wiederherstellen …
        </button>
      </div>

      {/* Scheduled backup scripts (existing) */}
      <div className="bg-white border border-[#e7e5e4] rounded-2xl p-5">
        <button
          onClick={openScripts}
          data-testid="backup-schedule-toggle"
          className="w-full flex items-center gap-3 text-left"
        >
          <div className="w-9 h-9 rounded-2xl bg-[#0f172a] text-white flex items-center justify-center shrink-0">
            <Clock size={14} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-[#0f172a] leading-tight">
              Tägliche Auto-Sicherung einrichten
            </div>
            <div className="text-xs text-[#78716c] mt-0.5">
              Script kopieren → einmal auf deinem PC einrichten → läuft täglich um Mitternacht.
            </div>
          </div>
          {showScripts ? (
            <ChevronUp size={16} className="text-[#94a3b8]" />
          ) : (
            <ChevronDown size={16} className="text-[#94a3b8]" />
          )}
        </button>

        {showScripts && scripts && (
          <div className="mt-4 bg-[#0f172a] rounded-2xl p-5 text-white">
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
                    data-testid={`backup-os-${k}`}
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
                data-testid="backup-copy-script"
                className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase bg-white/10 text-white px-3 py-1.5 rounded-full hover:bg-white/20"
              >
                <Copy size={11} /> Kopieren
              </button>
            </div>
            <pre className="text-[11px] font-mono whitespace-pre-wrap leading-relaxed text-white/80 max-h-80 overflow-y-auto">
              {scripts[os]}
            </pre>
            <div className="mt-3 text-[11px] text-white/70 leading-relaxed">
              <ShieldCheck size={11} className="inline-block mr-1 text-white" />
              <strong className="text-white">Hinweis:</strong> {scripts.auth_hint}
            </div>
          </div>
        )}
      </div>

      {restoreOpen && (
        <RestoreModal
          onClose={() => setRestoreOpen(false)}
          onDone={() => { setRestoreOpen(false); loadStatus(); }}
        />
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-[10px] font-semibold tracking-widest uppercase text-[#94a3b8]">
        {label}
      </div>
      <div className="mt-1 text-3xl font-display leading-none text-[#0f172a] tabular-nums">{value}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Restore Modal — file upload + double confirm                              */
/* -------------------------------------------------------------------------- */
function RestoreModal({ onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const CONFIRM_PHRASE = "WIEDERHERSTELLEN";
  const canSubmit = !!file && confirmText === CONFIRM_PHRASE && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post("/backup/restore?confirm=RESTORE-YES", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 300_000,      // 5 min for large ZIPs
      });
      setResult(r.data);
      toast.success("Wiederherstellung abgeschlossen");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center p-4 bg-[#0f172a]/50 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-3xl p-6 my-8 shadow-2xl"
        data-testid="backup-restore-modal"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-[#dc2626] text-white flex items-center justify-center">
              <AlertTriangle size={16} />
            </div>
            <h3 className="font-display text-2xl leading-tight">Wiederherstellen</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-[#78716c] hover:bg-[#f1f5f9]"
          >
            <X size={16} />
          </button>
        </div>

        {result ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 bg-[#dcfce7] text-[#166534] border border-[#bbf7d0] rounded-2xl p-4">
              <Check size={18} />
              <div>
                <div className="text-sm font-semibold">Wiederherstellung erfolgreich</div>
                <div className="text-xs mt-0.5">
                  {Object.keys(result.collections_restored || {}).length} Sammlungen ·{" "}
                  {result.files_restored} Dateien wiederhergestellt
                </div>
              </div>
            </div>
            {result.files_errors && result.files_errors.length > 0 && (
              <div className="bg-[#fef3c7] border border-[#fde68a] rounded-2xl p-3 text-xs text-[#78350f]">
                <strong>{result.files_errors.length} Datei-Fehler:</strong>
                <ul className="mt-1 space-y-0.5">
                  {result.files_errors.slice(0, 5).map((e, i) => (
                    <li key={i} className="truncate font-mono text-[10px]">• {e}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="text-[10px] text-[#94a3b8] font-mono break-all">
              Zwischen-Snapshot: {result.pre_restore_snapshot_id}
            </div>
            <button
              onClick={onDone}
              className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-[#0f172a] text-white px-5 py-2.5 rounded-full hover:opacity-90"
            >
              Schliessen und Seite aktualisieren
            </button>
          </div>
        ) : (
          <>
            <div className="bg-[#fee2e2] border border-[#fecaca] rounded-2xl p-4 mb-4 text-xs text-[#7f1d1d] leading-relaxed">
              <strong className="block mb-1 flex items-center gap-1">
                <AlertTriangle size={12} /> Achtung — überschreibt die aktuelle Datenbank
              </strong>
              Alle jetzigen Daten (Schüler, Rechnungen, Fahrkontrolle, Content, …)
              werden durch die Sicherung ersetzt. Dateien mit gleichem Namen in
              Hetzner werden ebenfalls überschrieben. Nutze das nur nach einem
              Datenverlust, nicht zum &quot;Zurückspringen&quot; im Alltag.
            </div>

            <div className="mb-4">
              <label className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] block mb-2">
                Backup-Datei (.zip)
              </label>
              <input
                ref={fileRef}
                type="file"
                accept=".zip,application/zip"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                data-testid="backup-restore-file"
                className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:tracking-widest file:uppercase file:bg-[#0f172a] file:text-white hover:file:opacity-90 cursor-pointer"
              />
              {file && (
                <div className="mt-2 text-xs text-[#475569]">
                  <strong>{file.name}</strong>
                  <span className="text-[#94a3b8]"> · {fmtBytes(file.size)}</span>
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] block mb-2">
                Zur Bestätigung tippen: <span className="font-mono text-[#dc2626]">{CONFIRM_PHRASE}</span>
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                data-testid="backup-restore-confirm-text"
                placeholder={CONFIRM_PHRASE}
                className={`w-full text-sm bg-[#fbf9f6] border-2 rounded-xl px-3 py-2 focus:outline-none font-mono tabular-nums ${
                  confirmText === CONFIRM_PHRASE
                    ? "border-[#16a34a]"
                    : "border-[#e2e8f0] focus:border-[#dc2626]"
                }`}
              />
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={onClose}
                className="text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-full text-[#475569] hover:text-[#0f172a]"
              >
                Abbrechen
              </button>
              <button
                onClick={submit}
                disabled={!canSubmit}
                data-testid="backup-restore-submit"
                className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-[#dc2626] text-white px-5 py-2.5 rounded-full hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                Jetzt wiederherstellen
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
