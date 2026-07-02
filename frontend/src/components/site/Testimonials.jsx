import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Star, Quote, Plus, Trash2, Loader2, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";
import { api, formatApiError } from "@/lib/api";
import Editable from "@/components/edit/Editable";
import SectionTitle from "@/components/site/SectionTitle";
import GoogleIcon from "@/components/site/GoogleIcon";

/**
 * Renders a pasted 3rd-party widget snippet (e.g. Elfsight Google Reviews).
 * React's `dangerouslySetInnerHTML` renders inline `<script>` tags as inert
 * text, so we re-execute them manually after mount. Reachable only via
 * authenticated admin editing – raw HTML injection is intentional.
 */
function ReviewsEmbedHtml({ html }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !html) return;
    ref.current.innerHTML = html;
    ref.current.querySelectorAll("script").forEach((oldScript) => {
      const s = document.createElement("script");
      Array.from(oldScript.attributes).forEach((a) => s.setAttribute(a.name, a.value));
      s.text = oldScript.textContent;
      oldScript.parentNode.replaceChild(s, oldScript);
    });
  }, [html]);
  return (
    <div
      ref={ref}
      data-testid="reviews-embed-html"
      className="reviews-embed-html w-full"
      style={{ minHeight: "400px" }}
    />
  );
}

