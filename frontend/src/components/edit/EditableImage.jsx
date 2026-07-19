import { useRef, useState } from "react";
import { ImagePlus, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError, resolveUrl } from "@/lib/api";
import { useEdit } from "@/contexts/EditContext";

/**
 * Click-to-replace image. In view mode renders a plain <img>. In edit mode
 * shows a hover overlay; clicking opens the file picker which uploads and
 * updates the field path on the content document.
 *
 * Note: in edit mode the wrapper uses `display:contents` so it does not
 * disrupt the parent's layout — the <img> still drives the box size.
 *
 * `broadcast`: optional `{slug, field, label?}` — when set, an extra
 * "übertragen"-button pushes THIS location's field value to every other
 * location document (uses `POST /api/locations/{slug}/broadcast-field`).
 */
export default function EditableImage({
  path,
  src,
  alt = "",
  className = "",
  imgClassName = "",
  onUpdate,
  forceEditMode,
  broadcast,
  loading = "lazy",           // "eager" for above-the-fold (hero) images
  fetchPriority,              // "high" for the LCP hero
}) {
  const ctx = useEdit();
  const editMode = forceEditMode !== undefined ? forceEditMode : ctx.editMode;
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  const handleBroadcast = async () => {
    if (!broadcast?.slug || !broadcast?.field) return;
    if (!window.confirm(
      "Dieses Bild auf ALLE anderen Standort-Landingpages übertragen? " +
      "Die bisherigen Bilder dort werden ersetzt."
    )) return;
    setBroadcasting(true);
    try {
      const r = await api.post(
        `/locations/${broadcast.slug}/broadcast-field`,
        { field: broadcast.field }
      );
      toast.success(`Auf ${r.data.updated} Standorte übertragen`);
    } catch (err) {
      toast.error(formatApiError(err, "Übertragung fehlgeschlagen"));
    } finally {
      setBroadcasting(false);
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Bitte eine Bilddatei wählen");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post("/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      // When a custom onUpdate is provided the caller expects just the URL
      // (e.g. blog post uses `(url) => patch({ hero_image_url: url })`).
      // The default context updater expects `(path, url)` for content docs.
      if (onUpdate) {
        onUpdate(r.data.url);
      } else {
        ctx.updateField(path, r.data.url);
      }
      toast.success("Bild ersetzt");
    } catch (err) {
      toast.error(formatApiError(err, "Upload fehlgeschlagen"));
    } finally {
      setUploading(false);
    }
  };

  if (!editMode) {
    return (
      <img
        src={resolveUrl(src)}
        alt={alt}
        loading={loading}
        decoding="async"
        {...(fetchPriority ? { fetchPriority } : {})}
        className={`${className} ${imgClassName}`}
      />
    );
  }

  return (
    <span className={`relative group inline-block ${className}`} style={{ lineHeight: 0 }}>
      <img
        src={resolveUrl(src)}
        alt={alt}
        loading={loading}
        decoding="async"
        {...(fetchPriority ? { fetchPriority } : {})}
        className={imgClassName}
      />
      <span className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 group-hover:bg-black/45 transition-colors opacity-0 group-hover:opacity-100 rounded-[inherit]">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          data-edit-path={path}
          className="inline-flex items-center gap-2 bg-white text-[#0f172a] rounded-full px-4 py-2 text-sm font-semibold shadow-lg"
        >
          {uploading ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Lädt …
            </>
          ) : (
            <>
              <ImagePlus size={14} /> Bild ersetzen
            </>
          )}
        </button>
        {broadcast?.slug && broadcast?.field && (
          <button
            type="button"
            onClick={handleBroadcast}
            data-testid="editable-image-broadcast"
            title="Dieses Bild auf alle Standort-Landingpages übertragen"
            className="inline-flex items-center gap-2 bg-[#0f172a] text-white rounded-full px-4 py-2 text-sm font-semibold shadow-lg hover:bg-[#1e293b]"
          >
            {broadcasting ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Überträgt …
              </>
            ) : (
              <>
                <Copy size={14} /> Auf alle Standorte
              </>
            )}
          </button>
        )}
      </span>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
    </span>
  );
}
