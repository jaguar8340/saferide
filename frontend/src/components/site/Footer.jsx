import { useEffect, useState } from "react";
import { Instagram, Music2, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";
import { api } from "@/lib/api";
import Editable from "@/components/edit/Editable";
import EditableImage from "@/components/edit/EditableImage";
import BrandLogo from "@/components/site/BrandLogo";

export default function Footer({ data }) {
  const { t, lang, pick } = useLang();
  const { content, editMode } = useEdit();
  const [locations, setLocations] = useState([]);
  const year = new Date().getFullYear();
  const tagline = pick(content?.footer_tagline_de, content?.footer_tagline_en) || t.footer.tagline;

  useEffect(() => {
    let mounted = true;
    api
      .get("/locations")
      .then((r) => mounted && setLocations(r.data || []))
      .catch(() => mounted && setLocations([]));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <footer
      data-testid="site-footer"
      className="bg-[#0f172a] text-white px-5 md:px-8 lg:px-12 py-14"
    >
      <div className="container-x">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 items-start">
          {/* Brand */}
          <div className="md:col-span-3">
            <BrandLogo variant="footer" />
            <Editable
              path={`footer_tagline_${lang}`}
              value={tagline}
              as="p"
              multiline
              className="text-white/60 text-sm mt-4 max-w-xs leading-relaxed font-medium block"
            />
            <div className="mt-5 flex items-center gap-2">
              {data?.instagram && (
                <a
                  href={data.instagram}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="footer-instagram"
                  className="w-9 h-9 inline-flex items-center justify-center rounded-full bg-white/10 hover:bg-[#ff5a36] transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram size={14} />
                </a>
              )}
              {data?.tiktok && (
                <a
                  href={data.tiktok}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="footer-tiktok"
                  className="w-9 h-9 inline-flex items-center justify-center rounded-full bg-white/10 hover:bg-[#ff5a36] transition-colors"
                  aria-label="TikTok"
                >
                  <Music2 size={14} />
                </a>
              )}
            </div>
          </div>

          {/* Contact */}
          <div className="md:col-span-3">
            <div className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40 mb-3">
              {lang === "de" ? "Kontakt" : "Contact"}
            </div>
            <div className="text-sm text-white/85 space-y-1.5 font-medium">
              {data?.phone && (
                <a
                  href={`tel:${data.phone.replace(/\s/g, "")}`}
                  className="block hover:text-[#ff5a36] transition-colors"
                  data-testid="footer-phone"
                >
                  {data.phone}
                </a>
              )}
              {data?.email && (
                <a
                  href={`mailto:${data.email}`}
                  className="block hover:text-[#ff5a36] transition-colors"
                  data-testid="footer-email"
                >
                  {data.email}
                </a>
              )}
            </div>

            {/* Audi silhouette – editable via inline CMS. Only rendered
                when the admin has uploaded an image or is in edit mode. */}
            {(editMode || data?.footer_image_url) && (
              <div className="mt-6" data-testid="footer-brand-image-slot">
                <EditableImage
                  path="contact.footer_image_url"
                  src={
                    data?.footer_image_url ||
                    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80"
                  }
                  alt="Audi Silhouette"
                  className="block rounded-xl overflow-hidden border border-white/10"
                  imgClassName="w-full h-auto max-h-32 object-contain bg-black"
                />
              </div>
            )}
          </div>

          {/* Standorte */}
          <div className="md:col-span-6">
            <div className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40 mb-3">
              {lang === "de" ? "Standorte" : "Locations"}
            </div>
            <ul
              data-testid="footer-locations-list"
              className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2 text-[13px] font-medium"
            >
              {locations.map((loc) => (
                <li key={loc.slug}>
                  <Link
                    to={`/fahrschule-${loc.slug}`}
                    data-testid={`footer-location-${loc.slug}`}
                    className="group inline-flex items-center gap-1.5 text-white/80 hover:text-[#ff5a36] transition-colors whitespace-nowrap"
                  >
                    <MapPin
                      size={11}
                      className="text-[#ff5a36] opacity-70 group-hover:opacity-100 shrink-0"
                    />
                    <span>Fahrschule {loc.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-white/15 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs text-white/45">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 order-2 md:order-1">
            <span>© {year} Fahrschule Safe Ride · {t.footer.rights}</span>
            <Link
              to="/admin/login"
              className="hover:text-[#ff5a36] transition-colors"
              data-testid="footer-admin-link"
            >
              {t.admin.title}
            </Link>
          </div>
          <nav className="flex items-center gap-5 order-1 md:order-2">
            <Link
              to="/impressum"
              className="hover:text-[#ff5a36] transition-colors"
              data-testid="footer-impressum-link"
            >
              {lang === "de" ? "Impressum" : "Imprint"}
            </Link>
            <Link
              to="/datenschutz"
              className="hover:text-[#ff5a36] transition-colors"
              data-testid="footer-datenschutz-link"
            >
              {lang === "de" ? "Datenschutz" : "Privacy"}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
