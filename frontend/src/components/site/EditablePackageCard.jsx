import { useState, useRef } from "react";
import { Check, Plus, Trash2, ImagePlus, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";
import { api, formatApiError } from "@/lib/api";

/**
 * One booking-package card. Inline-editable in admin edit mode:
 * title, subtitle, price, original price, features list, highlight tag,
 * "popular" toggle and delete.
 *
 * Click-to-select stays functional in both modes; clicks inside contenteditable
 * elements use stopPropagation so they don't trigger selection.
 */
export default function EditablePackageCard({
  pkg,
  index,
  isSelected,
  onSelect,
  onPatched,
  onRemoved,
}) {
  const { lang, pick } = useLang();
  const { editMode } = useEdit();
  const dark = (pkg.color_class || "").includes("ff5a36");

  const features = pick(pkg.features_de, pkg.features_en) || [];

  // PATCH helper – updates the package on the backend and reports back upstream
  // so the parent list can re-render without a network round-trip.
  const patch = async (delta) => {
    try {
      const r = await api.patch(`/packages/${pkg.slug}`, delta);
      onPatched(r.data);
    } catch (err) {
      toast.error(formatApiError(err, "Speichern fehlgeschlagen"));
    }
  };

  const updateFeature = (j) => (e) => {
    const next = [...(features || [])];
    next[j] = e.target.innerText.trim();
    if (next[j] !== features[j]) {
      patch({ [`features_${lang}`]: next });
    }
  };
  const removeFeature = (j) => (e) => {
    e.stopPropagation();
    const next = features.filter((_, idx) => idx !== j);
    patch({ [`features_${lang}`]: next });
  };
  const addFeature = (e) => {
    e.stopPropagation();
    patch({ [`features_${lang}`]: [...features, "Neuer Punkt"] });
  };

  const removeCard = async (e) => {
    e.stopPropagation();
    if (!confirm(`Paket "${pkg.title_de || pkg.slug}" löschen?`)) return;
    try {
      await api.delete(`/packages/${pkg.slug}`);
      onRemoved(pkg.slug);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const togglePopular = (e) => {
    e.stopPropagation();
    patch({ popular: !pkg.popular });
  };

  const stop = (e) => e.stopPropagation();

  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`package-${pkg.slug}`}
      onClick={() => onSelect(pkg.slug)}
      onKeyDown={(e) => {
        // Only intercept keys when the outer card is focused – never swallow
        // Space / Enter typed inside a nested contentEditable child (title,
        // subtitle, feature, highlight …). Otherwise the user cannot type
        // spaces while editing.
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(pkg.slug);
        }
      }}
      className={`relative text-left p-6 md:p-7 rounded-3xl border-2 transition-all duration-300 cursor-pointer ${
        isSelected
          ? "border-[#ff5a36] -translate-y-1 shadow-lg shadow-[#ff5a36]/15"
          : "border-transparent hover:-translate-y-0.5"
      } ${dark ? "bg-[#ff5a36] text-white" : "bg-white text-[#0f172a]"}`}
    >
      {pkg.popular && (
        <span className="absolute -top-2.5 left-6 inline-flex items-center gap-1 bg-[#0f172a] text-white text-[10px] font-semibold tracking-widest uppercase px-3 py-1 rounded-full">
          <Sparkles size={10} /> Beliebt
        </span>
      )}

      {editMode && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5" onClick={stop}>
          <button
            type="button"
            onClick={togglePopular}
            data-testid={`package-toggle-popular-${pkg.slug}`}
            className={`inline-flex items-center justify-center w-7 h-7 rounded-full border text-xs ${
              pkg.popular
                ? "bg-[#0f172a] text-white border-[#0f172a]"
                : dark
                  ? "bg-white/15 text-white border-white/30"
                  : "bg-white text-[#0f172a] border-[#e2e8f0]"
            }`}
            title={pkg.popular ? "Beliebt-Marker entfernen" : "Als beliebt markieren"}
          >
            <Sparkles size={11} />
          </button>
          <button
            type="button"
            onClick={removeCard}
            data-testid={`package-delete-${pkg.slug}`}
            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#ff5a36] text-white"
            title="Paket löschen"
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}

      <div className="text-[10px] font-semibold tracking-widest uppercase opacity-75">
        {pkg.service_type === "vku" ? "VKU" : "Fahrlektion"}
      </div>

      <EField
        as="h3"
        editMode={editMode}
        value={pick(pkg.title_de, pkg.title_en)}
        onSave={(v) => patch({ [`title_${lang}`]: v })}
        className="font-display text-2xl md:text-3xl tracking-tight mt-2 block"
        testId={`package-title-${pkg.slug}`}
        onClick={stop}
      />

      <EField
        as="p"
        editMode={editMode}
        value={pick(pkg.subtitle_de, pkg.subtitle_en)}
        onSave={(v) => patch({ [`subtitle_${lang}`]: v })}
        className={`mt-2 text-sm font-medium block ${dark ? "text-white/80" : "text-[#475569]"}`}
        testId={`package-subtitle-${pkg.slug}`}
        onClick={stop}
      />

      <div className="mt-5 flex items-baseline gap-2" onClick={stop}>
        {editMode ? (
          <input
            type="number"
            min={0}
            defaultValue={pkg.price_chf}
            onBlur={(e) => {
              const n = parseInt(e.target.value, 10);
              if (Number.isFinite(n) && n !== pkg.price_chf) patch({ price_chf: n });
            }}
            data-testid={`package-price-${pkg.slug}`}
            className={`font-display text-4xl tracking-tight bg-transparent border-b border-dashed outline-none w-28 ${
              dark ? "text-white border-white/40" : "text-[#0f172a] border-[#0f172a]/30"
            }`}
          />
        ) : (
          <span className="font-display text-4xl tracking-tight" data-testid={`package-price-${pkg.slug}`}>
            CHF {pkg.price_chf}
          </span>
        )}
        {editMode ? (
          <input
            type="number"
            min={0}
            placeholder="alt"
            defaultValue={pkg.original_price_chf || ""}
            onBlur={(e) => {
              const v = e.target.value;
              const n = v === "" ? null : parseInt(v, 10);
              if (n !== pkg.original_price_chf) patch({ original_price_chf: n });
            }}
            data-testid={`package-old-price-${pkg.slug}`}
            className={`text-xs bg-transparent border-b border-dashed outline-none w-14 ${
              dark ? "text-white/70 border-white/30" : "text-[#94a3b8] border-[#94a3b8]/40"
            }`}
          />
        ) : (
          pkg.original_price_chf &&
          pkg.original_price_chf > pkg.price_chf && (
            <span className={`text-xs line-through ${dark ? "text-white/60" : "text-[#94a3b8]"}`}>
              CHF {pkg.original_price_chf}
            </span>
          )
        )}
        {editMode && (
          <span className={`text-[10px] font-semibold tracking-widest uppercase ml-auto ${dark ? "text-white/60" : "text-[#94a3b8]"}`}>
            CHF
          </span>
        )}
      </div>

      <ul className="mt-5 space-y-2" onClick={stop}>
        {features.map((f, j) => (
          <li
            key={j}
            data-testid={`package-feature-${pkg.slug}-${j}`}
            className="flex items-start gap-2 text-sm font-medium group/feat"
          >
            <Check size={14} className={`shrink-0 mt-0.5 ${dark ? "text-white" : "text-[#ff5a36]"}`} />
            {editMode ? (
              <span
                contentEditable
                suppressContentEditableWarning
                onBlur={updateFeature(j)}
                className={`flex-1 outline-none focus:bg-black/5 rounded ${dark ? "text-white/90" : "text-[#475569]"}`}
              >
                {f}
              </span>
            ) : (
              <span className={dark ? "text-white/90" : "text-[#475569]"}>{f}</span>
            )}
            {editMode && (
              <button
                type="button"
                onClick={removeFeature(j)}
                data-testid={`package-feature-remove-${pkg.slug}-${j}`}
                className={`opacity-0 group-hover/feat:opacity-100 transition-opacity ${dark ? "text-white/60 hover:text-white" : "text-[#94a3b8] hover:text-[#ff5a36]"}`}
                aria-label="Feature entfernen"
              >
                <X size={12} />
              </button>
            )}
          </li>
        ))}
        {editMode && (
          <li>
            <button
              type="button"
              onClick={addFeature}
              data-testid={`package-feature-add-${pkg.slug}`}
              className={`inline-flex items-center gap-1 text-xs font-semibold tracking-widest uppercase ${dark ? "text-white/80 hover:text-white" : "text-[#ff5a36] hover:opacity-80"}`}
            >
              <Plus size={11} /> Feature
            </button>
          </li>
        )}
      </ul>

      {(pkg.highlight_de || editMode) && (
        <div
          className={`mt-5 text-xs font-semibold tracking-widest uppercase inline-block px-2.5 py-1 rounded-full ${
            dark ? "bg-white/15 text-white" : "bg-[#fef3c7] text-[#92400e]"
          }`}
          onClick={stop}
        >
          {editMode ? (
            <span
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => {
                const v = e.target.innerText.trim();
                if (v !== (pick(pkg.highlight_de, pkg.highlight_en) || "")) {
                  patch({ [`highlight_${lang}`]: v });
                }
              }}
              data-testid={`package-highlight-${pkg.slug}`}
              className="outline-none"
            >
              {pick(pkg.highlight_de, pkg.highlight_en) || (lang === "de" ? "Highlight…" : "Highlight…")}
            </span>
          ) : (
            pick(pkg.highlight_de, pkg.highlight_en)
          )}
        </div>
      )}

      {isSelected && !editMode && (
        <div className={`mt-5 inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase ${dark ? "text-white" : "text-[#ff5a36]"}`}>
          <Check size={12} /> Ausgewählt
        </div>
      )}
    </div>
  );
}

/** Compact editable field – contenteditable in edit mode, plain text otherwise. */
function EField({ as = "span", editMode, value, onSave, className = "", testId, onClick }) {
  const Tag = as;
  if (!editMode) {
    return (
      <Tag data-testid={testId} className={className}>
        {value}
      </Tag>
    );
  }
  return (
    <Tag
      data-testid={testId}
      className={`${className} outline-none focus:bg-black/5 rounded px-1 -mx-1`}
      contentEditable
      suppressContentEditableWarning
      onClick={onClick}
      onBlur={(e) => {
        const next = e.currentTarget.innerText.trim();
        if (next !== (value || "")) onSave(next);
      }}
    >
      {value}
    </Tag>
  );
}
