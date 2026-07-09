/**
 * Buchhaltung — top-level admin section with 5 sub-tabs.
 *
 *   1. Übersicht        – KPI cards + open receivables
 *   2. Rechnungen       – flat list of ALL invoices across students
 *   3. Ausgaben         – expenses grouped by month
 *   4. Kontenplan       – chart of accounts CRUD
 *   5. Erfolgsrechnung  – monthly + yearly income statement
 */
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Receipt,
  ArrowDownLeft,
  BookOpenCheck,
  BarChart3,
  Loader2,
  Plus,
  Trash2,
  Upload,
  Paperclip,
  ChevronLeft,
  ChevronRight,
  FileDown,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";

const SUBTABS = [
  { id: "overview",       icon: LayoutDashboard, label: "Übersicht" },
  { id: "monthly",        icon: CalendarDays,    label: "Monatsjournal" },
  { id: "invoices",       icon: Receipt,         label: "Rechnungen" },
  { id: "expenses",       icon: ArrowDownLeft,   label: "Ausgaben" },
  { id: "accounts",       icon: BookOpenCheck,   label: "Kontenplan" },
  { id: "income",         icon: BarChart3,       label: "Erfolgsrechnung" },
];

const money = (n) =>
  new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF", minimumFractionDigits: 2 })
    .format(Number(n) || 0);

const formatDMY = (iso) => {
  if (!iso || typeof iso !== "string") return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "—";
};

const MONTHS_DE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

const currentYear = new Date().getFullYear();

