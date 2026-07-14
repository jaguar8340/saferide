/**
 * DocumentsManager — Admin-Dateiablage für Verträge, Steuerunterlagen usw.
 *  - PDF + JPG-Upload nach Hetzner S3
 *  - Titel, Bemerkung, automatisches Datum/Zeit
 *  - Suchfeld (Titel + Bemerkung + Original-Dateiname)
 *  - Bearbeiten (Titel/Bemerkung) + Löschen
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileText,
  FileImage,
  Loader2,
  Plus,
  Search,
  Trash2,
  Download,
  X,
  Upload,
  Pencil,
  Check,
  Folder,
  FolderPlus,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";

export default function DocumentsManager() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null); // null = alle
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [docs, cats] = await Promise.all([
        api.get("/documents"),
        api.get("/documents/categories"),
      ]);
      setItems(docs.data || []);
      setCategories(cats.data || []);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const reloadCategories = async () => {
    try {
      const cats = await api.get("/documents/categories");
      setCategories(cats.data || []);
    } catch { /* silent */ }
  };

  const filtered = useMemo(() => {
    let list = items;
    if (activeCategory !== null) {
      list = list.filter((d) => (d.category || "") === activeCategory);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((d) =>
        (d.title || "").toLowerCase().includes(q) ||
        (d.note || "").toLowerCase().includes(q) ||
        (d.original_filename || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [items, query, activeCategory]);

  const remove = async (doc) => {
    if (!window.confirm(`Datei „${doc.title}“ endgültig löschen?`)) return;
    try {
      await api.delete(`/documents/${doc.id}`);
      setItems((cur) => cur.filter((x) => x.id !== doc.id));
      reloadCategories();
      toast.success("Datei gelöscht");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const patch = async (id, patch) => {
    try {
      const r = await api.patch(`/documents/${id}`, patch);
      setItems((cur) => cur.map((x) => (x.id === id ? r.data : x)));
      reloadCategories();
      toast.success("Gespeichert");
      setEditingId(null);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const addCategory = async () => {
    const name = window.prompt("Name der neuen Kategorie:");
    if (!name || !name.trim()) return;
    try {
      await api.post("/documents/categories", { name: name.trim() });
      reloadCategories();
      setActiveCategory(name.trim());
      toast.success(`Kategorie „${name.trim()}“ erstellt`);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const removeCategory = async (name) => {
    if (!name) return;
    if (!window.confirm(`Kategorie „${name}“ entfernen? (Dateien werden nicht gelöscht)`)) return;
    try {
      await api.delete(`/documents/categories/${encodeURIComponent(name)}`);
      reloadCategories();
      if (activeCategory === name) setActiveCategory(null);
      toast.success("Kategorie entfernt");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const totalCount = items.length;

  return (
    <div className="space-y-4" data-testid="admin-documents">
      {/* Header */}
      <div className="bg-white border border-[#e7e5e4] rounded-2xl p-4 md:p-5">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={16} className="text-[#ff5a36]" />
          <h2 className="font-display text-lg">Dateien &amp; Unterlagen</h2>
          <div className="ml-auto text-[10px] text-[#78716c]">
            {totalCount} {totalCount === 1 ? "Datei" : "Dateien"}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#78716c]"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Suchen nach Titel, Notiz oder Dateiname …"
              data-testid="documents-search"
              className="w-full text-sm bg-[#fafaf9] border border-[#e7e5e4] rounded-full pl-9 pr-4 py-2 focus:outline-none focus:border-[#ff5a36]"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            data-testid="documents-new"
            className="inline-flex items-center gap-1.5 bg-[#ff5a36] hover:bg-[#e94418] text-white text-xs font-semibold px-3.5 py-2 rounded-full transition-colors"
          >
            <Plus size={13} />
            Neue Datei
          </button>
        </div>
      </div>

      {/* Body: Sidebar + List */}
      <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-4 items-start">
        <CategorySidebar
          categories={categories}
          totalCount={totalCount}
          active={activeCategory}
          onPick={setActiveCategory}
          onAdd={addCategory}
          onRemove={removeCategory}
        />

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[#78716c]">
            <Loader2 size={14} className="animate-spin" /> Lade Dateien …
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-dashed border-[#e7e5e4] rounded-2xl p-10 text-center text-sm text-[#78716c]">
            {items.length === 0
              ? "Noch keine Dateien hochgeladen."
              : query
              ? `Keine Treffer für „${query}“.`
              : `Keine Dateien in dieser Kategorie.`}
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((doc) => (
              <li
                key={doc.id}
                data-testid={`documents-item-${doc.id}`}
                className="bg-white border border-[#e7e5e4] rounded-2xl p-4 flex flex-wrap items-start gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-[#fff7ed] text-[#c2410c] flex items-center justify-center shrink-0">
                  {doc.kind === "pdf" ? <FileText size={16} /> : <FileImage size={16} />}
                </div>
                {editingId === doc.id ? (
                  <DocEditForm
                    doc={doc}
                    categories={categories}
                    onCancel={() => setEditingId(null)}
                    onSave={patch}
                  />
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-display text-base leading-tight truncate">
                          {doc.title}
                        </div>
                        {doc.category && (
                          <span className="text-[10px] font-semibold tracking-widest uppercase bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa] px-2 py-0.5 rounded-full">
                            <Folder size={9} className="inline mr-1" />
                            {doc.category}
                          </span>
                        )}
                      </div>
                      {doc.note && (
                        <div className="text-xs text-[#475569] mt-1 whitespace-pre-line line-clamp-3">
                          {doc.note}
                        </div>
                      )}
                      <div className="text-[10px] text-[#a8a29e] mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                        <span>{formatDate(doc.created_at)}</span>
                        <span>{formatBytes(doc.size)}</span>
                        <span className="uppercase tracking-widest">{doc.kind}</span>
                        {doc.uploaded_by && <span>· {doc.uploaded_by}</span>}
                        {doc.original_filename && doc.original_filename !== doc.title && (
                          <span className="truncate">· {doc.original_filename}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid={`documents-download-${doc.id}`}
                        className="w-9 h-9 flex items-center justify-center rounded-full text-[#334155] hover:text-[#0f172a] hover:bg-[#fafaf9]"
                        title="Öffnen / Herunterladen"
                      >
                        <Download size={14} />
                      </a>
                      <button
                        type="button"
                        onClick={() => setEditingId(doc.id)}
                        data-testid={`documents-edit-${doc.id}`}
                        className="w-9 h-9 flex items-center justify-center rounded-full text-[#334155] hover:text-[#0f172a] hover:bg-[#fafaf9]"
                        title="Bearbeiten"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(doc)}
                        data-testid={`documents-delete-${doc.id}`}
                        className="w-9 h-9 flex items-center justify-center rounded-full text-[#dc2626] hover:bg-[#fef2f2]"
                        title="Löschen"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {showUpload && (
        <UploadModal
          categories={categories}
          defaultCategory={activeCategory || ""}
          onClose={() => setShowUpload(false)}
          onUploaded={(doc) => {
            setItems((cur) => [doc, ...cur]);
            reloadCategories();
            setShowUpload(false);
          }}
        />
      )}
    </div>
  );
}


function CategorySidebar({ categories, totalCount, active, onPick, onAdd, onRemove }) {
  return (
    <aside className="bg-white border border-[#e7e5e4] rounded-2xl p-3 md:sticky md:top-4">
      <div className="text-[10px] font-semibold tracking-widest uppercase text-[#78716c] px-2 mb-2">
        Kategorien
      </div>
      <ul className="space-y-0.5" data-testid="documents-categories">
        <li>
          <button
            type="button"
            onClick={() => onPick(null)}
            data-testid="documents-category-all"
            className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm ${
              active === null
                ? "bg-[#fff7ed] text-[#c2410c] font-semibold"
                : "text-[#334155] hover:bg-[#fafaf9]"
            }`}
          >
            <Layers size={12} />
            <span className="flex-1 truncate">Alle</span>
            <span className="text-[10px] text-[#a8a29e]">{totalCount}</span>
          </button>
        </li>
        {categories.map((cat) => (
          <li key={cat.name || "__unclassified__"} className="group flex items-center">
            <button
              type="button"
              onClick={() => onPick(cat.name)}
              data-testid={`documents-category-${cat.name || "unclassified"}`}
              className={`flex-1 text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm min-w-0 ${
                active === cat.name
                  ? "bg-[#fff7ed] text-[#c2410c] font-semibold"
                  : "text-[#334155] hover:bg-[#fafaf9]"
              }`}
            >
              <Folder size={12} />
              <span className="flex-1 truncate">
                {cat.name || <span className="italic text-[#a8a29e]">Ohne Kategorie</span>}
              </span>
              <span className="text-[10px] text-[#a8a29e]">{cat.count}</span>
            </button>
            {cat.name && cat.count === 0 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemove(cat.name); }}
                title="Leere Kategorie entfernen"
                data-testid={`documents-category-remove-${cat.name}`}
                className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded text-[#a8a29e] hover:text-[#dc2626]"
              >
                <X size={11} />
              </button>
            )}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onAdd}
        data-testid="documents-category-add"
        className="w-full mt-2 flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-[#78716c] hover:text-[#ff5a36] hover:bg-[#fff7ed]"
      >
        <FolderPlus size={12} />
        Kategorie hinzufügen
      </button>
    </aside>
  );
}


function UploadModal({ categories, defaultCategory, onClose, onUploaded }) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState(defaultCategory || "");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const uniqueCats = useMemo(
    () => Array.from(new Set(categories.map((c) => c.name).filter(Boolean))),
    [categories],
  );

  const submit = async () => {
    if (!file) return toast.error("Bitte eine Datei auswählen");
    if (file.size > 20 * 1024 * 1024) {
      return toast.error("Datei zu gross (max. 20 MB)");
    }
    const allowed = ["application/pdf", "image/jpeg", "image/jpg"];
    if (!allowed.includes(file.type)) {
      return toast.error("Nur PDF und JPG erlaubt");
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", title.trim());
      fd.append("note", note.trim());
      fd.append("category", category.trim());
      const r = await api.post("/documents", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Datei hochgeladen");
      onUploaded(r.data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="documents-upload-modal"
    >
      <div
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f1f5f9]">
          <h3 className="font-display text-2xl leading-none">Neue Datei</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schliessen"
            className="p-1.5 rounded-full hover:bg-[#fafaf9] text-[#78716c]"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <label className="block">
            <span className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] block mb-1">
              Titel
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="documents-upload-title"
              placeholder="z. B. Mietvertrag Fahrschulraum 2026"
              className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#ff5a36]"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] block mb-1">
              Kategorie
            </span>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              data-testid="documents-upload-category"
              list="documents-category-suggestions"
              placeholder="z. B. Verträge, Steuer …"
              className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#ff5a36]"
            />
            <datalist id="documents-category-suggestions">
              {uniqueCats.map((c) => <option key={c} value={c} />)}
            </datalist>
            <div className="mt-1 text-[10px] text-[#a8a29e]">
              Frei wählbar oder aus vorhandenen wählen. Leer lassen = „Ohne Kategorie“.
            </div>
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] block mb-1">
              Bemerkung
            </span>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              data-testid="documents-upload-note"
              placeholder="Optional …"
              className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#ff5a36] resize-none"
            />
          </label>
          <div>
            <span className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] block mb-1">
              Datei · PDF oder JPG · max. 20 MB
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/jpeg,image/jpg"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              data-testid="documents-upload-file"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center gap-2 bg-[#fbf9f6] border border-dashed border-[#e2e8f0] rounded-xl px-4 py-3 text-sm text-[#475569] hover:border-[#ff5a36] hover:bg-[#fff7ed]"
            >
              <Upload size={14} />
              <span className="truncate">
                {file ? `${file.name} · ${formatBytes(file.size)}` : "Datei auswählen …"}
              </span>
            </button>
          </div>
        </div>
        <div className="px-6 py-4 bg-[#fafaf9] flex items-center justify-end gap-2 border-t border-[#f1f5f9]">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold tracking-widest uppercase text-[#78716c] hover:text-[#0f172a] px-4 py-2"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !file}
            data-testid="documents-upload-submit"
            className={`inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase px-4 py-2.5 rounded-full transition-colors ${
              busy || !file
                ? "bg-[#e7e5e4] text-[#a8a29e] cursor-not-allowed"
                : "bg-[#ff5a36] text-white hover:bg-[#e94418]"
            }`}
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            Hochladen
          </button>
        </div>
      </div>
    </div>
  );
}


function DocEditForm({ doc, categories, onCancel, onSave }) {
  const [title, setTitle] = useState(doc.title || "");
  const [note, setNote] = useState(doc.note || "");
  const [category, setCategory] = useState(doc.category || "");
  const uniqueCats = useMemo(
    () => Array.from(new Set(categories.map((c) => c.name).filter(Boolean))),
    [categories],
  );
  return (
    <div className="flex-1 min-w-0 space-y-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        data-testid={`documents-edit-title-${doc.id}`}
        className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-xl px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
      />
      <input
        type="text"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        data-testid={`documents-edit-category-${doc.id}`}
        list={`documents-edit-cat-list-${doc.id}`}
        placeholder="Kategorie (frei wählbar)"
        className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-xl px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
      />
      <datalist id={`documents-edit-cat-list-${doc.id}`}>
        {uniqueCats.map((c) => <option key={c} value={c} />)}
      </datalist>
      <textarea
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        data-testid={`documents-edit-note-${doc.id}`}
        className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-xl px-3 py-2 focus:outline-none focus:border-[#ff5a36] resize-none"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onSave(doc.id, { title: title.trim(), note: note.trim(), category: category.trim() })}
          data-testid={`documents-edit-save-${doc.id}`}
          className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase bg-[#0f172a] text-white px-3 py-2 rounded-full hover:opacity-90"
        >
          <Check size={11} />
          Speichern
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-[10px] font-semibold tracking-widest uppercase text-[#78716c] hover:text-[#0f172a] px-3 py-2"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}


function formatBytes(bytes) {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes, i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("de-CH", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}
