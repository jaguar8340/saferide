/**
 * BookingWizard — 6-Schritt-Assistent für die Online-Terminbuchung.
 *
 * Datum → Fahrzeug → Dauer → Abholort → Slot → Kontakt → Bestätigung
 *
 * Die Komponente ist vollständig eigenständig; Backend-Endpunkte:
 *   GET  /api/booking/public/vehicles
 *   GET  /api/booking/public/pickup-locations
 *   GET  /api/booking/public/slots?date=…&duration_min=…&pickup_id=…
 *   POST /api/booking/public/request
 */
import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Calendar as CalendarIcon,
  Car,
  MapPin,
  Clock,
  User as UserIcon,
  ChevronLeft,
  Check,
  Mail,
  Phone,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";

const STEPS = ["date", "vehicle", "duration", "pickup", "slot", "contact"];

const STEP_LABEL = {
  date:     { icon: CalendarIcon, label_de: "Datum" },
  vehicle:  { icon: Car,          label_de: "Fahrzeug" },
  duration: { icon: Clock,        label_de: "Dauer" },
  pickup:   { icon: MapPin,       label_de: "Abholort" },
  slot:     { icon: Clock,        label_de: "Uhrzeit" },
  contact:  { icon: UserIcon,     label_de: "Kontakt" },
};

function todayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function formatDateHuman(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("de-CH", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function BookingWizard() {
  const [step, setStep] = useState(0);
  const [vehicles, setVehicles] = useState(null);
  const [locations, setLocations] = useState(null);
  const [state, setState] = useState({
    date: todayISO(),
    vehicle_id: "",
    duration_min: 0,
    pickup_id: "",
    time: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [slots, setSlots] = useState(null); // null=loading, []=none, [...]=slots
  const [slotsMeta, setSlotsMeta] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get("/booking/public/vehicles"),
      api.get("/booking/public/pickup-locations"),
    ])
      .then(([v, l]) => {
        setVehicles(v.data || []);
        setLocations(l.data || []);
      })
      .catch((e) => {
        toast.error(formatApiError(e));
        setVehicles([]);
        setLocations([]);
      });
  }, []);

  const selectedVehicle = useMemo(
    () => (vehicles || []).find((v) => v.id === state.vehicle_id) || null,
    [vehicles, state.vehicle_id],
  );
  const selectedPickup = useMemo(
    () => (locations || []).find((l) => l.id === state.pickup_id) || null,
    [locations, state.pickup_id],
  );

  // Fetch slots whenever we reach the slot step
  useEffect(() => {
    if (STEPS[step] !== "slot") return;
    if (!state.date || !state.duration_min) return;
    setSlots(null);
    api.get("/booking/public/slots", {
      params: {
        date: state.date,
        duration_min: state.duration_min,
        pickup_id: state.pickup_id || undefined,
        vehicle_id: state.vehicle_id || undefined,
      },
    }).then((r) => {
      setSlots(r.data?.slots || []);
      setSlotsMeta({
        opening: r.data?.opening || "",
        reason: r.data?.reason || "",
        blocked_label: r.data?.blocked_label || "",
      });
    }).catch((e) => {
      toast.error(formatApiError(e));
      setSlots([]);
    });
  }, [step, state.date, state.duration_min, state.pickup_id, state.vehicle_id]);

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const canProceed = () => {
    switch (STEPS[step]) {
      case "date":     return !!state.date && state.date >= todayISO();
      case "vehicle":  return !!state.vehicle_id;
      case "duration": return !!state.duration_min;
      case "pickup":   return !!state.pickup_id;
      case "slot":     return !!state.time;
      case "contact":  return state.first_name && state.last_name && state.email && state.phone;
      default: return false;
    }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.post("/booking/public/request", {
        first_name: state.first_name.trim(),
        last_name: state.last_name.trim(),
        email: state.email.trim(),
        phone: state.phone.trim(),
        date: state.date,
        time: state.time,
        duration_min: state.duration_min,
        vehicle_id: state.vehicle_id,
        pickup_id: state.pickup_id,
        notes: state.notes.trim(),
      });
      setSuccess({
        date: state.date,
        time: state.time,
        vehicle: selectedVehicle?.name,
        pickup: selectedPickup?.name,
        duration: state.duration_min,
      });
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div
        data-testid="booking-wizard-success"
        className="max-w-2xl mx-auto text-center py-12 px-6 bg-white border border-[#e7e5e4] rounded-3xl"
      >
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#dcfce7] text-[#16a34a] flex items-center justify-center">
          <Check size={28} strokeWidth={2.5} />
        </div>
        <h3 className="font-display text-3xl md:text-4xl leading-tight tracking-tight mb-3">
          Anfrage eingegangen!
        </h3>
        <p className="text-[#475569] leading-relaxed max-w-md mx-auto">
          Ich habe deine Terminanfrage erhalten und melde mich innerhalb von 24 Stunden
          per E-Mail mit der Bestätigung.
        </p>
        <div className="mt-8 inline-flex flex-col text-left gap-2 text-sm text-[#475569] bg-[#fbf9f6] rounded-2xl border border-[#e7e5e4] px-6 py-4">
          <Row label="Datum">{formatDateHuman(success.date)}</Row>
          <Row label="Uhrzeit">{success.time} Uhr</Row>
          <Row label="Dauer">{success.duration} Min</Row>
          <Row label="Fahrzeug">{success.vehicle}</Row>
          <Row label="Abholort">{success.pickup}</Row>
        </div>
      </div>
    );
  }

  if (vehicles === null || locations === null) {
    return (
      <div className="py-16 flex items-center justify-center text-[#78716c]">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  return (
    <div
      data-testid="booking-wizard"
      className="max-w-3xl mx-auto bg-white border border-[#e7e5e4] rounded-3xl overflow-hidden shadow-[0_20px_60px_-30px_rgba(15,23,42,0.15)]"
    >
      {/* Progress */}
      <div className="bg-[#0f172a] text-white px-6 md:px-8 py-4 flex items-center gap-2 overflow-x-auto">
        {STEPS.map((s, i) => {
          const meta = STEP_LABEL[s];
          const Icon = meta.icon;
          const done = i < step;
          const active = i === step;
          return (
            <div
              key={s}
              data-testid={`wizard-step-indicator-${s}`}
              className={`flex items-center gap-2 shrink-0 ${i > 0 ? "ml-1" : ""}`}
            >
              {i > 0 && (
                <div className={`w-4 md:w-6 h-px ${done ? "bg-[#ff5a36]" : "bg-white/20"}`} />
              )}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                  done ? "bg-[#ff5a36] text-white"
                       : active ? "bg-white text-[#0f172a]"
                                : "bg-white/10 text-white/60"
                }`}
              >
                {done ? <Check size={13} strokeWidth={3} /> : <Icon size={13} />}
              </div>
              <span
                className={`hidden md:inline text-[10px] font-semibold tracking-widest uppercase ${
                  active ? "text-white" : "text-white/60"
                }`}
              >
                {meta.label_de}
              </span>
            </div>
          );
        })}
      </div>

      {/* Body */}
      <div className="p-6 md:p-10">
        {STEPS[step] === "date" && (
          <StepDate value={state.date} onChange={(v) => setState((s) => ({ ...s, date: v }))} />
        )}
        {STEPS[step] === "vehicle" && (
          <StepVehicle
            vehicles={vehicles}
            value={state.vehicle_id}
            onChange={(id) => setState((s) => ({
              ...s,
              vehicle_id: id,
              duration_min: 0,   // reset if vehicle changes
            }))}
          />
        )}
        {STEPS[step] === "duration" && (
          <StepDuration
            vehicle={selectedVehicle}
            value={state.duration_min}
            onChange={(d) => setState((s) => ({ ...s, duration_min: d }))}
          />
        )}
        {STEPS[step] === "pickup" && (
          <StepPickup
            locations={locations}
            value={state.pickup_id}
            onChange={(id) => setState((s) => ({ ...s, pickup_id: id }))}
          />
        )}
        {STEPS[step] === "slot" && (
          <StepSlot
            slots={slots}
            meta={slotsMeta}
            value={state.time}
            onChange={(t) => setState((s) => ({ ...s, time: t }))}
            date={state.date}
          />
        )}
        {STEPS[step] === "contact" && (
          <StepContact
            state={state}
            onChange={(patch) => setState((s) => ({ ...s, ...patch }))}
            summary={{
              date: state.date,
              time: state.time,
              vehicle: selectedVehicle,
              pickup: selectedPickup,
              duration: state.duration_min,
            }}
          />
        )}
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between border-t border-[#e7e5e4] px-6 md:px-10 py-4 gap-3 bg-[#fbf9f6]">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 0}
          data-testid="wizard-back"
          className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-full text-[#475569] hover:text-[#0f172a] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={14} /> Zurück
        </button>
        {step === STEPS.length - 1 ? (
          <button
            type="button"
            onClick={submit}
            disabled={!canProceed() || submitting}
            data-testid="wizard-submit"
            className={`inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase px-5 py-2.5 rounded-full transition-colors ${
              canProceed() && !submitting
                ? "bg-[#ff5a36] text-white hover:bg-[#e94418]"
                : "bg-[#e7e5e4] text-[#a8a29e] cursor-not-allowed"
            }`}
          >
            {submitting ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            Termin anfragen
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            disabled={!canProceed()}
            data-testid="wizard-next"
            className={`inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase px-5 py-2.5 rounded-full transition-colors ${
              canProceed()
                ? "bg-[#0f172a] text-white hover:opacity-90"
                : "bg-[#e7e5e4] text-[#a8a29e] cursor-not-allowed"
            }`}
          >
            Weiter <Check size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Step 1 – Date                                                              */
/* -------------------------------------------------------------------------- */
function StepDate({ value, onChange }) {
  const min = todayISO();
  return (
    <div>
      <StepHeader
        overline="Schritt 1 von 6"
        title="Wann willst du fahren?"
        subtitle="Wähle dein Wunschdatum. Die verfügbaren Zeiten passen wir automatisch an."
      />
      <input
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        data-testid="wizard-date-input"
        className="w-full text-lg bg-[#fbf9f6] border-2 border-[#e2e8f0] rounded-2xl px-5 py-4 focus:outline-none focus:border-[#ff5a36] font-semibold tabular-nums"
      />
      {value && (
        <p className="mt-3 text-sm text-[#475569] capitalize">{formatDateHuman(value)}</p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Step 2 – Vehicle                                                           */
/* -------------------------------------------------------------------------- */
function StepVehicle({ vehicles, value, onChange }) {
  return (
    <div>
      <StepHeader
        overline="Schritt 2 von 6"
        title="Welches Fahrzeug?"
        subtitle="Alle unsere Fahrzeuge sind eingetragen und startklar."
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {vehicles.map((v) => {
          const active = v.id === value;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onChange(v.id)}
              data-testid={`wizard-vehicle-${v.id}`}
              className={`text-left border-2 rounded-2xl p-5 transition-all ${
                active
                  ? "border-[#ff5a36] bg-[#fff7f4] shadow-[0_10px_30px_-15px_rgba(255,90,54,0.4)]"
                  : "border-[#e2e8f0] hover:border-[#0f172a]"
              }`}
            >
              <div className="text-[10px] font-semibold tracking-widest uppercase text-[#78716c] mb-1">
                Kat. {v.category}
              </div>
              <div className="font-display text-xl leading-tight">{v.name}</div>
              <div className="mt-1 text-xs text-[#475569]">{v.transmission}</div>
            </button>
          );
        })}
      </div>
      {vehicles.length === 0 && (
        <p className="text-sm text-[#78716c] italic">Aktuell sind keine Fahrzeuge verfügbar.</p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Step 3 – Duration                                                          */
/* -------------------------------------------------------------------------- */
function StepDuration({ vehicle, value, onChange }) {
  const durations = vehicle?.allowed_durations || [45, 90, 135];
  return (
    <div>
      <StepHeader
        overline="Schritt 3 von 6"
        title="Wie lange möchtest du fahren?"
        subtitle="45 Min für eine Kurzlektion, 90 Min für eine Doppellektion. 135 Min für intensive Trainings."
      />
      <div className="grid grid-cols-3 gap-3">
        {durations.map((d) => {
          const active = d === value;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onChange(d)}
              data-testid={`wizard-duration-${d}`}
              className={`text-center border-2 rounded-2xl px-4 py-6 transition-all ${
                active
                  ? "border-[#ff5a36] bg-[#fff7f4]"
                  : "border-[#e2e8f0] hover:border-[#0f172a]"
              }`}
            >
              <div className="font-display text-3xl md:text-4xl tabular-nums">{d}</div>
              <div className="text-[10px] font-semibold tracking-widest uppercase text-[#78716c] mt-1">
                Minuten
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Step 4 – Pickup                                                            */
/* -------------------------------------------------------------------------- */
function StepPickup({ locations, value, onChange }) {
  return (
    <div>
      <StepHeader
        overline="Schritt 4 von 6"
        title="Wo hole ich dich ab?"
        subtitle="Ich hole dich am ausgewählten Ort direkt ab – meist am Bahnhof."
      />
      <div className="space-y-2">
        {locations.map((l) => {
          const active = l.id === value;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => onChange(l.id)}
              data-testid={`wizard-pickup-${l.id}`}
              className={`w-full flex items-center gap-4 text-left border-2 rounded-2xl px-5 py-4 transition-all ${
                active
                  ? "border-[#ff5a36] bg-[#fff7f4]"
                  : "border-[#e2e8f0] hover:border-[#0f172a]"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  active ? "bg-[#ff5a36] text-white" : "bg-[#f1f5f9] text-[#475569]"
                }`}
              >
                <MapPin size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[#0f172a]">{l.name}</div>
                {l.address && (
                  <div className="text-xs text-[#78716c] truncate">{l.address}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Step 5 – Slot                                                              */
/* -------------------------------------------------------------------------- */
function StepSlot({ slots, meta, value, onChange, date }) {
  return (
    <div>
      <StepHeader
        overline="Schritt 5 von 6"
        title="Wähle deine Uhrzeit"
        subtitle={
          meta.opening
            ? `Öffnungszeit: ${meta.opening}. Angezeigt sind nur die verfügbaren Slots.`
            : "Ich lade die verfügbaren Zeiten…"
        }
      />
      {slots === null ? (
        <div className="py-8 flex items-center justify-center text-[#78716c]">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : slots.length === 0 ? (
        <div
          data-testid="wizard-no-slots"
          className="bg-[#fff7f4] border-2 border-dashed border-[#fecaca] rounded-2xl p-6 text-center"
        >
          <p className="text-sm font-semibold text-[#7f1d1d] mb-1">
            Keine freien Termine am {formatDateHuman(date)}.
          </p>
          <p className="text-xs text-[#78716c]">
            {meta.reason === "blocked_date"
              ? `Dieser Tag ist gesperrt${meta.blocked_label ? ` (${meta.blocked_label})` : ""}. Bitte wähle einen anderen Tag.`
              : meta.reason === "closed_day"
              ? "Ich habe an diesem Tag geschlossen. Probier bitte einen anderen Tag."
              : "Bitte wähle einen anderen Tag oder eine andere Lektionsdauer."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
          {slots.map((t) => {
            const active = t === value;
            return (
              <button
                key={t}
                type="button"
                onClick={() => onChange(t)}
                data-testid={`wizard-slot-${t}`}
                className={`text-center border-2 rounded-xl py-3 font-semibold tabular-nums transition-all ${
                  active
                    ? "border-[#ff5a36] bg-[#ff5a36] text-white"
                    : "border-[#e2e8f0] hover:border-[#0f172a] text-[#0f172a]"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Step 6 – Contact                                                           */
/* -------------------------------------------------------------------------- */
function StepContact({ state, onChange, summary }) {
  return (
    <div>
      <StepHeader
        overline="Schritt 6 von 6"
        title="Deine Kontaktdaten"
        subtitle="Ich schicke dir die Bestätigung per E-Mail und melde mich bei Fragen."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <Input label="Vorname" value={state.first_name} onChange={(v) => onChange({ first_name: v })} testid="wizard-firstname" />
        <Input label="Nachname" value={state.last_name} onChange={(v) => onChange({ last_name: v })} testid="wizard-lastname" />
        <Input label="E-Mail" type="email" value={state.email} onChange={(v) => onChange({ email: v })} icon={Mail} testid="wizard-email" />
        <Input label="Telefon" type="tel" value={state.phone} onChange={(v) => onChange({ phone: v })} icon={Phone} testid="wizard-phone" />
      </div>
      <div>
        <label className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] block mb-1">
          Notiz (optional)
        </label>
        <div className="flex gap-2 items-start bg-[#fbf9f6] border border-[#e2e8f0] rounded-xl px-3 py-2 focus-within:border-[#ff5a36]">
          <MessageSquare size={14} className="text-[#78716c] mt-2 shrink-0" />
          <textarea
            value={state.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            rows={3}
            data-testid="wizard-notes"
            placeholder="Vorkenntnisse, spezielle Wünsche, Referenzcode …"
            className="flex-1 bg-transparent focus:outline-none text-sm resize-y"
          />
        </div>
      </div>
      <div className="mt-6 bg-[#fbf9f6] border border-[#e7e5e4] rounded-2xl p-5">
        <div className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] mb-3">
          Zusammenfassung
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <Row label="Datum">{formatDateHuman(summary.date)}</Row>
          <Row label="Uhrzeit">{summary.time} Uhr · {summary.duration} Min</Row>
          <Row label="Fahrzeug">{summary.vehicle?.name} ({summary.vehicle?.transmission})</Row>
          <Row label="Abholort">{summary.pickup?.name}</Row>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Building blocks                                                            */
/* -------------------------------------------------------------------------- */
function StepHeader({ overline, title, subtitle }) {
  return (
    <div className="mb-6">
      <div className="text-[10px] font-semibold tracking-widest uppercase text-[#ff5a36] mb-2">
        {overline}
      </div>
      <h3 className="font-display text-2xl md:text-3xl leading-tight tracking-tight text-[#0f172a] mb-2">
        {title}
      </h3>
      {subtitle && <p className="text-sm text-[#475569] leading-relaxed max-w-lg">{subtitle}</p>}
    </div>
  );
}
function Input({ label, value, onChange, type = "text", icon: Icon, testid }) {
  return (
    <div>
      <label className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] block mb-1">
        {label}
      </label>
      <div className="flex gap-2 items-center bg-[#fbf9f6] border border-[#e2e8f0] rounded-xl px-3 py-2 focus-within:border-[#ff5a36]">
        {Icon && <Icon size={14} className="text-[#78716c] shrink-0" />}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          data-testid={testid}
          className="flex-1 bg-transparent focus:outline-none text-sm"
        />
      </div>
    </div>
  );
}
function Row({ label, children }) {
  return (
    <div className="flex items-baseline gap-2 min-w-0">
      <span className="text-[10px] font-semibold tracking-widest uppercase text-[#78716c] shrink-0">
        {label}:
      </span>
      <span className="text-[#0f172a] font-medium truncate">{children}</span>
    </div>
  );
}
