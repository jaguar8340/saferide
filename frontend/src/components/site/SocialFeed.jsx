import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Instagram, HelpCircle, Sparkles } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";
import Editable from "@/components/edit/Editable";
import SectionTitle from "@/components/site/SectionTitle";

/**
 * TikTok has no lucide icon – ship a minimal inline SVG matching the brand mark.
 */
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
 * Parse an Instagram post URL (feed post or reel) → official embed URL.
 * Returns null when the input doesn't match the known IG post pattern.
 */
function toInstagramEmbedSrc(url) {
  const match = (url || "").match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i);
  return match ? `https://www.instagram.com/p/${match[1]}/embed/captioned/` : null;
}

/**
 * Parse a TikTok video URL → official embed URL. Only full `/@user/video/ID`
 * URLs are supported (short vt.tiktok.com links cannot be resolved
 * client-side).
 */
function toTikTokEmbedSrc(url) {
  const match = (url || "").match(/tiktok\.com\/@[^/]+\/video\/(\d+)/i);
  return match ? `https://www.tiktok.com/embed/v2/${match[1]}` : null;
}

/**
 * Split a multi-line textarea into a clean, deduped list of URLs the user
 * pasted. Ignores blank lines, whitespace and duplicates.
 */
function parseUrlLines(text) {
  if (!text) return [];
  const seen = new Set();
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s && (s.startsWith("http://") || s.startsWith("https://")))
    .filter((s) => {
      if (seen.has(s)) return false;
      seen.add(s);
      return true;
    });
}

/**
 * Renders an embed snippet pasted from Elfsight / Behold / SnapWidget / any
 * other 3rd-party widget provider. React `dangerouslySetInnerHTML` renders
 * inline `<script>` tags as inert text, so we manually re-execute them here
 * after mount. Only reachable via authenticated admin editing, so raw HTML
 * injection is intentional. Guards against double-injection on re-render
 * (many widget bootstrap scripts are NOT idempotent).
 */
function EmbedHtml({ html, platform }) {
  const ref = useRef(null);
  const injectedHtmlRef = useRef(null);
  useEffect(() => {
    if (!ref.current || !html) return;
    if (injectedHtmlRef.current === html) return;
    injectedHtmlRef.current = html;
    try {
      ref.current.innerHTML = html;
      ref.current.querySelectorAll("script").forEach((oldScript) => {
        const newScript = document.createElement("script");
        Array.from(oldScript.attributes).forEach((a) => newScript.setAttribute(a.name, a.value));
        newScript.text = oldScript.textContent;
        oldScript.parentNode.replaceChild(newScript, oldScript);
      });
    } catch (err) {
      if (typeof console !== "undefined" && console.warn) {
        console.warn(`${platform} embed bootstrap failed:`, err);
      }
    }
  }, [html, platform]);
  return (
    <div
      ref={ref}
      data-testid={`${platform}-embed-html`}
      className="social-embed-html w-full"
      style={{ minHeight: "300px" }}
    />
  );
}

/**
 * Render a single iframe embed tile for a validated post URL.
 */
function EmbedTile({ src, index, platform, aspect }) {
  return (
    <div
      className={`relative ${aspect} rounded-xl overflow-hidden bg-black/5 border border-black/5`}
      data-testid={`${platform}-tile-${index}`}
    >
      <iframe
        src={src}
        title={`${platform} post ${index + 1}`}
        loading="lazy"
        allow="autoplay; encrypted-media; picture-in-picture; web-share"
        allowFullScreen
        scrolling="no"
        referrerPolicy="strict-origin-when-cross-origin"
        className="w-full h-full block"
        style={{ border: 0 }}
      />
    </div>
  );
}

/**
 * Fallback CTA card shown when a platform has no posts filled in yet.
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

/**
 * Per-platform card. Shows profile handle + Follow CTA and one of three
 * content modes (priority): pasted Widget-Embed → parsed multi-line URLs →
 * empty state CTA.
 */
