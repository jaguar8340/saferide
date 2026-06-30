import { Phone, Clock, MapPin } from "lucide-react";
import { useEdit } from "@/contexts/EditContext";

/**
 * Thin, dark-navy utility bar sitting ABOVE the main header. Always sticky.
 * Shows the phone number prominently (one-tap call on mobile) plus opening
 * hours blurb. Phone number is sourced from content.contact.phone so admins
 * can edit it through the regular content editor.
 */
export default function TopContactBar() {
  const { content } = useEdit();
  const phone = content?.contact?.phone;
  if (!phone) return null;
  const telHref = `tel:${phone.replace(/[^+\d]/g, "")}`;

  return (
    <div
      data-testid="top-contact-bar"
      className="bg-[#0f172a] text-white text-[12.5px] font-semibold tracking-wide"
    >
      <div className="container-x px-4 md:px-8 lg:px-12 py-2 flex items-center justify-between gap-3">
        <a
          href={telHref}
          data-testid="top-bar-phone"
          className="inline-flex items-center gap-2 group hover:text-[#ff5a36] transition-colors"
        >
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#ff5a36] text-white group-hover:scale-110 transition-transform">
            <Phone size={12} />
          </span>
          <span className="hidden sm:inline">Direkt anrufen ·</span>
          <span className="font-display tracking-tight text-base">{phone}</span>
        </a>
        <div className="hidden md:flex items-center gap-5 text-xs text-white/65">
          <span className="inline-flex items-center gap-1.5">
            <Clock size={11} className="text-[#ff5a36]" /> Mo–Fr · 07–21 Uhr
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={11} className="text-[#ff5a36]" /> 11 Standorte · ZH/SZ/SG/GR
          </span>
        </div>
      </div>
    </div>
  );
}
