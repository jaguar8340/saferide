/**
 * SEO helpers — small utilities to build JSON-LD structured data on the client
 * side without introducing a heavy schema library.
 */

/** Return the absolute origin. Safe on SSR / initial static render. */
export function seoOrigin() {
  return typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : "https://saferide.ch";
}

/**
 * Build a Schema.org BreadcrumbList JSON-LD block.
 * @param {{name: string, path: string}[]} crumbs — ordered ancestor → current.
 *        e.g.  [{name: "Startseite", path: "/"}, {name: "Blog", path: "/blog"}]
 */
export function buildBreadcrumb(crumbs) {
  if (!Array.isArray(crumbs) || crumbs.length === 0) return null;
  const origin = seoOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${origin}${c.path.startsWith("/") ? c.path : `/${c.path}`}`,
    })),
  };
}