function PlatformCard({
  platform,       // "instagram" | "tiktok"
  handle,
  profileUrl,
  postUrlsText,   // raw multi-line textarea value
  embedHtml,     // widget HTML (Elfsight/Behold/SnapWidget)
  aspect,         // tailwind aspect ratio class per tile
  gridCols,       // e.g. "grid-cols-3"
  cardClassName,
  labelClassName,
  labelMutedClassName,
  labelAccentClassName,
  toEmbedFn,
  icon,
  handleColor,
  followBtnClass,
  animationDelay = 0,
  lang,
}) {
  const { editMode } = useEdit();
  const parsedUrls = parseUrlLines(postUrlsText);
  const embedSrcs = parsedUrls.map(toEmbedFn).filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: animationDelay }}
      data-testid={`${platform}-card`}
      className={cardClassName}
    >
      {/* Header: icon + handle + Follow CTA */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 min-w-0">
          {icon}
          <div className="min-w-0">
            <div className="font-display text-lg leading-tight">
              {platform === "instagram" ? "Instagram" : "TikTok"}
            </div>
            <Editable
              path={`social.${platform}_handle`}
              value={handle}
              className={`text-xs block truncate ${handleColor}`}
            />
          </div>
        </div>
        <a
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`social-${platform}-follow`}
          className={followBtnClass}
        >
          {lang === "de" ? "Folgen" : "Follow"}
          <ArrowUpRight size={14} />
        </a>
      </div>

      {/* Edit-mode inputs */}
      {editMode && (
        <div className="mb-6 space-y-4">
          {/* 1) The PRIMARY input – multi-line URL paste */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={`text-[10px] font-semibold tracking-widest uppercase ${labelAccentClassName}`}>
                ✨ Post-URLs (eine pro Zeile)
              </label>
              <span className={`text-[10px] ${labelMutedClassName}`}>
                {embedSrcs.length}/{parsedUrls.length} URLs erkannt
              </span>
            </div>
            <Editable
              path={`social.${platform}_post_urls`}
              value={postUrlsText}
              placeholder={
                platform === "instagram"
                  ? "https://www.instagram.com/p/ABC…/\nhttps://www.instagram.com/reel/XYZ…/"
                  : "https://www.tiktok.com/@…/video/123…\nhttps://www.tiktok.com/@…/video/456…"
              }
              multiline
              className={`text-[11px] block break-all font-mono rounded p-2 min-h-[4.5em] ${
                platform === "instagram" ? "text-[#0f172a] bg-[#f8fafc]" : "text-white bg-black/30"
              }`}
            />
            <p className={`text-[10px] mt-1 leading-relaxed ${labelMutedClassName}`}>
              Kopiere Deine Post-URL aus dem Browser oder aus der App (&quot;Link teilen&quot; → &quot;Link kopieren&quot;), füge sie hier ein und klicke außerhalb → Speichern.
            </p>
          </div>

          {/* 2) The ALTERNATIVE input – paid widget embed code */}
          <details className="text-[11px]">
            <summary className={`cursor-pointer font-semibold ${labelMutedClassName} hover:${labelAccentClassName}`}>
              💠 Erweitert: Widget-Embed (Elfsight / Behold / SnapWidget)
            </summary>
            <div className="mt-2">
              <Editable
                path={`social.${platform}_embed_html`}
                value={embedHtml}
                placeholder="<script src='https://static.elfsight.com/…'></script><div class='elfsight-app-…'></div>"
                multiline
                className={`text-[11px] block break-all font-mono rounded p-2 min-h-[3em] ${
                  platform === "instagram" ? "text-[#0f172a] bg-[#f8fafc]" : "text-white bg-black/30"
                }`}
              />
              <p className={`text-[10px] mt-1 leading-relaxed ${labelMutedClassName}`}>
                Nur ausfüllen wenn Du ein bezahltes Widget nutzt (~5 CHF/Monat). Überschreibt die Post-URLs oben.
              </p>
            </div>
          </details>

          {/* 3) Profile URL – used by the Follow button */}
          <details className="text-[11px]">
            <summary className={`cursor-pointer font-semibold ${labelMutedClassName} hover:${labelAccentClassName}`}>
              🔗 Profil-URL (für den &quot;Folgen&quot;-Button)
            </summary>
            <div className="mt-2">
              <Editable
                path={`social.${platform}_url`}
                value={profileUrl}
                className={`text-xs block break-all ${labelClassName}`}
              />
            </div>
          </details>
        </div>
      )}

      {/* Rendering priority: paid widget > multi-line URLs > empty */}
      {embedHtml && !editMode ? (
        <EmbedHtml html={embedHtml} platform={platform} />
      ) : embedHtml && editMode ? (
        <div className={`rounded-2xl border-2 border-dashed p-4 text-center text-xs ${
          platform === "instagram"
            ? "border-[#ff5a36]/30 bg-[#fff6ef] text-[#e74123]"
            : "border-[#ff5a36]/40 bg-white/5 text-[#ffb56b]"
        }`}>
          <div className="font-semibold mb-1">Live-Widget aktiv</div>
          <div className={labelMutedClassName}>
            Der eingebettete Feed wird im Live-Modus angezeigt.
          </div>
        </div>
      ) : embedSrcs.length > 0 ? (
        <div className={`grid ${gridCols} gap-2 md:gap-3`}>
          {embedSrcs.map((src, i) => (
            <EmbedTile key={src + i} src={src} index={i} platform={platform} aspect={aspect} />
          ))}
        </div>
      ) : parsedUrls.length > 0 && editMode ? (
        <div className="rounded-2xl border-2 border-dashed border-amber-400/40 bg-amber-50 text-amber-800 p-4 text-xs">
          <div className="font-semibold mb-1">Achtung: URLs erkannt aber nicht gültig</div>
          <div>
            Bitte prüfe das Format:{" "}
            {platform === "instagram" ? (
              <code>https://www.instagram.com/p/… oder /reel/…</code>
            ) : (
              <code>https://www.tiktok.com/@user/video/123…</code>
            )}
          </div>
        </div>
      ) : (
        <EmptyGrid platform={platform} lang={lang} url={profileUrl} dark={platform === "tiktok"} />
      )}
    </motion.div>
  );
}

