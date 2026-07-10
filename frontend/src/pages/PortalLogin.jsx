/**
 * Portal login page — students authenticate here with e-mail + password.
 * If they haven't received / set a password yet, they need the setup link
 * from the admin's invitation e-mail (/portal/setup?token=…).
 */
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { LogIn, ArrowRight, Mail, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePortalAuth } from "@/contexts/PortalAuthContext";

export default function PortalLogin() {
  const { status, login } = usePortalAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (status === "authenticated") return <Navigate to="/portal" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login({ email: email.trim(), password });
      toast.success("Willkommen zurück");
      nav("/portal", { replace: true });
    } catch (err) {
      const detail = err?.response?.data?.detail || err.message;
      toast.error(typeof detail === "string" ? detail : "Anmeldung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      data-testid="portal-login-page"
      className="min-h-[100dvh] bg-[#f7f5f0] flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#475569] mb-6 hover:text-[#ff5a36]"
        >
          <ArrowRight size={14} className="rotate-180" /> Zur Website
        </a>
        <div className="bg-white border border-[#e7e5e4] rounded-3xl p-6 md:p-8 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.15)]">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#ff5a36]" />
            <span className="text-[10px] font-semibold tracking-[0.24em] uppercase text-[#475569]">
              Schülerbereich
            </span>
          </div>
          <h1 className="font-display text-3xl tracking-tight text-[#0f172a] mb-6">
            Anmelden
          </h1>

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="text-xs font-semibold tracking-widest uppercase text-[#475569] mb-1.5 block">
                E-Mail
              </span>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="portal-login-email"
                  className="w-full bg-white border border-[#e7e5e4] rounded-xl pl-10 pr-3 py-3 text-sm focus:outline-none focus:border-[#ff5a36]"
                  placeholder="name@example.ch"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-semibold tracking-widest uppercase text-[#475569] mb-1.5 block">
                Passwort
              </span>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="portal-login-password"
                  className="w-full bg-white border border-[#e7e5e4] rounded-xl pl-10 pr-3 py-3 text-sm focus:outline-none focus:border-[#ff5a36]"
                  placeholder="••••••••"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={busy}
              data-testid="portal-login-submit"
              className="w-full inline-flex items-center justify-center gap-2 bg-[#ff5a36] hover:bg-[#e64d2e] disabled:opacity-50 text-white font-semibold text-sm py-3 rounded-xl transition-colors"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
              Anmelden
            </button>
          </form>

          <p className="mt-6 text-xs text-[#78716c] leading-relaxed">
            Noch keinen Zugang? Deine Fahrlehrerin erstellt dein Konto beim
            nächsten Termin – du erhältst eine Einladungs-E-Mail mit einem
            persönlichen Link.
          </p>
        </div>
      </div>
    </main>
  );
}
