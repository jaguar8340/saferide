import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Tag as TagIcon, Calendar, Trash2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";
import { api, formatApiError, resolveUrl } from "@/lib/api";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import EditableImage from "@/components/edit/EditableImage";
import AdminToolbar from "@/components/edit/AdminToolbar";
import CanonicalLink from "@/components/site/CanonicalLink";

function formatDate(iso, lang) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(lang === "de" ? "de-CH" : "en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

/** Inline-editable contenteditable wrapper bound to a single field of the post. */
function EditableField({ value, onUpdate, multiline = false, className = "", as = "span", testId, placeholder = "" }) {
  const { editMode } = useEdit();
  const Tag = as;
  if (!editMode) {
    return (
      <Tag data-testid={testId} className={className}>
        {value || placeholder}
      </Tag>
    );
  }
  return (
    <Tag
      data-testid={testId}
      className={`${className} outline-none focus:bg-[#ff5a36]/10 rounded px-1 -mx-1`}
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => {
        const next = multiline ? e.currentTarget.innerText : e.currentTarget.textContent;
        if ((next ?? "") !== (value ?? "")) onUpdate(next);
      }}
      style={multiline ? { whiteSpace: "pre-wrap" } : undefined}
    >
      {value || ""}
    </Tag>
  );
}

