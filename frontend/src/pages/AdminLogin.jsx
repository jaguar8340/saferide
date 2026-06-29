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
      className="min-h-screen bg-[#f4f5f0] flex items-center justify-center px-5 relative overflow-hidden"
    >
      <div
        aria-hidden
        className="absolute -top-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-[#ccff00] animate-blob"
      />
      <div
        aria-hidden
        className="absolute -bottom-32 -left-32 w-[24rem] h-[24rem] rounded-full bg-[#0033ff] animate-blob"
        style={{ animationDelay: "-4s" }}
      />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md bg-white border-2 border-[#0a0a0a] rounded-3xl p-9 shadow-[8px_8px_0_#ccff00]"
      >
        <Link to="/" className="inline-block mb-8" data-testid="admin-back-home">
          <div className="font-display font-black tracking-tighter text-2xl uppercase">
            Safe<span className="text-[#0033ff]">Ride</span>
          </div>
        </Link>
        <div className="eyebrow text-[#ff0055] mb-3">CMS</div>
        <h1 className="font-display font-black uppercase tracking-tighter text-4xl md:text-5xl leading-[0.95]">
          {t.admin.title}
        </h1>
        <p className="text-[#4b5563] text-base mt-3 font-medium">{t.admin.subtitle}</p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5"
          data-testid="admin-login-form"
        >
          <div>
            <label className="text-[10px] tracking-[0.25em] uppercase text-[#0a0a0a]/60 font-extrabold">
              {t.admin.email}
            </label>
            <input
              type="email"
              autoComplete="email"
              required
              data-testid="admin-email-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full bg-transparent border-b-2 border-[#0a0a0a]/20 focus:border-[#0033ff] focus:outline-none py-3 text-[#0a0a0a] font-medium transition-colors"
              placeholder="admin@saferide.ch"
            />
          </div>
          <div>
            <label className="text-[10px] tracking-[0.25em] uppercase text-[#0a0a0a]/60 font-extrabold">
              {t.admin.password}
            </label>
            <input
              type="password"
              autoComplete="current-password"
              required
              data-testid="admin-password-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full bg-transparent border-b-2 border-[#0a0a0a]/20 focus:border-[#0033ff] focus:outline-none py-3 text-[#0a0a0a] font-medium transition-colors"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            data-testid="admin-login-submit"
            className="btn-pill-primary w-full justify-center disabled:opacity-60"
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
