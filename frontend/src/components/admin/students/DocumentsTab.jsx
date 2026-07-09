/**
 * Dokumente-Tab — file uploads scoped to a single student.
 *
 * Uses /api/students/{id}/documents (multipart POST) for upload and
 * DELETE for removal. Images render as thumbnails, PDFs get a filetype
 * badge with a big "Öffnen" button. Category dropdown groups files
 * (Lernfahrerausweis, ID, Vertrag, Rechnung, Sonstiges).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Upload,
  Trash2,
  FileText,
  Image as ImageIcon,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";

const CATEGORIES = [
  { id: "permit",   label: "Lernfahrerausweis" },
  { id: "id",       label: "ID / Pass" },
  { id: "contract", label: "Vertrag" },
  { id: "invoice",  label: "Rechnung" },
  { id: "other",    label: "Sonstiges" },
  { id: "misc",     label: "Uncategorized" },
];

const CATEGORY_META = {};
for (const c of CATEGORIES) CATEGORY_META[c.id] = c;

const bytesToHuman = (n) => {
  if (!n) return "—";
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
};

export default function DocumentsTab({ student }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("permit");
  const [uploadLabel, setUploadLabel] = useState("");
  const fileInputRef = useRef(null);

  const load = async () => {
    try {
      const r = await api.get(`/students/${student.id}/documents`);
      setDocs(r.data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id]);

  const grouped = useMemo(() => {
    const g = {};
    for (const d of docs) {
      const cat = d.category || "misc";
      (g[cat] ||= []).push(d);
    }
    return g;
  }, [docs]);

  const doUpload = async (files) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", uploadCategory);
      fd.append("label", uploadLabel || file.name);
      await api.post(`/students/${student.id}/documents`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Hochgeladen");
      setUploadLabel("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setUploading(false);
    }
  };

  const removeDoc = async (id) => {
    if (!window.confirm("Dokument wirklich entfernen?")) return;
    try {
      await api.delete(`/students/${student.id}/documents/${id}`);
      toast.success("Entfernt");
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#78716c]">
        <Loader2 size={14} className="animate-spin" /> Lade Dokumente …
      </div>
    );
  }

  return (
    <div data-testid="documents-tab" className="space-y-6">
      <div>
        <h2 className="font-display text-3xl md:text-4xl leading-none tracking-tight">
          Dokumente
        </h2>
        <p className="text-xs text-[#78716c] mt-2">
          <span className="font-semibold text-[#0f172a]">{docs.length}</span>{" "}
          {docs.length === 1 ? "Datei" : "Dateien"}
        </p>
      </div>

      {/* Upload form */}
      <div className="bg-white border border-[#e7e5e4] rounded-2xl p-4">
        <div className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] mb-3">
          Neues Dokument hochladen
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_auto] gap-3 items-center">
          <select
            value={uploadCategory}
            onChange={(e) => setUploadCategory(e.target.value)}
            data-testid="document-upload-category"
            className="text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
          >
            {CATEGORIES.filter((c) => c.id !== "misc").map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={uploadLabel}
            onChange={(e) => setUploadLabel(e.target.value)}
            placeholder="Bezeichnung (optional)"
            data-testid="document-upload-label"
            className="text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
          />
          <label
            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold tracking-widest uppercase bg-[#ff5a36] text-white px-4 py-2.5 rounded-lg hover:opacity-90 cursor-pointer whitespace-nowrap"
            data-testid="document-upload-button"
          >
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
            {uploading ? "Lade …" : "Datei wählen"}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => doUpload(e.target.files)}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
        <p className="text-[10px] text-[#94a3b8] mt-2">
          Zugelassen: PDF, JPG, PNG, WebP, GIF. Max. 8 MB (PDF) bzw. 10 MB (Bild).
        </p>
      </div>

      {/* Grouped list */}
      {docs.length === 0 ? (
        <div className="bg-white border border-dashed border-[#e7e5e4] rounded-2xl p-10 text-center text-sm text-[#78716c]">
          Noch kein Dokument hochgeladen.
        </div>
      ) : (
        <div className="space-y-6">
          {CATEGORIES.filter((c) => (grouped[c.id] || []).length > 0).map((cat) => (
            <div key={cat.id}>
              <div className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] mb-2">
                {cat.label} ({(grouped[cat.id] || []).length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {grouped[cat.id].map((d) => (
                  <div
                    key={d.id}
                    data-testid={`document-card-${d.id}`}
                    className="bg-white border border-[#e7e5e4] rounded-2xl overflow-hidden flex flex-col"
                  >
                    <div className="aspect-[4/3] bg-[#fafaf9] flex items-center justify-center relative">
                      {d.kind === "image" ? (
                        <img
                          src={d.url}
                          alt={d.label}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-[#a8a29e]">
                          <FileText size={40} strokeWidth={1.5} />
                          <span className="text-[10px] font-semibold tracking-widest uppercase">
                            {d.content_type?.includes("pdf") ? "PDF" : "Datei"}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex flex-col gap-2 flex-1">
                      <div className="text-sm font-medium text-[#0f172a] leading-tight truncate">
                        {d.label || d.original_filename}
                      </div>
                      <div className="text-[10px] text-[#94a3b8] flex flex-wrap items-center gap-x-2">
                        {d.kind === "image" ? <ImageIcon size={10} /> : <FileText size={10} />}
                        {bytesToHuman(d.size)}
                        <span>·</span>
                        {new Date(d.created_at).toLocaleDateString("de-CH")}
                      </div>
                      <div className="mt-auto flex items-center gap-2 pt-2">
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noreferrer"
                          data-testid={`document-open-${d.id}`}
                          className="flex-1 inline-flex items-center justify-center gap-1 text-[10px] font-semibold tracking-widest uppercase bg-[#0f172a] text-white px-3 py-2 rounded-full hover:opacity-90"
                        >
                          <ExternalLink size={10} /> Öffnen
                        </a>
                        <button
                          onClick={() => removeDoc(d.id)}
                          data-testid={`document-delete-${d.id}`}
                          className="w-8 h-8 flex items-center justify-center rounded-full text-[#a8a29e] hover:text-[#dc2626] hover:bg-[#fee2e2]"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
