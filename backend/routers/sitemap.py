"""SEO sitemap.xml + service health check."""
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Request, Response

from core.db import db
from routers.blog import is_post_published

router = APIRouter(tags=["seo"])


def _public_base_url(request: Request) -> str:
    """Derive the absolute public base URL the visitor used to reach this API.

    Honours `PUBLIC_SITE_URL` env var first, then `X-Forwarded-*` headers, then
    falls back to `request.base_url`. Strips any trailing `/api`.
    """
    override = os.environ.get("PUBLIC_SITE_URL")
    if override:
        return override.rstrip("/")
    fwd_host = request.headers.get("x-forwarded-host")
    fwd_proto = request.headers.get("x-forwarded-proto", "https")
    if fwd_host:
        base = f"{fwd_proto}://{fwd_host}".rstrip("/")
    else:
        base = str(request.base_url).rstrip("/")
    if base.endswith("/api"):
        base = base[: -len("/api")]
    return base


@router.get("/sitemap.xml")
async def sitemap_xml(request: Request):
    """Dynamic sitemap listing the homepage, ablauf, vku, blog, buchung and ALL
    location landing pages.

    Recommended `robots.txt` entry:
    `Sitemap: <PUBLIC_SITE_URL>/api/sitemap.xml`
    """
    base = _public_base_url(request)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    static_urls = [
        (f"{base}/", "1.0", "weekly"),
        (f"{base}/ablauf-zum-fuehrerschein", "0.9", "monthly"),
        (f"{base}/vku-unterricht", "0.9", "weekly"),
        (f"{base}/impressum", "0.3", "yearly"),
        (f"{base}/datenschutz", "0.3", "yearly"),
    ]
    loc_docs = await db.locations.find({}, {"slug": 1, "_id": 0}).sort("order", 1).to_list(200)
    # Main hub cities get higher priority (0.9), secondary locations get 0.7.
    # This helps Google understand which landing pages are the primary
    # commercial targets vs secondary long-tail SEO pages.
    MAIN_LOCATION_SLUGS = {"einsiedeln", "lachen", "waedenswil", "chur", "pfaeffikon-sz", "rapperswil"}
    loc_urls = [
        (
            f"{base}/fahrschule-{d['slug']}",
            "0.9" if d["slug"] in MAIN_LOCATION_SLUGS else "0.7",
            "monthly",
        )
        for d in loc_docs
    ]

    blog_docs = await db.blog_posts.find({}, {"_id": 0}).to_list(500)
    blog_urls = [(f"{base}/blog/{d['slug']}", "0.7", "monthly") for d in blog_docs if is_post_published(d)]
    static_urls.append((f"{base}/blog", "0.8", "weekly"))
    static_urls.append((f"{base}/buchung", "0.95", "weekly"))
    static_urls.append((f"{base}/partner", "0.6", "monthly"))

    urls_xml = "".join(
        f"<url><loc>{u}</loc><lastmod>{now}</lastmod><changefreq>{f}</changefreq><priority>{p}</priority></url>"
        for u, p, f in (static_urls + loc_urls + blog_urls)
    )
    body = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        f"{urls_xml}"
        "</urlset>"
    )
    return Response(content=body, media_type="application/xml")


@router.get("/")
async def root():
    return {"status": "ok", "service": "Fahrschule Safe Ride"}
