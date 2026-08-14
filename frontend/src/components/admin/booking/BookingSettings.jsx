/**
 * BookingSettings — Kalender-Einstellungs-Seite (Phase 1).
 *
 * Fasst 4 Bereiche zusammen, die für das kommende Online-Buchungs-Widget
 * benötigt werden. Alle Bereiche sind rein CRUD auf getrennten
 * DB-Kollektionen — keine bestehenden Daten werden angerührt.
 *
 *   1. Öffnungszeiten & Puffer      – Wochentage + Standard-Puffer
 *   2. Fahrzeuge                    – Audi Automat / Opel Handschaltung / Range Rover
 *   3. Abholorte + Reisezeit-Matrix – Bahnhöfe & manuelle Distanzen
 *   4. E-Mail-Vorlagen              – 4 fixe Kinds mit HTML-Body + Platzhaltern
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Save,
  Plus,
  Trash2,
  Clock3,
  Car,
  MapPin,
  Mail,
  ChevronDown,
  CalendarOff,
} from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import RichTextEditor from "@/components/admin/booking/RichTextEditor";

const DAY_NAMES = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

const PLACEHOLDER_TOKENS = [
  { token: "{name}",         desc: "Vorname des Schülers" },
  { token: "{datum}",        desc: "z. B. 14.08.2026" },
  { token: "{uhrzeit}",      desc: "z. B. 14:30" },
  { token: "{dauer}",        desc: "Lektionsdauer in Minuten" },
  { token: "{abholort}",     desc: "z. B. Pfäffikon SZ Bahnhof" },
  { token: "{fahrzeug}",     desc: "z. B. Audi S3 (Automat)" },
  { token: "{fahrlehrerin}", desc: "z. B. Nadine Stäubli" },
];

export default function BookingSettings({ onClose }) {
  const [openSection, setOpenSection] = useState("availability");
  return (
    <div className="space-y-3" data-testid="booking-settings">
      <header className="flex items-center justify-between mb-2">
        <div>
          <h2 className="font-display text-2xl md:text-3xl leading-tight">Kalender-Einstellungen</h2>
          <p className="text-xs text-[#78716c] mt-1">
            Öffnungszeiten, Fahrzeuge, Abholorte und E-Mail-Vorlagen für die Online-Buchung.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            data-testid="booking-settings-close"
            className="text-xs font-semibold tracking-widest uppercase text-[#78716c] hover:text-[#0f172a] px-3 py-2"
          >
            Zurück zum Kalender
          </button>
        )}
      </header>

      <Section
        id="availability"
        title="Öffnungszeiten & Puffer"
        icon={Clock3}
        open={openSection === "availability"}
        onToggle={() => setOpenSection(openSection === "availability" ? null : "availability")}
      >
        <AvailabilityEditor />
      </Section>

      <Section
        id="vehicles"
        title="Fahrzeuge"
        icon={Car}
        open={openSection === "vehicles"}
        onToggle={() => setOpenSection(openSection === "vehicles" ? null : "vehicles")}
      >
        <VehiclesEditor />
      </Section>

      <Section
        id="locations"
        title="Abholorte & Reisezeit-Matrix"
        icon={MapPin}
        open={openSection === "locations"}
        onToggle={() => setOpenSection(openSection === "locations" ? null : "locations")}
      >
        <LocationsEditor />
      </Section>

      <Section
        id="templates"
        title="E-Mail-Vorlagen"
        icon={Mail}
        open={openSection === "templates"}
        onToggle={() => setOpenSection(openSection === "templates" ? null : "templates")}
      >
        <EmailTemplatesEditor />
      </Section>

      <Section
        id="blocked-dates"
        title="Feiertage & Ferien"
        icon={CalendarOff}
        open={openSection === "blocked-dates"}
        onToggle={() => setOpenSection(openSection === "blocked-dates" ? null : "blocked-dates")}
      >
        <BlockedDatesEditor />
      </Section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section (collapsible card)                                                */
