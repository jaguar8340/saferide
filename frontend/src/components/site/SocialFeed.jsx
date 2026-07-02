import { motion } from "framer-motion";
import { ArrowUpRight, Instagram, ExternalLink } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";
import Editable from "@/components/edit/Editable";
import EditableImage from "@/components/edit/EditableImage";
import SectionTitle from "@/components/site/SectionTitle";
import { resolveUrl } from "@/lib/api";

// TikTok has no lucide icon – ship a minimal inline SVG matching the brand mark.
function TikTokIcon({ size = 18, className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.83 20.1a6.34 6.34 0 0 0 10.86-4.43V9.75a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.87-1.18Z" />
    </svg>
  );
}

/**
 * "Follow us" social section shown at the bottom of the homepage before the
 * contact form. Two side-by-side cards (Instagram + TikTok) with a small grid
 * of preview thumbnails that the admin uploads via the CMS. Not a live-syncing
 * feed – Nadine manually refreshes the tiles when she posts something new.
 * This avoids paid widget subscriptions (Elfsight/Behold) and keeps the design
 * fully editable through the existing Wix-style CMS.
 */
export default function SocialFeed() {
  const { lang, pick } = useLang();
  const { content, editMode } = useEdit();
  const data = content?.social || {};

  const overline = pick(data.overline_de, data.overline_en) || (lang === "de" ? "Social" : "Social");
  const title = pick(data.title_de, data.title_en) || (lang === "de" ? "Folge uns auf Social Media" : "Follow us on social media");
  const subtitle = pick(data.subtitle_de, data.subtitle_en) || (lang === "de"
    ? "Hinter-den-Kulissen, Tipps und Prüfungs-Momente – jede Woche neu."
    : "Behind the scenes, tips and exam moments – fresh every week.");

  const igHandle = data.instagram_handle || "@fahrschule.safe.ride";
  const igUrl = data.instagram_url || "https://www.instagram.com/fahrschule.safe.ride/";
  const ttHandle = data.tiktok_handle || "@nadine_staeubli";
  const ttUrl = data.tiktok_url || "https://www.tiktok.com/@nadine_staeubli";

  const igTiles = data.instagram_tiles || [];
  const ttTiles = data.tiktok_tiles || [];

  // Ensure at least 6 IG placeholders and 3 TT placeholders when editing so
  // the admin can upload into empty slots. In view mode, empty slots are
  // simply hidden.
  const igSlots = editMode
    ? Array.from({ length: 6 }).map((_, i) => igTiles[i] || { id: `ig-${i}`, image_url: "" })
    : igTiles.filter((t) => t?.image_url);
  const ttSlots = editMode
    ? Array.from({ length: 3 }).map((_, i) => ttTiles[i] || { id: `tt-${i}`, image_url: "" })
    : ttTiles.filter((t) => t?.image_url);

  if (!editMode && igSlots.length === 0 && ttSlots.length === 0) return null;

  return (
    <section
      id="social"
      data-testid="social-feed-section"
      className="section-pad bg-blush-soft border-t border-[#e2e8f0]"
    >
      <div className="container-x">
        {/* Header */}
        <div className="max-w-3xl mb-12 md:mb-16">
          <div className="flex items-center gap-2 mb-4">
            <span className="dot-accent animate-pulse-accent" />
            <Editable
              path={`social.overline_${lang}`}
              value={overline}
              className="text-xs font-semibold tracking-[0.18em] uppercase text-[#e74123]"
            />
          </div>
          <SectionTitle
            path={`social.title_${lang}`}
            value={title}
            className=""
            style={{ fontSize: "clamp(2.1rem, 4.4vw, 4rem)" }}
          />
          <Editable
            path={`social.subtitle_${lang}`}
            value={subtitle}
            as="p"
            multiline
            className="mt-5 text-lg text-[#475569] leading-relaxed font-medium block max-w-2xl"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* --- Instagram Card --- */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5 }}
            data-testid="instagram-card"
            className="rounded-3xl bg-white border border-[#e2e8f0] p-6 md:p-8 shadow-sm hover:shadow-xl hover:border-[#ff5a36]/40 transition-all"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl icon-bubble-accent inline-flex items-center justify-center">
                  <Instagram size={20} strokeWidth={2} />
                </span>
                <div>
                  <div className="font-display text-lg leading-tight">Instagram</div>
                  <Editable
                    path="social.instagram_handle"
                    value={igHandle}
                    className="text-xs text-[#475569] block"
                  />
                </div>
              </div>
              <a
                href={igUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="social-instagram-follow"
                className="btn-accent !py-2 !px-4 !text-xs"
              >
                {lang === "de" ? "Folgen" : "Follow"}
                <ArrowUpRight size={14} />
              </a>
            </div>

            {editMode && (
              <div className="mb-4 -mt-2">
                <label className="text-[10px] font-semibold tracking-widest uppercase text-[#94a3b8] block mb-1">
                  Instagram-Profil-URL
                </label>
                <Editable
                  path="social.instagram_url"
                  value={igUrl}
                  className="text-xs text-[#0f172a] block break-all"
                />
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {igSlots.map((tile, i) => (
                <div
                  key={tile.id || i}
                  data-testid={`instagram-tile-${i}`}
                  className="relative aspect-square rounded-xl overflow-hidden bg-[#fbf9f6] border border-[#e2e8f0]"
                >
                  {tile.image_url ? (
                    <a
                      href={tile.link_url || igUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full h-full group"
                    >
                      <EditableImage
                        path={`social.instagram_tiles.${i}.image_url`}
                        src={resolveUrl(tile.image_url)}
                        alt={`Instagram ${i + 1}`}
                        imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </a>
                  ) : (
                    <EditableImage
                      path={`social.instagram_tiles.${i}.image_url`}
                      src=""
                      alt=""
                      imgClassName="w-full h-full object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* --- TikTok Card --- */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            data-testid="tiktok-card"
            className="rounded-3xl bg-[#0f172a] text-white border border-[#0f172a] p-6 md:p-8 shadow-sm hover:shadow-xl transition-all"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl bg-white text-[#0f172a] inline-flex items-center justify-center">
                  <TikTokIcon size={22} />
                </span>
                <div>
                  <div className="font-display text-lg leading-tight">TikTok</div>
                  <Editable
                    path="social.tiktok_handle"
                    value={ttHandle}
                    className="text-xs text-white/70 block"
                  />
                </div>
              </div>
              <a
                href={ttUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="social-tiktok-follow"
                className="inline-flex items-center gap-1.5 bg-white text-[#0f172a] font-semibold text-xs px-4 py-2 rounded-full hover:bg-[#ff5a36] hover:text-white transition-colors"
              >
                {lang === "de" ? "Folgen" : "Follow"}
                <ArrowUpRight size={14} />
              </a>
            </div>

            {editMode && (
              <div className="mb-4 -mt-2">
                <label className="text-[10px] font-semibold tracking-widest uppercase text-white/50 block mb-1">
                  TikTok-Profil-URL
                </label>
                <Editable
                  path="social.tiktok_url"
                  value={ttUrl}
                  className="text-xs text-white block break-all"
                />
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {ttSlots.map((tile, i) => (
                <div
                  key={tile.id || i}
                  data-testid={`tiktok-tile-${i}`}
                  className="relative aspect-[9/16] rounded-xl overflow-hidden bg-black/40 border border-white/10"
                >
                  {tile.image_url ? (
                    <a
                      href={tile.link_url || ttUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full h-full group"
                    >
                      <EditableImage
                        path={`social.tiktok_tiles.${i}.image_url`}
                        src={resolveUrl(tile.image_url)}
                        alt={`TikTok ${i + 1}`}
                        imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white/90 text-[#0f172a] inline-flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink size={13} />
                      </span>
                    </a>
                  ) : (
                    <EditableImage
                      path={`social.tiktok_tiles.${i}.image_url`}
                      src=""
                      alt=""
                      imgClassName="w-full h-full object-cover"
                    />
                  )}
                </div>
              ))}
            </div>

            <p className="mt-5 text-xs text-white/50 leading-relaxed">
              {lang === "de"
                ? "Tippe eine Kachel an, um das Original-Video auf TikTok zu öffnen."
                : "Tap a tile to open the original video on TikTok."}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
