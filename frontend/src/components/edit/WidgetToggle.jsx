import { useEdit } from "@/contexts/EditContext";

/**
 * Admin-only on/off toggle that PATCHes a boolean CMS content field.
 * The associated widget (Google Reviews, Instagram, TikTok, …) will render
 * only when its `*_embed_enabled` flag is true AND the corresponding
 * `*_embed_html` code is filled in.
 *
 * Renders as a compact pill switch inline above the embed textarea in
 * edit-mode. Not visible in view mode.
 */
export default function WidgetToggle({ path, label, value, testid }) {
  const { updateField } = useEdit();
  // Treat missing/undefined as ON (backwards compat for legacy content docs
  // that never had the flag). Falsy only when the admin explicitly toggled off.
  const enabled = value !== false;

  return (
    <div className="flex items-center justify-between gap-3 mb-2">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-[#0f172a]">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => updateField(path, !enabled)}
        data-testid={testid}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? "bg-emerald-500" : "bg-[#94a3b8]"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
        <span className="sr-only">{label}</span>
      </button>
      <span
        className={`text-[10px] font-bold uppercase tracking-widest shrink-0 w-8 text-right ${
          enabled ? "text-emerald-600" : "text-[#94a3b8]"
        }`}
      >
        {enabled ? "AN" : "AUS"}
      </span>
    </div>
  );
}