export default function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { lang, pick } = useLang();
  const { editMode, content } = useEdit();
  const [post, setPost] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(() => {
    setNotFound(false);
    api
      .get(`/blog/${slug}`)
      .then((r) => setPost(r.data))
      .catch(() => setNotFound(true));
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (post) {
      document.title =
        (lang === "de" ? post.title_de : post.title_en) + " · Safe Ride Blog";
    }
  }, [post, lang]);

  // Patch helper
  const patch = async (patchObj) => {
    try {
      const r = await api.patch(`/blog/${slug}`, patchObj);
      setPost(r.data);
    } catch (err) {
      toast.error(formatApiError(err, "Speichern fehlgeschlagen"));
    }
  };

  const remove = async () => {
    if (!confirm("Diesen Beitrag wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) return;
    try {
      await api.delete(`/blog/${slug}`);
      toast.success("Beitrag gelöscht");
      navigate("/blog");
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  // Tag/Category management
  const addTag = async () => {
    const val = prompt("Neuer Tag:");
    if (!val) return;
    await patch({ tags: [...(post.tags || []), val.trim()] });
  };
  const removeTag = (t) => () => patch({ tags: (post.tags || []).filter((x) => x !== t) });
  const addCategory = async () => {
    const val = prompt("Neue Kategorie:");
    if (!val) return;
    await patch({ categories: [...(post.categories || []), val.trim()] });
  };
  const removeCategory = (c) => () => patch({ categories: (post.categories || []).filter((x) => x !== c) });

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fbf9f6] text-[#0f172a] gap-4 px-5">
        <span className="text-xs font-semibold tracking-widest uppercase opacity-50">404</span>
        <h1 className="font-display text-4xl">Beitrag nicht gefunden</h1>
        <Link to="/blog" className="btn-accent text-sm">
          <ArrowLeft size={14} /> Zurück zum Blog
        </Link>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbf9f6] text-[#0f172a]">
        <span className="text-xs font-semibold tracking-widest uppercase opacity-50">Lade…</span>
      </div>
    );
  }

  return (
    <main data-testid="blog-post-page" className="min-h-screen bg-[#fbf9f6] text-[#0f172a] font-sans">
      <CanonicalLink path={`/blog/${slug}`} />
      <Header />

      {/* Back + admin actions */}
      <div className="container-x px-5 md:px-8 lg:px-12 pt-24 md:pt-28">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/blog"
            data-testid="blog-back-link"
            className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-[#475569] hover:text-[#ff5a36]"
          >
            <ArrowLeft size={12} /> Blog
          </Link>
          {editMode && (
            <div className="flex items-center gap-2">
              <select
                data-testid="blog-status-select"
                value={post.status || "draft"}
                onChange={(e) => patch({ status: e.target.value })}
                className="text-xs font-semibold tracking-widest uppercase bg-white border border-[#e2e8f0] rounded-full px-3 py-1.5 focus:outline-none focus:border-[#ff5a36]"
              >
                <option value="draft">Entwurf</option>
                <option value="scheduled">Geplant</option>
                <option value="published">Veröffentlicht</option>
              </select>
              <button
                type="button"
                onClick={remove}
                data-testid="blog-delete"
                className="text-[#94a3b8] hover:text-[#ff5a36] transition-colors w-9 h-9 inline-flex items-center justify-center rounded-full bg-white border border-[#e2e8f0]"
                aria-label="Beitrag löschen"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hero */}
      <article className="container-x px-5 md:px-8 lg:px-12 pt-8 md:pt-12 pb-16 md:pb-24 max-w-4xl mx-auto">
        <header>
          <div className="flex items-center flex-wrap gap-2 mb-6">
            {(post.categories || []).map((c) => (
              <span
                key={c}
                data-testid={`blog-post-category-${c}`}
                className="group inline-flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase bg-[#ff5a36]/10 text-[#ff5a36] px-2.5 py-1 rounded-full"
              >
                {c}
                {editMode && (
                  <button
                    onClick={removeCategory(c)}
                    className="opacity-60 hover:opacity-100 ml-0.5"
                    aria-label="Kategorie entfernen"
                  >
                    <X size={10} />
                  </button>
                )}
              </span>
            ))}
            {editMode && (
              <button
                onClick={addCategory}
                data-testid="blog-add-category"
                className="text-[10px] font-semibold tracking-widest uppercase bg-white border border-dashed border-[#94a3b8] text-[#475569] px-2.5 py-1 rounded-full hover:border-[#ff5a36] hover:text-[#ff5a36]"
              >
                <Plus size={10} className="inline mr-1" /> Kategorie
              </button>
            )}
          </div>

          <h1
            className="font-display leading-[0.95] tracking-tight"
            style={{ fontSize: "clamp(2.2rem, 5vw, 4.4rem)" }}
          >
            <EditableField
              as="span"
              testId="blog-post-title"
              className="inline"
              value={pick(post.title_de, post.title_en)}
              onUpdate={(v) => patch({ [`title_${lang}`]: v })}
            />
          </h1>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-[#475569] font-medium">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={13} /> {formatDate(post.published_at, lang)}
            </span>
            <span className="text-[#94a3b8]">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={13} />
              {editMode ? (
                <input
                  data-testid="blog-reading-time"
                  type="number"
                  min="1"
                  max="60"
                  value={post.reading_time_min || 3}
                  onChange={(e) => patch({ reading_time_min: parseInt(e.target.value, 10) || 3 })}
                  className="w-12 bg-white border border-[#e2e8f0] rounded px-1 text-center"
                />
              ) : (
                <span>{post.reading_time_min || 3}</span>
              )}{" "}
              {lang === "de" ? "Min Lesezeit" : "min read"}
            </span>
            {post.scheduled_publish_at && post.status === "scheduled" && (
              <span className="bg-[#dbeafe] text-[#1d4ed8] px-2.5 py-1 rounded-full text-xs font-semibold">
                {lang === "de" ? "Geplant für" : "Scheduled for"}{" "}
                {formatDate(post.scheduled_publish_at, lang)}
              </span>
            )}
          </div>

          {/* Excerpt */}
          <EditableField
            as="p"
            multiline
            testId="blog-post-excerpt"
            className="mt-8 text-xl md:text-2xl text-[#0f172a] leading-snug font-display tracking-tight block"
            value={pick(post.excerpt_de, post.excerpt_en)}
            onUpdate={(v) => patch({ [`excerpt_${lang}`]: v })}
          />
        </header>

        {/* Hero image */}
        <div className="mt-10 md:mt-14 rounded-[2rem] overflow-hidden aspect-[16/9]">
          <EditableImage
            src={resolveUrl(post.hero_image_url)}
            path="blog.hero_image"
            onUpdate={(u) => patch({ hero_image_url: u })}
            className="w-full h-full"
            imgClassName="w-full h-full object-cover"
            alt={pick(post.title_de, post.title_en)}
          />
        </div>

        {/* Scheduled publish picker (admin only) */}
        {editMode && (
          <div className="mt-8 bg-white border border-[#e2e8f0] rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-3">
            <span className="text-xs font-semibold tracking-widest uppercase text-[#475569] shrink-0">
              Veröffentlichungsdatum
            </span>
            <input
              data-testid="blog-publish-date"
              type="datetime-local"
              value={post.published_at ? post.published_at.slice(0, 16) : ""}
              onChange={(e) => patch({ published_at: new Date(e.target.value).toISOString() })}
              className="bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:border-[#ff5a36]"
            />
            <span className="text-xs font-semibold tracking-widest uppercase text-[#475569] shrink-0 md:ml-4">
              Geplant ab
            </span>
            <input
              data-testid="blog-schedule-date"
              type="datetime-local"
              value={post.scheduled_publish_at ? post.scheduled_publish_at.slice(0, 16) : ""}
              onChange={(e) =>
                patch({
                  scheduled_publish_at: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : null,
                })
              }
              className="bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:border-[#ff5a36]"
            />
          </div>
        )}

        {/* Body */}
        <div className="mt-12 md:mt-16 prose prose-lg max-w-none">
          <EditableField
            as="div"
            multiline
            testId="blog-post-body"
            className="text-lg leading-relaxed text-[#0f172a]/90 font-medium whitespace-pre-line block"
            value={pick(post.body_de, post.body_en)}
            onUpdate={(v) => patch({ [`body_${lang}`]: v })}
          />
        </div>

        {/* Tags */}
        <div className="mt-12 flex flex-wrap items-center gap-2 pt-8 border-t border-[#e2e8f0]">
          <span className="text-xs font-semibold tracking-widest uppercase text-[#94a3b8] mr-2">
            Tags
          </span>
          {(post.tags || []).map((tg) => (
            <Link
              key={tg}
              to={`/blog?tag=${encodeURIComponent(tg)}`}
              data-testid={`blog-post-tag-${tg}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white border border-[#e2e8f0] hover:border-[#ff5a36] hover:text-[#ff5a36] px-3 py-1.5 rounded-full transition-colors"
            >
              <TagIcon size={11} /> {tg}
              {editMode && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    removeTag(tg)();
                  }}
                  className="opacity-60 hover:opacity-100 ml-0.5"
                  aria-label="Tag entfernen"
                >
                  <X size={10} />
                </button>
              )}
            </Link>
          ))}
          {editMode && (
            <button
              onClick={addTag}
              data-testid="blog-add-tag"
              className="inline-flex items-center gap-1 text-xs font-semibold bg-white border border-dashed border-[#94a3b8] text-[#475569] px-3 py-1.5 rounded-full hover:border-[#ff5a36] hover:text-[#ff5a36]"
            >
              <Plus size={10} /> Tag
            </button>
          )}
        </div>

        {/* Author bio */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
          className="mt-16 bg-white border border-[#e2e8f0] rounded-3xl p-8 md:p-10 flex flex-col md:flex-row gap-6 items-start"
        >
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden bg-[#fbf9f6] shrink-0">
            <EditableImage
              src={resolveUrl(post.author_image_url)}
              path="blog.author_image"
              onUpdate={(u) => patch({ author_image_url: u })}
              className="w-full h-full"
              imgClassName="w-full h-full object-cover"
              alt={post.author_name}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold tracking-widest uppercase text-[#475569] mb-2">
              {lang === "de" ? "Über die Autorin" : "About the author"}
            </div>
            <EditableField
              as="h3"
              testId="blog-author-name"
              className="font-display text-2xl tracking-tight"
              value={post.author_name}
              onUpdate={(v) => patch({ author_name: v })}
            />
            <EditableField
              as="div"
              testId="blog-author-role"
              className="text-sm text-[#ff5a36] font-semibold mt-1"
              value={pick(post.author_role_de, post.author_role_en)}
              onUpdate={(v) => patch({ [`author_role_${lang}`]: v })}
            />
            <EditableField
              as="p"
              multiline
              testId="blog-author-bio"
              className="mt-3 text-base text-[#475569] leading-relaxed font-medium block"
              value={pick(post.author_bio_de, post.author_bio_en)}
              onUpdate={(v) => patch({ [`author_bio_${lang}`]: v })}
            />
          </div>
        </motion.div>
      </article>

      <Footer data={content?.contact} />
      <AdminToolbar />
    </main>
  );
}
