import { useState } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { ArrowRight, Lock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";

export default function AdminLogin() {
  const { user, login, loading } = useAuth();
  const { t } = useLang();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/admin" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await login(email, password);
    setSubmitting(false);
    if (res.ok) {
      toast.success("Willkommen zurück");
      nav("/admin");
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div
      data-testid="admin-login-page"
      className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-5"
    >
      <div className="absolute inset-0 noise" />
      <div
        className="relative w-full max-w-md card-surface p-10"
        style={{ borderRadius: 2 }}
      >
        <Link to="/" className="inline-block mb-8" data-testid="admin-back-home">
          <div className="font-display font-black tracking-tighter text-xl uppercase">
            Safe<span className="text-[#FF2E00]">Ride</span>
          </div>
        </Link>
        <div className="overline mb-3">CMS</div>
        <h1 className="font-display font-bold uppercase tracking-tight text-3xl md:text-4xl">
          {t.admin.title}
        </h1>
        <p className="text-white/55 text-sm mt-3">{t.admin.subtitle}</p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5"
          data-testid="admin-login-form"
        >
          <div>
            <label className="text-[10px] tracking-[0.25em] uppercase text-white/55 font-bold">
              {t.admin.email}
            </label>
            <input
              type="email"
              autoComplete="email"
              required
              data-testid="admin-email-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full bg-transparent border-b border-white/20 focus:border-[#FF2E00] focus:outline-none py-3 text-white placeholder:text-white/30 transition-colors"
              placeholder="admin@saferide.ch"
            />
          </div>
          <div>
            <label className="text-[10px] tracking-[0.25em] uppercase text-white/55 font-bold">
              {t.admin.password}
            </label>
            <input
              type="password"
              autoComplete="current-password"
              required
              data-testid="admin-password-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full bg-transparent border-b border-white/20 focus:border-[#FF2E00] focus:outline-none py-3 text-white placeholder:text-white/30 transition-colors"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            data-testid="admin-login-submit"
            className="btn-primary w-full justify-center disabled:opacity-60"
            style={{ borderRadius: 2 }}
          >
            <Lock size={14} />
            {submitting ? t.admin.loggingIn : t.admin.login}
            <ArrowRight size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
