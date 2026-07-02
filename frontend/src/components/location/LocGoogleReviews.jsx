import { ArrowUpRight, Star } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";
import Editable from "@/components/edit/Editable";
import GoogleIcon from "@/components/site/GoogleIcon";
import WidgetEmbed from "@/components/site/WidgetEmbed";

/**
 * Google-reviews block on every location landing page.
 *
 * Two mutually exclusive display modes to avoid the previous duplication
 * (widget internal header + manual header showing the same info):
 *   • Widget mode (default when reviews_embed_html is set AND enabled):
 *     render ONLY the live Elfsight widget. It already carries the star
 *     rating, review count and "Bewerten"-CTA inside – nothing else needed.
 *   • Manual fallback mode (widget disabled or empty): render the previous
 *     hand-crafted overline / title / rating badge / description / CTA. Admin
 *     content for these fields is still editable in edit mode when the widget
 *     is toggled OFF.
 */
export default function LocGoogleReviews({ loc, updateField, globalReviewsUrl, globalReviewsCount }) {
  const { lang, pick } = useLang();
  const { editMode, content } = useEdit();

  const reviewsEmbedHtml = content?.reviews_embed_html || "";
  const reviewsEmbedEnabled = content?.reviews_embed_enabled !== false; // default ON
  const showEmbed = !!reviewsEmbedHtml.trim() && reviewsEmbedEnabled;

  return (
    <section className="section-pad bg-white border-y border-[#e2e8f0]" data-testid="loc-google-reviews">
      <div className="container-x px-5 md:px-8 lg:px-12 max-w-4xl mx-auto">
        {showEmbed ? (
          <WidgetEmbed
            html={reviewsEmbedHtml}
            testid="loc-reviews-embed-html"
            minHeight={420}
          />
        ) : (
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-4">
              <GoogleIcon size={20} />
              <Editable
                path={`google_reviews_overline_${lang}`}
                value={pick(loc.google_reviews_overline_de, loc.google_reviews_overline_en)}
                onUpdate={updateField}
                className="text-xs font-semibold tracking-[0.18em] uppercase text-[#475569]"
              />
            </div>
            <Editable
              path={`google_reviews_title_${lang}`}
              value={pick(loc.google_reviews_title_de, loc.google_reviews_title_en)}
              onUpdate={updateField}
              as="h2"
              className="font-display leading-[0.98] tracking-tight block"
              style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)" }}
            />
            <div className="mt-5 inline-flex items-center gap-3 bg-[#fbf9f6] rounded-full px-5 py-2.5 text-sm">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} className="text-[#ff5a36]" fill="#ff5a36" />
                ))}
              </div>
              <span className="font-semibold text-[#0f172a]">{globalReviewsCount || "60+"}</span>
              <span className="text-[#475569]">
                {lang === "de" ? "5-Sterne-Bewertungen" : "5-star reviews"}
              </span>
            </div>
            <Editable
              path={`google_reviews_subtitle_${lang}`}
              value={pick(loc.google_reviews_subtitle_de, loc.google_reviews_subtitle_en)}
              onUpdate={updateField}
              as="p"
              multiline
              className="mt-6 max-w-xl mx-auto text-base text-[#475569] leading-relaxed font-medium block"
            />
            {editMode && (
              <div className="mt-4 max-w-xl mx-auto">
                <label className="text-[10px] font-semibold tracking-widest uppercase text-[#94a3b8] block text-left mb-1">
                  Google-Bewertungen-Link (für diesen Standort)
                </label>
                <input
                  type="url"
                  defaultValue={loc.google_reviews_url || ""}
                  onBlur={(e) => updateField("google_reviews_url", e.target.value)}
                  placeholder="https://g.page/r/…"
                  data-testid="loc-google-reviews-url"
                  className="w-full text-xs bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
                />
              </div>
            )}
            <a
              href={loc.google_reviews_url || globalReviewsUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="loc-google-reviews-cta"
              className="mt-8 inline-flex items-center gap-2 btn-accent"
            >
              <GoogleIcon size={16} />
              <Editable
                path={`google_reviews_cta_${lang}`}
                value={pick(loc.google_reviews_cta_de, loc.google_reviews_cta_en)}
                onUpdate={updateField}
              />
              <ArrowUpRight size={14} />
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
