/**
 * BookingRequestsManager — Admin-Tab „Buchungsanfragen".
 *
 * Zeigt alle öffentlich eingegangenen Buchungsanfragen mit Filter
 * (offen / bestätigt / abgesagt / alle). Detail-Panel rechts erlaubt
 * die drei Kern-Aktionen:
 *   - Bestätigen (POST /requests/{id}/approve  → confirmed-Mail)
 *   - Verschieben (POST /requests/{id}/reschedule mit {date,time} → rescheduled-Mail)
 *   - Ablehnen (POST /requests/{id}/decline mit {reason} → cancelled-Mail)
 *
 * SMTP-Fehler beim Versand blockieren die Statusänderung nicht — sie
 * werden lediglich als Warnung ausgegeben, damit Nadine sie manuell
 * behandeln kann.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Inbox,
  CheckCircle2,
  Calendar as CalendarIcon,
  XCircle,
  MapPin,
  Car,
  Clock,
  Phone,
  Mail,
  MessageSquare,
  Loader2,
  Filter,
  RefreshCw,
  User as UserIcon,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";

const STATUS_LABEL = {
  pending:   { label: "Offen",       color: "bg-[#fef3c7] text-[#a16207]" },
  confirmed: { label: "Bestätigt",   color: "bg-[#dcfce7] text-[#166534]" },
  cancelled: { label: "Abgesagt",    color: "bg-[#fee2e2] text-[#991b1b]" },
};

function formatDateDMY(iso) {
  if (!iso) return "";
  const d = iso.slice(0, 10);
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : d;
}
function relativeTime(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.round((now - then) / 60000);   // minutes
  if (diff < 1) return "gerade eben";
  if (diff < 60) return `vor ${diff} min`;
  const h = Math.round(diff / 60);
  if (h < 24) return `vor ${h} h`;
  const days = Math.round(h / 24);
  if (days === 1) return "gestern";
  if (days < 30) return `vor ${days} Tagen`;
  return formatDateDMY(iso);
}

export default function BookingRequestsManager() {
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState("pending");
  const [selected, setSelected] = useState(null);

  const load = async () => {
    try {
      const r = await api.get("/booking/requests");
      setItems(r.data || []);
    } catch (e) {
      toast.error(formatApiError(e));
      setItems([]);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!items) return [];
    if (filter === "all") return items;
    return items.filter((b) => (b.status || "pending") === filter);
  }, [items, filter]);

  const counts = useMemo(() => {
    const c = { pending: 0, confirmed: 0, cancelled: 0, all: (items || []).length };
    for (const b of items || []) c[b.status || "pending"] = (c[b.status || "pending"] || 0) + 1;
    return c;
  }, [items]);

  const activeItem = selected ? (items || []).find((b) => b.id === selected) : null;

  const handleActionDone = async (id, r) => {
    if (r?.email_error) {
      toast.warning(`Aktion gespeichert, aber E-Mail: ${r.email_error}`);
    } else {
      toast.success("E-Mail versendet");
    }
    await load();
    if (r?.booking) setSelected(id);
  };

  return (
    <div data-testid="booking-requests-manager" className="max-w-full">
      <div className="flex items-start gap-3 mb-6 flex-wrap">
        <div className="w-11 h-11 rounded-2xl bg-[#0f172a] text-white flex items-center justify-center">
          <Inbox size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-3xl md:text-4xl leading-none tracking-tight">
            Buchungsanfragen
          </h2>
          <p className="text-xs text-[#78716c] mt-1">
            Bestätige, verschiebe oder lehne eingehende Online-Anfragen ab.
            Die passende E-Mail-Vorlage wird automatisch versendet.
          </p>
        </div>
        <button
          onClick={load}
          data-testid="requests-refresh"
          className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-white border border-[#e2e8f0] text-[#475569] px-3 py-2 rounded-full hover:text-[#0f172a] hover:border-[#0f172a]"
        >
          <RefreshCw size={12} /> Aktualisieren
        </button>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-[#78716c] mr-1">
          <Filter size={11} className="inline mr-1" />
          Filter:
        </span>
        {[
          { id: "pending",   label: "Offen" },
          { id: "confirmed", label: "Bestätigt" },
          { id: "cancelled", label: "Abgesagt" },
          { id: "all",       label: "Alle" },
        ].map((t) => {
          const active = t.id === filter;
          return (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              data-testid={`requests-filter-${t.id}`}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 ${
                active
                  ? "bg-[#0f172a] text-white"
                  : "bg-white border border-[#e2e8f0] text-[#475569] hover:text-[#0f172a]"
              }`}
            >
              {t.label}
              <span
                className={`text-[10px] rounded-full px-1.5 py-0.5 tabular-nums ${
                  active ? "bg-white/20" : "bg-[#f1f5f9] text-[#78716c]"
                }`}
              >
                {counts[t.id] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {items === null ? (
        <div className="py-16 flex items-center justify-center text-[#78716c]">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
          {/* List */}
          <div className="bg-white border border-[#e7e5e4] rounded-2xl overflow-hidden">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#78716c]">
                Keine Anfragen mit diesem Filter.
              </div>
            ) : (
              <ul className="divide-y divide-[#f1f5f9]" data-testid="requests-list">
                {filtered.map((b) => {
                  const st = STATUS_LABEL[b.status] || STATUS_LABEL.pending;
                  const active = b.id === selected;
                  return (
                    <li key={b.id}>
                      <button
                        onClick={() => setSelected(b.id)}
                        data-testid={`request-row-${b.id}`}
                        className={`w-full text-left px-4 py-3.5 transition-colors ${
                          active ? "bg-[#fff7f4]" : "hover:bg-[#fafaf9]"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-[9px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full ${st.color}`}
                          >
                            {st.label}
                          </span>
                          <span className="text-[10px] text-[#94a3b8] tabular-nums ml-auto">
                            {relativeTime(b.created_at)}
                          </span>
                        </div>
                        <div className="font-semibold text-[#0f172a] truncate">
                          {b.customer_name || `${b.first_name || ""} ${b.last_name || ""}`.trim() || b.email}
                        </div>
                        <div className="text-xs text-[#475569] flex items-center gap-3 mt-1 tabular-nums">
                          <span className="flex items-center gap-1">
                            <CalendarIcon size={11} /> {formatDateDMY(b.start_datetime)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={11} /> {(b.start_datetime || "").slice(11, 16)}
                          </span>
                          <span className="text-[10px] uppercase tracking-widest text-[#94a3b8]">
                            {b.duration_min} min
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Detail */}
          <div>
            {activeItem ? (
              <RequestDetail booking={activeItem} onActionDone={handleActionDone} />
            ) : (
              <div className="bg-white border border-dashed border-[#e7e5e4] rounded-2xl p-10 text-center text-sm text-[#78716c]">
                Wähle links eine Anfrage aus, um Details und Aktionen zu sehen.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Detail panel with action buttons                                           */
/* -------------------------------------------------------------------------- */
function RequestDetail({ booking, onActionDone }) {
  const [busy, setBusy] = useState(null);   // "approve" | "reschedule" | "decline"
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [reschedule, setReschedule] = useState({
    date: (booking.start_datetime || "").slice(0, 10),
    time: (booking.start_datetime || "").slice(11, 16),
  });
  const [declineReason, setDeclineReason] = useState("");
  const st = STATUS_LABEL[booking.status] || STATUS_LABEL.pending;

  const runApprove = async () => {
    if (!window.confirm("Anfrage bestätigen und E-Mail an den Schüler senden?")) return;
    setBusy("approve");
    try {
      const r = await api.post(`/booking/requests/${booking.id}/approve`);
      await onActionDone(booking.id, r.data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(null);
    }
  };
  const runReschedule = async () => {
    if (!reschedule.date || !reschedule.time) return;
    setBusy("reschedule");
    try {
      const r = await api.post(`/booking/requests/${booking.id}/reschedule`, {
        date: reschedule.date,
        time: reschedule.time,
      });
      setRescheduleOpen(false);
      await onActionDone(booking.id, r.data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(null);
    }
  };
  const runDecline = async () => {
    setBusy("decline");
    try {
      const r = await api.post(`/booking/requests/${booking.id}/decline`, {
        reason: declineReason.trim(),
      });
      setDeclineOpen(false);
      setDeclineReason("");
      await onActionDone(booking.id, r.data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-white border border-[#e7e5e4] rounded-2xl overflow-hidden" data-testid={`request-detail-${booking.id}`}>
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#f1f5f9]">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span
            className={`text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full ${st.color}`}
            data-testid="request-status-badge"
          >
            {st.label}
          </span>
          <span className="text-[10px] font-semibold tracking-widest uppercase text-[#94a3b8]">
            Eingegangen: {relativeTime(booking.created_at)}
          </span>
          <span className="text-[10px] font-semibold tracking-widest uppercase text-[#94a3b8] ml-auto">
            ID: {booking.id.slice(0, 8)}
          </span>
        </div>
        <h3 className="font-display text-2xl leading-tight tracking-tight text-[#0f172a]">
          {booking.customer_name || `${booking.first_name || ""} ${booking.last_name || ""}`.trim()}
        </h3>
        <div className="mt-3 flex items-center gap-4 flex-wrap text-sm">
          {booking.email && (
            <a href={`mailto:${booking.email}`} className="flex items-center gap-1.5 text-[#475569] hover:text-[#ff5a36]">
              <Mail size={13} /> {booking.email}
            </a>
          )}
          {booking.phone && (
            <a href={`tel:${booking.phone.replace(/\s/g, "")}`} className="flex items-center gap-1.5 text-[#475569] hover:text-[#ff5a36]">
              <Phone size={13} /> {booking.phone}
            </a>
          )}
        </div>
      </div>

      {/* Facts grid */}
      <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Fact icon={CalendarIcon} label="Datum">{formatDateDMY(booking.start_datetime)}</Fact>
        <Fact icon={Clock} label="Uhrzeit & Dauer">
          {(booking.start_datetime || "").slice(11, 16)} Uhr · {booking.duration_min} Min
        </Fact>
        <Fact icon={Car} label="Fahrzeug">{booking.vehicle_name || "—"}</Fact>
        <Fact icon={MapPin} label="Abholort">{booking.pickup_location || "—"}</Fact>
        {(booking.notes || booking.message) && (
          <div className="md:col-span-2 bg-[#fbf9f6] border border-[#e7e5e4] rounded-2xl p-4">
            <div className="text-[10px] font-semibold tracking-widest uppercase text-[#78716c] mb-1 flex items-center gap-1.5">
              <MessageSquare size={11} /> Notiz vom Schüler
            </div>
            <p className="text-sm text-[#0f172a] whitespace-pre-wrap">{booking.notes || booking.message}</p>
          </div>
        )}
        {booking.admin_note && (
          <div className="md:col-span-2 bg-[#fee2e2] border border-[#fecaca] rounded-2xl p-4">
            <div className="text-[10px] font-semibold tracking-widest uppercase text-[#991b1b] mb-1 flex items-center gap-1.5">
              <AlertTriangle size={11} /> Absage-Grund
            </div>
            <p className="text-sm text-[#7f1d1d] whitespace-pre-wrap">{booking.admin_note}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      {booking.status !== "cancelled" && (
        <div className="border-t border-[#f1f5f9] px-6 py-4 bg-[#fbf9f6] flex flex-wrap gap-2 justify-end">
          {booking.status === "pending" && (
            <button
              type="button"
              onClick={runApprove}
              disabled={busy !== null}
              data-testid="request-approve"
              className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-[#16a34a] text-white px-4 py-2 rounded-full hover:opacity-90 disabled:opacity-50"
            >
              {busy === "approve" ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              Bestätigen
            </button>
          )}
          <button
            type="button"
            onClick={() => setRescheduleOpen(true)}
            disabled={busy !== null}
            data-testid="request-reschedule-open"
            className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-white border border-[#0f172a] text-[#0f172a] px-4 py-2 rounded-full hover:bg-[#0f172a] hover:text-white disabled:opacity-50"
          >
            <CalendarIcon size={12} /> Verschieben
          </button>
          <button
            type="button"
            onClick={() => setDeclineOpen(true)}
            disabled={busy !== null}
            data-testid="request-decline-open"
            className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-white border border-[#dc2626] text-[#dc2626] px-4 py-2 rounded-full hover:bg-[#dc2626] hover:text-white disabled:opacity-50"
          >
            <XCircle size={12} /> Ablehnen
          </button>
        </div>
      )}

      {/* Reschedule modal */}
      {rescheduleOpen && (
        <Modal onClose={() => setRescheduleOpen(false)}>
          <h4 className="font-display text-xl mb-1">Termin verschieben</h4>
          <p className="text-xs text-[#78716c] mb-4">
            Wähle den neuen Termin. Der Schüler erhält automatisch eine
            E-Mail mit dem aktualisierten Datum.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] block mb-1">
                Datum
              </label>
              <input
                type="date"
                value={reschedule.date}
                onChange={(e) => setReschedule((r) => ({ ...r, date: e.target.value }))}
                data-testid="request-reschedule-date"
                className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] block mb-1">
                Uhrzeit
              </label>
              <input
                type="time"
                value={reschedule.time}
                onChange={(e) => setReschedule((r) => ({ ...r, time: e.target.value }))}
                data-testid="request-reschedule-time"
                className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRescheduleOpen(false)}
              className="text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-full text-[#475569] hover:text-[#0f172a]"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={runReschedule}
              disabled={busy === "reschedule" || !reschedule.date || !reschedule.time}
              data-testid="request-reschedule-submit"
              className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-[#ff5a36] text-white px-4 py-2 rounded-full hover:opacity-90 disabled:opacity-50"
            >
              {busy === "reschedule" ? <Loader2 size={12} className="animate-spin" /> : <CalendarIcon size={12} />}
              Verschieben & E-Mail
            </button>
          </div>
        </Modal>
      )}

      {/* Decline modal */}
      {declineOpen && (
        <Modal onClose={() => setDeclineOpen(false)}>
          <h4 className="font-display text-xl mb-1">Anfrage ablehnen</h4>
          <p className="text-xs text-[#78716c] mb-4">
            Optional kannst du einen Grund angeben — er wird in der
            Absage-Mail an den Schüler eingefügt.
          </p>
          <textarea
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            rows={3}
            data-testid="request-decline-reason"
            placeholder="z. B. Zeitfenster leider bereits vergeben, bitte anderen Termin wählen."
            className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36] resize-y"
          />
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeclineOpen(false)}
              className="text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-full text-[#475569] hover:text-[#0f172a]"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={runDecline}
              disabled={busy === "decline"}
              data-testid="request-decline-submit"
              className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-[#dc2626] text-white px-4 py-2 rounded-full hover:opacity-90 disabled:opacity-50"
            >
              {busy === "decline" ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
              Ablehnen & E-Mail
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Small helpers                                                              */
/* -------------------------------------------------------------------------- */
function Fact({ icon: Icon, label, children }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase text-[#78716c] mb-1">
        <Icon size={11} /> {label}
      </div>
      <div className="text-sm text-[#0f172a] font-medium tabular-nums">{children}</div>
    </div>
  );
}
function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0f172a]/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl"
        data-testid="request-modal"
      >
        {children}
      </div>
    </div>
  );
}
