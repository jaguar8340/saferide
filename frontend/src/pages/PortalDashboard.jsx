/**
 * Student portal dashboard.
 *
 *  Layout (mobile first):
 *   ┌ Greeting bar + Logout ─────────────────────────────────┐
 *   ├ 4 KPI cards: Fahrstunden · Nächster Termin ·           │
 *   │              Offene Rechnungen · Ausbildungsstand       │
 *   ├ Fortschrittsbalken je Kategorie                         │
 *   ├ Rechnungsliste (mit PDF-Download)                       │
 *   └ Gutschein einlösen                                      │
 */
import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Loader2, CalendarClock, Wallet, Ticket, TrendingUp,
  LogOut, GraduationCap, FileDown, CheckCircle2, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { usePortalAuth } from "@/contexts/PortalAuthContext";

export default function PortalDashboard() {
  const { status, student, logout, api } = usePortalAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voucherCode, setVoucherCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/portal/dashboard");
      setData(r.data);
    } catch (e) {
      toast.error("Konnte Daten nicht laden");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status, load]);

  if (status === "loading") {
    return (
      <div
        data-testid="portal-dashboard-loading"
        className="min-h-[100dvh] bg-[#f7f5f0] flex items-center justify-center"
      >
        <Loader2 size={24} className="animate-spin text-[#ff5a36]" />
      </div>
    );
  }
  if (status === "anonymous") return <Navigate to="/portal/login" replace />;

  const redeem = async () => {
    if (!voucherCode.trim()) return;
    setRedeeming(true);
    try {
      const r = await api.post("/portal/vouchers/redeem", { code: voucherCode });
      toast.success(`Gutschein eingelöst · ${r.data.amount} ${r.data.discount_type === "chf" ? "CHF" : "%"}`);
      setVoucherCode("");
      load();
    } catch (err) {
      const detail = err?.response?.data?.detail || err.message;
      toast.error(typeof detail === "string" ? detail : "Einlösung fehlgeschlagen");
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <main
      data-testid="portal-dashboard"
      className="min-h-[100dvh] bg-[#f7f5f0] pb-14"
    >
      {/* Header */}
      <header className="bg-white border-b border-[#e7e5e4]">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold tracking-[0.22em] uppercase text-[#475569]">
              Schülerbereich
            </div>
            <div className="font-display text-2xl tracking-tight text-[#0f172a]">
              Hallo {student?.first_name || "Schüler:in"}
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            data-testid="portal-logout"
            className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-[#475569] hover:text-[#ff5a36]"
          >
            <LogOut size={13} /> Abmelden
          </button>
        </div>
      </header>

      {loading || !data ? (
        <div className="max-w-5xl mx-auto p-6 flex items-center gap-2 text-sm text-[#475569]">
          <Loader2 size={14} className="animate-spin" /> Lädt Dashboard …
        </div>
      ) : (
        <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
          {/* KPIs */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4" data-testid="portal-kpis">
            <KpiCard
              icon={<CalendarClock size={16} />}
              label="Fahrstunden"
              value={String(data.lessons.count)}
              detail={`${Math.round(data.lessons.total_minutes / 60)} h absolviert`}
              testid="kpi-lessons"
            />
            <KpiCard
              icon={<CalendarClock size={16} />}
              label="Nächster Termin"
              value={data.next_appointment ? formatDateShort(data.next_appointment.start_datetime) : "—"}
              detail={data.next_appointment?.title || "kein Termin geplant"}
              testid="kpi-next-appt"
            />
            <KpiCard
              icon={<Wallet size={16} />}
              label="Offene Rechnungen"
              value={String(data.invoices.open_count)}
              detail={`CHF ${data.invoices.open_total.toFixed(2)}`}
              accent={data.invoices.open_count > 0}
              testid="kpi-invoices"
            />
            <KpiCard
              icon={<GraduationCap size={16} />}
              label="Ausbildungsstand"
              value={data.progress.status}
              detail={`${data.progress.overall_percent} % Fortschritt`}
              testid="kpi-status"
            />
          </section>

          {/* Progress per category */}
          <section
            data-testid="portal-progress"
            className="bg-white border border-[#e7e5e4] rounded-2xl p-4 md:p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} className="text-[#ff5a36]" />
              <h2 className="font-display text-base">Ausbildungsfortschritt</h2>
              <span className="ml-auto text-xs font-semibold text-[#475569]">
                Gesamt: {data.progress.overall_percent} %
              </span>
            </div>
            {data.progress.categories.length === 0 ? (
              <p className="text-sm text-[#78716c]">
                Noch keine Bewertungen erfasst – deine Fahrlehrerin trägt sie
                nach jeder Lektion ein.
              </p>
            ) : (
              <div className="space-y-2.5">
                {data.progress.categories.map((c) => (
                  <ProgressBar key={c.id} title={c.title} percent={c.percent} />
                ))}
              </div>
            )}
          </section>

          {/* Invoices */}
          <section
            data-testid="portal-invoices"
            className="bg-white border border-[#e7e5e4] rounded-2xl p-4 md:p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <Wallet size={14} className="text-[#ff5a36]" />
              <h2 className="font-display text-base">Rechnungen</h2>
            </div>
            {data.invoices.recent.length === 0 ? (
              <p className="text-sm text-[#78716c]">Noch keine Rechnungen vorhanden.</p>
            ) : (
              <ul className="divide-y divide-[#f3f0eb]">
                {data.invoices.recent.map((inv) => (
                  <InvoiceRow key={inv.id} inv={inv} api={api} />
                ))}
              </ul>
            )}
          </section>

          {/* Vouchers */}
          <section
            data-testid="portal-vouchers"
            className="bg-white border border-[#e7e5e4] rounded-2xl p-4 md:p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Ticket size={14} className="text-[#ff5a36]" />
              <h2 className="font-display text-base">Gutscheine</h2>
            </div>

            {data.vouchers.length > 0 && (
              <ul className="space-y-2 mb-4">
                {data.vouchers.map((v) => (
                  <li
                    key={v.id}
                    data-testid={`voucher-${v.code}`}
                    className="flex items-center gap-3 bg-[#f7f5f0] border border-[#e7e5e4] rounded-xl px-3 py-2"
                  >
                    <Sparkles size={14} className="text-[#ff5a36] shrink-0" />
                    <span className="font-mono text-sm font-semibold">{v.code}</span>
                    <span className="text-xs text-[#475569] ml-auto">
                      {v.discount_type === "chf" ? `CHF ${v.amount}` : `${v.amount} %`}
                    </span>
                    <CheckCircle2 size={14} className="text-[#166534]" />
                  </li>
                ))}
              </ul>
            )}

            <form
              className="flex items-stretch gap-2"
              onSubmit={(e) => { e.preventDefault(); redeem(); }}
            >
              <input
                type="text"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                placeholder="Gutschein-Code eingeben …"
                data-testid="voucher-code-input"
                className="flex-1 bg-white border border-[#e7e5e4] rounded-xl px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:border-[#ff5a36]"
              />
              <button
                type="submit"
                disabled={redeeming || !voucherCode.trim()}
                data-testid="voucher-redeem-btn"
                className="inline-flex items-center gap-1.5 bg-[#ff5a36] hover:bg-[#e64d2e] disabled:opacity-50 text-white font-semibold text-xs uppercase tracking-widest px-4 rounded-xl transition-colors"
              >
                {redeeming ? <Loader2 size={13} className="animate-spin" /> : <Ticket size={13} />}
                Einlösen
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}


function KpiCard({ icon, label, value, detail, accent = false, testid }) {
  return (
    <div
      data-testid={testid}
      className={`bg-white border rounded-2xl p-4 ${accent ? "border-[#ff5a36]" : "border-[#e7e5e4]"}`}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase text-[#475569] mb-1.5">
        <span className={accent ? "text-[#ff5a36]" : "text-[#94a3b8]"}>{icon}</span>
        {label}
      </div>
      <div className="font-display text-2xl md:text-3xl tracking-tight text-[#0f172a] leading-tight">
        {value}
      </div>
      {detail && (
        <div className="text-xs text-[#78716c] mt-1 truncate">{detail}</div>
      )}
    </div>
  );
}


function ProgressBar({ title, percent }) {
  const color =
    percent >= 80 ? "#166534"
    : percent >= 60 ? "#84cc16"
    : percent >= 30 ? "#f59e0b"
    : "#dc2626";
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-semibold text-[#0f172a] mb-1">
        <span>{title}</span>
        <span className="text-[#475569]">{percent} %</span>
      </div>
      <div className="h-2 rounded-full bg-[#f3f0eb] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
    </div>
  );
}


function InvoiceRow({ inv, api }) {
  const [downloading, setDownloading] = useState(false);
  const download = async () => {
    setDownloading(true);
    try {
      const r = await api.get(`/portal/invoices/${inv.id}.pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast.error("PDF konnte nicht geladen werden");
    } finally {
      setDownloading(false);
    }
  };
  return (
    <li className="flex items-center gap-3 py-2.5" data-testid={`invoice-row-${inv.number}`}>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-[#0f172a] truncate">
          {inv.number}
          <span className="ml-2 text-xs font-normal text-[#78716c]">
            {formatDateShort(inv.date)}
          </span>
        </div>
        <div className="text-xs text-[#475569]">
          CHF {(inv.price_chf ?? inv.total_incl ?? 0).toFixed(2)}
          <span
            className={`ml-2 inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-widest ${
              inv.status === "paid"
                ? "bg-[#f0fdf4] text-[#166534]"
                : inv.status === "cancelled"
                ? "bg-[#f5f5f4] text-[#78716c]"
                : "bg-[#fff7ed] text-[#c2410c]"
            }`}
          >
            {inv.status === "paid" ? "bezahlt" : inv.status === "cancelled" ? "storniert" : "offen"}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={download}
        disabled={downloading}
        data-testid={`invoice-pdf-${inv.number}`}
        className="inline-flex items-center gap-1 text-xs font-semibold text-[#475569] hover:text-[#ff5a36] disabled:opacity-50"
      >
        {downloading ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />}
        PDF
      </button>
    </li>
  );
}


function formatDateShort(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("de-CH", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}
