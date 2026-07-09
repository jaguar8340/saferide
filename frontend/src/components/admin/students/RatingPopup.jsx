/**
 * Rating popup used inside the Fahrkontrolle matrix.
 *
 * Displays a fixed-positioned modal with:
 *   • Five big color-coded rating buttons (1 / 2 / 3 / 4 / X)
 *   • A textarea for the comment scoped to THIS cell only
 *   • Save / Delete / Cancel actions
 *
 * The modal is centered on desktop but slides in from the bottom on
 * mobile / iPad for easy thumb reach. Touch targets are ≥ 56 px tall.
 */
import { useEffect, useRef, useState } from "react";
import { X, Trash2, Check } from "lucide-react";

export const RATING_META = {
  "1": { label: "1", desc_de: "erklärt",       bg: "#dc2626", fg: "#ffffff" },
  "2": { label: "2", desc_de: "geübt",         bg: "#f97316", fg: "#ffffff" },
  "3": { label: "3", desc_de: "selbständig",   bg: "#84cc16", fg: "#0f172a" },
  "4": { label: "4", desc_de: "sicher",        bg: "#166534", fg: "#ffffff" },
  "X": { label: "X", desc_de: "nochmals üben", bg: "#94a3b8", fg: "#0f172a" },
};

const ORDER = ["1", "2", "3", "4", "X"];

export default function RatingPopup({
  open,
  initialValue = "",
  initialComment = "",
  contextLabel = "",
  onSave,
  onClear,
  onClose,
}) {
  const [value, setValue] = useState(initialValue);
  const [comment, setComment] = useState(initialComment);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
      setComment(initialComment);
    }
  }, [open, initialValue, initialComment]);

  if (!open) return null;

  const save = () => {
    onSave(value, comment);
  };

  return (
    <div
      className="fixed inset-0 z-[95] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
      data-testid="rating-popup-overlay"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        data-testid="rating-popup"
      >
        <div className="px-5 py-4 border-b border-[#e7e5e4] flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold tracking-[0.24em] uppercase text-[#a8a29e]">
              Bewertung
            </div>
            <div className="font-display text-lg leading-tight mt-1 truncate">
              {contextLabel || "Feld"}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 -m-1 flex items-center justify-center rounded-full text-[#78716c] hover:bg-[#f5f5f4] transition-colors"
            data-testid="rating-popup-close"
            aria-label="Schliessen"
          >
            <X size={17} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* 5 big rating buttons */}
          <div className="grid grid-cols-5 gap-2">
            {ORDER.map((v) => {
              const meta = RATING_META[v];
              const active = value === v;
              return (
                <button
                  key={v}
                  onClick={() => setValue(active ? "" : v)}
                  data-testid={`rating-btn-${v}`}
                  className={`h-16 rounded-2xl font-display text-2xl transition-all ${
                    active
                      ? "ring-4 ring-offset-2 ring-[#0f172a] scale-105"
                      : "opacity-70 hover:opacity-100 active:scale-95"
                  }`}
                  style={{
                    background: meta.bg,
                    color: meta.fg,
                  }}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-5 gap-2 -mt-3">
            {ORDER.map((v) => (
              <div
                key={v}
                className="text-[10px] font-semibold tracking-[0.05em] text-center text-[#78716c] leading-tight"
              >
                {RATING_META[v].desc_de}
              </div>
            ))}
          </div>

          {/* Comment textarea */}
          <div>
            <label className="text-[10px] font-semibold tracking-[0.22em] uppercase text-[#475569] block mb-2">
              Bemerkung zu diesem Feld
            </label>
            <textarea
              ref={textareaRef}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              data-testid="rating-popup-comment"
              placeholder="z. B. Spiegelkontrolle noch üben, Blicktechnik gut"
              rows={4}
              className="w-full text-sm bg-[#fafaf9] border border-[#e7e5e4] focus:border-[#ff5a36] focus:outline-none rounded-2xl p-3 leading-relaxed resize-none"
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[#e7e5e4] bg-[#fafaf9] flex items-center gap-2">
          <button
            onClick={onClear}
            data-testid="rating-popup-delete"
            className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-[#dc2626] px-3 py-2.5 rounded-full hover:bg-[#fee2e2] transition-colors"
          >
            <Trash2 size={13} /> Leeren
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            data-testid="rating-popup-cancel"
            className="text-xs font-semibold tracking-widest uppercase text-[#475569] px-4 py-2.5 rounded-full hover:bg-white transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={save}
            data-testid="rating-popup-save"
            className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-[#0f172a] text-white px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity"
          >
            <Check size={13} /> Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
