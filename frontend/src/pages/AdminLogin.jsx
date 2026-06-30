import { useState } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { ArrowRight, Lock } from "lucide-react";
import { motion } from "framer-motion";
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
      className="min-h-screen bg-[#fbf9f6] flex items-center justify-center px-5"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white border border-[#e2e8f0] rounded-3xl p-9 shadow-[0_18px_50px_-25px_rgba(15,23,42,0.18)]"
      >
        <Link to="/" className="inline-block mb-9" data-testid="admin-back-home">
          <div className="font-display text-xl tracking-tight">
            Safe<span className="font-serif-i text-[#ff5a36]">Ride</span>
          </div>
        </Link>
        <div className="flex items-center gap-2 mb-3">
          <span className="dot-accent" />
          <span className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]">CMS</span>
        </div>
        <h1
          className="font-display leading-[0.98] tracking-tight"
          style={{ fontSize: "clamp(2rem, 3.6vw, 2.8rem)" }}
        >
          {t.admin.title.split(" ").map((w, i, arr) =>
            i === arr.length - 1 ? (
              <span key={i} className="font-serif-i text-[#ff5a36] font-normal">{w}</span>
            ) : (
              <span key={i}>{w} </span>
            ),
          )}
        </h1>
        <p className="text-[#475569] mt-3 font-medium">{t.admin.subtitle}</p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6"
          data-testid="admin-login-form"
        >
          <div>
            <label className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]">
              {t.admin.email}
            </label>
            <input
              type="email"
              autoComplete="email"
              required
              data-testid="admin-email-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-underline mt-2"
              placeholder="admin@saferide.ch"
            />
          </div>
          <div>
            <label className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]">
              {t.admin.password}
            </label>
            <input
              type="password"
              autoComplete="current-password"
              required
              data-testid="admin-password-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-underline mt-2"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            data-testid="admin-login-submit"
            className="btn-accent w-full justify-center disabled:opacity-60"
          >
            <Lock size={14} />
            {submitting ? t.admin.loggingIn : t.admin.login}
            <ArrowRight size={14} />
          </button>
        </form>
      </motion.div>
    </div>
  );
}
