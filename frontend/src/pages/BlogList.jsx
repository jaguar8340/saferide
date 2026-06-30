import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Clock, Tag, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";
import { api, formatApiError, resolveUrl } from "@/lib/api";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import AdminToolbar from "@/components/edit/AdminToolbar";

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

export default function BlogList() {
  const { lang, pick, t } = useLang();
  const { editMode, content } = useEdit();
  const [posts, setPosts] = useState(null);
  const [creating, setCreating] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category");
  const activeTag = searchParams.get("tag");

  useEffect(() => {
    document.title = lang === "de" ? "Blog · Safe Ride" : "Blog · Safe Ride";
  }, [lang]);

  // Load posts (admin sees drafts + scheduled too)
  useEffect(() => {
    let cancel = false;
    const url = editMode ? "/blog/admin" : "/blog";
    api
      .get(url)
      .then((r) => !cancel && setPosts(r.data || []))
      .catch(() => !cancel && setPosts([]));
    return () => {
      cancel = true;
    };
  }, [editMode]);

  const filtered = useMemo(() => {
    if (!posts) return [];
    return posts.filter((p) => {
      if (activeCategory && !(p.categories || []).includes(activeCategory)) return false;
      if (activeTag && !(p.tags || []).includes(activeTag)) return false;
      return true;
    });
  }, [posts, activeCategory, activeTag]);

  const allCategories = useMemo(() => {
    const set = new Set();
    (posts || []).forEach((p) => (p.categories || []).forEach((c) => set.add(c)));
    return Array.from(set).sort();
  }, [posts]);

  const createPost = async () => {
    setCreating(true);
    try {
      const slug = `neuer-beitrag-${Date.now()}`;
      const r = await api.post("/blog", {
        slug,
        title_de: "Neuer Beitrag",
        title_en: "New post",
        excerpt_de: "Kurze Zusammenfassung…",
        excerpt_en: "Short summary…",
        body_de: "Klicken zum Bearbeiten…",
        body_en: "Click to edit…",
        hero_image_url: "https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=1600",
        author_name: content?.about?.badge_name || "Nadine Stäubli",
        author_role_de: "Fahrlehrerin",
        author_role_en: "Driving instructor",
        author_image_url: content?.about?.image_url || "",
        author_bio_de: "Über die Autorin…",
        author_bio_en: "About the author…",
        categories: [],
        tags: [],
        reading_time_min: 3,
        status: "draft",
        published_at: new Date().toISOString(),
      });
      setPosts((cur) => [r.data, ...(cur || [])]);
      toast.success("Beitrag erstellt – in der Detailansicht bearbeiten");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setCreating(false);
    }
  };

  if (posts === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbf9f6] text-[#0f172a]">
        <span className="text-xs font-semibold tracking-widest uppercase opacity-50">Lade…</span>
      </div>
    );
  }

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <main data-testid="blog-list-page" className="min-h-screen bg-[#fbf9f6] text-[#0f172a] font-sans">
      <Header />

      {/* Hero */}
      <section className="pt-16 md:pt-24 pb-12 md:pb-16">
        <div className="container-x px-5 md:px-8 lg:px-12">
          <div className="flex items-center gap-2 mb-5">
            <span className="dot-accent animate-pulse-accent" />
            <span className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]">
              Blog
            </span>
          </div>
          <h1
            className="font-display leading-[0.92] tracking-tight max-w-4xl"
            style={{ fontSize: "clamp(2.6rem, 6vw, 5.6rem)" }}
          >
            {lang === "de" ? (
              <>
                Geschichten und <span className="font-serif-i text-[#ff5a36]">Wissen</span> rund ums Fahren
              </>
            ) : (
              <>
                Stories and <span className="font-serif-i text-[#ff5a36]">knowledge</span> around driving
              </>
            )}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-[#475569] leading-relaxed font-medium">
            {lang === "de"
              ? "Tipps, Coaching-Insights und ehrliche Geschichten aus 10+ Jahren Fahrschule. Geschrieben von Nadine selbst."
              : "Tips, coaching insights and honest stories from 10+ years of driving school. Written by Nadine herself."}
          </p>

          {/* Filter chips */}
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <Link
              to="/blog"
              data-testid="blog-filter-all"
              className={`text-xs font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full transition-colors ${
                !activeCategory && !activeTag
                  ? "bg-[#0f172a] text-white"
                  : "bg-white border border-[#e2e8f0] text-[#0f172a] hover:border-[#ff5a36]"
              }`}
            >
              Alle
            </Link>
            {allCategories.map((c) => (
              <Link
                key={c}
                to={`/blog?category=${encodeURIComponent(c)}`}
                data-testid={`blog-filter-category-${c}`}
                className={`text-xs font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full transition-colors ${
                  activeCategory === c
                    ? "bg-[#ff5a36] text-white"
                    : "bg-white border border-[#e2e8f0] text-[#0f172a] hover:border-[#ff5a36]"
                }`}
              >
                {c}
              </Link>
            ))}
            {editMode && (
              <button
                onClick={createPost}
                disabled={creating}
                data-testid="blog-create"
                className="ml-2 inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full bg-[#ff5a36] text-white hover:opacity-90 disabled:opacity-50"
              >
                {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Neuer Beitrag
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Featured post */}
      {featured && (
        <section className="pb-12 md:pb-16">
          <div className="container-x px-5 md:px-8 lg:px-12">
            <Link
              to={`/blog/${featured.slug}`}
              data-testid={`blog-post-featured-${featured.slug}`}
              className="group block bg-white rounded-[2rem] overflow-hidden border border-[#e2e8f0] hover:border-[#ff5a36] transition-all duration-300"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="relative aspect-[4/3] lg:aspect-auto overflow-hidden">
                  {featured.hero_image_url && (
                    <img
                      src={resolveUrl(featured.hero_image_url)}
                      alt={pick(featured.title_de, featured.title_en)}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  )}
                  {featured.status !== "published" && (
                    <span className="absolute top-4 left-4 bg-[#0f172a] text-white text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full">
                      {featured.status === "scheduled" ? "Geplant" : "Entwurf"}
                    </span>
                  )}
                </div>
                <div className="p-8 md:p-10 lg:p-12 flex flex-col justify-center">
                  <div className="flex items-center gap-3 text-xs font-semibold tracking-widest uppercase text-[#475569] mb-5">
                    {(featured.categories || []).slice(0, 2).map((c) => (
                      <span key={c} className="text-[#ff5a36]">
                        {c}
                      </span>
                    ))}
                    <span className="text-[#94a3b8]">·</span>
                    <span>{formatDate(featured.published_at, lang)}</span>
                    {featured.reading_time_min && (
                      <>
                        <span className="text-[#94a3b8]">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={11} /> {featured.reading_time_min} {lang === "de" ? "Min" : "min"}
                        </span>
                      </>
                    )}
                  </div>
                  <h2
                    className="font-display leading-[0.98] tracking-tight"
                    style={{ fontSize: "clamp(1.8rem, 3.4vw, 3rem)" }}
                  >
                    {pick(featured.title_de, featured.title_en)}
                  </h2>
                  <p className="mt-5 text-base text-[#475569] leading-relaxed font-medium">
                    {pick(featured.excerpt_de, featured.excerpt_en)}
                  </p>
                  <span className="mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-[#ff5a36]">
                    {lang === "de" ? "Beitrag lesen" : "Read post"}
                    <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Rest grid */}
      {rest.length > 0 && (
        <section className="pb-24 md:pb-32">
          <div className="container-x px-5 md:px-8 lg:px-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {rest.map((p, i) => (
                <motion.div
                  key={p.slug}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: (i % 3) * 0.05 }}
                >
                  <Link
                    to={`/blog/${p.slug}`}
                    data-testid={`blog-post-card-${p.slug}`}
                    className="group block bg-white rounded-3xl overflow-hidden border border-[#e2e8f0] hover:border-[#ff5a36] hover:-translate-y-1 transition-all duration-300 h-full"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-[#fbf9f6]">
                      {p.hero_image_url && (
                        <img
                          src={resolveUrl(p.hero_image_url)}
                          alt={pick(p.title_de, p.title_en)}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      )}
                      {p.status !== "published" && (
                        <span className="absolute top-3 left-3 bg-[#0f172a] text-white text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full">
                          {p.status === "scheduled" ? "Geplant" : "Entwurf"}
                        </span>
                      )}
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-2 text-[10px] font-semibold tracking-widest uppercase text-[#475569] mb-3">
                        {(p.categories || []).slice(0, 1).map((c) => (
                          <span key={c} className="text-[#ff5a36]">{c}</span>
                        ))}
                        <span className="text-[#94a3b8]">·</span>
                        <span>{formatDate(p.published_at, lang)}</span>
                      </div>
                      <h3 className="font-display text-xl leading-tight tracking-tight">
                        {pick(p.title_de, p.title_en)}
                      </h3>
                      <p className="mt-3 text-sm text-[#475569] leading-relaxed font-medium line-clamp-3">
                        {pick(p.excerpt_de, p.excerpt_en)}
                      </p>
                      <div className="mt-5 flex items-center justify-between">
                        <span className="text-xs text-[#94a3b8] inline-flex items-center gap-1">
                          <Clock size={11} /> {p.reading_time_min || 3} {lang === "de" ? "Min" : "min"}
                        </span>
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#fbf9f6] text-[#0f172a] group-hover:bg-[#ff5a36] group-hover:text-white transition-colors">
                          <ArrowUpRight size={14} />
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {filtered.length === 0 && (
        <section className="pb-24">
          <div className="container-x px-5 md:px-8 lg:px-12 text-center text-[#475569]">
            {lang === "de" ? "Keine Beiträge gefunden." : "No posts found."}
          </div>
        </section>
      )}

      <Footer data={content?.contact} />
      <AdminToolbar />
    </main>
  );
}
