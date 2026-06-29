import { Instagram, Music2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useLang } from "@/contexts/LanguageContext";

export default function Footer({ data }) {
  const { t } = useLang();
  const year = new Date().getFullYear();
  return (
    <footer
      data-testid="site-footer"
      className="bg-[#0a0a0a] text-white px-5 md:px-10 lg:px-14 py-14"
    >
      <div className="container-x">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-5">
            <div className="font-display font-black tracking-tighter text-3xl uppercase">
              Safe<span className="text-[#ccff00]">Ride</span>
            </div>
            <p className="text-white/55 text-base mt-3 max-w-sm leading-relaxed font-medium">
              {t.footer.tagline}
            </p>
          </div>
          <div className="md:col-span-4 text-base text-white/75 space-y-2">
            {data?.phone && (
              <a
                href={`tel:${data.phone.replace(/\s/g, "")}`}
                className="block hover:text-[#ccff00] transition-colors font-medium"
                data-testid="footer-phone"
              >
                {data.phone}
              </a>
            )}
            {data?.email && (
              <a
                href={`mailto:${data.email}`}
                className="block hover:text-[#ccff00] transition-colors font-medium"
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
                className="w-11 h-11 inline-flex items-center justify-center rounded-full bg-white/10 hover:bg-[#ccff00] hover:text-[#0a0a0a] transition-colors"
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
                className="w-11 h-11 inline-flex items-center justify-center rounded-full bg-white/10 hover:bg-[#ccff00] hover:text-[#0a0a0a] transition-colors"
              >
                <Music2 size={16} />
              </a>
            )}
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-white/15 flex flex-col md:flex-row justify-between items-center gap-3 text-sm text-white/40 tracking-wide">
          <div>
            © {year} Fahrschule Safe Ride · {t.footer.rights}
          </div>
          <div className="flex items-center gap-5">
            <Link
              to="/admin/login"
              className="hover:text-[#ccff00] transition-colors"
              data-testid="footer-admin-link"
            >
              {t.admin.title}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
