import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
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
 */
export default function EditableImage({
  path,
  src,
  alt = "",
  className = "",
  imgClassName = "",
  onUpdate,
  forceEditMode,
}) {
  const ctx = useEdit();
  const editMode = forceEditMode !== undefined ? forceEditMode : ctx.editMode;
  const updateFn = onUpdate || ctx.updateField;
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

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
      updateFn(path, r.data.url);
      toast.success("Bild ersetzt");
    } catch (err) {
      toast.error(formatApiError(err, "Upload fehlgeschlagen"));
    } finally {
      setUploading(false);
    }
  };

  if (!editMode) {
    return <img src={resolveUrl(src)} alt={alt} className={`${className} ${imgClassName}`} />;
  }

  return (
    <span className={`relative group inline-block ${className}`} style={{ lineHeight: 0 }}>
      <img src={resolveUrl(src)} alt={alt} className={imgClassName} />
      <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/45 transition-colors opacity-0 group-hover:opacity-100 rounded-[inherit]">
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
