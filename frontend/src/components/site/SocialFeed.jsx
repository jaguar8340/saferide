import { motion } from "framer-motion";
import { ArrowUpRight, Instagram, HelpCircle, Sparkles } from "lucide-react";
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
 * Extract the shortcode from an Instagram post URL and return the official
 * embed URL. Supports /p/ (Feed posts) and /reel/ (Reels). Returns null if
 * the input isn't recognisable so callers can fall back to a static tile.
 */
function toInstagramEmbedSrc(url) {
  if (!url) return null;
  const match = url.match(/instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/i);
  if (!match) return null;
  return `https://www.instagram.com/p/${match[1]}/embed/captioned/`;
}

/**
 * Extract the numeric video ID from a TikTok URL and return the official
 * embed URL. Only works with full www.tiktok.com URLs (short vt.tiktok.com
 * links aren't resolvable client-side).
 */
function toTikTokEmbedSrc(url) {
  if (!url) return null;
  const match = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/i);
  if (!match) return null;
  return `https://www.tiktok.com/embed/v2/${match[1]}`;
}

/**
 * Individual tile: renders one of three modes depending on which data the
 * admin filled in for this tile:
 *   1. `post_url` matches IG/TikTok pattern → iframe with the real live post
 *   2. `image_url` present                  → uploaded screenshot linked to
 *      `link_url` (or the profile URL as a fallback)
 *   3. Nothing filled in                    → hidden in view mode; shown as
 *      a labelled empty upload target in edit mode
 */
