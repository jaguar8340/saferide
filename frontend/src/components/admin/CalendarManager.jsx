/**
 * CalendarManager – week + day view + click-to-create + iCal subscribe.
 * Replaces the old BookingsManager (booking table) with a proper agenda.
 *
 * Backend:
 *   GET  /api/appointments?start=...&end=...
 *   POST /api/appointments
 *   PATCH /api/appointments/{id}
 *   DELETE /api/appointments/{id}
 *   GET  /api/calendar/{token}.ics
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Clock,
  MapPin,
  X,
  RefreshCw,
  Copy,
  Link as LinkIcon,
  Info,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";

/* Configurable calendar */
const HOUR_START = 6;            // 06:00
const HOUR_END = 22;             // 22:00 (exclusive)
const SLOT_MIN = 30;             // 30-minute grid
const SLOT_PX = 32;              // 32 px per 30-min slot → 1h = 64 px
const HOURS = HOUR_END - HOUR_START;
const SLOTS_PER_HOUR = 60 / SLOT_MIN;

/* Local ISO helpers – calendar operates in local time so 14:30 stays 14:30. */
function toLocalISO(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}
function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function startOfWeek(d) {
  // Week starts on Monday (Swiss standard)
  const x = startOfDay(d);
  const day = x.getDay(); // 0 = Sun
  const diff = (day === 0 ? -6 : 1 - day);
  return addDays(x, diff);
}
function formatDayLabel(d) {
  return d.toLocaleDateString("de-CH", { weekday: "short", day: "2-digit", month: "2-digit" });
}
function formatTime(d) {
  return d.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" });
}