/* -------------------------------------------------------------------------- */
function Section({ id, title, icon: Icon, open, onToggle, children }) {
  return (
    <div
      data-testid={`booking-settings-section-${id}`}
      className="bg-white border border-[#e7e5e4] rounded-2xl overflow-hidden"
    >
      <button
        type="button"
        onClick={onToggle}
        data-testid={`booking-settings-toggle-${id}`}
        className={`w-full flex items-center justify-between gap-3 px-5 py-4 transition-colors ${
          open ? "bg-[#0f172a] text-white" : "bg-white text-[#0f172a] hover:bg-[#fafaf9]"
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon size={16} strokeWidth={2} />
          <span className="font-display text-lg">{title}</span>
        </div>
        <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  1) Öffnungszeiten                                                         */
/* -------------------------------------------------------------------------- */
function AvailabilityEditor() {
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get("/booking/availability");
        setData(r.data);
      } catch (e) {
        toast.error(formatApiError(e));
      }
    })();
  }, []);

  if (!data) return <Loading />;

  const updateWeekday = (i, field, value) => {
    setData((d) => {
      const wd = [...d.weekdays];
      wd[i] = { ...wd[i], [field]: value };
      return { ...d, weekdays: wd };
    });
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/booking/availability", {
        weekdays: data.weekdays,
        default_buffer_min: data.default_buffer_min,
      });
      toast.success("Öffnungszeiten gespeichert");
      setDirty(false);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2">
        {data.weekdays.map((w, i) => (
          <div
            key={w.weekday}
            data-testid={`availability-row-${w.weekday}`}
            className="grid grid-cols-[110px_60px_1fr_1fr] items-center gap-3 py-2"
          >
            <div className="text-sm font-semibold text-[#0f172a]">{DAY_NAMES[w.weekday]}</div>
            <label className="inline-flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={w.open}
                onChange={(e) => updateWeekday(i, "open", e.target.checked)}
                data-testid={`availability-open-${w.weekday}`}
                className="accent-[#ff5a36]"
              />
              <span className="text-[11px] text-[#475569]">{w.open ? "offen" : "zu"}</span>
            </label>
            <input
              type="time"
              value={w.start_time}
              onChange={(e) => updateWeekday(i, "start_time", e.target.value)}
              disabled={!w.open}
              data-testid={`availability-start-${w.weekday}`}
              className="text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-1.5 disabled:opacity-40 focus:outline-none focus:border-[#ff5a36]"
            />
            <input
              type="time"
              value={w.end_time}
              onChange={(e) => updateWeekday(i, "end_time", e.target.value)}
              disabled={!w.open}
              data-testid={`availability-end-${w.weekday}`}
              className="text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-1.5 disabled:opacity-40 focus:outline-none focus:border-[#ff5a36]"
            />
          </div>
        ))}
      </div>

      <div className="border-t border-[#f1f5f9] pt-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <label className="text-[10px] font-semibold tracking-widest uppercase text-[#475569]">
            Standard-Puffer nach jedem Termin
          </label>
          <input
            type="number"
            min="0"
            max="240"
            value={data.default_buffer_min}
            onChange={(e) => {
              setData((d) => ({ ...d, default_buffer_min: Number(e.target.value) || 0 }));
              setDirty(true);
            }}
            data-testid="availability-buffer"
            className="w-20 text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#ff5a36]"
          />
          <span className="text-xs text-[#78716c]">Minuten</span>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          data-testid="availability-save"
          className={`inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-full transition-colors ${
            dirty && !saving
              ? "bg-[#ff5a36] text-white hover:bg-[#e94418]"
              : "bg-[#e7e5e4] text-[#a8a29e] cursor-not-allowed"
          }`}
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          Speichern
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  2) Fahrzeuge                                                              */
/* -------------------------------------------------------------------------- */
const TRANSMISSION_OPTIONS = ["Automat", "Handschaltung", "Anhänger", "Motorrad", "LKW"];

function VehiclesEditor() {
  const [items, setItems] = useState(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    transmission: "Automat",
    category: "B",
    allowed_durations: "45,90,135",
  });

  const load = async () => {
    try {
      const r = await api.get("/booking/vehicles");
      setItems(r.data);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!draft.name.trim()) return toast.error("Name ist Pflicht");
    const durations = draft.allowed_durations
      .split(",").map((s) => parseInt(s.trim(), 10)).filter(Boolean);
    if (durations.length === 0) return toast.error("Mindestens eine Dauer angeben");
    setCreating(true);
    try {
      await api.post("/booking/vehicles", {
        name: draft.name.trim(),
        transmission: draft.transmission,
        category: draft.category,
        allowed_durations: durations,
      });
      toast.success("Fahrzeug hinzugefügt");
      setDraft({ name: "", transmission: "Automat", category: "B", allowed_durations: "45,90,135" });
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setCreating(false);
    }
  };

  const patch = async (id, field, value) => {
    try {
      await api.patch(`/booking/vehicles/${id}`, { [field]: value });
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const remove = async (id) => {
    if (!window.confirm("Fahrzeug wirklich löschen?")) return;
    try {
      await api.delete(`/booking/vehicles/${id}`);
      toast.success("Gelöscht");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  if (items === null) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="divide-y divide-[#f1f5f9]">
        {items.map((v) => (
          <div
            key={v.id}
            data-testid={`vehicle-row-${v.id}`}
            className="py-3 grid grid-cols-1 md:grid-cols-[1fr_140px_90px_150px_40px] gap-3 items-center"
          >
            <input
              defaultValue={v.name}
              onBlur={(e) => e.target.value !== v.name && patch(v.id, "name", e.target.value)}
              className="text-sm font-semibold bg-transparent focus:outline-none focus:border-b focus:border-[#ff5a36]"
              data-testid={`vehicle-name-${v.id}`}
            />
            <select
              defaultValue={v.transmission}
              onChange={(e) => patch(v.id, "transmission", e.target.value)}
              className="text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-2 py-1.5 focus:outline-none"
              data-testid={`vehicle-transmission-${v.id}`}
            >
              {TRANSMISSION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              {!TRANSMISSION_OPTIONS.includes(v.transmission) && (
                <option value={v.transmission}>{v.transmission}</option>
              )}
            </select>
            <input
              defaultValue={v.category}
              onBlur={(e) => e.target.value !== v.category && patch(v.id, "category", e.target.value)}
              className="text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-2 py-1.5 focus:outline-none text-center"
              data-testid={`vehicle-category-${v.id}`}
            />
            <input
              defaultValue={(v.allowed_durations || []).join(", ")}
              onBlur={(e) => {
                const arr = e.target.value.split(",").map((s) => parseInt(s.trim(), 10)).filter(Boolean);
                if (JSON.stringify(arr) !== JSON.stringify(v.allowed_durations)) {
                  patch(v.id, "allowed_durations", arr);
                }
              }}
              className="text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-2 py-1.5 focus:outline-none tabular-nums"
              placeholder="45, 90, 135"
              data-testid={`vehicle-durations-${v.id}`}
            />
            <button
              type="button"
              onClick={() => remove(v.id)}
              data-testid={`vehicle-delete-${v.id}`}
              className="w-8 h-8 flex items-center justify-center rounded-full text-[#a8a29e] hover:text-[#dc2626] hover:bg-[#fee2e2]"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-[#fafaf9] border border-dashed border-[#e7e5e4] rounded-2xl p-4">
        <div className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] mb-2">
          Neues Fahrzeug
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_90px_150px_120px] gap-2">
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="z. B. Audi S3"
            className="text-sm bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
            data-testid="vehicle-new-name"
          />
          <select
            value={draft.transmission}
            onChange={(e) => setDraft({ ...draft, transmission: e.target.value })}
            className="text-sm bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none"
            data-testid="vehicle-new-transmission"
          >
            {TRANSMISSION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <input
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            placeholder="B"
            className="text-sm bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none text-center"
            data-testid="vehicle-new-category"
          />
          <input
            value={draft.allowed_durations}
            onChange={(e) => setDraft({ ...draft, allowed_durations: e.target.value })}
            placeholder="45, 90, 135"
            className="text-sm bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none tabular-nums"
            data-testid="vehicle-new-durations"
          />
          <button
            type="button"
            onClick={create}
            disabled={creating}
            data-testid="vehicle-create"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-[#0f172a] text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Hinzufügen
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  3) Abholorte + Reisezeit-Matrix                                            */
/* -------------------------------------------------------------------------- */
function LocationsEditor() {
  const [locs, setLocs] = useState(null);
  const [distances, setDistances] = useState({});  // key = "a|b" (sorted) → travel_min
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", address: "" });

  const pairKey = (a, b) => (a <= b ? `${a}|${b}` : `${b}|${a}`);

  const load = async () => {
    try {
      const [lr, dr] = await Promise.all([
        api.get("/booking/pickup-locations"),
        api.get("/booking/pickup-locations/distances"),
      ]);
      setLocs(lr.data);
      const dmap = {};
      for (const d of dr.data) dmap[pairKey(d.from_id, d.to_id)] = d.travel_min;
      setDistances(dmap);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!draft.name.trim()) return toast.error("Name ist Pflicht");
    setCreating(true);
    try {
      await api.post("/booking/pickup-locations", {
        name: draft.name.trim(),
        address: draft.address.trim(),
      });
      toast.success("Abholort hinzugefügt");
      setDraft({ name: "", address: "" });
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setCreating(false);
    }
  };

  const patchLoc = async (id, field, value) => {
    try {
      await api.patch(`/booking/pickup-locations/${id}`, { [field]: value });
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const removeLoc = async (id) => {
    if (!window.confirm("Abholort und alle zugehörigen Distanzen wirklich löschen?")) return;
    try {
      await api.delete(`/booking/pickup-locations/${id}`);
      toast.success("Gelöscht");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const setDistance = async (a, b, minutes) => {
    const clean = Math.max(0, Math.min(1440, Number(minutes) || 0));
    try {
      await api.put("/booking/pickup-locations/distances", {
        from_id: a, to_id: b, travel_min: clean,
      });
      setDistances((cur) => ({ ...cur, [pairKey(a, b)]: clean }));
    } catch (e) { toast.error(formatApiError(e)); }
  };

  if (locs === null) return <Loading />;

  return (
    <div className="space-y-6">
      {/* List of locations */}
      <div className="divide-y divide-[#f1f5f9]">
        {locs.map((l) => (
          <div
            key={l.id}
            data-testid={`location-row-${l.id}`}
            className="py-3 grid grid-cols-1 md:grid-cols-[1fr_1fr_40px] gap-3 items-center"
          >
            <input
              defaultValue={l.name}
              onBlur={(e) => e.target.value !== l.name && patchLoc(l.id, "name", e.target.value)}
              className="text-sm font-semibold bg-transparent focus:outline-none focus:border-b focus:border-[#ff5a36]"
              data-testid={`location-name-${l.id}`}
            />
            <input
              defaultValue={l.address || ""}
              onBlur={(e) => e.target.value !== l.address && patchLoc(l.id, "address", e.target.value)}
              placeholder="Adresse (optional)"
              className="text-sm text-[#475569] bg-transparent focus:outline-none focus:border-b focus:border-[#ff5a36]"
              data-testid={`location-address-${l.id}`}
            />
            <button
              type="button"
              onClick={() => removeLoc(l.id)}
              data-testid={`location-delete-${l.id}`}
              className="w-8 h-8 flex items-center justify-center rounded-full text-[#a8a29e] hover:text-[#dc2626] hover:bg-[#fee2e2]"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* Distance matrix */}
      {locs.length >= 2 && (
        <div>
          <div className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] mb-3">
            Reisezeit-Matrix (in Minuten)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="location-distance-matrix">
              <thead>
                <tr>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-[#475569] border-b border-[#e7e5e4]">Von \ Nach</th>
                  {locs.map((l) => (
                    <th key={l.id} className="text-center px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-[#475569] border-b border-[#e7e5e4]">
                      {l.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {locs.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-[#475569] border-b border-[#f1f5f9]">
                      {row.name}
                    </td>
                    {locs.map((col) => {
                      if (row.id === col.id) {
                        return (
                          <td key={col.id} className="text-center text-[#a8a29e] border-b border-[#f1f5f9]">
                            —
                          </td>
                        );
                      }
                      const k = pairKey(row.id, col.id);
                      const val = distances[k] ?? "";
                      return (
                        <td key={col.id} className="p-1.5 border-b border-[#f1f5f9]">
                          <input
                            type="number"
                            min="0"
                            max="1440"
                            defaultValue={val}
                            onBlur={(e) => {
                              const v = Number(e.target.value);
                              if (v !== (distances[k] ?? -1)) {
                                setDistance(row.id, col.id, v);
                              }
                            }}
                            key={`${row.id}-${col.id}-${val}`}
                            data-testid={`distance-${row.id}-${col.id}`}
                            className="w-16 text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-2 py-1 focus:outline-none focus:border-[#ff5a36] text-center tabular-nums"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-[#78716c] mt-2 leading-relaxed">
            Reisezeit wird bei der Online-Buchung <em>zusätzlich</em> zum
            Standard-Puffer angerechnet, wenn zwei aufeinanderfolgende Termine
            unterschiedliche Abholorte haben. Beispiel: Nach einer Lektion in
            Pfäffikon (endet 10:00) mit Reisezeit 120 Min nach Chur wäre der
            früheste nächste Slot 12:00 + Puffer.
          </p>
        </div>
      )}

      <div className="bg-[#fafaf9] border border-dashed border-[#e7e5e4] rounded-2xl p-4">
        <div className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] mb-2">
          Neuer Abholort
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_120px] gap-2">
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="z. B. Wädenswil Bahnhof"
            className="text-sm bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
            data-testid="location-new-name"
          />
          <input
            value={draft.address}
            onChange={(e) => setDraft({ ...draft, address: e.target.value })}
            placeholder="Bahnhofstrasse, 8820 Wädenswil"
            className="text-sm bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
            data-testid="location-new-address"
          />
          <button
            type="button"
            onClick={create}
            disabled={creating}
            data-testid="location-create"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-[#0f172a] text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Hinzufügen
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  4) E-Mail-Vorlagen                                                        */
/* -------------------------------------------------------------------------- */
function EmailTemplatesEditor() {
  const [items, setItems] = useState(null);
  const [activeKind, setActiveKind] = useState("requested");

  const load = async () => {
    try {
      const r = await api.get("/booking/email-templates");
      setItems(r.data);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };
  useEffect(() => { load(); }, []);

  if (items === null) return <Loading />;

  const active = items.find((t) => t.kind === activeKind);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-[#e7e5e4]" data-testid="email-template-tabs">
        {items.map((t) => (
          <button
            key={t.kind}
            type="button"
            onClick={() => setActiveKind(t.kind)}
            data-testid={`email-template-tab-${t.kind}`}
            className={`px-4 py-2 text-xs font-semibold tracking-widest uppercase transition-colors border-b-2 -mb-px ${
              activeKind === t.kind
                ? "text-[#0f172a] border-[#ff5a36]"
                : "text-[#78716c] border-transparent hover:text-[#0f172a]"
            }`}
          >
            {t.label_de || t.kind}
          </button>
        ))}
      </div>

      {active && (
        <TemplateEditor
          key={active.kind}
          template={active}
          onSaved={() => load()}
        />
      )}
    </div>
  );
}

function TemplateEditor({ template, onSaved }) {
  const [subject, setSubject] = useState(template.subject || "");
  const [bodyHtml, setBodyHtml] = useState(template.body_html || "");
  const [bodyText, setBodyText] = useState(template.body_text || "");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const markDirty = () => setDirty(true);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/booking/email-templates/${template.kind}`, {
        subject, body_html: bodyHtml, body_text: bodyText,
      });
      toast.success("Vorlage gespeichert");
      setDirty(false);
      onSaved?.();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] block mb-1">
          Betreff
        </label>
        <input
          value={subject}
          onChange={(e) => { setSubject(e.target.value); markDirty(); }}
          data-testid={`email-template-subject-${template.kind}`}
          className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
        />
      </div>

      <div>
        <label className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] block mb-1">
          HTML-Body (Rich-Text)
        </label>
        <RichTextEditor
          value={bodyHtml}
          onChange={(v) => { setBodyHtml(v); markDirty(); }}
          onInsertPlaceholder={(token) => {
            // Fallback for keyboard-driven insert – append at cursor if
            // possible, else at end of the HTML string.
            setBodyHtml((cur) => (cur || "") + token);
            markDirty();
          }}
          placeholders={PLACEHOLDER_TOKENS}
          testid={`email-template-html-${template.kind}`}
        />
      </div>

      <details className="bg-[#fafaf9] border border-[#e7e5e4] rounded-2xl p-4">
        <summary className="cursor-pointer text-[10px] font-semibold tracking-widest uppercase text-[#475569]">
          Plain-Text-Fallback anzeigen
        </summary>
        <textarea
          value={bodyText}
          onChange={(e) => { setBodyText(e.target.value); markDirty(); }}
          rows={8}
          data-testid={`email-template-text-${template.kind}`}
          className="w-full mt-2 text-sm bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36] font-mono resize-y"
        />
        <p className="text-[11px] text-[#78716c] mt-2">
          Wird bei E-Mail-Clients gesendet, die kein HTML anzeigen können.
        </p>
      </details>

      <div className="flex items-center justify-between border-t border-[#f1f5f9] pt-4">
        <div className="text-xs text-[#78716c]">
          Zuletzt aktualisiert: <span className="tabular-nums">{template.updated_at?.slice(0, 16).replace("T", " ")}</span>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          data-testid={`email-template-save-${template.kind}`}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-full transition-colors ${
            dirty && !saving
              ? "bg-[#ff5a36] text-white hover:bg-[#e94418]"
              : "bg-[#e7e5e4] text-[#a8a29e] cursor-not-allowed"
          }`}
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          Speichern
        </button>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="py-8 flex items-center gap-2 text-sm text-[#78716c]">
      <Loader2 size={14} className="animate-spin" /> Lade …
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  5) Feiertage & Ferien                                                     */
/* -------------------------------------------------------------------------- */
function BlockedDatesEditor() {
  const [items, setItems] = useState(null);
  const [draft, setDraft] = useState({ date: "", label: "" });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      const r = await api.get("/booking/blocked-dates");
      setItems(r.data || []);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!draft.date) return toast.error("Datum ist Pflicht");
    setCreating(true);
    try {
      await api.post("/booking/blocked-dates", {
        date: draft.date,
        label: draft.label.trim(),
      });
      toast.success("Tag gesperrt");
      setDraft({ date: "", label: "" });
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setCreating(false);
    }
  };
  const patch = async (id, field, value) => {
    try {
      await api.patch(`/booking/blocked-dates/${id}`, { [field]: value });
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };
  const remove = async (id) => {
    if (!window.confirm("Diesen gesperrten Tag wirklich löschen?")) return;
    try {
      await api.delete(`/booking/blocked-dates/${id}`);
      toast.success("Gelöscht");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  if (items === null) return <Loading />;

  const grouped = items.reduce((acc, it) => {
    const yr = (it.date || "").slice(0, 4);
    (acc[yr] = acc[yr] || []).push(it);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <p className="text-xs text-[#78716c] leading-relaxed">
        Gesperrte Tage werden im öffentlichen Buchungswidget als &quot;geschlossen&quot;
        angezeigt — Schüler können sie gar nicht erst auswählen.
      </p>

      {items.length === 0 ? (
        <div className="bg-[#fafaf9] border border-dashed border-[#e7e5e4] rounded-2xl p-6 text-center text-sm text-[#78716c]">
          Noch keine Feiertage oder Ferien eingetragen.
        </div>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([year, list]) => (
            <div key={year}>
              <div className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] mb-2">
                {year}
              </div>
              <div className="divide-y divide-[#f1f5f9] border border-[#e7e5e4] rounded-2xl overflow-hidden bg-white">
                {list.map((b) => (
                  <div
                    key={b.id}
                    data-testid={`blocked-date-row-${b.id}`}
                    className="py-2.5 px-3 grid grid-cols-1 md:grid-cols-[160px_1fr_40px] gap-2 items-center"
                  >
                    <input
                      type="date"
                      defaultValue={b.date}
                      onBlur={(e) => e.target.value !== b.date && patch(b.id, "date", e.target.value)}
                      className="text-sm font-semibold bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#ff5a36] tabular-nums"
                      data-testid={`blocked-date-input-${b.id}`}
                    />
                    <input
                      defaultValue={b.label || ""}
                      onBlur={(e) => e.target.value !== (b.label || "") && patch(b.id, "label", e.target.value)}
                      placeholder="Bezeichnung (z. B. Weihnachten, Ferien Woche 41)"
                      className="text-sm bg-transparent focus:outline-none focus:border-b focus:border-[#ff5a36]"
                      data-testid={`blocked-label-input-${b.id}`}
                    />
                    <button
                      type="button"
                      onClick={() => remove(b.id)}
                      data-testid={`blocked-date-delete-${b.id}`}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-[#a8a29e] hover:text-[#dc2626] hover:bg-[#fee2e2]"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
      )}

      <div className="bg-[#fafaf9] border border-dashed border-[#e7e5e4] rounded-2xl p-4">
        <div className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] mb-2">
          Neuer gesperrter Tag
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[160px_1fr_120px] gap-2">
          <input
            type="date"
            value={draft.date}
            onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            className="text-sm bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36] tabular-nums"
            data-testid="blocked-date-new-date"
          />
          <input
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            placeholder="Bezeichnung (optional, z. B. Weihnachten)"
            className="text-sm bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
            data-testid="blocked-date-new-label"
          />
          <button
            type="button"
            onClick={create}
            disabled={creating || !draft.date}
            data-testid="blocked-date-create"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-[#0f172a] text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Sperren
          </button>
        </div>
      </div>
    </div>
  );
}
