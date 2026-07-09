/**
 * Rechnungen-Tab — CRUD for student invoices.
 *
 * Backed by /api/students/{id}/invoices. Autosave on blur for existing
 * rows; new rows are created via a compact "Neue Rechnung" form.
 *
 * Status pills:
 *   open       → orange
 *   paid       → green
 *   cancelled  → gray
 */
import { useEffect, useMemo, useState } from "react";
import { Loader2, Trash2, Plus, Check, CircleDot, XCircle } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";

const STATUS_META = {
  open:      { label: "Offen",     bg: "#fff7ed", text: "#c2410c", dot: "#f97316" },
  paid:      { label: "Bezahlt",   bg: "#dcfce7", text: "#166534", dot: "#16a34a" },
  cancelled: { label: "Storniert", bg: "#f5f5f4", text: "#57534e", dot: "#a8a29e" },
};

const formatDMY = (iso) => {
  if (!iso || typeof iso !== "string") return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "—";
};

const money = (n) =>
  new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "CHF",
    minimumFractionDigits: 2,
  }).format(Number(n) || 0);

export default function InvoicesTab({ student }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({
    number: "",
    date: new Date().toISOString().slice(0, 10),
    amount_chf: "",
    status: "open",
    note: "",
  });

  const load = async () => {
    try {
      const r = await api.get(`/students/${student.id}/invoices`);
      setInvoices(r.data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id]);

  const totals = useMemo(() => {
    const t = { total: 0, open: 0, paid: 0 };
    for (const i of invoices) {
      if (i.status === "cancelled") continue;
      t.total += Number(i.amount_chf) || 0;
      if (i.status === "paid") t.paid += Number(i.amount_chf) || 0;
      else if (i.status === "open") t.open += Number(i.amount_chf) || 0;
    }
    return t;
  }, [invoices]);

  const createInvoice = async () => {
    if (!draft.amount_chf) {
      toast.error("Bitte Betrag angeben");
      return;
    }
    setCreating(true);
    try {
      await api.post(`/students/${student.id}/invoices`, {
        ...draft,
        amount_chf: parseFloat(draft.amount_chf) || 0,
      });
      toast.success("Rechnung angelegt");
      setDraft({
        number: "",
        date: new Date().toISOString().slice(0, 10),
        amount_chf: "",
        status: "open",
        note: "",
      });
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setCreating(false);
    }
  };

  const patch = async (id, field, value) => {
    try {
      const v = field === "amount_chf" ? parseFloat(value) || 0 : value;
      await api.patch(`/students/${student.id}/invoices/${id}`, { [field]: v });
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const cycleStatus = async (invoice) => {
    const order = ["open", "paid", "cancelled"];
    const next = order[(order.indexOf(invoice.status) + 1) % order.length];
    await patch(invoice.id, "status", next);
  };

  const removeInvoice = async (id) => {
    if (!window.confirm("Rechnung wirklich löschen?")) return;
    try {
      await api.delete(`/students/${student.id}/invoices/${id}`);
      toast.success("Gelöscht");
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#78716c]">
        <Loader2 size={14} className="animate-spin" /> Lade Rechnungen …
      </div>
    );
  }

  return (
    <div data-testid="invoices-tab" className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-3xl md:text-4xl leading-none tracking-tight">
            Rechnungen
          </h2>
          <p className="text-xs text-[#78716c] mt-2 flex flex-wrap items-center gap-3">
            <span>
              <span className="font-semibold text-[#0f172a]">{invoices.length}</span>{" "}
              {invoices.length === 1 ? "Rechnung" : "Rechnungen"}
            </span>
            <span className="text-[#a8a29e]">·</span>
            <span>
              <span
                className="font-semibold text-[#0f172a]"
                data-testid="invoices-total"
              >
                {money(totals.total)}
              </span>{" "}
              gesamt
            </span>
            <span className="text-[#a8a29e]">·</span>
            <span className="text-[#c2410c] font-semibold" data-testid="invoices-open">
              {money(totals.open)} offen
            </span>
            <span className="text-[#a8a29e]">·</span>
            <span className="text-[#166534] font-semibold" data-testid="invoices-paid">
              {money(totals.paid)} bezahlt
            </span>
          </p>
        </div>
      </div>

      {/* Create form */}
      <div className="bg-white border border-[#e7e5e4] rounded-2xl p-4">
        <div className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] mb-3">
          Neue Rechnung
        </div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-1">
            <input
              type="text"
              value={draft.number}
              onChange={(e) => setDraft({ ...draft, number: e.target.value })}
              placeholder="Nr."
              data-testid="invoice-new-number"
              className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
            />
          </div>
          <div className="md:col-span-1">
            <input
              type="date"
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              data-testid="invoice-new-date"
              className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
            />
          </div>
          <div className="md:col-span-1">
            <input
              type="number"
              step="0.05"
              value={draft.amount_chf}
              onChange={(e) => setDraft({ ...draft, amount_chf: e.target.value })}
              placeholder="Betrag CHF"
              data-testid="invoice-new-amount"
              className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
            />
          </div>
          <div className="md:col-span-1">
            <select
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value })}
              data-testid="invoice-new-status"
              className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
            >
              <option value="open">Offen</option>
              <option value="paid">Bezahlt</option>
              <option value="cancelled">Storniert</option>
            </select>
          </div>
          <div className="md:col-span-1">
            <input
              type="text"
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              placeholder="Notiz (optional)"
              className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
            />
          </div>
          <div>
            <button
              type="button"
              onClick={createInvoice}
              disabled={creating}
              data-testid="invoice-create-button"
              className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-[#ff5a36] text-white px-4 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              Anlegen
            </button>
          </div>
        </div>
      </div>

      {/* Invoice rows */}
      {invoices.length === 0 && (
        <div className="bg-white border border-dashed border-[#e7e5e4] rounded-2xl p-10 text-center text-sm text-[#78716c]">
          Noch keine Rechnung erstellt.
        </div>
      )}

      <div className="space-y-2.5">
        {invoices.map((inv) => {
          const st = STATUS_META[inv.status] || STATUS_META.open;
          return (
            <div
              key={inv.id}
              data-testid={`invoice-row-${inv.id}`}
              className="bg-white border border-[#e7e5e4] rounded-2xl p-4 grid grid-cols-1 md:grid-cols-[100px_130px_120px_140px_1fr_44px] items-center gap-3"
            >
              <input
                type="text"
                defaultValue={inv.number}
                onBlur={(e) => e.target.value !== inv.number && patch(inv.id, "number", e.target.value)}
                data-testid={`invoice-number-${inv.id}`}
                className="text-sm font-semibold border-0 bg-transparent focus:outline-none focus:border-b focus:border-[#ff5a36]"
              />
              <div>
                <label className="text-[9px] tracking-widest uppercase text-[#94a3b8] block">
                  Datum
                </label>
                <input
                  type="date"
                  defaultValue={inv.date}
                  onBlur={(e) => e.target.value !== inv.date && patch(inv.id, "date", e.target.value)}
                  className="text-sm border-0 bg-transparent focus:outline-none focus:border-b focus:border-[#ff5a36]"
                />
                <div className="text-[10px] text-[#a8a29e]">{formatDMY(inv.date)}</div>
              </div>
              <div>
                <label className="text-[9px] tracking-widest uppercase text-[#94a3b8] block">
                  Betrag
                </label>
                <input
                  type="number"
                  step="0.05"
                  defaultValue={inv.amount_chf}
                  onBlur={(e) => Number(e.target.value) !== Number(inv.amount_chf) && patch(inv.id, "amount_chf", e.target.value)}
                  data-testid={`invoice-amount-${inv.id}`}
                  className="text-sm font-semibold text-[#0f172a] border-0 bg-transparent focus:outline-none w-24"
                />
              </div>
              <button
                onClick={() => cycleStatus(inv)}
                data-testid={`invoice-status-${inv.id}`}
                className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full transition-colors"
                style={{ background: st.bg, color: st.text }}
              >
                {inv.status === "paid" && <Check size={11} strokeWidth={3} />}
                {inv.status === "open" && <CircleDot size={11} />}
                {inv.status === "cancelled" && <XCircle size={11} />}
                {st.label}
              </button>
              <input
                type="text"
                defaultValue={inv.note}
                onBlur={(e) => e.target.value !== inv.note && patch(inv.id, "note", e.target.value)}
                placeholder="Notiz"
                className="text-sm text-[#334155] border-0 bg-transparent focus:outline-none focus:border-b focus:border-[#ff5a36] min-w-0"
              />
              <button
                onClick={() => removeInvoice(inv.id)}
                data-testid={`invoice-delete-${inv.id}`}
                className="w-8 h-8 flex items-center justify-center rounded-full text-[#a8a29e] hover:text-[#dc2626] hover:bg-[#fee2e2]"
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