export default function Testimonials({ items }) {
  const { lang, pick, t } = useLang();
  const { editMode, reloadTestimonials, content } = useEdit();
  const [busy, setBusy] = useState(null);
  const [adding, setAdding] = useState(false);

  const overline = pick(content?.reviews_overline_de, content?.reviews_overline_en) || t.reviews.overline;
  const title = pick(content?.reviews_title_de, content?.reviews_title_en) || t.reviews.title;
  const ratingValue = content?.reviews_rating_value || "5.0";
  const ratingLabel = pick(content?.reviews_rating_label_de, content?.reviews_rating_label_en) || t.reviews.rating;
  const embedHtml = content?.reviews_embed_html || "";
  const hasEmbed = !!embedHtml.trim();

  // In view mode: hide the section only if there is neither an embed widget
  // nor any manual review card to show.
  if (!hasEmbed && !items?.length && !editMode) return null;

  const updateField = async (id, field, value) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    try {
      await api.put(`/testimonials/${id}`, { ...it, [field]: value });
      await reloadTestimonials();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const remove = async (id) => {
    if (!confirm("Bewertung wirklich löschen?")) return;
    setBusy(id);
    try {
      await api.delete(`/testimonials/${id}`);
      await reloadTestimonials();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(null);
    }
  };

  const addNew = async () => {
    setAdding(true);
    try {
      const today = new Date().toLocaleDateString("de-CH", { month: "long", year: "numeric" });
      await api.post("/testimonials", {
        name: "Neue Bewertung",
        rating: 5,
        date: today,
        text_de: "Klicken zum Bearbeiten…",
        text_en: "Click to edit…",
      });
      await reloadTestimonials();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setAdding(false);
    }
  };

  return (
    <section
      id="reviews"
      data-testid="reviews-section"
      className="section-pad bg-white border-y border-[#e2e8f0]"
    >
      <div className="container-x">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="dot-accent" />
              <Editable
                path={`reviews_overline_${lang}`}
                value={overline}
                className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]"
              />
            </div>
            <SectionTitle
              path={`reviews_title_${lang}`}
              value={title}
              className="max-w-2xl"
              style={{ fontSize: "clamp(2.1rem, 4.4vw, 4rem)" }}
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-3 bg-[#fbf9f6] rounded-full px-5 py-3 text-sm">
              <GoogleIcon size={16} />
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} className="text-[#ff5a36]" fill="#ff5a36" />
                ))}
              </div>
              <Editable
                path="reviews_rating_value"
                value={ratingValue}
                className="font-semibold text-[#0f172a]"
              />
              <span className="text-[#475569]">
                · <Editable path={`reviews_rating_label_${lang}`} value={ratingLabel} />
              </span>
            </div>
            <a
              href={content?.google_reviews_url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="reviews-google-cta"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0f172a] hover:text-[#ff5a36] transition-colors"
            >
              {lang === "de" ? "Auf Google ansehen" : "View on Google"}
              <ArrowUpRight size={14} />
            </a>
            {editMode && !hasEmbed && (
              <button
                onClick={addNew}
                disabled={adding}
                data-testid="reviews-add-btn"
                className="btn-accent text-sm py-2.5 px-4 disabled:opacity-60"
              >
                {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Neu
              </button>
            )}
          </div>
        </div>

        {/* Edit-mode: embed-code textarea (Elfsight / SnapWidget / …) */}
        {editMode && (
          <details className="mb-8 rounded-2xl border border-[#ff5a36]/25 bg-white p-5" open={hasEmbed}>
            <summary className="cursor-pointer text-sm font-semibold text-[#0f172a] flex items-center gap-2">
              <span className="w-6 h-6 rounded-md icon-bubble-accent inline-flex items-center justify-center text-[10px]">⚡</span>
              Live-Widget einbetten (Elfsight Google Reviews, SnapWidget, …)
            </summary>
            <div className="mt-3">
              <Editable
                path="reviews_embed_html"
                value={embedHtml}
                placeholder="<script src='https://elfsightcdn.com/platform.js' async></script><div class='elfsight-app-…' data-elfsight-app-lazy></div>"
                multiline
                className="text-[11px] block break-all font-mono text-[#0f172a] bg-[#f8fafc] rounded p-3 min-h-[5em]"
              />
              <p className="text-[10px] text-[#94a3b8] mt-2 leading-relaxed">
                Wenn ausgefüllt, wird der eingebettete Live-Feed statt der einzelnen Bewertungskarten angezeigt. Zum Zurücksetzen: Feld leeren.
              </p>
            </div>
          </details>
        )}

        {/* Content: embed widget OR manual review cards */}
        {hasEmbed ? (
          <div>
            {editMode && (
              <div className="mb-6 rounded-2xl border-2 border-dashed border-[#ff5a36]/30 bg-[#fff6ef] p-4 text-center text-xs text-[#e74123]">
                <div className="font-semibold mb-1">Live-Widget aktiv</div>
                <div className="text-[#475569]">Der eingebettete Google-Reviews-Feed wird unten angezeigt. Zum Testen: Live-Modus wechseln.</div>
              </div>
            )}
            <ReviewsEmbedHtml html={embedHtml} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((r, i) => (
            <motion.div
              key={r.id || i}
              data-testid={`review-card-${i}`}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.06 }}
              className={`relative rounded-3xl p-7 md:p-8 border ${
                i === 0
                  ? "bg-[#ff5a36] text-white border-[#ff5a36]"
                  : "bg-[#fbf9f6] text-[#0f172a] border-[#e2e8f0]"
              }`}
            >
              {editMode && (
                <button
                  onClick={() => remove(r.id)}
                  disabled={busy === r.id}
                  data-testid={`review-delete-${r.id}`}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/90 text-[#0f172a] hover:bg-[#ff5a36] hover:text-white inline-flex items-center justify-center transition-colors"
                  aria-label="Löschen"
                >
                  {busy === r.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </button>
              )}
              <Quote
                size={24}
                className={i === 0 ? "text-white/50 mb-4" : "text-[#ff5a36] mb-4"}
              />
              {editMode ? (
                <textarea
                  defaultValue={pick(r.text_de, r.text_en || r.text_de)}
                  onBlur={(e) => updateField(r.id, `text_${lang}`, e.target.value)}
                  data-testid={`review-text-${r.id}`}
                  rows={4}
                  className={`w-full bg-transparent leading-relaxed font-medium text-base resize-y focus:outline-none rounded-md p-2 -m-2 ${
                    i === 0
                      ? "text-white placeholder:text-white/50 focus:bg-white/10"
                      : "text-[#0f172a] focus:bg-white"
                  }`}
                />
              ) : (
                <p className="leading-relaxed font-medium text-base">
                  &ldquo;{pick(r.text_de, r.text_en || r.text_de)}&rdquo;
                </p>
              )}
              <div className={`mt-6 pt-5 border-t flex items-center justify-between ${i === 0 ? "border-white/20" : "border-[#e2e8f0]"}`}>
                <div className="flex-1 min-w-0">
                  {editMode ? (
                    <input
                      type="text"
                      defaultValue={r.name}
                      onBlur={(e) => updateField(r.id, "name", e.target.value)}
                      data-testid={`review-name-${r.id}`}
                      className={`font-semibold text-base bg-transparent focus:outline-none rounded-md px-2 -mx-2 ${
                        i === 0 ? "text-white focus:bg-white/10" : "text-[#0f172a] focus:bg-white"
                      }`}
                    />
                  ) : (
                    <div className="font-semibold text-base">{r.name}</div>
                  )}
                  <div className="flex items-center gap-1.5 mt-1">
                    <GoogleIcon size={10} className="shrink-0" />
                    {editMode ? (
                      <input
                        type="text"
                        defaultValue={r.date}
                        onBlur={(e) => updateField(r.id, "date", e.target.value)}
                        data-testid={`review-date-${r.id}`}
                        className={`text-[10px] tracking-widest uppercase font-semibold bg-transparent focus:outline-none rounded-md px-1 -mx-1 max-w-[10rem] ${
                          i === 0 ? "text-white/70 focus:bg-white/10" : "text-[#94a3b8] focus:bg-white"
                        }`}
                      />
                    ) : (
                      <div className={`text-[10px] tracking-widest uppercase font-semibold ${i === 0 ? "text-white/60" : "text-[#94a3b8]"}`}>
                        Google · {r.date}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex">
                  {[...Array(r.rating || 5)].map((_, idx) => (
                    <Star
                      key={idx}
                      size={12}
                      className={i === 0 ? "text-white" : "text-[#ff5a36]"}
                      fill={i === 0 ? "#fff" : "#ff5a36"}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
          </div>
        )}
      </div>
    </section>
  );
}
