/**
 * CalendarManager – week/day/list view + click-to-create + iCal subscribe/import.
 * Replaces the old BookingsManager (booking table) with a proper agenda.
 *
 * Backend:
 *   GET  /api/appointments?start=...&end=...    → { appointments, unscheduled, external }
 *   GET  /api/appointments/upcoming             → list view feed
 *   POST /api/appointments                      → create (appointment | block)
 *   PATCH /api/appointments/{id}                → move / edit
 *   DELETE /api/appointments/{id}               → delete
 *   GET  /api/calendar/{token}.ics              → subscribe (iPhone/Google)
 *   GET|POST|DELETE /api/calendar/external-feeds → import iPhone/Google
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
  Ban,
  List,
  User,
  ExternalLink,
  Download,
  ChevronDown,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";
import BookingSettings from "@/components/admin/booking/BookingSettings";

/* Configurable calendar */
const HOUR_START = 6;
const HOUR_END = 22;
const SLOT_MIN = 30;
const SLOT_PX = 32;
const HOURS = HOUR_END - HOUR_START;
const SLOTS_PER_HOUR = 60 / SLOT_MIN;

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
  const x = startOfDay(d);
  const day = x.getDay();
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
  const [view, setView] = useState("week");                     // 'week' | 'day' | 'list'
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [appointments, setAppointments] = useState([]);
  const [externalEvents, setExternalEvents] = useState([]);
  const [unscheduled, setUnscheduled] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(null);
  const [editing, setEditing] = useState(null);
  const [icalOpen, setIcalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(null);
  const gridRef = useRef(null);

  const { rangeStart, rangeEnd, days } = useMemo(() => {
    if (view === "day") {
      const s = startOfDay(cursor);
      return { rangeStart: s, rangeEnd: addDays(s, 1), days: [s] };
    }
    if (view === "list") {
      const s = startOfDay(new Date());
      return { rangeStart: s, rangeEnd: addDays(s, 365), days: [] };
    }
    const s = startOfWeek(cursor);
    return { rangeStart: s, rangeEnd: addDays(s, 7), days: [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(s, i)) };
  }, [view, cursor]);

  const load = async () => {
    setLoading(true);
    try {
      if (view === "list") {
        const r = await api.get("/appointments/upcoming", { params: { limit: 200 } });
        setAppointments(r.data.appointments || []);
        setExternalEvents([]);
        setUnscheduled([]);
      } else {
        const r = await api.get("/appointments", {
          params: { start: toLocalISO(rangeStart), end: toLocalISO(rangeEnd) },
        });
        setAppointments(r.data.appointments || []);
        setUnscheduled(r.data.unscheduled || []);
        setExternalEvents(r.data.external || []);
      }
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeStart.getTime(), rangeEnd.getTime(), view]);

  // Load students once for the picker
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get("/students");
        setStudents(r.data || []);
      } catch {
        /* non-blocking */
      }
    })();
  }, []);

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

  const [refreshing, setRefreshing] = useState(false);
  const refreshExternal = async () => {
    setRefreshing(true);
    try {
      const r = await api.post("/calendar/external-feeds/refresh");
      toast.success(`Externe Kalender aktualisiert (${r.data?.events_found ?? 0} Termine)`);
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setRefreshing(false);
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
      entry_type: "appointment",
    });
  };

  const openNewAppointment = () => {
    const start = new Date();
    start.setHours(Math.max(9, start.getHours() + 1), 0, 0, 0);
    setCreating({
      start_datetime: toLocalISO(start),
      duration_min: 60,
      customer_name: "",
      pickup_location: "",
      notes: "",
      phone: "",
      email: "",
      entry_type: "appointment",
    });
  };

  const openNewBlock = () => {
    const start = new Date();
    start.setHours(Math.max(9, start.getHours() + 1), 0, 0, 0);
    setCreating({
      start_datetime: toLocalISO(start),
      duration_min: 60,
      customer_name: "",
      pickup_location: "",
      notes: "",
      phone: "",
      email: "",
      entry_type: "block",
    });
  };

  const handleEventMove = async (apptId, newStart) => {
    const prev = appointments;
    const iso = toLocalISO(newStart);
    setAppointments((list) =>
      list.map((a) => (a.id === apptId ? { ...a, start_datetime: iso } : a)),
    );
    try {
      await api.patch(`/appointments/${apptId}`, { start_datetime: iso });
      toast.success(
        `Verschoben auf ${newStart.toLocaleDateString("de-CH", {
          day: "2-digit", month: "2-digit",
        })} · ${newStart.toLocaleTimeString("de-CH", {
          hour: "2-digit", minute: "2-digit",
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
      : view === "list"
      ? "Alle zukünftigen Termine"
      : `${rangeStart.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit" })} – ${addDays(rangeStart, 6).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" })}`;

  const goToday = () => setCursor(startOfDay(new Date()));
  const goPrev = () => setCursor(addDays(cursor, view === "day" ? -1 : -7));
  const goNext = () => setCursor(addDays(cursor, view === "day" ? 1 : 7));

  return (
    <div data-testid="calendar-manager" className="max-w-full">
      {settingsOpen ? (
        <BookingSettings onClose={() => setSettingsOpen(false)} />
      ) : (
      <>
      <div className="flex items-start gap-3 mb-6 flex-wrap">
        <div className="w-11 h-11 rounded-2xl bg-[#0f172a] text-white flex items-center justify-center">
          <CalendarIcon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-3xl md:text-4xl leading-none tracking-tight">
            Kalender
          </h2>
          <p className="text-xs text-[#78716c] mt-1">
            Termine planen. Klicke auf einen freien Slot oder nutze die Buttons oben rechts.
          </p>
        </div>
        <button
          onClick={refreshExternal}
          disabled={refreshing}
          data-testid="calendar-refresh-external"
          title="Externe iCal-Feeds jetzt neu abrufen"
          className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-white border border-[#e2e8f0] text-[#475569] px-3 py-2 rounded-full hover:text-[#0f172a] hover:border-[#0f172a] transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          <span className="hidden sm:inline">Aktualisieren</span>
        </button>
        <button
          onClick={openIcal}
          data-testid="calendar-ical-btn"
          className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-white border border-[#0f172a] text-[#0f172a] px-4 py-2 rounded-full hover:bg-[#0f172a] hover:text-white transition-colors"
        >
          <LinkIcon size={12} /> iPhone-Sync
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          data-testid="calendar-settings-btn"
          title="Kalender-Einstellungen (Öffnungszeiten, Fahrzeuge, Abholorte)"
          className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-white border border-[#e2e8f0] text-[#475569] px-3 py-2 rounded-full hover:text-[#0f172a] hover:border-[#0f172a] transition-colors"
        >
          <Settings size={12} />
          <span className="hidden sm:inline">Einstellungen</span>
        </button>
      </div>

      {/* Farb-Legende — was bedeutet welche Farbe im Kalender */}
      <div
        data-testid="calendar-legend"
        className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 px-3 py-2 bg-white border border-[#e7e5e4] rounded-full text-[10px] font-semibold tracking-widest uppercase text-[#475569] w-fit"
      >
        <LegendChip color="bg-[#ff5a36]/70 border-[#ff5a36]" label="Termin" />
        <LegendChip color="bg-[#fef3c7] border-[#fde68a]" label="Offen" />
        <LegendChip color="bg-[#334155] border-[#1e293b]" label="Blockzeit" />
        <LegendChip
          label="Extern belegt"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #e2e8f0 0 4px, #f1f5f9 4px 8px)",
            border: "1px solid #cbd5e1",
          }}
        />
        <LegendChip color="bg-[#f1f5f9] border-[#e2e8f0] line-through text-[#94a3b8]" label="Storniert" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <div className="inline-flex items-center bg-white border border-[#e2e8f0] rounded-full p-1">
          <ViewBtn active={view === "week"} onClick={() => setView("week")} testid="calendar-view-week">Woche</ViewBtn>
          <ViewBtn active={view === "day"} onClick={() => setView("day")} testid="calendar-view-day">Tag</ViewBtn>
          <ViewBtn active={view === "list"} onClick={() => setView("list")} testid="calendar-view-list">Liste</ViewBtn>
        </div>
        {view !== "list" && (
          <div className="inline-flex items-center gap-1">
            <button onClick={goPrev} data-testid="calendar-prev" aria-label="Zurück"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-[#e2e8f0] text-[#475569] hover:text-[#0f172a]">
              <ChevronLeft size={14} />
            </button>
            <button onClick={goToday} data-testid="calendar-today"
              className="text-[10px] font-semibold tracking-widest uppercase bg-white border border-[#e2e8f0] px-3 py-2 rounded-full text-[#475569] hover:text-[#0f172a]">
              Heute
            </button>
            <button onClick={goNext} data-testid="calendar-next" aria-label="Weiter"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-[#e2e8f0] text-[#475569] hover:text-[#0f172a]">
              <ChevronRight size={14} />
            </button>
          </div>
        )}
        <div className="text-sm font-semibold text-[#0f172a] px-2 flex-1 min-w-[180px] capitalize">
          {cursorTitle}
        </div>
        <button
          onClick={openNewBlock}
          data-testid="calendar-new-block"
          className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-white border border-[#0f172a] text-[#0f172a] px-4 py-2 rounded-full hover:bg-[#0f172a] hover:text-white transition-colors"
        >
          <Ban size={12} /> Blockzeit
        </button>
        <button
          onClick={openNewAppointment}
          data-testid="calendar-new-appointment"
          className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-[#ff5a36] text-white px-4 py-2 rounded-full hover:opacity-90"
        >
          <Plus size={12} /> Neuer Termin
        </button>
      </div>

      {/* Grid / List */}
      {view === "list" ? (
        <ListView
          loading={loading}
          appointments={appointments}
          onEventClick={setEditing}
        />
      ) : (
        <div className="bg-white border border-[#e7e5e4] rounded-2xl overflow-hidden" data-testid="calendar-grid">
          {loading && (
            <div className="p-8 flex items-center gap-2 text-[#78716c] text-sm">
              <Loader2 size={14} className="animate-spin" /> Lade …
            </div>
          )}
          {!loading && (
            <CalendarGrid
              days={days}
              appointments={appointments}
              externalEvents={externalEvents}
              onSlotClick={handleSlotClick}
              onEventClick={setEditing}
              onEventMove={handleEventMove}
              gridRef={gridRef}
            />
          )}
        </div>
      )}

      {/* Unscheduled bookings – below calendar (week/day view only) */}
      {view !== "list" && (
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
                    entry_type: "appointment",
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
      )}

      {creating && (
        <AppointmentModal
          mode="create"
          initial={creating}
          students={students}
          onClose={() => setCreating(null)}
          onSaved={() => { setCreating(null); load(); }}
        />
      )}
      {editing && (
        <AppointmentModal
          mode="edit"
          initial={editing}
          students={students}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
      {icalOpen && (
        <IcalModal
          settings={settings}
          onClose={() => setIcalOpen(false)}
          onRegenerate={regenerateToken}
          onReload={load}
        />
      )}
      </>
      )}
    </div>
  );
}

function LegendChip({ color, label, style }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`w-3 h-3 rounded-sm border ${color || ""}`}
        style={style}
        aria-hidden
      />
      {label}
    </span>
  );
}

function ViewBtn({ active, onClick, testid, children }) {
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className={`text-[10px] font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full transition-colors ${
        active ? "bg-[#0f172a] text-white" : "text-[#475569]"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------------- Grid (flexbox: label column + N day columns) ---------------- */
function CalendarGrid({ days, appointments, externalEvents, onSlotClick, onEventClick, onEventMove, gridRef }) {
  const eventTop = (isoStr) => {
    const dt = new Date(isoStr);
    const min = (dt.getHours() - HOUR_START) * 60 + dt.getMinutes();
    return (min / SLOT_MIN) * SLOT_PX;
  };
  const bodyHeight = HOURS * SLOTS_PER_HOUR * SLOT_PX;

  const [drag, setDrag] = useState(null);
  const columnRefs = useRef({});

  const pickupSlot = (dayIndex, clientY) => {
    const col = columnRefs.current[dayIndex];
    if (!col) return null;
    const rect = col.getBoundingClientRect();
    let y = clientY - rect.top;
    if (drag?.offsetY) y -= drag.offsetY;
    if (y < 0) y = 0;
    if (y > bodyHeight - SLOT_PX) y = bodyHeight - SLOT_PX;
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
    if (target && onEventMove) onEventMove(draggedId, target);
  };

  const startDrag = (e, appt) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    document.body.style.userSelect = "none";
    setDrag({ id: appt.id, offsetY });
  };

  return (
    <div className="flex select-none overflow-x-auto" ref={gridRef}>
      <div className="w-[54px] shrink-0 border-r border-[#e7e5e4] bg-white">
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

      <div className="flex-1 flex min-w-0">
        {days.map((day, di) => {
          const dayAppts = appointments.filter((a) => sameDay(new Date(a.start_datetime), day));
          const dayExt = (externalEvents || []).filter((a) => sameDay(new Date(a.start_datetime), day));
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
              <div className="h-14 border-b border-[#e7e5e4] px-3 py-2 text-center bg-[#fbf9f6]" data-testid={`calendar-day-header-${di}`}>
                <div className="text-[10px] tracking-widest uppercase text-[#78716c]">
                  {DAY_NAMES_SHORT[(day.getDay() + 6) % 7]}
                </div>
                <div className={`text-sm font-semibold ${isToday(day) ? "text-[#ff5a36]" : "text-[#0f172a]"}`}>
                  {day.getDate()}.{day.getMonth() + 1}
                </div>
              </div>

              <div className={`relative ${isDragOver ? "bg-[#fef2f2]/40" : ""}`} style={{ height: bodyHeight }}>
                {Array.from({ length: HOURS }).map((_, hi) => (
                  <div key={`sep-${hi}`} className="absolute left-0 right-0 border-t border-[#e7e5e4] pointer-events-none"
                    style={{ top: hi * SLOTS_PER_HOUR * SLOT_PX }} />
                ))}
                {Array.from({ length: HOURS }).map((_, hi) => (
                  <div key={`half-${hi}`} className="absolute left-0 right-0 border-t border-dashed border-[#f1f5f9] pointer-events-none"
                    style={{ top: (hi * SLOTS_PER_HOUR + 1) * SLOT_PX }} />
                ))}
                {Array.from({ length: HOURS * SLOTS_PER_HOUR }).map((_, si) => {
                  const hour = HOUR_START + Math.floor(si / SLOTS_PER_HOUR);
                  const quarter = si % SLOTS_PER_HOUR;
                  return (
                    <button key={si} type="button" onClick={() => onSlotClick(day, hour, quarter)}
                      data-testid={`calendar-slot-${di}-${hour}-${quarter}`}
                      className="absolute left-0 right-0 hover:bg-[#fef2f2] transition-colors"
                      style={{ top: si * SLOT_PX, height: SLOT_PX }}
                      aria-label={`Neuer Termin ${String(hour).padStart(2, "0")}:${String(quarter * SLOT_MIN).padStart(2, "0")}`}
                    />
                  );
                })}

                {isToday(day) && <NowLine />}

                {/* External (iPhone/Google) events — read-only, striped */}
                {dayExt.map((a) => {
                  const top = eventTop(a.start_datetime);
                  const dur = a.duration_min || 60;
                  const height = (dur / SLOT_MIN) * SLOT_PX - 2;
                  return (
                    <div
                      key={a.id}
                      data-testid={`calendar-external-${a.id}`}
                      style={{
                        top, height,
                        backgroundImage: "repeating-linear-gradient(45deg, #e2e8f0 0 6px, #f1f5f9 6px 12px)",
                      }}
                      className="absolute left-1 right-1 rounded-lg px-2 py-1 text-[11px] leading-tight overflow-hidden border border-[#cbd5e1] text-[#475569] pointer-events-auto cursor-not-allowed"
                      title={`Extern belegt: ${a.customer_name}`}
                    >
                      <div className="text-[9px] tracking-widest uppercase font-semibold opacity-70 truncate">
                        <ExternalLink size={8} className="inline mr-0.5" />
                        {new Date(a.start_datetime).toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" })}
                        {" · "}{dur} min
                      </div>
                      <div className="font-semibold truncate">{a.customer_name || "Belegt"}</div>
                    </div>
                  );
                })}

                {dayAppts.map((a) => {
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
  const isBlock = appt.entry_type === "block";
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
          : isBlock
          ? "bg-[#334155] border-[#1e293b] text-white"
          : isPending
          ? "bg-[#fef3c7] border-[#fde68a] text-[#92400e]"
          : "bg-[#ff5a36]/10 border-[#ff5a36]/40 text-[#0f172a]"
      }`}
    >
      <div className="text-[9px] tracking-widest uppercase font-semibold opacity-70">
        {isBlock && <Ban size={8} className="inline mr-0.5" />}
        {new Date(appt.start_datetime).toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" })}
        {" · "}{appt.duration_min} min
      </div>
      <div className="font-semibold truncate">
        {appt.customer_name || `${appt.first_name || ""} ${appt.last_name || ""}`.trim() || "Termin"}
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
  return t.getFullYear() === d.getFullYear() && t.getMonth() === d.getMonth() && t.getDate() === d.getDate();
}
function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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
    <div className="absolute left-0 right-0 pointer-events-none z-10" style={{ top }} data-testid="calendar-now-line">
      <div className="h-0.5 bg-[#ff5a36]" />
      <div className="w-2 h-2 rounded-full bg-[#ff5a36] -ml-1 -mt-[5px]" />
    </div>
  );
}

/* ---------------- List view ---------------- */
function ListView({ loading, appointments, onEventClick }) {
  if (loading) {
    return (
      <div className="bg-white border border-[#e7e5e4] rounded-2xl p-8 flex items-center gap-2 text-[#78716c] text-sm">
        <Loader2 size={14} className="animate-spin" /> Lade …
      </div>
    );
  }
  if (appointments.length === 0) {
    return (
      <div className="bg-white border border-dashed border-[#e7e5e4] rounded-2xl p-10 text-center text-sm text-[#78716c]">
        Keine zukünftigen Termine.
      </div>
    );
  }
  // Group by date-string YYYY-MM-DD
  const groups = {};
  for (const a of appointments) {
    const key = (a.start_datetime || "").slice(0, 10);
    (groups[key] = groups[key] || []).push(a);
  }
  const sortedKeys = Object.keys(groups).sort();

  return (
    <div data-testid="calendar-list-view" className="space-y-6">
      {sortedKeys.map((key) => {
        const day = new Date(`${key}T12:00`);
        const label = day.toLocaleDateString("de-CH", {
          weekday: "long", day: "2-digit", month: "long", year: "numeric",
        });
        return (
          <div key={key}>
            <div className="text-[11px] font-semibold tracking-widest uppercase text-[#c2410c] mb-2 capitalize">
              {label}
            </div>
            <div className="grid grid-cols-1 gap-2">
              {groups[key].map((a) => (
                <ListRow key={a.id} appt={a} onClick={() => onEventClick(a)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListRow({ appt, onClick }) {
  const isBlock = appt.entry_type === "block";
  const isExternal = appt.source === "external_ical";
  const start = new Date(appt.start_datetime);
  const dur = appt.duration_min || 60;
  return (
    <button
      type="button"
      onClick={isExternal ? undefined : onClick}
      data-testid={`calendar-list-row-${appt.id}`}
      disabled={isExternal}
      className={`text-left bg-white border rounded-2xl px-4 py-3 flex items-center gap-3 transition-colors ${
        isExternal
          ? "border-[#e2e8f0] opacity-70 cursor-not-allowed"
          : isBlock
          ? "border-[#1e293b] bg-[#0f172a]/5 hover:border-[#0f172a]"
          : "border-[#e7e5e4] hover:border-[#ff5a36]"
      }`}
    >
      <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${
        isBlock ? "bg-[#334155] text-white" : isExternal ? "bg-[#f1f5f9] text-[#475569]" : "bg-[#fff7ed] text-[#c2410c]"
      }`}>
        <span className="text-xs font-bold leading-none">
          {start.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" })}
        </span>
        <span className="text-[9px] tracking-widest uppercase mt-0.5 opacity-70">{dur}min</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[#0f172a] truncate flex items-center gap-2">
          {isBlock && <Ban size={12} className="text-[#334155] shrink-0" />}
          {isExternal && <ExternalLink size={12} className="text-[#475569] shrink-0" />}
          <span className="truncate">{appt.customer_name || "Termin"}</span>
        </div>
        <div className="text-xs text-[#78716c] truncate">
          {[
            appt.pickup_location,
            appt.phone,
            isExternal && "Extern (iPhone/Google)",
            isBlock && "Blockzeit",
          ].filter(Boolean).join(" · ") || "—"}
        </div>
      </div>
      {!isExternal && <ChevronRight size={14} className="text-[#94a3b8] shrink-0" />}
    </button>
  );
}

/* ---------------- Unscheduled card ---------------- */
function UnscheduledCard({ booking, onSchedule, onDelete }) {
  const [when, setWhen] = useState(() => {
    const now = new Date();
    now.setHours(9, 0, 0, 0);
    return toLocalISO(now).slice(0, 16);
  });
  return (
    <div data-testid={`calendar-unscheduled-${booking.id}`} className="bg-white border border-[#fde68a] rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="font-semibold text-[#0f172a]">{booking.first_name} {booking.last_name}</div>
          <div className="text-xs text-[#78716c] mt-0.5">
            {booking.email && <div>{booking.email}</div>}
            {booking.phone && <div>{booking.phone}</div>}
          </div>
        </div>
        <button onClick={onDelete} data-testid={`calendar-unscheduled-delete-${booking.id}`}
          className="w-8 h-8 flex items-center justify-center rounded-full text-[#a8a29e] hover:text-[#dc2626] hover:bg-[#fee2e2]">
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
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)}
          data-testid={`calendar-unscheduled-when-${booking.id}`}
          className="text-xs bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#ff5a36]" />
        <button onClick={() => onSchedule(`${when}:00`)} data-testid={`calendar-unscheduled-schedule-${booking.id}`}
          className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase bg-[#ff5a36] text-white px-3 py-1.5 rounded-full hover:opacity-90">
          <CheckCircle2 size={11} /> In Kalender
        </button>
      </div>
    </div>
  );
}

/* ---------------- Modal (mobile-optimized bottom sheet) ---------------- */
function AppointmentModal({ mode, initial, students, onClose, onSaved }) {
  const [form, setForm] = useState({
    customer_name: initial.customer_name || "",
    student_id: initial.student_id || "",
    start_datetime: (initial.start_datetime || "").slice(0, 16),
    duration_min: initial.duration_min || 60,
    pickup_location: initial.pickup_location || "",
    notes: initial.notes || "",
    phone: initial.phone || "",
    email: initial.email || "",
    status: initial.status || "confirmed",
    entry_type: initial.entry_type || "appointment",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isBlock = form.entry_type === "block";

  const save = async () => {
    if (!isBlock && !form.customer_name.trim()) {
      toast.error("Kunde muss ausgefüllt sein");
      return;
    }
    if (isBlock && !form.customer_name.trim()) {
      // Blockzeit: Standardtitel setzen
      form.customer_name = "Blockzeit";
    }
    if (!form.start_datetime) {
      toast.error("Datum & Zeit fehlen");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        student_id: form.student_id || null,
        start_datetime: `${form.start_datetime}:00`,
        duration_min: parseInt(form.duration_min, 10) || 60,
      };
      if (mode === "create") {
        await api.post("/appointments", payload);
        if (initial._from_booking_id) {
          try { await api.delete(`/bookings/${initial._from_booking_id}`); } catch { /* ignore */ }
        }
        toast.success(isBlock ? "Blockzeit gespeichert" : "Termin gespeichert");
      } else {
        await api.patch(`/appointments/${initial.id}`, payload);
        toast.success(isBlock ? "Blockzeit aktualisiert" : "Termin aktualisiert");
      }
      onSaved();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(isBlock ? "Blockzeit wirklich löschen?" : "Termin wirklich löschen?")) return;
    setDeleting(true);
    try {
      await api.delete(`/appointments/${initial.id}`);
      toast.success("Gelöscht");
      onSaved();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setDeleting(false);
    }
  };

  const pickStudent = (studentId) => {
    if (!studentId) {
      setForm((f) => ({ ...f, student_id: "" }));
      return;
    }
    const s = students.find((x) => x.id === studentId);
    if (!s) return;
    setForm((f) => ({
      ...f,
      student_id: s.id,
      customer_name: `${s.first_name} ${s.last_name}`.trim(),
      phone: s.phone || f.phone,
      email: s.email || f.email,
    }));
  };

  return (
    <div
      onClick={onClose}
      data-testid="appointment-modal"
      className="fixed inset-0 z-50 bg-[#0f172a]/60 flex items-end sm:items-center justify-center sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-lg overflow-hidden shadow-2xl flex flex-col rounded-t-2xl sm:rounded-2xl max-h-[95vh] sm:max-h-[90vh]"
      >
        {/* Sticky header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e7e5e4] shrink-0">
          <div className="flex items-center gap-2 font-display text-xl tracking-tight">
            {isBlock && <Ban size={18} className="text-[#334155]" />}
            {mode === "create"
              ? (isBlock ? "Neue Blockzeit" : "Neuer Termin")
              : (isBlock ? "Blockzeit bearbeiten" : "Termin bearbeiten")}
          </div>
          <button
            onClick={onClose}
            data-testid="appointment-modal-close"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f5f5f4]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Type toggle (create only) */}
        {mode === "create" && (
          <div className="px-5 pt-4 shrink-0">
            <div className="inline-flex bg-[#fafaf9] border border-[#e7e5e4] rounded-full p-1 text-[10px] font-semibold tracking-widest uppercase">
              <button
                type="button"
                onClick={() => setForm({ ...form, entry_type: "appointment" })}
                data-testid="appointment-type-appointment"
                className={`px-3 py-1.5 rounded-full transition-colors ${
                  !isBlock ? "bg-[#ff5a36] text-white" : "text-[#475569]"
                }`}
              >
                Termin
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, entry_type: "block" })}
                data-testid="appointment-type-block"
                className={`px-3 py-1.5 rounded-full transition-colors ${
                  isBlock ? "bg-[#0f172a] text-white" : "text-[#475569]"
                }`}
              >
                <Ban size={10} className="inline mr-1 -mt-0.5" />
                Blockzeit
              </button>
            </div>
          </div>
        )}

        {/* Scrollable body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
          {isBlock ? (
            <Field label="Titel">
              <input
                type="text"
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                placeholder="z. B. „Zahnarzt-Termin"
                data-testid="appointment-block-title"
                autoFocus
                className="w-full text-base sm:text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
              />
            </Field>
          ) : (
            <StudentPicker
              students={students}
              value={form.student_id}
              customName={form.customer_name}
              onPick={pickStudent}
              onCustomName={(v) => setForm({ ...form, customer_name: v, student_id: "" })}
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Datum & Zeit">
              <input
                type="datetime-local"
                value={form.start_datetime}
                onChange={(e) => setForm({ ...form, start_datetime: e.target.value })}
                data-testid="appointment-start"
                className="w-full text-base sm:text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
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
                className="w-full text-base sm:text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
              />
            </Field>
          </div>
          {!isBlock && (
            <Field label="Abholort">
              <input
                type="text"
                value={form.pickup_location}
                onChange={(e) => setForm({ ...form, pickup_location: e.target.value })}
                placeholder="z. B. Bahnhof Hinwil"
                data-testid="appointment-pickup"
                className="w-full text-base sm:text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
              />
            </Field>
          )}
          <Field label="Bemerkungen">
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optionale Notizen"
              data-testid="appointment-notes"
              className="w-full text-base sm:text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36] resize-none"
            />
          </Field>
          {!isBlock && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Telefon">
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  data-testid="appointment-phone"
                  className="w-full text-base sm:text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]" />
              </Field>
              <Field label="E-Mail">
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  data-testid="appointment-email"
                  className="w-full text-base sm:text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]" />
              </Field>
            </div>
          )}
          {mode === "edit" && (
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                data-testid="appointment-status"
                className="w-full text-base sm:text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]">
                <option value="confirmed">Bestätigt</option>
                <option value="pending">Offen</option>
                <option value="cancelled">Storniert</option>
              </select>
            </Field>
          )}
        </div>

        {/* Sticky footer */}
        <div className="px-5 py-4 border-t border-[#e7e5e4] flex items-center gap-2 justify-between shrink-0 bg-white">
          {mode === "edit" ? (
            <button onClick={remove} disabled={deleting} data-testid="appointment-delete"
              className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-[#dc2626] hover:bg-[#fee2e2] px-3 py-2 rounded-full">
              {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Löschen
            </button>
          ) : <div />}
          <div className="flex items-center gap-2">
            <button onClick={onClose}
              className="text-xs font-semibold tracking-widest uppercase text-[#475569] px-3 py-2 hover:text-[#0f172a]">
              Abbrechen
            </button>
            <button onClick={save} disabled={saving} data-testid="appointment-save"
              className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-[#ff5a36] text-white px-5 py-2 rounded-full hover:opacity-90 disabled:opacity-50">
              {saving ? <Loader2 size={12} className="animate-spin" /> : null}
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Student picker (search + custom name fallback) ---------------- */
function StudentPicker({ students, value, customName, onPick, onCustomName }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const term = (q || "").toLowerCase().trim();
    if (!term) return students.slice(0, 20);
    return students
      .filter((s) => (`${s.first_name} ${s.last_name} ${s.email || ""} ${s.phone || ""}`).toLowerCase().includes(term))
      .slice(0, 20);
  }, [q, students]);

  const selected = students.find((s) => s.id === value);

  if (selected) {
    return (
      <Field label="Kunde – aus Datenbank">
        <div className="flex items-center gap-2 bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg px-3 py-2">
          <User size={14} className="text-[#166534]" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-[#166534] truncate">
              {selected.first_name} {selected.last_name}
            </div>
            <div className="text-[10px] text-[#166534] opacity-80 truncate">
              {[selected.email, selected.phone].filter(Boolean).join(" · ")}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onPick("")}
            data-testid="student-picker-clear"
            className="text-[10px] font-semibold tracking-widest uppercase text-[#166534] hover:text-[#0f172a] px-2 py-1"
          >
            Andere
          </button>
        </div>
      </Field>
    );
  }

  return (
    <div ref={wrapRef}>
      <Field label="Kunde">
        <div className="relative">
          <input
            type="text"
            value={q || customName || ""}
            onChange={(e) => {
              setQ(e.target.value);
              onCustomName(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Schüler suchen oder Name eintippen"
            data-testid="appointment-customer"
            autoFocus
            className="w-full text-base sm:text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-[#ff5a36]"
          />
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
        </div>
      </Field>
      {open && filtered.length > 0 && (
        <div
          data-testid="student-picker-list"
          className="mt-1 max-h-60 overflow-y-auto bg-white border border-[#e2e8f0] rounded-lg shadow-lg"
        >
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onPick(s.id);
                setQ("");
                setOpen(false);
              }}
              data-testid={`student-picker-item-${s.id}`}
              className="w-full text-left px-3 py-2 hover:bg-[#fef2f2] border-b border-[#f3f0eb] last:border-b-0 flex items-center gap-2"
            >
              <User size={13} className="text-[#475569] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[#0f172a] truncate">
                  {s.first_name} {s.last_name}
                </div>
                <div className="text-[11px] text-[#78716c] truncate">
                  {[s.email, s.phone, s.city].filter(Boolean).join(" · ")}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      {open && q && filtered.length === 0 && (
        <div className="mt-1 px-3 py-2 text-xs text-[#78716c] bg-white border border-dashed border-[#e2e8f0] rounded-lg">
          Kein Schüler gefunden — der eingegebene Name wird als Ein-Weg-Termin gespeichert.
        </div>
      )}
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

/* ---------------- iCal modal (subscribe + import external feeds) ---------------- */
function IcalModal({ settings, onClose, onRegenerate, onReload }) {
  const token = settings?.calendar_token || "";
  const backendBase = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
  const url = token ? `${backendBase}/api/calendar/${token}.ics` : "";
  const webcalUrl = url.replace(/^https?:/, "webcal:");
  const [externalUrls, setExternalUrls] = useState([]);
  const [newExt, setNewExt] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("subscribe");                 // 'subscribe' | 'import'

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Kopiert");
    } catch { toast.error("Kopieren fehlgeschlagen"); }
  };

  const loadFeeds = async () => {
    try {
      const r = await api.get("/calendar/external-feeds");
      setExternalUrls(r.data.urls || []);
    } catch (e) { toast.error(formatApiError(e)); }
  };
  useEffect(() => { loadFeeds(); }, []);

  const addFeed = async () => {
    const u = newExt.trim();
    if (!u) return;
    setBusy(true);
    try {
      const r = await api.post("/calendar/external-feeds", { url: u });
      setExternalUrls(r.data.urls || []);
      setNewExt("");
      toast.success(`Feed hinzugefügt (${r.data.events_found || 0} Termine gefunden)`);
      onReload?.();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setBusy(false); }
  };

  const removeFeed = async (index) => {
    if (!window.confirm("Feed entfernen?")) return;
    try {
      const r = await api.delete(`/calendar/external-feeds/${index}`);
      setExternalUrls(r.data.urls || []);
      toast.success("Feed entfernt");
      onReload?.();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div onClick={onClose} data-testid="ical-modal"
      className="fixed inset-0 z-50 bg-[#0f172a]/60 flex items-end sm:items-center justify-center sm:p-4">
      <div onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-xl overflow-hidden shadow-2xl flex flex-col rounded-t-2xl sm:rounded-2xl max-h-[95vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e7e5e4] shrink-0">
          <div className="font-display text-xl tracking-tight">Kalender-Sync</div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f5f5f4]">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 pt-4 shrink-0">
          <div className="inline-flex bg-[#fafaf9] border border-[#e7e5e4] rounded-full p-1 text-[10px] font-semibold tracking-widest uppercase">
            <button type="button" data-testid="ical-tab-subscribe"
              onClick={() => setTab("subscribe")}
              className={`px-3 py-1.5 rounded-full transition-colors ${tab === "subscribe" ? "bg-[#0f172a] text-white" : "text-[#475569]"}`}>
              <LinkIcon size={10} className="inline mr-1 -mt-0.5" />
              Meinen Kalender teilen
            </button>
            <button type="button" data-testid="ical-tab-import"
              onClick={() => setTab("import")}
              className={`px-3 py-1.5 rounded-full transition-colors ${tab === "import" ? "bg-[#0f172a] text-white" : "text-[#475569]"}`}>
              <Download size={10} className="inline mr-1 -mt-0.5" />
              Externen Kalender importieren
            </button>
          </div>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {tab === "subscribe" ? (
            <>
              <div className="text-sm text-[#475569] leading-relaxed">
                Abonniere diese Adresse in Apple Kalender (iPhone / Mac) oder Google Kalender, um
                deine Fahrschul-Termine automatisch synchron zu halten.
              </div>
              <div>
                <label className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] block mb-1">
                  Kalender-URL
                </label>
                <div className="flex items-center gap-2">
                  <input readOnly value={url} data-testid="ical-url"
                    className="flex-1 text-xs bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 font-mono" />
                  <button onClick={() => copy(url)} data-testid="ical-copy"
                    className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase bg-[#0f172a] text-white px-3 py-2 rounded-full hover:opacity-90">
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
                  Alternativ: <a href={webcalUrl} className="underline font-semibold">mit einem Tap abonnieren</a> (öffnet die Apple-Kalender-App).
                </div>
              </div>
              <div className="border-t border-[#e7e5e4] pt-3 flex items-center gap-2">
                <button onClick={onRegenerate} data-testid="ical-regenerate"
                  className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase text-[#dc2626] hover:bg-[#fee2e2] px-3 py-2 rounded-full">
                  <RefreshCw size={11} /> Token neu generieren
                </button>
                <span className="text-[10px] text-[#94a3b8]">Alte Abos werden dann ungültig.</span>
              </div>
            </>
          ) : (
            <>
              <div className="text-sm text-[#475569] leading-relaxed">
                Kopiere die iCal-Abo-URL aus deinem privaten Kalender hier rein.
                Termine daraus werden als <span className="font-semibold text-[#334155]">gestreifte, graue Blöcke</span> im
                Kalender angezeigt und blockieren Doppelbuchungen — sowohl im Admin-Kalender
                als auch im öffentlichen Buchungs-Widget. Import läuft alle 5 Minuten.
              </div>
              <div>
                <label className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] block mb-1">
                  Neue iCal-URL hinzufügen
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={newExt}
                    onChange={(e) => setNewExt(e.target.value)}
                    placeholder="https://… .ics  oder  webcal://…"
                    data-testid="ical-external-input"
                    className="flex-1 text-xs bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 font-mono"
                  />
                  <button onClick={addFeed} disabled={busy || !newExt.trim()}
                    data-testid="ical-external-add"
                    className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase bg-[#ff5a36] text-white px-3 py-2 rounded-full hover:opacity-90 disabled:opacity-50">
                    {busy ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                    Hinzufügen
                  </button>
                </div>
              </div>
              <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-xl p-4 text-xs text-[#1e3a8a] leading-relaxed">
                <div className="font-semibold text-[#1d4ed8] mb-1">iCloud-Kalender-URL exportieren (iPhone)</div>
                <ol className="list-decimal pl-4 space-y-0.5">
                  <li>iCloud.com → Kalender öffnen (auf einem Computer)</li>
                  <li>Kalender-Info-Symbol antippen → &laquo;Öffentlicher Kalender&raquo; aktivieren</li>
                  <li>URL kopieren und hier einfügen (beginnt mit <span className="font-mono">webcal://</span>)</li>
                </ol>
              </div>
              {externalUrls.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] mb-2">
                    Aktive Feeds ({externalUrls.length})
                  </div>
                  <ul className="space-y-2" data-testid="ical-external-list">
                    {externalUrls.map((u, i) => (
                      <li key={i} className="bg-[#fafaf9] border border-[#e7e5e4] rounded-lg p-2 flex items-center gap-2">
                        <div className="flex-1 min-w-0 font-mono text-[11px] text-[#475569] truncate">{u}</div>
                        <button onClick={() => removeFeed(i)}
                          data-testid={`ical-external-remove-${i}`}
                          className="w-7 h-7 flex items-center justify-center rounded-full text-[#a8a29e] hover:text-[#dc2626] hover:bg-[#fee2e2]">
                          <Trash2 size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
