import { useEffect } from "react";

/**
 * Imperatively manages a single <link rel="canonical"> tag in <head>.
 * The canonical URL is the absolute SEO-friendly URL we want Google to
 * treat as the source-of-truth for the current page (avoids duplicate
 * content penalties when a page is reachable under multiple paths).
 */
export default function CanonicalLink({ path }) {
  useEffect(() => {
    const origin = window.location.origin;
    const href = `${origin}${path.startsWith("/") ? path : `/${path}`}`;
    let tag = document.head.querySelector('link[rel="canonical"]');
    if (!tag) {
      tag = document.createElement("link");
      tag.setAttribute("rel", "canonical");
      document.head.appendChild(tag);
    }
    tag.setAttribute("href", href);
    return () => {
      // Leave the tag in place – React Router-driven page changes will
      // overwrite it on mount of the next CanonicalLink. Removing it here
      // would cause a brief flicker on route transition.
    };
  }, [path]);
  return null;
}
