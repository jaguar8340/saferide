/**
 * Portal setup page — first-time password setting via magic-link token.
 * Reached from an invitation e-mail: /portal/setup?token=abc123
 */
import { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { KeyRound, Lock, Loader2, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { usePortalAuth } from "@/contexts/PortalAuthContext";

const BASE = process.env.REACT_APP_BACKEND_URL;

export default function PortalSetup() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const nav = useNavigate();
  const { status } = usePortalAuth();

  const [validation, setValidation] = useState({ state: "checking", data: null, error: "" });
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setValidation({ state: "invalid", data: null, error: "Kein Setup-Link" });
      return;
    }
    (async () => {
      try {
        const r = await axios.get(`${BASE}/api/portal/setup/validate`, { params: { token } });
        if (!cancelled) setValidation({ state: "valid", data: r.data, error: "" });
      } catch (e) {
        const detail = e?.response?.data?.detail || e.message;
        if (!cancelled) setValidation({
          state: "invalid",
          data: null,
          error: typeof detail === "string" ? detail : "Link ungültig",
        });
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (status === "authenticated") return <Navigate to="/portal" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Passwort muss mind. 8 Zeichen haben");
    if (password !== password2) return toast.error("Passwörter stimmen nicht überein");
    setBusy(true);
    try {
      const r = await axios.post(`${BASE}/api/portal/setup`, { token, password });
      localStorage.setItem("portalToken", r.data.access_token);
      toast.success("Passwort gespeichert — du bist eingeloggt");
      nav("/portal", { replace: true });
      // Force a reload so PortalAuthContext picks up the new token
      window.location.reload();
    } catch (err) {
      const detail = err?.response?.data?.detail || err.message;
      toast.error(typeof detail === "string" ? detail : "Setup fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      data-testid="portal-setup-page"
      className="min-h-[100dvh] bg-[#f7f5f0] flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md">
        <div className="bg-white border border-[#e7e5e4] rounded-3xl p-6 md:p-8 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.15)]">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#ff5a36]" />
            <span className="text-[10px] font-semibold tracking-[0.24em] uppercase text-[#475569]">
              Schülerbereich
            </span>
          </div>
          <h1 className="font-display text-3xl tracking-tight text-[#0f172a] mb-6">
            Konto aktivieren
          </h1>

          {validation.state === "checking" && (
            <div data-testid="portal-setup-checking" className="flex items-center gap-2 text-sm text-[#475569]">
              <Loader2 size={16} className="animate-spin" /> Prüfe Link …
            </div>
          )}

          {validation.state === "invalid" && (
            <div
              data-testid="portal-setup-invalid"
              className="bg-[#fef2f2] border border-[#fecaca] rounded-2xl p-4 text-sm text-[#991b1b] flex items-start gap-3"
            >
              <XCircle size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold mb-1">Link ungültig oder abgelaufen</p>
                <p className="opacity-80">{validation.error}</p>
                <p className="mt-3">
                  Bitte kontaktiere deine Fahrlehrerin für einen neuen Setup-Link.
                </p>
              </div>
            </div>
          )}

          {validation.state === "valid" && (
            <>
              <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl p-4 text-sm text-[#166534] flex items-start gap-3 mb-6">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                <div>
                  Hallo <span className="font-semibold">{validation.data.first_name}</span>,
                  wähle jetzt dein Passwort. E-Mail für Anmeldung: <span className="font-mono">{validation.data.email}</span>
                </div>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <PasswordField
                  label="Neues Passwort"
                  value={password}
                  onChange={setPassword}
                  testid="portal-setup-password"
                />
                <PasswordField
                  label="Passwort wiederholen"
                  value={password2}
                  onChange={setPassword2}
                  testid="portal-setup-password2"
                />
                <button
                  type="submit"
                  disabled={busy}
                  data-testid="portal-setup-submit"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#ff5a36] hover:bg-[#e64d2e] disabled:opacity-50 text-white font-semibold text-sm py-3 rounded-xl transition-colors"
                >
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                  Passwort speichern & anmelden
                </button>
              </form>
            </>
          )}

          <a
            href="/portal/login"
            className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-[#475569] hover:text-[#ff5a36]"
          >
            Zur Anmeldung <ArrowRight size={12} />
          </a>
        </div>
      </div>
    </main>
  );
}


function PasswordField({ label, value, onChange, testid }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold tracking-widest uppercase text-[#475569] mb-1.5 block">
        {label}
      </span>
      <div className="relative">
        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
        <input
          type="password"
          required
          minLength={8}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          data-testid={testid}
          className="w-full bg-white border border-[#e7e5e4] rounded-xl pl-10 pr-3 py-3 text-sm focus:outline-none focus:border-[#ff5a36]"
          placeholder="mind. 8 Zeichen"
        />
      </div>
    </label>
  );
}