const DAY_NAMES_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export default function CalendarManager() {
  const [view, setView] = useState("week");                     // 'week' | 'day'
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [appointments, setAppointments] = useState([]);
  const [unscheduled, setUnscheduled] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(null);               // { start_datetime, duration_min } for the modal
  const [editing, setEditing] = useState(null);                 // full appointment doc
  const [icalOpen, setIcalOpen] = useState(false);
  const [settings, setSettings] = useState(null);
  const gridRef = useRef(null);

  // Range = current visible week or single day
  const { rangeStart, rangeEnd, days } = useMemo(() => {
    if (view === "day") {
      const s = startOfDay(cursor);
      return { rangeStart: s, rangeEnd: addDays(s, 1), days: [s] };
    }
    const s = startOfWeek(cursor);
    return { rangeStart: s, rangeEnd: addDays(s, 7), days: [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(s, i)) };
  }, [view, cursor]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/appointments", {
        params: { start: toLocalISO(rangeStart), end: toLocalISO(rangeEnd) },
      });
      setAppointments(r.data.appointments || []);
      setUnscheduled(r.data.unscheduled || []);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [rangeStart.getTime(), rangeEnd.getTime()]);

  const openIcal = async () => {
    if (!settings) {
      try {
        const r = await api.get("/settings/business");
        setSettings(r.data);
      } catch (e) {
        toast.error(formatApiError(e));
        return;
      }
    }
    setIcalOpen(true);
  };

  const regenerateToken = async () => {
    if (!window.confirm("Wirklich neues iCal-Token generieren? Alte Abos werden ungültig.")) return;
    try {
      const r = await api.post("/calendar/regenerate-token", {});
      setSettings({ ...settings, calendar_token: r.data.calendar_token });
      toast.success("Neues Token generiert");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const handleSlotClick = (date, hour, quarter) => {
    const start = new Date(date);
    start.setHours(hour, quarter * SLOT_MIN, 0, 0);
    setCreating({
      start_datetime: toLocalISO(start),
      duration_min: 60,
      customer_name: "",
      pickup_location: "",
      notes: "",
      phone: "",
      email: "",
    });
  };

  const handleEventMove = async (apptId, newStart) => {
    /* Optimistic update: patch local state instantly, revert on error. */
    const prev = appointments;
    const iso = toLocalISO(newStart);
    setAppointments((list) =>
      list.map((a) => (a.id === apptId ? { ...a, start_datetime: iso } : a)),
    );
    try {
      await api.patch(`/appointments/${apptId}`, { start_datetime: iso });
      toast.success(
        `Verschoben auf ${newStart.toLocaleDateString("de-CH", {
          day: "2-digit",
          month: "2-digit",
        })} · ${newStart.toLocaleTimeString("de-CH", {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
      );
    } catch (e) {
      setAppointments(prev);
      toast.error(formatApiError(e));
    }
  };

  const cursorTitle =
    view === "day"
      ? cursor.toLocaleDateString("de-CH", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
      : `${rangeStart.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit" })} – ${addDays(rangeStart, 6).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" })}`;

  const goToday = () => setCursor(startOfDay(new Date()));
  const goPrev = () => setCursor(addDays(cursor, view === "day" ? -1 : -7));
  const goNext = () => setCursor(addDays(cursor, view === "day" ? 1 : 7));

  return (
    <div data-testid="calendar-manager" className="max-w-full">
      <div className="flex items-start gap-3 mb-6 flex-wrap">
        <div className="w-11 h-11 rounded-2xl bg-[#0f172a] text-white flex items-center justify-center">
          <CalendarIcon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-3xl md:text-4xl leading-none tracking-tight">
            Kalender
          </h2>
          <p className="text-xs text-[#78716c] mt-1">
            Termine planen. Klicke auf einen freien Slot, um einen Termin einzutragen.
          </p>
        </div>
        <button
          onClick={openIcal}
          data-testid="calendar-ical-btn"
          className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-white border border-[#0f172a] text-[#0f172a] px-4 py-2 rounded-full hover:bg-[#0f172a] hover:text-white transition-colors"
        >
          <LinkIcon size={12} /> iPhone-Sync
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <div className="inline-flex items-center bg-white border border-[#e2e8f0] rounded-full p-1">
          <button
            onClick={() => setView("week")}
            data-testid="calendar-view-week"
            className={`text-[10px] font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full transition-colors ${
              view === "week" ? "bg-[#0f172a] text-white" : "text-[#475569]"
            }`}
          >
            Woche
          </button>
          <button
            onClick={() => setView("day")}
            data-testid="calendar-view-day"
            className={`text-[10px] font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full transition-colors ${
              view === "day" ? "bg-[#0f172a] text-white" : "text-[#475569]"
            }`}
          >
            Tag
          </button>
        </div>
        <div className="inline-flex items-center gap-1">
          <button
            onClick={goPrev}
            data-testid="calendar-prev"
            aria-label="Zurück"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-[#e2e8f0] text-[#475569] hover:text-[#0f172a]"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={goToday}
            data-testid="calendar-today"
            className="text-[10px] font-semibold tracking-widest uppercase bg-white border border-[#e2e8f0] px-3 py-2 rounded-full text-[#475569] hover:text-[#0f172a]"
          >
            Heute
          </button>
          <button
            onClick={goNext}
            data-testid="calendar-next"
            aria-label="Weiter"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-[#e2e8f0] text-[#475569] hover:text-[#0f172a]"
          >
            <ChevronRight size={14} />
          </button>
        </div>
        <div className="text-sm font-semibold text-[#0f172a] px-2 flex-1 min-w-[180px] capitalize">
          {cursorTitle}
        </div>
        <button
          onClick={() => handleSlotClick(new Date(), 9, 0)}
          data-testid="calendar-new-appointment"
          className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-[#ff5a36] text-white px-4 py-2 rounded-full hover:opacity-90"
        >
          <Plus size={12} /> Neuer Termin
        </button>
      </div>

      {/* Grid */}
      <div
        className="bg-white border border-[#e7e5e4] rounded-2xl overflow-hidden"
        data-testid="calendar-grid"
      >
        {loading && (
          <div className="p-8 flex items-center gap-2 text-[#78716c] text-sm">
            <Loader2 size={14} className="animate-spin" /> Lade …
          </div>
        )}
        {!loading && (
          <CalendarGrid
            days={days}
            appointments={appointments}
            onSlotClick={handleSlotClick}
            onEventClick={setEditing}
            onEventMove={handleEventMove}
            gridRef={gridRef}
          />
        )}
      </div>

      {/* Unscheduled bookings – below calendar */}
      <div className="mt-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-2xl bg-[#fef3c7] text-[#a16207] flex items-center justify-center">
            <Info size={14} />
          </div>
          <div>
            <div className="text-[10px] font-semibold tracking-widest uppercase text-[#a16207]">
              Nicht bestätigte Buchungen
            </div>
            <div className="text-sm text-[#0f172a]">
              {unscheduled.length === 0
                ? "Keine offenen Anfragen – super!"
                : `${unscheduled.length} Anfrage(n) warten auf deine Bestätigung`}
            </div>
          </div>
        </div>
        {unscheduled.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {unscheduled.map((b) => (
              <UnscheduledCard
                key={b.id}
                booking={b}
                onSchedule={(iso) => setCreating({
                  start_datetime: iso,
                  duration_min: b.duration_min || 60,
                  customer_name: `${b.first_name || ""} ${b.last_name || ""}`.trim(),
                  pickup_location: b.location_slug || "",
                  notes: b.message || b.notes || "",
                  phone: b.phone || "",
                  email: b.email || "",
                  _from_booking_id: b.id,
                })}
                onDelete={async () => {
                  if (!window.confirm("Buchung löschen?")) return;
                  try {
                    await api.delete(`/bookings/${b.id}`);
                    load();
                    toast.success("Gelöscht");
                  } catch (e) {
                    toast.error(formatApiError(e));
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {creating && (
        <AppointmentModal
          mode="create"
          initial={creating}
          onClose={() => setCreating(null)}
          onSaved={() => {
            setCreating(null);
            load();
          }}
        />
      )}
      {editing && (
        <AppointmentModal
          mode="edit"
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
      {icalOpen && (
        <IcalModal
          settings={settings}
          onClose={() => setIcalOpen(false)}
          onRegenerate={regenerateToken}
        />
      )}
    </div>
  );
}

/* ---------------- Grid (flexbox: label column + N day columns) ---------------- */
function CalendarGrid({ days, appointments, onSlotClick, onEventClick, onEventMove, gridRef }) {
  const eventTop = (isoStr) => {
    const dt = new Date(isoStr);
    const min = (dt.getHours() - HOUR_START) * 60 + dt.getMinutes();
    return (min / SLOT_MIN) * SLOT_PX;
  };
  const bodyHeight = HOURS * SLOTS_PER_HOUR * SLOT_PX;

  /* Drag state — one appointment in flight at a time. */
  const [drag, setDrag] = useState(null);           // { id, offsetY }
  const columnRefs = useRef({});

  const pickupSlot = (dayIndex, clientY) => {
    const col = columnRefs.current[dayIndex];
    if (!col) return null;
    const rect = col.getBoundingClientRect();
    let y = clientY - rect.top;
    if (drag?.offsetY) y -= drag.offsetY;
    if (y < 0) y = 0;
    if (y > bodyHeight - SLOT_PX) y = bodyHeight - SLOT_PX;
    // Snap to nearest 30-min slot
    const slotIndex = Math.round(y / SLOT_PX);
    const minutes = slotIndex * SLOT_MIN;
    const hour = HOUR_START + Math.floor(minutes / 60);
    const minute = minutes % 60;
    const target = new Date(days[dayIndex]);
    target.setHours(hour, minute, 0, 0);
    return target;
  };

  const handleColumnPointerMove = (e, dayIndex) => {
    if (!drag) return;
    e.preventDefault();
  };

  const handleColumnPointerUp = (e, dayIndex) => {
    if (!drag) return;
    const target = pickupSlot(dayIndex, e.clientY);
    const draggedId = drag.id;
    setDrag(null);
    document.body.style.userSelect = "";
    if (target && onEventMove) {
      onEventMove(draggedId, target);
    }
  };

  const startDrag = (e, appt) => {
    if (e.button !== undefined && e.button !== 0) return;      // only left mouse / touch
    e.stopPropagation();
    // offset from event's top so cursor stays inside the pill while dragging
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    document.body.style.userSelect = "none";
    setDrag({ id: appt.id, offsetY });
  };

  return (
    <div className="flex select-none" ref={gridRef}>
      {/* Time labels column */}
      <div className="w-[64px] shrink-0 border-r border-[#e7e5e4] bg-white">
        <div className="h-14 bg-[#fbf9f6] border-b border-[#e7e5e4]" />
        <div className="relative" style={{ height: bodyHeight }}>
          {Array.from({ length: HOURS + 1 }).map((_, hi) => {
            const hour = HOUR_START + hi;
            const top = hi * SLOTS_PER_HOUR * SLOT_PX;
            return (
              <div
                key={hi}
                className="absolute right-2 -translate-y-1/2 text-[10px] text-[#94a3b8] font-medium bg-white px-1"
                style={{ top }}
              >
                {String(hour).padStart(2, "0")}:00
              </div>
            );
          })}
        </div>
      </div>

      {/* Day columns */}
      <div className="flex-1 flex min-w-0">
        {days.map((day, di) => {
          const dayAppointments = appointments.filter((a) => sameDay(new Date(a.start_datetime), day));
          const isDragOver = drag !== null;
          return (
            <div
              key={di}
              ref={(el) => (columnRefs.current[di] = el)}
              className="flex-1 border-r border-[#e7e5e4] min-w-0 last:border-r-0"
              onPointerMove={(e) => handleColumnPointerMove(e, di)}
              onPointerUp={(e) => handleColumnPointerUp(e, di)}
              data-testid={`calendar-day-column-${di}`}
            >
              {/* Header */}
              <div
                className="h-14 border-b border-[#e7e5e4] px-3 py-2 text-center bg-[#fbf9f6]"
                data-testid={`calendar-day-header-${di}`}
              >
                <div className="text-[10px] tracking-widest uppercase text-[#78716c]">
                  {DAY_NAMES_SHORT[(day.getDay() + 6) % 7]}
                </div>
                <div
                  className={`text-sm font-semibold ${
                    isToday(day) ? "text-[#ff5a36]" : "text-[#0f172a]"
                  }`}
                >
                  {day.getDate()}.{day.getMonth() + 1}
                </div>
              </div>

              {/* Body */}
              <div
                className={`relative ${isDragOver ? "bg-[#fef2f2]/40" : ""}`}
                style={{ height: bodyHeight }}
              >
                {/* Hour separator lines (top of every hour) */}
                {Array.from({ length: HOURS }).map((_, hi) => (
                  <div
                    key={`sep-${hi}`}
                    className="absolute left-0 right-0 border-t border-[#e7e5e4] pointer-events-none"
                    style={{ top: hi * SLOTS_PER_HOUR * SLOT_PX }}
                  />
                ))}
                {/* Half-hour dashed lines */}
                {Array.from({ length: HOURS }).map((_, hi) => (
                  <div
                    key={`half-${hi}`}
                    className="absolute left-0 right-0 border-t border-dashed border-[#f1f5f9] pointer-events-none"
                    style={{ top: (hi * SLOTS_PER_HOUR + 1) * SLOT_PX }}
                  />
                ))}
                {/* Clickable slots */}
                {Array.from({ length: HOURS * SLOTS_PER_HOUR }).map((_, si) => {
                  const hour = HOUR_START + Math.floor(si / SLOTS_PER_HOUR);
                  const quarter = si % SLOTS_PER_HOUR;
                  return (
                    <button
                      key={si}
                      type="button"
                      onClick={() => onSlotClick(day, hour, quarter)}
                      data-testid={`calendar-slot-${di}-${hour}-${quarter}`}
                      className="absolute left-0 right-0 hover:bg-[#fef2f2] transition-colors"
                      style={{ top: si * SLOT_PX, height: SLOT_PX }}
                      aria-label={`Neuer Termin ${String(hour).padStart(2, "0")}:${String(quarter * SLOT_MIN).padStart(2, "0")}`}
                    />
                  );
                })}

                {/* Now-indicator (thin red line on today) */}
                {isToday(day) && <NowLine />}

                {/* Events */}
                {dayAppointments.map((a) => {
                  const top = eventTop(a.start_datetime);
                  const dur = a.duration_min || 60;
                  const height = (dur / SLOT_MIN) * SLOT_PX - 2;
                  const isDragging = drag?.id === a.id;
                  return (
                    <EventPill
                      key={a.id}
                      appt={a}
                      onClick={() => !isDragging && onEventClick(a)}
                      onPointerDown={(e) => startDrag(e, a)}
                      style={{ top, height }}
                      dragging={isDragging}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventPill({ appt, onClick, onPointerDown, style, dragging }) {
  const status = appt.status || "pending";
  const isPending = status === "pending";
  const isCancelled = status === "cancelled";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick?.()}
      onPointerDown={onPointerDown}
      data-testid={`calendar-event-${appt.id}`}
      style={style}
      className={`absolute left-1 right-1 rounded-lg px-2 py-1 text-left text-[11px] leading-tight overflow-hidden border transition-shadow cursor-grab active:cursor-grabbing ${
        dragging
          ? "opacity-70 ring-2 ring-[#ff5a36] shadow-lg z-20"
          : "hover:shadow-md hover:z-10"
      } ${
        isCancelled
          ? "bg-[#f1f5f9] border-[#e2e8f0] text-[#94a3b8] line-through"
          : isPending
          ? "bg-[#fef3c7] border-[#fde68a] text-[#92400e]"
          : "bg-[#ff5a36]/10 border-[#ff5a36]/40 text-[#0f172a]"
      }`}
    >
      <div className="text-[9px] tracking-widest uppercase font-semibold opacity-70">
        {new Date(appt.start_datetime).toLocaleTimeString("de-CH", {
          hour: "2-digit",
          minute: "2-digit",
        })}
        {" · "}
        {appt.duration_min} min
      </div>
      <div className="font-semibold truncate">
        {appt.customer_name ||
          `${appt.first_name || ""} ${appt.last_name || ""}`.trim() ||
          "Termin"}
      </div>
      {appt.pickup_location && (
        <div className="opacity-70 truncate text-[10px] mt-0.5">
          <MapPin size={9} className="inline mr-0.5" />
          {appt.pickup_location}
        </div>
      )}
    </div>
  );
}

function isToday(d) {
  const t = new Date();
  return (
    t.getFullYear() === d.getFullYear() &&
    t.getMonth() === d.getMonth() &&
    t.getDate() === d.getDate()
  );
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function NowLine() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const h = now.getHours();
  if (h < HOUR_START || h >= HOUR_END) return null;
  const top = ((h - HOUR_START) * 60 + now.getMinutes()) / SLOT_MIN * SLOT_PX;
  return (
    <div
      className="absolute left-0 right-0 pointer-events-none z-10"
      style={{ top }}
      data-testid="calendar-now-line"
    >
      <div className="h-0.5 bg-[#ff5a36]" />
      <div className="w-2 h-2 rounded-full bg-[#ff5a36] -ml-1 -mt-[5px]" />
    </div>
  );
}

/* ---------------- Unscheduled card ---------------- */
function UnscheduledCard({ booking, onSchedule, onDelete }) {
  const [when, setWhen] = useState(() => {
    const now = new Date();
    now.setHours(9, 0, 0, 0);
    return toLocalISO(now).slice(0, 16);      // YYYY-MM-DDThh:mm
  });
  return (
    <div
      data-testid={`calendar-unscheduled-${booking.id}`}
      className="bg-white border border-[#fde68a] rounded-2xl p-4"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="font-semibold text-[#0f172a]">
            {booking.first_name} {booking.last_name}
          </div>
          <div className="text-xs text-[#78716c] mt-0.5">
            {booking.email && <div>{booking.email}</div>}
            {booking.phone && <div>{booking.phone}</div>}
          </div>
        </div>
        <button
          onClick={onDelete}
          data-testid={`calendar-unscheduled-delete-${booking.id}`}
          className="w-8 h-8 flex items-center justify-center rounded-full text-[#a8a29e] hover:text-[#dc2626] hover:bg-[#fee2e2]"
        >
          <Trash2 size={13} />
        </button>
      </div>
      {booking.package_snapshot?.title_de && (
        <div className="text-xs text-[#475569] mb-2">
          Paket: <span className="font-semibold">{booking.package_snapshot.title_de}</span>
        </div>
      )}
      {booking.message && (
        <div className="text-xs text-[#475569] bg-[#fbf9f6] rounded p-2 mb-2 whitespace-pre-wrap">
          {booking.message}
        </div>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          data-testid={`calendar-unscheduled-when-${booking.id}`}
          className="text-xs bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#ff5a36]"
        />
        <button
          onClick={() => onSchedule(`${when}:00`)}
          data-testid={`calendar-unscheduled-schedule-${booking.id}`}
          className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase bg-[#ff5a36] text-white px-3 py-1.5 rounded-full hover:opacity-90"
        >
          <CheckCircle2 size={11} /> In Kalender
        </button>
      </div>
    </div>
  );
}

/* ---------------- Modal ---------------- */
function AppointmentModal({ mode, initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    customer_name: initial.customer_name || "",
    start_datetime: (initial.start_datetime || "").slice(0, 16),   // for datetime-local input
    duration_min: initial.duration_min || 60,
    pickup_location: initial.pickup_location || "",
    notes: initial.notes || "",
    phone: initial.phone || "",
    email: initial.email || "",
    status: initial.status || "confirmed",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const save = async () => {
    if (!form.customer_name.trim()) {
      toast.error("Kunde muss ausgefüllt sein");
      return;
    }
    if (!form.start_datetime) {
      toast.error("Datum & Zeit fehlen");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        start_datetime: `${form.start_datetime}:00`,
        duration_min: parseInt(form.duration_min, 10) || 60,
      };
      if (mode === "create") {
        await api.post("/appointments", payload);
        // If we're scheduling a public booking, delete the original request
        if (initial._from_booking_id) {
          try { await api.delete(`/bookings/${initial._from_booking_id}`); } catch { /* keep going */ }
        }
        toast.success("Termin gespeichert");
      } else {
        await api.patch(`/appointments/${initial.id}`, payload);
        toast.success("Termin aktualisiert");
      }
      onSaved();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Termin wirklich löschen?")) return;
    setDeleting(true);
    try {
      await api.delete(`/appointments/${initial.id}`);
      toast.success("Termin gelöscht");
      onSaved();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      data-testid="appointment-modal"
      className="fixed inset-0 z-50 bg-[#0f172a]/60 flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e7e5e4]">
          <div className="font-display text-xl tracking-tight">
            {mode === "create" ? "Neuer Termin" : "Termin bearbeiten"}
          </div>
          <button
            onClick={onClose}
            data-testid="appointment-modal-close"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f5f5f4]"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <Field label="Kunde">
            <input
              type="text"
              value={form.customer_name}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
              placeholder="z. B. Stefan Haas"
              data-testid="appointment-customer"
              autoFocus
              className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Datum & Zeit">
              <input
                type="datetime-local"
                value={form.start_datetime}
                onChange={(e) => setForm({ ...form, start_datetime: e.target.value })}
                data-testid="appointment-start"
                className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
              />
            </Field>
            <Field label="Dauer (Minuten)">
              <input
                type="number"
                min="15"
                max="480"
                step="15"
                value={form.duration_min}
                onChange={(e) => setForm({ ...form, duration_min: e.target.value })}
                data-testid="appointment-duration"
                className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
              />
            </Field>
          </div>
          <Field label="Abholort">
            <input
              type="text"
              value={form.pickup_location}
              onChange={(e) => setForm({ ...form, pickup_location: e.target.value })}
              placeholder="z. B. Bahnhof Hinwil"
              data-testid="appointment-pickup"
              className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
            />
          </Field>
          <Field label="Bemerkungen">
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optionale Notizen"
              data-testid="appointment-notes"
              className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36] resize-none"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefon">
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                data-testid="appointment-phone"
                className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
              />
            </Field>
            <Field label="E-Mail">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                data-testid="appointment-email"
                className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
              />
            </Field>
          </div>
          {mode === "edit" && (
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                data-testid="appointment-status"
                className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
              >
                <option value="confirmed">Bestätigt</option>
                <option value="pending">Offen</option>
                <option value="cancelled">Storniert</option>
              </select>
            </Field>
          )}
        </div>
        <div className="px-5 py-4 border-t border-[#e7e5e4] flex items-center gap-2 justify-between">
          {mode === "edit" ? (
            <button
              onClick={remove}
              disabled={deleting}
              data-testid="appointment-delete"
              className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-[#dc2626] hover:bg-[#fee2e2] px-3 py-2 rounded-full"
            >
              {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Löschen
            </button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-xs font-semibold tracking-widest uppercase text-[#475569] px-3 py-2 hover:text-[#0f172a]"
            >
              Abbrechen
            </button>
            <button
              onClick={save}
              disabled={saving}
              data-testid="appointment-save"
              className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-[#ff5a36] text-white px-5 py-2 rounded-full hover:opacity-90 disabled:opacity-50"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : null}
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] block mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

/* ---------------- iCal modal ---------------- */
function IcalModal({ settings, onClose, onRegenerate }) {
  const token = settings?.calendar_token || "";
  const backendBase = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
  const url = token ? `${backendBase}/api/calendar/${token}.ics` : "";
  const webcalUrl = url.replace(/^https?:/, "webcal:");
  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Kopiert");
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  };
  return (
    <div
      onClick={onClose}
      data-testid="ical-modal"
      className="fixed inset-0 z-50 bg-[#0f172a]/60 flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e7e5e4]">
          <div className="font-display text-xl tracking-tight">
            Kalender abonnieren
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f5f5f4]"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="text-sm text-[#475569] leading-relaxed">
            Abonniere diese Adresse in Apple Kalender (iPhone / Mac) oder Google Kalender, um
            deine Termine automatisch synchron zu halten.
          </div>
          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] block mb-1">
              Kalender-URL
            </label>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={url}
                data-testid="ical-url"
                className="flex-1 text-xs bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 font-mono"
              />
              <button
                onClick={() => copy(url)}
                data-testid="ical-copy"
                className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase bg-[#0f172a] text-white px-3 py-2 rounded-full hover:opacity-90"
              >
                <Copy size={11} /> Kopieren
              </button>
            </div>
          </div>
          <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-xl p-4 text-xs text-[#1e3a8a] leading-relaxed">
            <div className="font-semibold text-[#1d4ed8] mb-1">Auf dem iPhone einrichten</div>
            <ol className="list-decimal pl-4 space-y-0.5">
              <li>Einstellungen → Kalender → Accounts → Account hinzufügen → Andere</li>
              <li>{'„Kalenderabo hinzufügen" antippen'}</li>
              <li>URL oben einfügen → Weiter → Sichern</li>
            </ol>
            <div className="mt-2">
              Alternativ:{" "}
              <a href={webcalUrl} className="underline font-semibold">
                mit einem Tap abonnieren
              </a>{" "}
              (öffnet die Apple-Kalender-App).
            </div>
          </div>
          <div className="border-t border-[#e7e5e4] pt-3 flex items-center gap-2">
            <button
              onClick={onRegenerate}
              data-testid="ical-regenerate"
              className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase text-[#dc2626] hover:bg-[#fee2e2] px-3 py-2 rounded-full"
            >
              <RefreshCw size={11} /> Token neu generieren
            </button>
            <span className="text-[10px] text-[#94a3b8]">Alte Abos werden dann ungültig.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
