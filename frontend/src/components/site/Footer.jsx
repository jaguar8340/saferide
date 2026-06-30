import { Instagram, Music2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useLang } from "@/contexts/LanguageContext";

export default function Footer({ data }) {
  const { t } = useLang();
  const year = new Date().getFullYear();
  return (
    <footer
      data-testid="site-footer"
      className="bg-[#0f172a] text-white px-5 md:px-8 lg:px-12 py-14"
    >
      <div className="container-x">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-5">
            <div className="font-display text-2xl tracking-tight">
              Safe<span className="font-serif-i text-[#ff5a36]">Ride</span>
            </div>
            <p className="text-white/60 text-sm mt-3 max-w-xs leading-relaxed font-medium">
              {t.footer.tagline}
            </p>
          </div>
          <div className="md:col-span-4 text-sm text-white/80 space-y-1.5 font-medium">
            {data?.phone && (
              <a href={`tel:${data.phone.replace(/\s/g, "")}`} className="block hover:text-[#ff5a36] transition-colors" data-testid="footer-phone">
                {data.phone}
              </a>
            )}
            {data?.email && (
              <a href={`mailto:${data.email}`} className="block hover:text-[#ff5a36] transition-colors" data-testid="footer-email">
                {data.email}
              </a>
            )}
          </div>
          <div className="md:col-span-3 flex md:justify-end items-start gap-2">
            {data?.instagram && (
              <a href={data.instagram} target="_blank" rel="noreferrer" data-testid="footer-instagram" className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-white/10 hover:bg-[#ff5a36] transition-colors">
                <Instagram size={15} />
              </a>
            )}
            {data?.tiktok && (
              <a href={data.tiktok} target="_blank" rel="noreferrer" data-testid="footer-tiktok" className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-white/10 hover:bg-[#ff5a36] transition-colors">
                <Music2 size={15} />
              </a>
            )}
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-white/15 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-white/45">
          <div>© {year} Fahrschule Safe Ride · {t.footer.rights}</div>
          <Link to="/admin/login" className="hover:text-[#ff5a36] transition-colors" data-testid="footer-admin-link">
            {t.admin.title}
          </Link>
        </div>
      </div>
    </footer>
  );
}
