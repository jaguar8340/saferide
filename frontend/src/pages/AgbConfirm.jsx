/**
 * Public AGB confirmation page — reached via the link in the invitation
 * e-mail: /agb/{token}. Shows the current terms and lets the student
 * click one big "Ich stimme zu" button.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { CheckCircle2, XCircle, Loader2, FileText, ShieldCheck } from "lucide-react";

const BASE = process.env.REACT_APP_BACKEND_URL;

export default function AgbConfirm() {
  const { token } = useParams();
  const [state, setState] = useState({ status: "checking", data: null, error: "" });
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await axios.get(`${BASE}/api/terms/confirm/validate`, { params: { token } });
        if (!cancelled) {
          setState({ status: "valid", data: r.data, error: "" });
          if (r.data.already_confirmed) setConfirmed(true);
        }
      } catch (e) {
        const detail = e?.response?.data?.detail || e.message;
        if (!cancelled) setState({
          status: "invalid",
          data: null,
          error: typeof detail === "string" ? detail : "Link ungültig",
        });
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const confirm = async () => {
    setSubmitting(true);
    try {
      await axios.post(`${BASE}/api/terms/confirm`, { token });
      setConfirmed(true);
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e?.response?.data?.detail || "Bestätigung fehlgeschlagen");
    } finally { setSubmitting(false); }
  };

  return (
    <main
      data-testid="agb-confirm-page"
      className="min-h-[100dvh] bg-[#f7f5f0] py-8 px-4"
    >
      <div className="max-w-2xl mx-auto">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-[#475569] mb-6 hover:text-[#ff5a36]"
        >
          ← Zur Website
        </a>
        <div className="bg-white border border-[#e7e5e4] rounded-3xl p-6 md:p-8 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.15)]">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={14} className="text-[#ff5a36]" />
            <span className="text-[10px] font-semibold tracking-[0.24em] uppercase text-[#475569]">
              Allgemeine Geschäftsbedingungen
            </span>
          </div>
          <h1 className="font-display text-3xl tracking-tight text-[#0f172a] mb-6">
            {confirmed ? "Vielen Dank für deine Bestätigung" : "Bitte kurz bestätigen"}
          </h1>

          {state.status === "checking" && (
            <div data-testid="agb-checking" className="flex items-center gap-2 text-sm text-[#475569]">
              <Loader2 size={16} className="animate-spin" /> Prüfe Link …
            </div>
          )}

          {state.status === "invalid" && (
            <div
              data-testid="agb-invalid"
              className="bg-[#fef2f2] border border-[#fecaca] rounded-2xl p-4 text-sm text-[#991b1b] flex items-start gap-3"
            >
              <XCircle size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold mb-1">Link ungültig oder abgelaufen</p>
                <p className="opacity-80">{state.error}</p>
              </div>
            </div>
          )}

          {state.status === "valid" && !confirmed && (
            <>
              <div className="bg-[#fafaf9] border border-[#e7e5e4] rounded-2xl p-4 mb-6 max-h-[60vh] overflow-y-auto">
                <pre
                  data-testid="agb-body"
                  className="text-sm text-[#334155] whitespace-pre-wrap font-sans leading-relaxed"
                >
                  {state.data.terms_de || "Noch keine AGB hinterlegt."}
                </pre>
              </div>
              <button
                type="button"
                onClick={confirm}
                disabled={submitting}
                data-testid="agb-confirm-button"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#ff5a36] hover:bg-[#e64d2e] disabled:opacity-50 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-colors"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                Ich stimme den AGB zu
              </button>
              <p className="mt-3 text-xs text-[#78716c]">
                Mit dem Klick bestätigst du, dass du die AGB gelesen hast und akzeptierst.
                Diese Bestätigung wird in unserem System gespeichert.
              </p>
            </>
          )}

          {confirmed && (
            <div
              data-testid="agb-thanks"
              className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl p-5 text-sm text-[#166534] flex items-start gap-3"
            >
              <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold mb-1">Bestätigung gespeichert</p>
                <p className="opacity-80">
                  Wir haben deine Zustimmung zu den AGB erfasst. Du kannst dieses Fenster
                  nun schliessen. Bei Fragen einfach direkt auf die Einladungs-E-Mail
                  antworten – wir sind für dich da.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
