/**
 * GPS Tracker (MVP Web-only) — Admin side.
 *
 * The instructor picks a student, hits "Start". While the browser tab is
 * OPEN and the device screen is UNLOCKED the frontend polls
 * `navigator.geolocation.watchPosition` and batches new points every ~4 s
 * to `POST /api/gps/tracks/{id}/points`. On "Stop" a final
 * `PATCH /api/gps/tracks/{id} {end:true}` closes the track.
 *
 * Below the recorder we list previous tracks with distance + duration,
 * clickable to open a Leaflet map with the full route.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  MapPin,
  Play,
  Square,
  Trash2,
  Route as RouteIcon,
  Clock,
  Gauge,
  Signal,
  AlertTriangle,
  Locate,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";
import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Leaflet's default marker icon paths break with webpack — inline the CDN
// URL so the tiny start/stop markers render everywhere.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const BATCH_INTERVAL_MS = 4000;   // upload every 4 seconds
const MIN_MOVE_M = 4;             // ignore GPS jitter under 4 m


function haversineM(a, b) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}


export default function GpsTrackerModule() {
  const [students, setStudents] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [note, setNote] = useState("");
  const [activeTrack, setActiveTrack] = useState(null);      // in-progress track
  const [openTrackId, setOpenTrackId] = useState(null);      // map view
  const [openTrack, setOpenTrack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState(null);
  const [starting, setStarting] = useState(false);

  const bufferRef = useRef([]);        // pending points not yet uploaded
  const watchIdRef = useRef(null);     // navigator.geolocation.watchPosition id
  const uploadTimerRef = useRef(null); // setInterval id
  const lastPointRef = useRef(null);   // last accepted point for jitter filter
  const liveStatsRef = useRef({ distance: 0, points: 0, lastAt: null });
  const [, forceRender] = useState(0);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        api.get("/students"),
        api.get("/gps/tracks", { params: { limit: 200 } }),
      ]);
      setStudents((s.data || []).filter((x) => !x.archived));
      setTracks(t.data || []);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // ---------------------------------------------------------------------
  //  GPS recording
  // ---------------------------------------------------------------------
  const stopGeolocation = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (uploadTimerRef.current !== null) {
      clearInterval(uploadTimerRef.current);
      uploadTimerRef.current = null;
    }
  }, []);

  const flushBuffer = useCallback(async (trackId) => {
    const buf = bufferRef.current;
    if (!trackId || buf.length === 0) return;
    const pointsToSend = buf.splice(0, buf.length);
    try {
      const r = await api.post(`/gps/tracks/${trackId}/points`, pointsToSend);
      setActiveTrack((cur) => (cur ? { ...cur, ...r.data } : cur));
    } catch (e) {
      // Requeue at the front of the buffer for the next flush.
      bufferRef.current = pointsToSend.concat(bufferRef.current);
      // Only surface non-network errors to avoid spamming toasts offline.
      if (e?.response?.status && e.response.status >= 400) {
        toast.error(formatApiError(e, "Upload fehlgeschlagen"));
      }
    }
  }, []);

  const start = async () => {
    if (!navigator.geolocation) {
      toast.error("Dein Browser unterstützt kein GPS");
      return;
    }
    setStarting(true);
    setPermissionError(null);
    try {
      // 1) Create the track on the server first
      const r = await api.post("/gps/tracks", { student_id: studentId || null, note });
      const track = r.data;

      // 2) Warm up geolocation permission with a single request
      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(),
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        );
      });

      bufferRef.current = [];
      lastPointRef.current = null;
      liveStatsRef.current = { distance: 0, points: 0, lastAt: null };
      setActiveTrack(track);

      // 3) Start continuous watching
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const p = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            ts: new Date(pos.timestamp).toISOString(),
            accuracy: pos.coords.accuracy || null,
            speed: pos.coords.speed || null,
          };
          const last = lastPointRef.current;
          if (last && haversineM(last, p) < MIN_MOVE_M) return;      // jitter
          if (last) liveStatsRef.current.distance += haversineM(last, p);
          liveStatsRef.current.points += 1;
          liveStatsRef.current.lastAt = p.ts;
          lastPointRef.current = p;
          bufferRef.current.push(p);
          forceRender((x) => x + 1);
        },
        (err) => {
          setPermissionError(err.message || "GPS-Fehler");
          toast.error(err.message || "GPS-Fehler");
        },
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 },
      );

      // 4) Periodic upload
      uploadTimerRef.current = setInterval(() => flushBuffer(track.id), BATCH_INTERVAL_MS);

      toast.success(`Aufzeichnung gestartet${track.student_name ? ` · ${track.student_name}` : ""}`);
    } catch (e) {
      if (e?.code === 1) {
        setPermissionError("Zugriff auf Standort verweigert. Bitte in Browser-Einstellungen erlauben.");
      } else if (e?.code === 2) {
        setPermissionError("Standort konnte nicht ermittelt werden.");
      } else if (e?.code === 3) {
        setPermissionError("GPS-Timeout — Signal zu schwach.");
      } else {
        toast.error(formatApiError(e, "Aufzeichnung konnte nicht gestartet werden"));
      }
    } finally {
      setStarting(false);
    }
  };

  const stop = async () => {
    if (!activeTrack) return;
    stopGeolocation();
    await flushBuffer(activeTrack.id);
    try {
      const r = await api.patch(`/gps/tracks/${activeTrack.id}`, { end: true });
      toast.success(`Aufzeichnung beendet · ${r.data.distance_km} km`);
    } catch (e) {
      toast.error(formatApiError(e));
    }
    setActiveTrack(null);
    setNote("");
    reload();
  };

  const openTrack_ = async (id) => {
    setOpenTrackId(id);
    setOpenTrack(null);
    try {
      const r = await api.get(`/gps/tracks/${id}`);
      setOpenTrack(r.data);
    } catch (e) {
      toast.error(formatApiError(e));
      setOpenTrackId(null);
    }
  };

  const removeTrack = async (id) => {
    if (!window.confirm("Track wirklich löschen?")) return;
    try {
      await api.delete(`/gps/tracks/${id}`);
      setTracks((cur) => cur.filter((t) => t.id !== id));
      if (openTrackId === id) { setOpenTrackId(null); setOpenTrack(null); }
      toast.success("Track gelöscht");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  // Clean up on unmount so an accidental navigate doesn't leak the watcher.
  useEffect(() => () => stopGeolocation(), [stopGeolocation]);

  const liveStats = liveStatsRef.current;

  return (
    <div className="space-y-4" data-testid="admin-gps-tracker">
      {/* Recorder */}
      <div className="bg-white border border-[#e7e5e4] rounded-2xl p-4 md:p-5">
        <div className="flex items-center gap-2 mb-3">
          <RouteIcon size={16} className="text-[#ff5a36]" />
          <h2 className="font-display text-lg">GPS-Tracker</h2>
          {activeTrack && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold bg-[#dcfce7] text-[#166534] px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#16a34a] animate-pulse" />
              Aufnahme läuft
            </span>
          )}
        </div>

        {permissionError && (
          <div className="mb-3 flex items-start gap-2 text-xs bg-[#fef2f2] border border-[#fecaca] rounded-xl p-3 text-[#991b1b]">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <div>{permissionError}</div>
          </div>
        )}

        {!activeTrack ? (
          <div className="grid grid-cols-1 md:grid-cols-[1fr,1fr,auto] gap-3 items-end">
            <label className="block">
              <span className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] block mb-1">
                Schüler:in (optional)
              </span>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                data-testid="gps-student-select"
                className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#ff5a36]"
              >
                <option value="">— ohne Zuordnung —</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.last_name} {s.first_name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] block mb-1">
                Notiz (optional)
              </span>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                data-testid="gps-note"
                placeholder="z. B. Prüfungsstrecke Zizers"
                className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#ff5a36]"
              />
            </label>
            <button
              type="button"
              onClick={start}
              disabled={starting}
              data-testid="gps-start"
              className="inline-flex items-center gap-2 bg-[#ff5a36] hover:bg-[#e94418] text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors disabled:opacity-60"
            >
              {starting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              Aufzeichnen
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <LiveStat label="Distanz" icon={<RouteIcon size={12} />} value={`${(liveStats.distance / 1000).toFixed(2)} km`} />
            <LiveStat label="Punkte" icon={<Signal size={12} />} value={liveStats.points} />
            <LiveStat label="Zuletzt" icon={<Clock size={12} />} value={liveStats.lastAt ? new Date(liveStats.lastAt).toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "–"} />
            <button
              type="button"
              onClick={stop}
              data-testid="gps-stop"
              className="inline-flex items-center justify-center gap-2 bg-[#0f172a] hover:bg-[#1e293b] text-white text-sm font-semibold px-5 py-2.5 rounded-2xl transition-colors"
            >
              <Square size={14} />
              Stopp
            </button>
          </div>
        )}
        <div className="mt-3 text-[10px] text-[#a8a29e] leading-snug">
          💡 Handy während der Fahrt <strong>entsperrt</strong> lassen und Browser-Tab offen halten,
          sonst pausiert das GPS. Für Hintergrund-Tracking wäre eine native App nötig.
        </div>
      </div>

      {/* Detail view */}
      {openTrackId && (
        <TrackDetailPanel
          trackId={openTrackId}
          track={openTrack}
          onClose={() => { setOpenTrackId(null); setOpenTrack(null); }}
        />
      )}

      {/* List */}
      <div className="bg-white border border-[#e7e5e4] rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#f3f0eb] flex items-center gap-2">
          <span className="text-[10px] font-semibold tracking-widest uppercase text-[#78716c]">
            Aufgezeichnete Fahrten
          </span>
          <span className="ml-auto text-[10px] text-[#a8a29e]">{tracks.length}</span>
        </div>
        {loading ? (
          <div className="p-8 flex items-center gap-2 text-sm text-[#78716c]">
            <Loader2 size={14} className="animate-spin" /> Lade …
          </div>
        ) : tracks.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#78716c]">
            Noch keine Aufzeichnungen — klicke oben auf „Aufzeichnen".
          </div>
        ) : (
          <ul className="divide-y divide-[#f3f0eb]">
            {tracks.map((t) => (
              <li
                key={t.id}
                data-testid={`gps-track-row-${t.id}`}
                className="flex flex-wrap items-center gap-3 p-4 hover:bg-[#fafaf9] cursor-pointer"
                onClick={() => openTrack_(t.id)}
              >
                <div className="w-9 h-9 rounded-xl bg-[#fff7ed] text-[#c2410c] flex items-center justify-center shrink-0">
                  <RouteIcon size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-base truncate">
                    {t.student_name || <span className="italic text-[#78716c]">ohne Zuordnung</span>}
                    {t.note && <span className="ml-2 text-xs text-[#78716c] font-normal">· {t.note}</span>}
                  </div>
                  <div className="text-[10px] text-[#a8a29e] mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>{new Date(t.started_at).toLocaleString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    {t.instructor_email && <span>· {t.instructor_email}</span>}
                    {!t.ended_at && <span className="text-[#c2410c] font-semibold">· läuft</span>}
                  </div>
                </div>
                <div className="text-xs text-[#334155] tabular-nums flex items-center gap-3">
                  <span className="inline-flex items-center gap-1"><RouteIcon size={11} /> {t.distance_km.toFixed(2)} km</span>
                  <span className="inline-flex items-center gap-1"><Clock size={11} /> {t.duration_min.toFixed(0)} min</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeTrack(t.id); }}
                  data-testid={`gps-track-delete-${t.id}`}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-[#dc2626] hover:bg-[#fef2f2]"
                  title="Track löschen"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}


function LiveStat({ label, icon, value }) {
  return (
    <div className="bg-[#fafaf9] border border-[#f3f0eb] rounded-2xl px-3 py-2.5">
      <div className="text-[10px] font-semibold tracking-widest uppercase text-[#78716c] flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className="text-lg font-display tabular-nums">{value}</div>
    </div>
  );
}


export function TrackDetailPanel({ trackId, track, onClose }) {
  const points = track?.points || [];
  const polyline = useMemo(() => points.map((p) => [p.lat, p.lng]), [points]);
  const center = polyline[0] || [47.376, 8.541];
  const start = polyline[0];
  const end = polyline[polyline.length - 1];

  return (
    <div className="bg-white border border-[#e7e5e4] rounded-2xl overflow-hidden" data-testid={`gps-track-detail-${trackId}`}>
      <div className="px-4 py-3 border-b border-[#f3f0eb] flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#fafaf9] text-[#78716c]"
          aria-label="Schliessen"
        >
          <ChevronLeft size={15} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-display text-lg truncate">
            {track?.student_name || "Fahrt"}{track?.note ? ` · ${track.note}` : ""}
          </div>
          <div className="text-[10px] text-[#a8a29e] flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
            {track?.started_at && (
              <span>{new Date(track.started_at).toLocaleString("de-CH")}</span>
            )}
            {track?.distance_km !== undefined && (
              <span>· {track.distance_km.toFixed(2)} km</span>
            )}
            {track?.duration_min !== undefined && (
              <span>· {track.duration_min.toFixed(0)} min</span>
            )}
            {track?.point_count && <span>· {track.point_count} Punkte</span>}
          </div>
        </div>
      </div>
      {track ? (
        polyline.length >= 2 ? (
          <div style={{ height: "440px" }}>
            <MapContainer
              key={trackId}
              center={center}
              zoom={13}
              scrollWheelZoom
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Polyline positions={polyline} pathOptions={{ color: "#ff5a36", weight: 4 }} />
              <Marker position={start}>
                <Popup>Start · {new Date(points[0].ts).toLocaleTimeString("de-CH")}</Popup>
              </Marker>
              <Marker position={end}>
                <Popup>Ende · {new Date(points[points.length - 1].ts).toLocaleTimeString("de-CH")}</Popup>
              </Marker>
            </MapContainer>
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-[#78716c] flex items-center justify-center gap-2">
            <Locate size={14} />
            Zu wenig GPS-Punkte für eine Karte
          </div>
        )
      ) : (
        <div className="p-10 flex items-center gap-2 text-sm text-[#78716c]">
          <Loader2 size={14} className="animate-spin" /> Lade Karte …
        </div>
      )}
    </div>
  );
}
