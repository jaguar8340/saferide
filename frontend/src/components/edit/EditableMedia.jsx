import { useRef, useState } from "react";
import { ImagePlus, VideoIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEdit } from "@/contexts/EditContext";
import { api, formatApiError, resolveUrl } from "@/lib/api";

/**
 * Editable image OR video. In admin edit mode, exposes two upload buttons
 * (photo / video) and persists both the new media URL and the media_type
 * via the provided onUpdate callback.
 *
 * Props:
 *  - pathUrl: edit-path for the media URL (e.g. "nadine.media_url")
 *  - pathType: edit-path for the media type field ("nadine.media_type")
 *  - src: current media URL (image or video src)
 *  - type: "image" | "video"
 *  - className / mediaClassName: styling overrides
 *  - onUpdate(path, value): optional override for context.updateField
 */
export default function EditableMedia({
  pathUrl,
  pathType,
  src,
  type = "image",
  alt = "",
  className = "",
  mediaClassName = "",
  onUpdate,
}) {
  const ctx = useEdit();
  const editMode = ctx.editMode;
  const updateFn = onUpdate || ctx.updateField;
  const fileRef = useRef(null);
  const pendingTypeRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handlePick = (asType) => () => {
    pendingTypeRef.current = asType;
    if (fileRef.current) {
      fileRef.current.accept = asType === "video" ? "video/*" : "image/*";
      fileRef.current.click();
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const asType = pendingTypeRef.current || "image";
    if (asType === "image" && !file.type.startsWith("image/")) {
      toast.error("Bitte eine Bilddatei wählen");
      return;
    }
    if (asType === "video" && !file.type.startsWith("video/")) {
      toast.error("Bitte eine Videodatei wählen");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      updateFn(pathUrl, r.data.url);
      if (pathType) updateFn(pathType, r.data.kind || asType);
      toast.success(asType === "video" ? "Video ersetzt" : "Foto ersetzt");
    } catch (err) {
      toast.error(formatApiError(err, "Upload fehlgeschlagen"));
    } finally {
      setUploading(false);
      pendingTypeRef.current = null;
    }
  };

  const renderMedia = () => {
    if (!src) {
      return (
        <div className={`flex items-center justify-center bg-[#fbf9f6] text-[#94a3b8] text-xs font-semibold tracking-widest uppercase ${mediaClassName}`}>
          {type === "video" ? "Video" : "Foto"}
        </div>
      );
    }
    const url = resolveUrl(src);
    if (type === "video") {
      return (
        <video
          src={url}
          className={`block w-full h-full object-cover ${mediaClassName}`}
          controls
          playsInline
          preload="metadata"
        />
      );
    }
    return (
      <img
        src={url}
        alt={alt}
        loading="lazy"
        className={`block w-full h-full object-cover ${mediaClassName}`}
      />
    );
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {renderMedia()}
      {editMode && (
        <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
          <button
            type="button"
            onClick={handlePick("image")}
            disabled={uploading}
            data-testid={`${pathUrl}-upload-image`}
            className="inline-flex items-center gap-1.5 bg-white/95 backdrop-blur text-[#0f172a] rounded-full px-3 py-1.5 text-xs font-semibold shadow-md hover:bg-white disabled:opacity-50"
          >
            {uploading && pendingTypeRef.current === "image" ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <ImagePlus size={12} />
            )}
            Foto
          </button>
          <button
            type="button"
            onClick={handlePick("video")}
            disabled={uploading}
            data-testid={`${pathUrl}-upload-video`}
            className="inline-flex items-center gap-1.5 bg-[#ff5a36] text-white rounded-full px-3 py-1.5 text-xs font-semibold shadow-md hover:opacity-90 disabled:opacity-50"
          >
            {uploading && pendingTypeRef.current === "video" ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <VideoIcon size={12} />
            )}
            Video
          </button>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  );
}