export default function AccountingPage() {
  const [subtab, setSubtab] = useState("overview");
  const [year, setYear] = useState(currentYear);

  return (
    <div data-testid="accounting-page" className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-4xl md:text-5xl leading-none tracking-tight">
            Buchhaltung
          </h2>
          <p className="text-xs text-[#78716c] mt-2">
            Rechnungen, Ausgaben, Konten und Erfolgsrechnung.
          </p>
        </div>
        <YearSelector year={year} onChange={setYear} />
      </header>

      {/* Sub-tabs */}
      <div className="flex gap-2 flex-wrap border-b border-[#e7e5e4]">
        {SUBTABS.map((t) => {
          const Icon = t.icon;
          const active = subtab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSubtab(t.id)}
              data-testid={`accounting-subtab-${t.id}`}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold tracking-widest uppercase transition-colors border-b-2 -mb-px ${
                active
                  ? "text-[#ff5a36] border-[#ff5a36]"
                  : "text-[#78716c] border-transparent hover:text-[#0f172a]"
              }`}
            >
              <Icon size={13} />
              {t.label}
            </button>
          );
        })}
      </div>

      {subtab === "overview"  && <OverviewSubtab year={year} onGoto={setSubtab} />}
      {subtab === "monthly"   && <MonthlyJournalSubtab year={year} />}
      {subtab === "invoices"  && <InvoicesSubtab year={year} />}
      {subtab === "expenses"  && <ExpensesSubtab year={year} />}
      {subtab === "accounts"  && <AccountsSubtab />}
      {subtab === "income"    && <IncomeStatementSubtab year={year} />}
    </div>
  );
}

// -----------------------------------------------------------------------------
//  Shared bits
// -----------------------------------------------------------------------------
function YearSelector({ year, onChange }) {
  return (
    <div className="inline-flex items-center gap-2 bg-white border border-[#e7e5e4] rounded-full px-3 py-1.5">
      <button
        onClick={() => onChange(year - 1)}
        data-testid="accounting-year-prev"
        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#f5f5f4] text-[#475569]"
      >
        <ChevronLeft size={13} />
      </button>
      <span
        className="text-sm font-semibold tabular-nums w-14 text-center"
        data-testid="accounting-year-value"
      >
        {year}
      </span>
      <button
        onClick={() => onChange(year + 1)}
        data-testid="accounting-year-next"
        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#f5f5f4] text-[#475569]"
      >
        <ChevronRight size={13} />
      </button>
    </div>
  );
}

function KpiCard({ label, value, tint = "navy", testid }) {
  const tintClass = {
    navy:  "text-[#0f172a]",
    green: "text-[#166534]",
    coral: "text-[#c2410c]",
    red:   "text-[#dc2626]",
    blue:  "text-[#1e6fff]",
  }[tint];
  return (
    <div
      className="bg-white border border-[#e7e5e4] rounded-2xl p-5"
      data-testid={testid}
    >
      <div className="text-[10px] font-semibold tracking-widest uppercase text-[#475569]">
        {label}
      </div>
      <div className={`font-display text-3xl leading-none mt-2 tabular-nums ${tintClass}`}>
        {value}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
//  Overview
// -----------------------------------------------------------------------------
function OverviewSubtab({ year, onGoto }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await api.get("/accounting/summary", { params: { year } });
        if (!cancelled) setSummary(r.data);
      } catch (e) {
        if (!cancelled) toast.error(formatApiError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [year]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#78716c]">
        <Loader2 size={14} className="animate-spin" /> Lade Übersicht …
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Umsatz gesamt"
          value={money(summary.revenue_total)}
          tint="navy"
          testid="kpi-revenue-total"
        />
        <KpiCard
          label="Bezahlt"
          value={money(summary.revenue_paid)}
          tint="green"
          testid="kpi-revenue-paid"
        />
        <KpiCard
          label="Offen (Debitoren)"
          value={money(summary.revenue_open)}
          tint="coral"
          testid="kpi-revenue-open"
        />
        <KpiCard
          label="Ausgaben"
          value={money(summary.expenses_total)}
          tint="red"
          testid="kpi-expenses-total"
        />
      </div>

      <div className="bg-white border border-[#e7e5e4] rounded-2xl p-5">
        <div className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] mb-2">
          Gewinn / Verlust {year}
        </div>
        <div
          className={`font-display text-5xl leading-none tabular-nums ${
            summary.profit >= 0 ? "text-[#166534]" : "text-[#dc2626]"
          }`}
          data-testid="kpi-profit"
        >
          {money(summary.profit)}
        </div>
        <p className="text-xs text-[#78716c] mt-3">
          Berechnung: Bezahlte Rechnungen ({money(summary.revenue_paid)})
          <span className="mx-1">-</span>
          Ausgaben ({money(summary.expenses_total)}).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <QuickAction label="Alle Rechnungen anzeigen" onClick={() => onGoto("invoices")} icon={Receipt} />
        <QuickAction label="Ausgabe erfassen" onClick={() => onGoto("expenses")} icon={ArrowDownLeft} />
        <QuickAction label="Erfolgsrechnung öffnen" onClick={() => onGoto("income")} icon={BarChart3} />
      </div>
    </div>
  );
}

function QuickAction({ label, onClick, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className="bg-white border border-[#e7e5e4] rounded-2xl p-4 text-left hover:border-[#ff5a36] transition-colors group"
    >
      <div className="w-10 h-10 rounded-2xl bg-[#0f172a] text-white flex items-center justify-center mb-3 group-hover:bg-[#ff5a36] transition-colors">
        <Icon size={16} />
      </div>
      <div className="text-sm font-semibold text-[#0f172a]">{label}</div>
    </button>
  );
}

// -----------------------------------------------------------------------------
//  Invoices (global list)
// -----------------------------------------------------------------------------
function InvoicesSubtab({ year }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = { year };
        if (statusFilter) params.status = statusFilter;
        const r = await api.get("/accounting/invoices", { params });
        if (!cancelled) setItems(r.data);
      } catch (e) {
        if (!cancelled) toast.error(formatApiError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [year, statusFilter]);

  const totals = useMemo(() => {
    const t = { count: items.length, open: 0, paid: 0, cancelled: 0 };
    for (const i of items) {
      const p = Number(i.price_chf) || 0;
      if (i.status === "paid") t.paid += p;
      else if (i.status === "open") t.open += p;
      else if (i.status === "cancelled") t.cancelled += p;
    }
    return t;
  }, [items]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-xs text-[#78716c] flex flex-wrap items-center gap-3">
          <span><span className="font-semibold text-[#0f172a]">{totals.count}</span> Rechnungen</span>
          <span className="text-[#a8a29e]">·</span>
          <span className="text-[#166534] font-semibold">{money(totals.paid)} bezahlt</span>
          <span className="text-[#a8a29e]">·</span>
          <span className="text-[#c2410c] font-semibold">{money(totals.open)} offen</span>
        </div>
        <div className="inline-flex gap-1 bg-white border border-[#e7e5e4] rounded-full p-1">
          {[["", "Alle"], ["open", "Offen"], ["paid", "Bezahlt"], ["cancelled", "Storniert"]].map(([v, l]) => (
            <button
              key={v || "all"}
              onClick={() => setStatusFilter(v)}
              data-testid={`invoice-filter-${v || "all"}`}
              className={`text-[10px] font-semibold tracking-widest uppercase px-3 py-1 rounded-full transition-colors ${
                statusFilter === v
                  ? "bg-[#0f172a] text-white"
                  : "text-[#78716c] hover:text-[#0f172a]"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[#78716c]">
          <Loader2 size={14} className="animate-spin" /> Lade Rechnungen …
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-dashed border-[#e7e5e4] rounded-2xl p-10 text-center text-sm text-[#78716c]">
          Keine Rechnungen gefunden für {year}.
        </div>
      ) : (
        <div className="bg-white border border-[#e7e5e4] rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#fafaf9] text-[10px] font-semibold tracking-widest uppercase text-[#475569]">
              <tr>
                <th className="text-left px-4 py-3">Nr.</th>
                <th className="text-left px-4 py-3">Datum</th>
                <th className="text-left px-4 py-3">Schüler:in</th>
                <th className="text-left px-4 py-3">Lektion</th>
                <th className="text-left px-4 py-3">Zahlungsweise</th>
                <th className="text-right px-4 py-3">Preis</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Bemerkung</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr
                  key={i.id}
                  data-testid={`accounting-invoice-row-${i.id}`}
                  className="border-t border-[#f1f5f9] hover:bg-[#fafaf9]"
                >
                  <td className="px-4 py-3 font-semibold text-[#0f172a] whitespace-nowrap">{i.number}</td>
                  <td className="px-4 py-3 text-[#334155] tabular-nums whitespace-nowrap">{formatDMY(i.date)}</td>
                  <td className="px-4 py-3">
                    {i.student_name || "—"}
                    {i.student_category ? (
                      <span className="ml-1.5 text-[10px] text-[#a8a29e]">· Kat. {i.student_category}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#78716c] tabular-nums whitespace-nowrap">
                    {formatDMY(i.lesson_date)}
                    {i.duration_min ? ` · ${i.duration_min} min` : ""}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {PAYMENT_LABEL[i.payment_method] || "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-[#0f172a] tabular-nums whitespace-nowrap">
                    {money(i.price_chf)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusPill status={i.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-[#475569] max-w-[240px] truncate" title={i.note}>{i.note || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const PAYMENT_LABEL = {
  bar: "Bar",
  rechnung: "Rechnung",
  kreditkarte: "Kreditkarte",
  twint: "Twint",
};

function StatusPill({ status }) {
  const meta = {
    open:      { label: "Offen",     bg: "#fff7ed", text: "#c2410c" },
    paid:      { label: "Bezahlt",   bg: "#dcfce7", text: "#166534" },
    cancelled: { label: "Storniert", bg: "#f5f5f4", text: "#57534e" },
  }[status] || { label: "—", bg: "#f5f5f4", text: "#78716c" };
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full"
      style={{ background: meta.bg, color: meta.text }}
    >
      {meta.label}
    </span>
  );
}

// -----------------------------------------------------------------------------
//  Expenses
// -----------------------------------------------------------------------------
function ExpensesSubtab({ year }) {
  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [draft, setDraft] = useState({
    date: new Date().toISOString().slice(0, 10),
    amount_chf: "",
    description: "",
    account_id: "",
    receipt_url: "",
  });

  const load = async () => {
    try {
      const [ex, ac] = await Promise.all([
        api.get("/accounting/expenses", { params: { year } }),
        api.get("/accounting/accounts", { params: { type: "aufwand" } }),
      ]);
      setExpenses(ex.data);
      setAccounts(ac.data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const accountMap = useMemo(() => {
    const m = {};
    for (const a of accounts) m[a.id] = a;
    return m;
  }, [accounts]);

  const grouped = useMemo(() => {
    const g = {};
    for (const e of expenses) {
      const key = (e.date || "").slice(0, 7) || "unknown";
      (g[key] ||= []).push(e);
    }
    return g;
  }, [expenses]);

  const uploadReceipt = async (file) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post("/accounting/expenses/upload-receipt", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setDraft((d) => ({ ...d, receipt_url: r.data.url }));
      toast.success("Beleg hochgeladen");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setUploading(false);
    }
  };

  const createExpense = async () => {
    if (!draft.amount_chf || Number(draft.amount_chf) <= 0) {
      toast.error("Bitte Betrag angeben");
      return;
    }
    if (!draft.description) {
      toast.error("Bitte Bezeichnung angeben");
      return;
    }
    try {
      await api.post("/accounting/expenses", {
        ...draft,
        amount_chf: parseFloat(draft.amount_chf) || 0,
      });
      toast.success("Ausgabe erfasst");
      setDraft({
        date: new Date().toISOString().slice(0, 10),
        amount_chf: "",
        description: "",
        account_id: "",
        receipt_url: "",
      });
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const patchExpense = async (id, field, value) => {
    try {
      let v = value;
      if (field === "amount_chf") v = parseFloat(value) || 0;
      await api.patch(`/accounting/expenses/${id}`, { [field]: v });
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const removeExpense = async (id) => {
    if (!window.confirm("Ausgabe wirklich löschen?")) return;
    try {
      await api.delete(`/accounting/expenses/${id}`);
      toast.success("Gelöscht");
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#78716c]">
        <Loader2 size={14} className="animate-spin" /> Lade Ausgaben …
      </div>
    );
  }

  const totalYear = expenses.reduce((s, e) => s + (Number(e.amount_chf) || 0), 0);

  return (
    <div className="space-y-5">
      <div className="text-xs text-[#78716c]">
        <span className="font-semibold text-[#0f172a]">{expenses.length}</span>{" "}
        {expenses.length === 1 ? "Ausgabe" : "Ausgaben"}
        <span className="mx-1.5">·</span>
        <span className="font-semibold text-[#dc2626]">{money(totalYear)}</span> im Jahr
      </div>

      {/* Create form */}
      <div className="bg-white border border-[#e7e5e4] rounded-2xl p-4">
        <div className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] mb-3">
          Neue Ausgabe
        </div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[#475569] block mb-1">Datum</label>
            <input
              type="date"
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              data-testid="expense-new-date"
              className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[#475569] block mb-1">Betrag CHF</label>
            <input
              type="number"
              step="0.05"
              value={draft.amount_chf}
              onChange={(e) => setDraft({ ...draft, amount_chf: e.target.value })}
              placeholder="z. B. 89.90"
              data-testid="expense-new-amount"
              className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[#475569] block mb-1">Bezeichnung</label>
            <input
              type="text"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="z. B. Tankstelle SOCAR Uster"
              data-testid="expense-new-description"
              className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[#475569] block mb-1">Konto</label>
            <select
              value={draft.account_id}
              onChange={(e) => setDraft({ ...draft, account_id: e.target.value })}
              data-testid="expense-new-account"
              className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
            >
              <option value="">— wählen —</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.number} — {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[#475569] block mb-1">Beleg (JPG/PDF)</label>
            <label
              className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-widest bg-white border border-[#e2e8f0] text-[#334155] px-3 py-2 rounded-lg cursor-pointer hover:border-[#ff5a36]"
              data-testid="expense-new-receipt"
            >
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              {draft.receipt_url ? "Ersetzen" : "Hochladen"}
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => e.target.files?.[0] && uploadReceipt(e.target.files[0])}
                disabled={uploading}
                className="hidden"
              />
            </label>
            {draft.receipt_url && (
              <div className="text-[10px] text-[#166534] mt-1 flex items-center gap-1">
                <Paperclip size={9} /> hochgeladen
              </div>
            )}
          </div>
        </div>
        <div className="mt-3">
          <button
            type="button"
            onClick={createExpense}
            data-testid="expense-create-button"
            className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-[#ff5a36] text-white px-5 py-2.5 rounded-full hover:opacity-90"
          >
            <Plus size={12} /> Ausgabe erfassen
          </button>
        </div>
      </div>

      {expenses.length === 0 && (
        <div className="bg-white border border-dashed border-[#e7e5e4] rounded-2xl p-10 text-center text-sm text-[#78716c]">
          Noch keine Ausgabe für {year} erfasst.
        </div>
      )}

      {/* Grouped by month */}
      {Object.entries(grouped)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([monthKey, list]) => {
          const [, m] = monthKey.split("-");
          const monthName = MONTHS_DE[Number(m) - 1] || monthKey;
          const monthTotal = list.reduce((s, e) => s + (Number(e.amount_chf) || 0), 0);
          return (
            <div key={monthKey} data-testid={`expense-month-${monthKey}`}>
              <div className="flex items-center justify-between mb-2 mt-4">
                <div className="text-sm font-semibold text-[#0f172a]">
                  {monthName} {year}{" "}
                  <span className="text-xs text-[#78716c] font-normal ml-1">
                    ({list.length} {list.length === 1 ? "Ausgabe" : "Ausgaben"})
                  </span>
                </div>
                <div className="text-sm font-semibold text-[#dc2626] tabular-nums">
                  {money(monthTotal)}
                </div>
              </div>
              <div className="bg-white border border-[#e7e5e4] rounded-2xl divide-y divide-[#f1f5f9]">
                {list.map((e) => (
                  <div
                    key={e.id}
                    data-testid={`expense-row-${e.id}`}
                    className="p-3 grid grid-cols-1 md:grid-cols-[110px_130px_1fr_180px_80px_44px] gap-3 items-center"
                  >
                    <input
                      type="date"
                      defaultValue={e.date}
                      onBlur={(ev) => ev.target.value !== e.date && patchExpense(e.id, "date", ev.target.value)}
                      className="text-sm bg-transparent focus:outline-none focus:border-b focus:border-[#ff5a36]"
                    />
                    <input
                      type="number"
                      step="0.05"
                      defaultValue={e.amount_chf}
                      onBlur={(ev) => Number(ev.target.value) !== Number(e.amount_chf) && patchExpense(e.id, "amount_chf", ev.target.value)}
                      className="text-sm font-semibold text-[#0f172a] bg-transparent focus:outline-none focus:border-b focus:border-[#ff5a36]"
                    />
                    <input
                      type="text"
                      defaultValue={e.description}
                      onBlur={(ev) => ev.target.value !== e.description && patchExpense(e.id, "description", ev.target.value)}
                      className="text-sm text-[#334155] bg-transparent focus:outline-none focus:border-b focus:border-[#ff5a36]"
                    />
                    <select
                      defaultValue={e.account_id || ""}
                      onChange={(ev) => patchExpense(e.id, "account_id", ev.target.value)}
                      className="text-sm bg-transparent focus:outline-none focus:border-b focus:border-[#ff5a36]"
                    >
                      <option value="">— unzugeordnet —</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.number} · {a.name}
                        </option>
                      ))}
                    </select>
                    <div>
                      {e.receipt_url ? (
                        <a
                          href={e.receipt_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-[#0f172a] hover:text-[#ff5a36]"
                        >
                          <Paperclip size={10} /> Beleg
                        </a>
                      ) : (
                        <span className="text-[10px] text-[#a8a29e]">—</span>
                      )}
                    </div>
                    <button
                      onClick={() => removeExpense(e.id)}
                      data-testid={`expense-delete-${e.id}`}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-[#a8a29e] hover:text-[#dc2626] hover:bg-[#fee2e2]"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
    </div>
  );
}

// -----------------------------------------------------------------------------
//  Chart of accounts
// -----------------------------------------------------------------------------
function AccountsSubtab() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ number: "", name: "", type: "aufwand" });

  const load = async () => {
    try {
      const r = await api.get("/accounting/accounts");
      setAccounts(r.data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const patchAccount = async (id, field, value) => {
    try {
      await api.patch(`/accounting/accounts/${id}`, { [field]: value });
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const createAccount = async () => {
    if (!draft.number || !draft.name) {
      toast.error("Nummer + Name sind Pflicht");
      return;
    }
    setCreating(true);
    try {
      await api.post("/accounting/accounts", { ...draft, active: true });
      toast.success("Konto angelegt");
      setDraft({ number: "", name: "", type: "aufwand" });
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setCreating(false);
    }
  };

  const removeAccount = async (id) => {
    if (!window.confirm("Konto wirklich löschen?")) return;
    try {
      await api.delete(`/accounting/accounts/${id}`);
      toast.success("Gelöscht");
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const revenue = accounts.filter((a) => a.type === "ertrag");
  const expense = accounts.filter((a) => a.type === "aufwand");

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#78716c]">
        <Loader2 size={14} className="animate-spin" /> Lade Kontenplan …
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Create form */}
      <div className="bg-white border border-[#e7e5e4] rounded-2xl p-4">
        <div className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] mb-3">
          Neues Konto anlegen
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            value={draft.number}
            onChange={(e) => setDraft({ ...draft, number: e.target.value })}
            placeholder="Nummer (z. B. 4300)"
            data-testid="account-new-number"
            className="text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
          />
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Bezeichnung"
            data-testid="account-new-name"
            className="text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
          />
          <select
            value={draft.type}
            onChange={(e) => setDraft({ ...draft, type: e.target.value })}
            data-testid="account-new-type"
            className="text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
          >
            <option value="aufwand">Aufwand</option>
            <option value="ertrag">Ertrag</option>
          </select>
          <button
            type="button"
            onClick={createAccount}
            disabled={creating}
            data-testid="account-create-button"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-[#ff5a36] text-white px-4 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Anlegen
          </button>
        </div>
      </div>

      {/* Two columns: Ertrag + Aufwand */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AccountList
          title="Ertragskonten"
          accounts={revenue}
          onPatch={patchAccount}
          onDelete={removeAccount}
          testidPrefix="account-revenue"
        />
        <AccountList
          title="Aufwandkonten"
          accounts={expense}
          onPatch={patchAccount}
          onDelete={removeAccount}
          testidPrefix="account-expense"
        />
      </div>
    </div>
  );
}

function AccountList({ title, accounts, onPatch, onDelete, testidPrefix }) {
  return (
    <div className="bg-white border border-[#e7e5e4] rounded-2xl p-4">
      <div className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] mb-3">
        {title} ({accounts.length})
      </div>
      <div className="divide-y divide-[#f1f5f9]">
        {accounts.map((a) => (
          <div
            key={a.id}
            data-testid={`${testidPrefix}-row-${a.id}`}
            className="py-2 grid grid-cols-[70px_1fr_28px] items-center gap-2"
          >
            <input
              defaultValue={a.number}
              onBlur={(e) => e.target.value !== a.number && onPatch(a.id, "number", e.target.value)}
              className="text-sm font-semibold tabular-nums bg-transparent focus:outline-none focus:border-b focus:border-[#ff5a36]"
            />
            <input
              defaultValue={a.name}
              onBlur={(e) => e.target.value !== a.name && onPatch(a.id, "name", e.target.value)}
              className="text-sm text-[#334155] bg-transparent focus:outline-none focus:border-b focus:border-[#ff5a36]"
            />
            <button
              onClick={() => onDelete(a.id)}
              className="w-7 h-7 flex items-center justify-center rounded-full text-[#a8a29e] hover:text-[#dc2626] hover:bg-[#fee2e2]"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
//  Income statement (Erfolgsrechnung)
// -----------------------------------------------------------------------------
function IncomeStatementSubtab({ year }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await api.get(`/accounting/income-statement/${year}`);
        if (!cancelled) setData(r.data);
      } catch (e) {
        if (!cancelled) toast.error(formatApiError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [year]);

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/accounting/income-statement/${year}/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Erfolgsrechnung_${year}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setDownloading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#78716c]">
        <Loader2 size={14} className="animate-spin" /> Lade Erfolgsrechnung …
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button
          onClick={downloadPdf}
          disabled={downloading}
          data-testid="is-pdf-export"
          className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-[#0f172a] text-white px-4 py-2 rounded-full hover:opacity-90 disabled:opacity-50"
        >
          {downloading ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />}
          PDF-Export
        </button>
      </div>

      {/* Yearly totals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiCard label={`Ertrag ${year}`}   value={money(data.totals.revenue)}  tint="green" testid="is-yearly-revenue" />
        <KpiCard label={`Aufwand ${year}`}  value={money(data.totals.expenses)} tint="red"   testid="is-yearly-expenses" />
        <KpiCard
          label={data.totals.profit >= 0 ? `Gewinn ${year}` : `Verlust ${year}`}
          value={money(data.totals.profit)}
          tint={data.totals.profit >= 0 ? "green" : "red"}
          testid="is-yearly-profit"
        />
      </div>

      {/* Monthly table */}
      <div className="bg-white border border-[#e7e5e4] rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#fafaf9] text-[10px] font-semibold tracking-widest uppercase text-[#475569]">
            <tr>
              <th className="text-left px-4 py-3">Monat</th>
              <th className="text-right px-4 py-3">Ertrag</th>
              <th className="text-right px-4 py-3">Aufwand</th>
              <th className="text-right px-4 py-3">Gewinn / Verlust</th>
            </tr>
          </thead>
          <tbody>
            {data.months.map((m) => {
              const highlight = m.revenue || m.expenses;
              return (
                <tr
                  key={m.month}
                  data-testid={`is-month-row-${m.month}`}
                  className={`border-t border-[#f1f5f9] ${highlight ? "" : "text-[#a8a29e]"}`}
                >
                  <td className="px-4 py-3 font-semibold">
                    {MONTHS_DE[m.month - 1]}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#166534]">
                    {highlight ? money(m.revenue) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#dc2626]">
                    {highlight ? money(m.expenses) : "—"}
                  </td>
                  <td className={`px-4 py-3 text-right tabular-nums font-semibold ${
                    m.profit >= 0 ? "text-[#166534]" : "text-[#dc2626]"
                  }`}>
                    {highlight ? money(m.profit) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-[#0f172a] text-white">
            <tr>
              <td className="px-4 py-3 font-semibold uppercase tracking-widest text-[10px]">Total {year}</td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold" data-testid="is-total-revenue">
                {money(data.totals.revenue)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold" data-testid="is-total-expenses">
                {money(data.totals.expenses)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold" data-testid="is-total-profit">
                {money(data.totals.profit)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Per-account breakdown */}
      {data.totals.by_account.length > 0 && (
        <div className="bg-white border border-[#e7e5e4] rounded-2xl p-4">
          <div className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] mb-3">
            Aufteilung nach Konto ({year})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
            {data.totals.by_account
              .sort((a, b) => (a.number || "").localeCompare(b.number || ""))
              .map((row) => (
                <div key={row.account_id || "unassigned"} className="flex items-baseline gap-3 py-1">
                  <span className="text-xs font-semibold tabular-nums text-[#a8a29e] w-12">
                    {row.number}
                  </span>
                  <span className="text-sm text-[#334155] flex-1 truncate">
                    {row.name}
                  </span>
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      row.type === "ertrag" ? "text-[#166534]" : "text-[#dc2626]"
                    }`}
                  >
                    {money(row.amount)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
//  Monthly journal — chronological list of income + expense for one month
// -----------------------------------------------------------------------------
function MonthlyJournalSubtab({ year }) {
  const now = new Date();
  const isThisYear = year === now.getFullYear();
  const [month, setMonth] = useState(isThisYear ? now.getMonth() + 1 : 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await api.get(`/accounting/monthly/${year}/${month}`);
        if (!cancelled) setData(r.data);
      } catch (e) {
        if (!cancelled) toast.error(formatApiError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [year, month]);

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/accounting/monthly/${year}/${month}/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Monatsjournal_${year}-${String(month).padStart(2, "0")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Month selector + PDF export */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="inline-flex items-center gap-2 bg-white border border-[#e7e5e4] rounded-full px-3 py-1.5">
          <button
            onClick={() => setMonth((m) => (m > 1 ? m - 1 : 12))}
            data-testid="monthly-prev"
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#f5f5f4] text-[#475569]"
          >
            <ChevronLeft size={13} />
          </button>
          <span
            className="text-sm font-semibold w-32 text-center"
            data-testid="monthly-value"
          >
            {MONTHS_DE[month - 1]} {year}
          </span>
          <button
            onClick={() => setMonth((m) => (m < 12 ? m + 1 : 1))}
            data-testid="monthly-next"
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#f5f5f4] text-[#475569]"
          >
            <ChevronRight size={13} />
          </button>
        </div>
        <button
          onClick={downloadPdf}
          disabled={downloading || loading}
          data-testid="monthly-pdf-export"
          className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-[#0f172a] text-white px-4 py-2 rounded-full hover:opacity-90 disabled:opacity-50"
        >
          {downloading ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />}
          PDF-Export
        </button>
      </div>

      {loading || !data ? (
        <div className="flex items-center gap-2 text-sm text-[#78716c]">
          <Loader2 size={14} className="animate-spin" /> Lade Monatsjournal …
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Einnahmen"  value={money(data.totals.revenue_paid)}      tint="green" testid="monthly-kpi-revenue" />
            <KpiCard label="Offen"       value={money(data.totals.revenue_open)}      tint="coral" testid="monthly-kpi-open" />
            <KpiCard label="Ausgaben"    value={money(data.totals.expenses_total)}    tint="red"   testid="monthly-kpi-expenses" />
            <KpiCard
              label={data.totals.profit >= 0 ? "Gewinn" : "Verlust"}
              value={money(data.totals.profit)}
              tint={data.totals.profit >= 0 ? "green" : "red"}
              testid="monthly-kpi-profit"
            />
          </div>

          {/* Row list */}
          {data.rows.length === 0 ? (
            <div className="bg-white border border-dashed border-[#e7e5e4] rounded-2xl p-10 text-center text-sm text-[#78716c]">
              Keine Einträge in diesem Monat.
            </div>
          ) : (
            <div className="bg-white border border-[#e7e5e4] rounded-2xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#fafaf9] text-[10px] font-semibold tracking-widest uppercase text-[#475569]">
                  <tr>
                    <th className="text-left px-4 py-3 w-24">Datum</th>
                    <th className="text-left px-4 py-3 w-24">Typ</th>
                    <th className="text-left px-4 py-3">Bezeichnung</th>
                    <th className="text-left px-4 py-3 w-56">Konto / Status</th>
                    <th className="text-right px-4 py-3 w-32">Betrag CHF</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r, idx) => (
                    <tr
                      key={idx}
                      data-testid={`monthly-row-${idx}`}
                      className="border-t border-[#f1f5f9]"
                    >
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums text-[#334155]">
                        {formatDMY(r.date)}
                      </td>
                      <td className="px-4 py-3">
                        {r.kind === "income" ? (
                          <span className="text-[10px] font-bold tracking-widest uppercase text-[#166534]">
                            EINGANG
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold tracking-widest uppercase text-[#b91c1c]">
                            AUSGABE
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#0f172a]">{r.label}</td>
                      <td className="px-4 py-3 text-xs text-[#78716c]">
                        {r.kind === "income"
                          ? [
                              { paid: "Bezahlt", open: "Offen", cancelled: "Storniert" }[r.status] || "",
                              PAYMENT_LABEL[r.payment_method],
                            ].filter(Boolean).join(" · ")
                          : `${r.account_number || "—"} · ${r.account_name || "unzugeordnet"}`}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap ${
                          r.kind === "income"
                            ? r.status === "paid" ? "text-[#166534]" : "text-[#78716c]"
                            : "text-[#b91c1c]"
                        }`}
                      >
                        {r.kind === "expense" ? "-" : (r.status === "paid" ? "+" : "")}
                        {money(r.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#0f172a] text-white">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 font-semibold uppercase tracking-widest text-[10px]">
                      Total {MONTHS_DE[month - 1]} {year}
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums font-semibold ${
                        data.totals.profit >= 0 ? "text-[#86efac]" : "text-[#fca5a5]"
                      }`}
                      data-testid="monthly-total-profit"
                    >
                      {money(data.totals.profit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

