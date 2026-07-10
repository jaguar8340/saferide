/**
 * Rating popup used inside the Fahrkontrolle matrix.
 *
 * Displays a fixed-positioned modal with:
 *   • Five big color-coded rating buttons (1 / 2 / 3 / 4 / X)
 *   • A textarea for the comment scoped to THIS cell only
 *   • "Leeren" (clear cell) + "Fertig" (close) actions
 *
 * AUTOSAVE behaviour (as of Feb 2026):
 *   • Tapping a rating button saves IMMEDIATELY.
 *   • Comment saves on blur (when the textarea loses focus).
 *   • A tiny status pill in the header shows "Gespeichert ✓" for ~1.4s
 *     after each successful save so the user knows nothing is lost.
 *
 * The modal is centered on desktop but slides in from the bottom on
 * mobile / iPad for easy thumb reach. Touch targets are ≥ 56 px tall.
 */
import { useEffect, useRef, useState } from "react";
import { X, Trash2, Check, Camera, Loader2 } from "lucide-react";
import useRatingScale from "@/hooks/useRatingScale";

// Kept as fallback for callers that still `import { RATING_META }` from
// this module (FahrkontrolleTab reads it to render tiny matrix cells
// before the async hook has populated). At runtime the popup itself
// uses the dynamic scale from the API.
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
  photoUrls = [],
  onSave,          // async (value, comment) => Promise – parent persists to API
  onClear,         // () => – deletes the cell entirely
  onPhotoUpload,   // async (File) => Promise
  onPhotoDelete,   // async (url) => Promise
  onClose,
}) {
  const [value, setValue] = useState(initialValue);
  const [comment, setComment] = useState(initialComment);
  const [savedFlash, setSavedFlash] = useState(false);
  const [uploading, setUploading] = useState(false);
  const lastPersistedComment = useRef(initialComment);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const flashTimer = useRef(null);

  // Dynamic rating scale from /api/settings/rating-scale (falls back to
  // the static RATING_META constant while the hook is loading).
  const { meta: dynMeta = RATING_META, order: dynOrder = ORDER } = useRatingScale();

  useEffect(() => {
    if (open) {
      setValue(initialValue);
      setComment(initialComment);
      lastPersistedComment.current = initialComment;
      setSavedFlash(false);
    }
  }, [open, initialValue, initialComment]);

  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  const showSavedFlash = () => {
    setSavedFlash(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSavedFlash(false), 1400);
  };

  const persist = async (nextValue, nextComment) => {
    try {
      await onSave(nextValue, nextComment);
      lastPersistedComment.current = nextComment;
      showSavedFlash();
    } catch {
      /* onSave surfaces its own toast */
    }
  };

  const handleRatingClick = async (v) => {
    // Toggle-off if the same value is tapped again.
    const next = value === v ? "" : v;
    setValue(next);
    await persist(next, comment);
  };

  const handleCommentBlur = async () => {
    if (comment === lastPersistedComment.current) return;
    await persist(value, comment);
  };

  const handlePhotoPick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !onPhotoUpload) {
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      await onPhotoUpload(file);
      showSavedFlash();
    } finally {
      setUploading(false);
      e.target.value = "";     // allow picking the same file again
    }
  };

  const handlePhotoDelete = async (url) => {
    if (!onPhotoDelete) return;
    if (!window.confirm("Foto wirklich löschen?")) return;
    try {
      await onPhotoDelete(url);
      showSavedFlash();
    } catch {
      /* parent surfaces the error toast */
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[95] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
      data-testid="rating-popup-overlay"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[85vh]"
        data-testid="rating-popup"
      >
        <div className="px-5 py-3 sm:py-4 border-b border-[#e7e5e4] flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold tracking-[0.24em] uppercase text-[#a8a29e] flex items-center gap-2">
              <span>Bewertung</span>
              <span
                data-testid="rating-popup-saved-flash"
                className={`inline-flex items-center gap-1 text-[10px] font-semibold tracking-[0.06em] normal-case px-2 py-0.5 rounded-full bg-[#dcfce7] text-[#166534] transition-opacity duration-200 ${
                  savedFlash ? "opacity-100" : "opacity-0"
                }`}
              >
                <Check size={10} strokeWidth={3} />
                Gespeichert
              </span>
            </div>
            <div className="font-display text-base sm:text-lg leading-tight mt-1 truncate">
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

        <div className="p-4 sm:p-5 space-y-4 sm:space-y-5 flex-1 overflow-y-auto">
          {/* Rating buttons — click = autosave. Number driven by the
              admin-configurable rating scale (1..N positive levels + X).
              Falls back to the static RATING_META until the API resolves. */}
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${dynOrder.length}, minmax(0, 1fr))` }}
          >
            {dynOrder.map((v) => {
              const meta = dynMeta[v] || RATING_META[v] || {};
              const active = value === v;
              return (
                <button
                  key={v}
                  onClick={() => handleRatingClick(v)}
                  data-testid={`rating-btn-${v}`}
                  className={`h-14 sm:h-16 rounded-2xl font-display text-2xl transition-all ${
                    active
                      ? "ring-4 ring-offset-2 ring-[#0f172a] scale-105"
                      : "opacity-70 hover:opacity-100 active:scale-95"
                  }`}
                  style={{
                    background: meta.bg,
                    color: meta.fg,
                  }}
                >
                  {v}
                </button>
              );
            })}
          </div>
          <div
            className="grid gap-2 -mt-3"
            style={{ gridTemplateColumns: `repeat(${dynOrder.length}, minmax(0, 1fr))` }}
          >
            {dynOrder.map((v) => (
              <div
                key={v}
                className="text-[10px] font-semibold tracking-[0.05em] text-center text-[#78716c] leading-tight"
              >
                {(dynMeta[v] || RATING_META[v] || {}).desc_de}
              </div>
            ))}
          </div>

          {/* Comment textarea — autosave on blur */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="text-[10px] font-semibold tracking-[0.22em] uppercase text-[#475569] min-w-0 truncate">
                Bemerkung zu diesem Feld
                <span className="ml-2 normal-case tracking-normal text-[10px] text-[#a8a29e] font-normal">
                  (autospeichert)
                </span>
              </label>
              {onPhotoUpload && (
                <button
                  type="button"
                  onClick={handlePhotoPick}
                  disabled={uploading}
                  data-testid="rating-popup-camera"
                  aria-label="Foto aufnehmen"
                  title="Foto aufnehmen"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-[#e7e5e4] bg-white text-[#0f172a] hover:border-[#ff5a36] hover:text-[#ff5a36] active:scale-95 transition-all disabled:opacity-50 shrink-0"
                >
                  {uploading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Camera size={14} />
                  )}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden"
                data-testid="rating-popup-camera-input"
              />
            </div>
            <textarea
              ref={textareaRef}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onBlur={handleCommentBlur}
              data-testid="rating-popup-comment"
              placeholder="z. B. Spiegelkontrolle noch üben, Blicktechnik gut"
              rows={3}
              style={{ fontSize: "16px" }}
              className="w-full bg-[#fafaf9] border border-[#e7e5e4] focus:border-[#ff5a36] focus:outline-none rounded-2xl p-3 leading-relaxed resize-none"
            />

            {photoUrls.length > 0 && (
              <div
                className="mt-3 grid grid-cols-4 gap-2"
                data-testid="rating-popup-photos"
              >
                {photoUrls.map((url) => (
                  <div
                    key={url}
                    className="relative aspect-square rounded-xl overflow-hidden border border-[#e7e5e4] bg-[#fafaf9] group"
                  >
                    <a href={url} target="_blank" rel="noreferrer">
                      <img
                        src={url}
                        alt="Foto"
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </a>
                    <button
                      type="button"
                      onClick={() => handlePhotoDelete(url)}
                      data-testid="rating-popup-photo-delete"
                      aria-label="Foto entfernen"
                      className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-[#dc2626] transition-opacity"
                    >
                      <X size={12} strokeWidth={3} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 sm:px-5 py-3 sm:py-4 border-t border-[#e7e5e4] bg-[#fafaf9] flex items-center gap-2 shrink-0" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
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
            data-testid="rating-popup-done"
            className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-[#0f172a] text-white px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity"
          >
            <Check size={13} /> Fertig
          </button>
        </div>
      </div>
    </div>
  );
}
