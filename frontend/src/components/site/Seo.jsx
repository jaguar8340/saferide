import { useEffect } from "react";

/**
 * Imperative SEO head-tag manager — no react-helmet dependency needed.
 *
 * Sets / refreshes the following on every prop change:
 *  - <title>
 *  - <meta name="description">
 *  - <meta name="keywords">                (optional)
 *  - <html lang="..">                       reactively (de / en)
 *  - <link rel="canonical">                 absolute origin + path
 *  - <link rel="alternate" hreflang="...">  de, en, x-default
 *  - <meta property="og:..">                title, description, image, type, url, locale, site_name
 *  - <meta name="twitter:..">               card, title, description, image
 *  - One or more <script type="application/ld+json"> blocks (structured data)
 *
 * All tags are tagged with a `data-seo` attribute and rewritten in place on
 * remount so we never duplicate. JSON-LD blocks are scoped to the current
 * page via `data-seo-page-jsonld` and cleared before re-insertion.
 */
export default function Seo({
  title,
  description,
  keywords,
  path,
  lang = "de",
  type = "website",
  image,
  imageAlt,
  alternates = {},   // { de: "/...", en: "/..." }
  jsonLd = null,     // single object or array of objects
}) {
  useEffect(() => {
    const origin = window.location.origin;
    const fullPath = path && path.startsWith("/") ? path : `/${path || ""}`;
    const url = `${origin}${fullPath}`;
    // Ensure og:image / twitter:image are absolute URLs (required by FB/X).
    const absImage = image
      ? (image.startsWith("http://") || image.startsWith("https://")
          ? image
          : `${origin}${image.startsWith("/") ? image : `/${image}`}`)
      : null;

    document.documentElement.setAttribute("lang", lang);
    if (title) document.title = title;

    const upsertMeta = (selector, attrs) => {
      let tag = document.head.querySelector(selector);
      if (!tag) {
        tag = document.createElement("meta");
        document.head.appendChild(tag);
      }
      Object.entries(attrs).forEach(([k, v]) => tag.setAttribute(k, v));
      tag.setAttribute("data-seo", "1");
    };

    if (description) {
      upsertMeta('meta[name="description"]', { name: "description", content: description });
      upsertMeta('meta[property="og:description"]', { property: "og:description", content: description });
      upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: description });
    }
    if (keywords) {
      upsertMeta('meta[name="keywords"]', { name: "keywords", content: keywords });
    }
    if (title) {
      upsertMeta('meta[property="og:title"]', { property: "og:title", content: title });
      upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: title });
    }
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: type });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: url });
    upsertMeta('meta[property="og:locale"]', { property: "og:locale", content: lang === "en" ? "en_US" : "de_CH" });
    if (absImage) {
      upsertMeta('meta[property="og:image"]', { property: "og:image", content: absImage });
      upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: absImage });
      upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
      if (imageAlt) {
        upsertMeta('meta[property="og:image:alt"]', { property: "og:image:alt", content: imageAlt });
        upsertMeta('meta[name="twitter:image:alt"]', { name: "twitter:image:alt", content: imageAlt });
      }
    }

    // Canonical
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);
    canonical.setAttribute("data-seo", "1");

    // Hreflang alternates – remove old, re-insert
    document.head
      .querySelectorAll('link[rel="alternate"][data-seo="1"]')
      .forEach((n) => n.parentNode.removeChild(n));
    const addAlt = (hreflang, p) => {
      const link = document.createElement("link");
      link.setAttribute("rel", "alternate");
      link.setAttribute("hreflang", hreflang);
      link.setAttribute("href", `${origin}${p}`);
      link.setAttribute("data-seo", "1");
      document.head.appendChild(link);
    };
    const dePath = alternates.de || fullPath;
    const enPath = alternates.en || fullPath;
    addAlt("de", dePath);
    addAlt("en", enPath);
    addAlt("x-default", dePath);

    // JSON-LD – clear page-scoped blocks and re-insert
    document.head
      .querySelectorAll('script[data-seo-page-jsonld="1"]')
      .forEach((n) => n.parentNode.removeChild(n));
    const blocks = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];
    blocks.filter(Boolean).forEach((data) => {
      const s = document.createElement("script");
      s.type = "application/ld+json";
      s.setAttribute("data-seo-page-jsonld", "1");
      s.textContent = JSON.stringify(data);
      document.head.appendChild(s);
    });

    return () => {
      // Leave the tags in place on unmount – the next page's <Seo /> will
      // overwrite them, which avoids a flicker on route transitions.
    };
  }, [title, description, keywords, path, lang, type, image, imageAlt,
      alternates.de, alternates.en, JSON.stringify(jsonLd)]);

  return null;
}
