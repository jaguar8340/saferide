import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEdit } from "@/contexts/EditContext";
import { api, formatApiError, resolveUrl } from "@/lib/api";

/**
 * Brand logo block – shows the safe ride logo (chrome text on dark navy)
 * inside a fitted dark badge so it works on BOTH cream (header) and dark
 * (footer) backgrounds. Admins can upload a replacement logo inline; the
 * URL is saved globally to content.logo_url.
 *
 * Props:
 *  - variant: "header" | "footer"
 */
export default function BrandLogo({ variant = "header" }) {
  const { content, editMode, updateField } = useEdit();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const url = content?.logo_url
    ? resolveUrl(content.logo_url)
    : null;

  const isFooter = variant === "footer";
  // Header uses a tighter badge + tight border so it pops on cream.
  // Footer sits directly on the navy panel, no extra chrome needed.
  const wrapClass = isFooter
    ? "inline-flex items-center gap-3 group relative"
    : "inline-flex items-center gap-3 bg-[#0f172a] rounded-xl px-2.5 py-1.5 group relative";

  const imgClass = isFooter
    ? "h-9 md:h-10 w-auto object-contain"
    : "h-7 md:h-8 w-auto object-contain";

  const handleUpload = async (e) => {
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
      const r = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      updateField("logo_url", r.data.url);
      toast.success("Logo aktualisiert");
    } catch (err) {
      toast.error(formatApiError(err, "Upload fehlgeschlagen"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <span data-testid="brand-logo" className={wrapClass}>
      {url ? (
        <img src={url} alt="safe ride" className={imgClass} loading="eager" />
      ) : (
        // Fallback wordmark – never used in production but prevents layout shift on first paint.
        <span className={`font-display text-xl tracking-tight ${isFooter ? "text-white" : "text-white"}`}>
          safe<span className="font-serif-i text-[#ff5a36]">ride</span>
        </span>
      )}
      {editMode && (
        <>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            data-testid={`brand-logo-upload-${variant}`}
            className="absolute -top-2 -right-2 inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#ff5a36] text-white shadow-md hover:opacity-90 disabled:opacity-50"
            aria-label="Logo ersetzen"
          >
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
        </>
      )}
    </span>
  );
}