/**
 * Bottom-of-homepage social section – two cards side by side.
 *
 * Nadine's simplest free path: log in as admin → click BEARBEITEN → in each
 * card paste the URLs of her latest posts into the "✨ Post-URLs" field
 * (one per line). Everything else is optional.
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

  const igEmbedHtml = data.instagram_embed_html || "";
  const ttEmbedHtml = data.tiktok_embed_html || "";
  const igPostUrls = data.instagram_post_urls || "";
  const ttPostUrls = data.tiktok_post_urls || "";

  // Everything in view mode empty → hide the whole section to keep the
  // homepage tidy while Nadine hasn't linked anything yet.
  const igEmpty = !igEmbedHtml && parseUrlLines(igPostUrls).length === 0;
  const ttEmpty = !ttEmbedHtml && parseUrlLines(ttPostUrls).length === 0;
  if (!editMode && igEmpty && ttEmpty) return null;

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

        {/* Edit-mode help panel: SUPER short, focused on the free path */}
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
                <Sparkles size={16} className="text-[#ff5a36]" /> Kostenlos: Deine echten Posts in 30 Sekunden
              </div>
              <ol className="list-decimal ml-5 space-y-1.5 text-[#475569] text-[13px]">
                <li>
                  Öffne einen Deiner besten Posts auf Instagram (Web oder App). Auf <b>&quot;Link teilen&quot;</b> tippen → <b>&quot;Link kopieren&quot;</b>.
                </li>
                <li>
                  Hier unten im <span className="font-semibold text-[#e74123]">✨ Post-URLs</span>-Feld einfügen. Weitere Posts einfach in eine <b>neue Zeile</b> darunter setzen.
                </li>
                <li>
                  Klicke außerhalb des Felds → gespeichert. Wechsle zu <b>&quot;Live&quot;</b> und dein Feed ist live. 🎉
                </li>
                <li className="text-[#94a3b8]">
                  Selbes Prinzip für TikTok in der schwarzen Karte rechts.
                </li>
              </ol>
              <p className="mt-3 text-[12px] text-[#94a3b8]">
                Feed veraltet? Einfach alte URLs raus, neue rein. Kein Abo, kein API-Konto. 💚
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          <PlatformCard
            platform="instagram"
            handle={igHandle}
            profileUrl={igUrl}
            postUrlsText={igPostUrls}
            embedHtml={igEmbedHtml}
            aspect="aspect-square"
            gridCols="grid-cols-3"
            cardClassName="rounded-3xl bg-white border border-[#e2e8f0] p-6 md:p-8 shadow-sm hover:shadow-xl hover:border-[#ff5a36]/40 transition-all"
            labelClassName="text-[#0f172a]"
            labelMutedClassName="text-[#94a3b8]"
            labelAccentClassName="text-[#ff5a36]"
            toEmbedFn={toInstagramEmbedSrc}
            icon={
              <span className="w-11 h-11 rounded-2xl icon-bubble-accent inline-flex items-center justify-center shrink-0">
                <Instagram size={20} strokeWidth={2} />
              </span>
            }
            handleColor="text-[#475569]"
            followBtnClass="btn-accent !py-2 !px-4 !text-xs shrink-0"
            lang={lang}
          />
          <PlatformCard
            platform="tiktok"
            handle={ttHandle}
            profileUrl={ttUrl}
            postUrlsText={ttPostUrls}
            embedHtml={ttEmbedHtml}
            aspect="aspect-[9/16]"
            gridCols="grid-cols-3"
            cardClassName="rounded-3xl bg-[#0f172a] text-white border border-[#0f172a] p-6 md:p-8 shadow-sm hover:shadow-xl transition-all"
            labelClassName="text-white"
            labelMutedClassName="text-white/50"
            labelAccentClassName="text-[#ff8c42]"
            toEmbedFn={toTikTokEmbedSrc}
            icon={
              <span className="w-11 h-11 rounded-2xl bg-white text-[#0f172a] inline-flex items-center justify-center shrink-0">
                <TikTokIcon size={22} />
              </span>
            }
            handleColor="text-white/70"
            followBtnClass="inline-flex items-center gap-1.5 bg-white text-[#0f172a] font-semibold text-xs px-4 py-2 rounded-full hover:bg-[#ff5a36] hover:text-white transition-colors shrink-0"
            animationDelay={0.1}
            lang={lang}
          />
        </div>
      </div>
    </section>
  );
}