function SocialTile({ platform, index, tile, aspect, profileUrl, embedFn }) {
  const { editMode } = useEdit();
  const embedSrc = embedFn(tile.post_url);

  const wrapperCls = `relative ${aspect} rounded-xl overflow-hidden bg-black/5 border border-black/5`;
  const testid = `${platform}-tile-${index}`;

  // MODE 1 – real live embed from a post URL
  if (embedSrc) {
    return (
      <div className={wrapperCls} data-testid={testid}>
        <iframe
          src={embedSrc}
          title={`${platform} post ${index + 1}`}
          loading="lazy"
          allow="autoplay; encrypted-media; picture-in-picture; web-share"
          allowFullScreen
          scrolling="no"
          referrerPolicy="strict-origin-when-cross-origin"
          className="w-full h-full block"
          style={{ border: 0 }}
        />
        {editMode && (
          <div className="absolute top-1 left-1 right-1 bg-white/90 backdrop-blur-sm rounded-md px-2 py-1 pointer-events-none">
            <span className="text-[10px] font-semibold tracking-widest uppercase text-emerald-700">
              Live-Post
            </span>
          </div>
        )}
      </div>
    );
  }

  // MODE 2 – uploaded screenshot
  if (tile.image_url) {
    return (
      <a
        href={tile.link_url || profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${wrapperCls} block group`}
        data-testid={testid}
      >
        <EditableImage
          path={`social.${platform}_tiles.${index}.image_url`}
          src={resolveUrl(tile.image_url)}
          alt={`${platform} ${index + 1}`}
          imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </a>
    );
  }

  // MODE 3 – empty; hidden in view mode
  if (!editMode) return null;

  return (
    <div className={wrapperCls} data-testid={testid}>
      <EditableImage
        path={`social.${platform}_tiles.${index}.image_url`}
        src=""
        alt=""
        imgClassName="w-full h-full object-cover"
      />
    </div>
  );
}

/**
 * Bottom-of-homepage social section. Two cards: Instagram + TikTok.
 * Each card shows the profile handle, a "Follow" CTA that opens the
 * real profile, and a grid of tiles that Nadine fills in via the CMS.
 *
 * Tiles can be filled in two ways (per tile):
 *   • paste an Instagram post/reel URL or a TikTok video URL →
 *     the real post is embedded as an iframe (no upload needed)
 *   • upload a screenshot + link URL → static tile linked to the post
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

  // In edit mode: always render 6 IG + 3 TikTok slots so Nadine can fill any
  // of them. In view mode: hide empty tiles.
  const igSlots = editMode
    ? Array.from({ length: 6 }).map((_, i) => igTiles[i] || { id: `ig-${i}`, image_url: "", post_url: "" })
    : igTiles.filter((t) => t?.image_url || t?.post_url);
  const ttSlots = editMode
    ? Array.from({ length: 3 }).map((_, i) => ttTiles[i] || { id: `tt-${i}`, image_url: "", post_url: "" })
    : ttTiles.filter((t) => t?.image_url || t?.post_url);

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

        {/* Edit-mode help panel: shows Nadine how to plug in her real accounts */}
        {editMode && (
          <div
            data-testid="social-edit-help"
            className="mb-10 rounded-2xl border border-[#ff5a36]/25 bg-white p-5 md:p-6 flex gap-4 items-start"
          >
            <span className="w-10 h-10 rounded-xl icon-bubble-accent inline-flex items-center justify-center shrink-0">
              <HelpCircle size={18} />
            </span>
            <div className="text-sm text-[#0f172a] leading-relaxed">
              <div className="font-display text-base mb-2 flex items-center gap-2">
                <Sparkles size={16} className="text-[#ff5a36]" /> So verlinkst du deine Accounts
              </div>
              <ol className="list-decimal ml-5 space-y-1 text-[#475569]">
                <li>
                  Ändere <b>Handle</b> und <b>Profil-URL</b> (blaue, editierbare Felder unter dem Instagram- bzw. TikTok-Titel).
                </li>
                <li>
                  Für jede Kachel gibt es <b>zwei Möglichkeiten</b>:
                  <ul className="list-disc ml-5 mt-1">
                    <li>
                      <b>Live-Post (empfohlen)</b>: Kopiere die URL eines Instagram-Posts (<code className="text-[11px] bg-[#f1f5f9] px-1 py-0.5 rounded">https://www.instagram.com/p/…</code>) oder TikTok-Videos (<code className="text-[11px] bg-[#f1f5f9] px-1 py-0.5 rounded">https://www.tiktok.com/@…/video/…</code>) in das "Post-URL"-Feld unter der Kachel. Der echte Post erscheint automatisch.
                    </li>
                    <li>
                      <b>Bild-Upload</b>: Alternativ auf die leere Kachel klicken und einen Screenshot deines Posts hochladen. Trage optional darunter den Link zu deinem Post ein.
                    </li>
                  </ul>
                </li>
                <li>
                  Leere Kacheln (kein Bild, keine URL) werden im Live-Modus <b>ausgeblendet</b> – keine Sorge um leere Plätze.
                </li>
              </ol>
            </div>
          </div>
        )}

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
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-11 h-11 rounded-2xl icon-bubble-accent inline-flex items-center justify-center shrink-0">
                  <Instagram size={20} strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <div className="font-display text-lg leading-tight">Instagram</div>
                  <Editable
                    path="social.instagram_handle"
                    value={igHandle}
                    className="text-xs text-[#475569] block truncate"
                  />
                </div>
              </div>
              <a
                href={igUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="social-instagram-follow"
                className="btn-accent !py-2 !px-4 !text-xs shrink-0"
              >
                {lang === "de" ? "Folgen" : "Follow"}
                <ArrowUpRight size={14} />
              </a>
            </div>

            {editMode && (
              <div className="mb-5 -mt-2">
                <label className="text-[10px] font-semibold tracking-widest uppercase text-[#94a3b8] block mb-1">
                  Profil-URL (der "Folgen"-Button verlinkt hierher)
                </label>
                <Editable
                  path="social.instagram_url"
                  value={igUrl}
                  className="text-xs text-[#0f172a] block break-all"
                />
              </div>
            )}

            {igSlots.length === 0 ? (
              <EmptyGrid platform="instagram" lang={lang} url={igUrl} />
            ) : (
              <div className="grid grid-cols-3 gap-2 md:gap-3">
                {igSlots.map((tile, i) => (
                  <div key={tile.id || i} className="space-y-1.5">
                    <SocialTile
                      platform="instagram"
                      index={i}
                      tile={tile}
                      aspect="aspect-square"
                      profileUrl={igUrl}
                      embedFn={toInstagramEmbedSrc}
                    />
                    {editMode && (
                      <div className="text-[10px] leading-tight">
                        <div className="text-[#94a3b8] font-semibold tracking-widest uppercase mt-1">
                          Post-URL
                        </div>
                        <Editable
                          path={`social.instagram_tiles.${i}.post_url`}
                          value={tile.post_url || ""}
                          placeholder="https://www.instagram.com/p/…"
                          className="block break-all text-[11px] text-[#0f172a] min-h-[1.1em]"
                        />
                        <div className="text-[#94a3b8] font-semibold tracking-widest uppercase mt-1.5">
                          Link (bei Bild-Upload)
                        </div>
                        <Editable
                          path={`social.instagram_tiles.${i}.link_url`}
                          value={tile.link_url || ""}
                          placeholder={igUrl}
                          className="block break-all text-[11px] text-[#475569] min-h-[1.1em]"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-11 h-11 rounded-2xl bg-white text-[#0f172a] inline-flex items-center justify-center shrink-0">
                  <TikTokIcon size={22} />
                </span>
                <div className="min-w-0">
                  <div className="font-display text-lg leading-tight">TikTok</div>
                  <Editable
                    path="social.tiktok_handle"
                    value={ttHandle}
                    className="text-xs text-white/70 block truncate"
                  />
                </div>
              </div>
              <a
                href={ttUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="social-tiktok-follow"
                className="inline-flex items-center gap-1.5 bg-white text-[#0f172a] font-semibold text-xs px-4 py-2 rounded-full hover:bg-[#ff5a36] hover:text-white transition-colors shrink-0"
              >
                {lang === "de" ? "Folgen" : "Follow"}
                <ArrowUpRight size={14} />
              </a>
            </div>

            {editMode && (
              <div className="mb-5 -mt-2">
                <label className="text-[10px] font-semibold tracking-widest uppercase text-white/50 block mb-1">
                  Profil-URL (der "Folgen"-Button verlinkt hierher)
                </label>
                <Editable
                  path="social.tiktok_url"
                  value={ttUrl}
                  className="text-xs text-white block break-all"
                />
              </div>
            )}

            {ttSlots.length === 0 ? (
              <EmptyGrid platform="tiktok" lang={lang} url={ttUrl} dark />
            ) : (
              <div className="grid grid-cols-3 gap-2 md:gap-3">
                {ttSlots.map((tile, i) => (
                  <div key={tile.id || i} className="space-y-1.5">
                    <SocialTile
                      platform="tiktok"
                      index={i}
                      tile={tile}
                      aspect="aspect-[9/16]"
                      profileUrl={ttUrl}
                      embedFn={toTikTokEmbedSrc}
                    />
                    {editMode && (
                      <div className="text-[10px] leading-tight">
                        <div className="text-white/40 font-semibold tracking-widest uppercase mt-1">
                          Video-URL
                        </div>
                        <Editable
                          path={`social.tiktok_tiles.${i}.post_url`}
                          value={tile.post_url || ""}
                          placeholder="https://www.tiktok.com/@…/video/…"
                          className="block break-all text-[11px] text-white min-h-[1.1em]"
                        />
                        <div className="text-white/40 font-semibold tracking-widest uppercase mt-1.5">
                          Link (bei Bild-Upload)
                        </div>
                        <Editable
                          path={`social.tiktok_tiles.${i}.link_url`}
                          value={tile.link_url || ""}
                          placeholder={ttUrl}
                          className="block break-all text-[11px] text-white/70 min-h-[1.1em]"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!editMode && ttSlots.length > 0 && (
              <p className="mt-5 text-xs text-white/50 leading-relaxed">
                {lang === "de"
                  ? "Tippe eine Kachel an, um das Original-Video auf TikTok zu öffnen."
                  : "Tap a tile to open the original video on TikTok."}
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/**
 * Placeholder shown when a platform has zero filled tiles. Guides the visitor
 * to the actual profile instead of showing awkward empty space.
 */
function EmptyGrid({ platform, lang, url, dark = false }) {
  const bg = dark ? "border-white/10 bg-white/5 text-white/70" : "border-[#e2e8f0] bg-[#fbf9f6] text-[#475569]";
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`rounded-2xl border-2 border-dashed ${bg} py-10 px-6 text-center text-sm font-medium block hover:border-[#ff5a36] transition-colors`}
      data-testid={`${platform}-empty-cta`}
    >
      {lang === "de" ? (
        <>
          Noch keine Posts hier – <span className="text-[#ff5a36] font-semibold">öffne unser Profil</span> für den echten Feed
          <ArrowUpRight size={14} className="inline ml-1" />
        </>
      ) : (
        <>
          No posts here yet – <span className="text-[#ff5a36] font-semibold">visit our profile</span> for the real feed
          <ArrowUpRight size={14} className="inline ml-1" />
        </>
      )}
    </a>
  );
}
