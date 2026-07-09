/**
 * BackupManager – dedicated tab for MongoDB backup.
 * Extracted from BusinessSettingsManager so it's easier to find.
 * Backend: /api/backup/status, /api/backup/mongo, /api/backup/scripts.
 */
import { useEffect, useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";

export default function BackupManager() {
  const [status, setStatus] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [scripts, setScripts] = useState(null);
  const [showScripts, setShowScripts] = useState(false);
  const [os, setOs] = useState(() => {
    if (typeof navigator !== "undefined") {
      const p = (navigator.platform || "").toLowerCase();
      if (p.includes("mac")) return "mac_bash";
      if (p.includes("linux")) return "linux_bash";
    }
    return "windows_batch";
  });

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get("/backup/status");
        setStatus(r.data);
      } catch {
        /* ignore – download still works */
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
            MongoDB-Backup manuell laden oder täglich automatisch auf deinem PC/Mac speichern.
          </p>
        </div>
      </div>

      <div className="mb-6 flex items-start gap-3 p-3 bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl">
        <Info size={16} className="text-[#1d4ed8] shrink-0 mt-0.5" />
        <div className="text-xs text-[#1e3a8a] leading-relaxed">
          Ein Backup ist eine{" "}
          <code className="font-mono">.json.gz</code> Datei mit ALLEN Sammlungen (Schüler,
          Rechnungen, Fahrkontrolle, Content, …). Speichere sie an einem sicheren Ort — sie kann
          jederzeit wieder importiert werden. Auto-Sicherung heisst: dein PC lädt die Datei
          täglich automatisch herunter.
        </div>
      </div>

      {status && (
        <div className="bg-white border border-[#e7e5e4] rounded-2xl p-5 mb-4 grid grid-cols-2 gap-6">
          <Stat label="Datensätze" value={status.total_documents ?? "—"} />
          <Stat label="Sammlungen" value={status.collection_count ?? "—"} />
        </div>
      )}

      <div className="bg-white border border-[#e7e5e4] rounded-2xl p-5 mb-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-2xl bg-[#ff5a36]/10 text-[#ff5a36] flex items-center justify-center shrink-0">
            <Download size={14} />
          </div>
          <div>
            <div className="text-sm font-semibold text-[#0f172a] leading-tight">
              Backup jetzt herunterladen
            </div>
            <div className="text-xs text-[#78716c] mt-0.5">
              Sofort-Download der aktuellen Datenbank (`.json.gz`).
            </div>
          </div>
        </div>
        <button
          onClick={downloadNow}
          disabled={downloading}
          data-testid="backup-download-now"
          className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-[#ff5a36] text-white px-5 py-2.5 rounded-full hover:opacity-90 disabled:opacity-50"
        >
          {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
          Jetzt herunterladen
        </button>
      </div>

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
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-[10px] font-semibold tracking-widest uppercase text-[#94a3b8]">
        {label}
      </div>
      <div className="mt-1 text-3xl font-display leading-none text-[#0f172a]">{value}</div>
    </div>
  );
}
