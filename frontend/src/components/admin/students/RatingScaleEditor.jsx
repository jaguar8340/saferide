/**
 * RatingScaleEditor — admin card to configure the Fahrkontrolle rating
 * scale (labels + colours + number of positive levels).
 *
 * Layout: one row per level with big colour chip preview, editable
 * value/desc/bg/fg inputs, up/down/delete + a footer "+ Level" button.
 * The retry ("X") level is fixed in position and cannot be deleted —
 * only its label/colour can be edited.
 *
 * Saves via PATCH /api/settings/rating-scale on blur.
 */
import { useEffect, useState } from "react";
import {
  Loader2, Plus, Trash2, ArrowUp, ArrowDown, Palette, Save,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";
import { refreshRatingScale } from "@/hooks/useRatingScale";

const DEFAULT_LEVEL_COLOURS = [
  { bg: "#dc2626", fg: "#ffffff" },
  { bg: "#f97316", fg: "#ffffff" },
  { bg: "#f59e0b", fg: "#ffffff" },
  { bg: "#84cc16", fg: "#0f172a" },
  { bg: "#166534", fg: "#ffffff" },
  { bg: "#0f766e", fg: "#ffffff" },
  { bg: "#1d4ed8", fg: "#ffffff" },
  { bg: "#7c3aed", fg: "#ffffff" },
];

export default function RatingScaleEditor() {
  const [scale, setScale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/settings/rating-scale");
      setScale(r.data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const persist = async (next) => {
    setSaving(true);
    try {
      const r = await api.patch("/settings/rating-scale", {
        levels: next.levels, retry: next.retry,
      });
      setScale(r.data);
      refreshRatingScale();  // notify all consumers of the hook
      toast.success("Bewertungsskala gespeichert");
    } catch (e) {
      toast.error(formatApiError(e));
      load();  // revert to server state
    } finally {
      setSaving(false);
    }
  };

  if (loading || !scale) {
    return (
      <div
        data-testid="rating-scale-editor-loading"
        className="bg-white border border-[#e7e5e4] rounded-2xl p-6 flex items-center gap-3 text-sm text-[#475569]"
      >
        <Loader2 size={16} className="animate-spin" /> Lädt Bewertungsskala …
      </div>
    );
  }

  const updateLevel = (i, patch) => {
    const levels = [...scale.levels];
    levels[i] = { ...levels[i], ...patch };
    const next = { ...scale, levels };
    setScale(next);
    return next;
  };

  const commitLevel = (i, patch) => {
    persist(updateLevel(i, patch));
  };

  const moveLevel = (i, delta) => {
    const j = i + delta;
    if (j < 0 || j >= scale.levels.length) return;
    const levels = [...scale.levels];
    [levels[i], levels[j]] = [levels[j], levels[i]];
    persist({ ...scale, levels });
  };

  const removeLevel = (i) => {
    if (scale.levels.length <= 1) {
      toast.error("Mindestens ein Level muss bleiben");
      return;
    }
    if (!window.confirm(`Level "${scale.levels[i].desc_de}" wirklich löschen?`)) return;
    const levels = scale.levels.filter((_, idx) => idx !== i);
    persist({ ...scale, levels });
  };

  const addLevel = () => {
    const n = scale.levels.length;
    const nextValue = String(n + 1);
    const palette = DEFAULT_LEVEL_COLOURS[Math.min(n, DEFAULT_LEVEL_COLOURS.length - 1)];
    const levels = [
      ...scale.levels,
      {
        value: nextValue, desc_de: "Neuer Level", desc_en: "New level",
        bg: palette.bg, fg: palette.fg,
      },
    ];
    persist({ ...scale, levels });
  };

  return (
    <div
      data-testid="rating-scale-editor"
      className="bg-white border border-[#e7e5e4] rounded-2xl p-4 md:p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Palette size={14} className="text-[#ff5a36]" />
        <h3 className="font-display text-base">Bewertungsskala</h3>
        {saving && (
          <span
            data-testid="rating-scale-saving"
            className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase text-[#475569]"
          >
            <Loader2 size={11} className="animate-spin" /> Speichert
          </span>
        )}
      </div>
      <p className="text-xs text-[#475569] mb-4 leading-relaxed">
        Bezeichnungen, Farben und Anzahl Levels für die Fahrkontrolle. Klick auf
        eine Bezeichnung oder Farbe bearbeitet direkt. Änderungen werden sofort
        gespeichert und wirken sich auf Popup, Matrix und PDF-Export aus.
      </p>

      <div className="space-y-2">
        {scale.levels.map((lv, i) => (
          <LevelRow
            key={`lv-${i}-${lv.value}`}
            testid={`rating-scale-row-${lv.value}`}
            level={lv}
            canUp={i > 0}
            canDown={i < scale.levels.length - 1}
            onCommit={(patch) => commitLevel(i, patch)}
            onUp={() => moveLevel(i, -1)}
            onDown={() => moveLevel(i, 1)}
            onDelete={() => removeLevel(i)}
          />
        ))}

        {/* Retry level – always last, never deletable. */}
        <LevelRow
          testid={`rating-scale-row-${scale.retry.value}`}
          level={scale.retry}
          isRetry
          onCommit={(patch) => persist({ ...scale, retry: { ...scale.retry, ...patch } })}
        />
      </div>

      <button
        type="button"
        onClick={addLevel}
        data-testid="rating-scale-add"
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-[#475569] hover:text-[#ff5a36] transition-colors"
      >
        <Plus size={13} /> Level hinzufügen
      </button>
    </div>
  );
}


function LevelRow({
  level, isRetry = false, onCommit, canUp = false, canDown = false,
  onUp, onDown, onDelete, testid,
}) {
  const [local, setLocal] = useState(level);
  useEffect(() => setLocal(level), [level.value, level.desc_de, level.bg, level.fg]);

  const commitField = (field) => {
    if ((local[field] ?? "") !== (level[field] ?? "")) {
      onCommit({ [field]: local[field] });
    }
  };

  return (
    <div
      data-testid={testid}
      className="flex items-center gap-2 bg-[#fafaf9] border border-[#e7e5e4] rounded-xl p-2"
    >
      {/* Chip preview */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center font-display text-lg shrink-0 shadow-inner"
        style={{ background: local.bg, color: local.fg }}
      >
        {local.value}
      </div>

      {/* Value input */}
      <input
        data-testid={`${testid}-value`}
        type="text"
        maxLength={2}
        value={local.value}
        onChange={(e) => setLocal({ ...local, value: e.target.value })}
        onBlur={() => commitField("value")}
        disabled={isRetry}
        className="w-10 text-center bg-white border border-[#e7e5e4] rounded-lg px-1 py-1.5 text-sm font-semibold focus:outline-none focus:border-[#ff5a36] disabled:opacity-60"
      />

      {/* German label (main) */}
      <input
        data-testid={`${testid}-desc-de`}
        type="text"
        value={local.desc_de}
        onChange={(e) => setLocal({ ...local, desc_de: e.target.value })}
        onBlur={() => commitField("desc_de")}
        placeholder="Bezeichnung"
        className="flex-1 min-w-0 bg-white border border-[#e7e5e4] rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:border-[#ff5a36]"
      />

      {/* Colour swatch inputs */}
      <label
        title="Hintergrund"
        className="w-8 h-8 rounded-lg cursor-pointer border border-[#e7e5e4] overflow-hidden shrink-0"
        style={{ background: local.bg }}
      >
        <input
          data-testid={`${testid}-bg`}
          type="color"
          value={normaliseHex(local.bg)}
          onChange={(e) => setLocal({ ...local, bg: e.target.value })}
          onBlur={() => commitField("bg")}
          className="opacity-0 w-8 h-8 cursor-pointer"
        />
      </label>
      <label
        title="Textfarbe"
        className="w-8 h-8 rounded-lg cursor-pointer border border-[#e7e5e4] overflow-hidden shrink-0"
        style={{ background: local.fg }}
      >
        <input
          data-testid={`${testid}-fg`}
          type="color"
          value={normaliseHex(local.fg)}
          onChange={(e) => setLocal({ ...local, fg: e.target.value })}
          onBlur={() => commitField("fg")}
          className="opacity-0 w-8 h-8 cursor-pointer"
        />
      </label>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {!isRetry && (
          <>
            <button
              type="button"
              onClick={onUp}
              disabled={!canUp}
              data-testid={`${testid}-up`}
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[#78716c] hover:text-[#ff5a36] hover:bg-white disabled:opacity-30"
            >
              <ArrowUp size={14} />
            </button>
            <button
              type="button"
              onClick={onDown}
              disabled={!canDown}
              data-testid={`${testid}-down`}
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[#78716c] hover:text-[#ff5a36] hover:bg-white disabled:opacity-30"
            >
              <ArrowDown size={14} />
            </button>
            <button
              type="button"
              onClick={onDelete}
              data-testid={`${testid}-delete`}
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[#78716c] hover:text-[#dc2626] hover:bg-white"
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
        {isRetry && (
          <span className="text-[10px] font-semibold tracking-widest uppercase text-[#a8a29e] px-2">
            Fest
          </span>
        )}
      </div>
    </div>
  );
}


/** Ensure an HTML5 <input type="color"> receives a valid 7-char hex. */
function normaliseHex(v) {
  if (!v || typeof v !== "string") return "#94a3b8";
  const s = v.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s;
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    return "#" + s.slice(1).split("").map((c) => c + c).join("");
  }
  return "#94a3b8";
}
