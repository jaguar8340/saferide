import { Instagram, Music2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useLang } from "@/contexts/LanguageContext";

export default function Footer({ data }) {
  const { t } = useLang();
  const year = new Date().getFullYear();
  return (
    <footer
      data-testid="site-footer"
      className="bg-[#050505] border-t border-white/10 px-6 md:px-12 lg:px-20 py-12"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        <div className="md:col-span-5">
          <div className="font-display font-black tracking-tighter text-2xl uppercase">
            Safe<span className="text-[#FF2E00]">Ride</span>
          </div>
          <p className="text-white/55 text-sm mt-3 max-w-xs leading-relaxed">
            {t.footer.tagline}
          </p>
        </div>
        <div className="md:col-span-4 text-sm text-white/70 space-y-2">
          {data?.phone && (
            <a
              href={`tel:${data.phone.replace(/\s/g, "")}`}
              className="block hover:text-white transition-colors"
              data-testid="footer-phone"
            >
              {data.phone}
            </a>
          )}
          {data?.email && (
            <a
              href={`mailto:${data.email}`}
              className="block hover:text-white transition-colors"
              data-testid="footer-email"
            >
              {data.email}
            </a>
          )}
        </div>
        <div className="md:col-span-3 flex md:justify-end items-start gap-3">
          {data?.instagram && (
            <a
              href={data.instagram}
              target="_blank"
              rel="noreferrer"
              data-testid="footer-instagram"
              className="w-10 h-10 inline-flex items-center justify-center border border-white/15 hover:border-[#FF2E00] hover:text-[#FF2E00] transition-colors"
              style={{ borderRadius: 2 }}
            >
              <Instagram size={16} />
            </a>
          )}
          {data?.tiktok && (
            <a
              href={data.tiktok}
              target="_blank"
              rel="noreferrer"
              data-testid="footer-tiktok"
              className="w-10 h-10 inline-flex items-center justify-center border border-white/15 hover:border-[#FF2E00] hover:text-[#FF2E00] transition-colors"
              style={{ borderRadius: 2 }}
            >
              <Music2 size={16} />
            </a>
          )}
        </div>
      </div>
      <div className="mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-white/40 tracking-wide">
        <div>
          © {year} Fahrschule Safe Ride · {t.footer.rights}
        </div>
        <div className="flex items-center gap-5">
          <Link
            to="/admin/login"
            className="hover:text-white transition-colors"
            data-testid="footer-admin-link"
          >
            {t.admin.title}
          </Link>
        </div>
      </div>
    </footer>
  );
}
