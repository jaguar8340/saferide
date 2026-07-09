import { useEffect, useState } from "react";
import { LogOut, Home, FileText, MessageSquare, Image as ImageIcon, Inbox, Map, BookOpen, Calendar, Package, Award, Users, GraduationCap, UserRound, ClipboardList } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import ContentEditor from "@/components/admin/ContentEditor";
import TestimonialsManager from "@/components/admin/TestimonialsManager";
import GalleryManager from "@/components/admin/GalleryManager";
import SubmissionsViewer from "@/components/admin/SubmissionsViewer";
import VkuRegistrationsViewer from "@/components/admin/VkuRegistrationsViewer";
import PagesManager from "@/components/admin/PagesManager";
import StudentsManager from "@/components/admin/students/StudentsManager";
import MasterDataTab from "@/components/admin/students/MasterDataTab";
import {
  BlogManager,
  BookingsManager,
  PackagesManager,
  CertificatesManager,
  PartnersManager,
} from "@/components/admin/EntityManagers";

const TABS = [
  { id: "students", icon: UserRound, key: "students", label_de: "Schüler", label_en: "Students" },
  { id: "fk_master", icon: ClipboardList, key: "fk_master", label_de: "Fahrkontrolle-Stammdaten", label_en: "Fahrkontrolle Masters" },
  { id: "content", icon: FileText, key: "content", label_de: "Inhalte", label_en: "Content" },
  { id: "pages", icon: Map, key: "pages", label_de: "Seiten & Standorte", label_en: "Pages & Locations" },
  { id: "blog", icon: BookOpen, key: "blog", label_de: "Blog", label_en: "Blog" },
  { id: "bookings", icon: Calendar, key: "bookings", label_de: "Buchungen", label_en: "Bookings" },
  { id: "vku_registrations", icon: GraduationCap, key: "vku_registrations", label_de: "VKU-Anmeldungen", label_en: "VKU Registrations" },
  { id: "packages", icon: Package, key: "packages", label_de: "Pakete", label_en: "Packages" },
  { id: "certificates", icon: Award, key: "certificates", label_de: "Diplome", label_en: "Certificates" },
  { id: "partners", icon: Users, key: "partners", label_de: "Partner", label_en: "Partners" },
  { id: "testimonials", icon: MessageSquare, key: "testimonials" },
  { id: "gallery", icon: ImageIcon, key: "gallery" },
  { id: "submissions", icon: Inbox, key: "submissions" },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { t } = useLang();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const initial = params.get("tab");
  const [tab, setTab] = useState(
    TABS.some((tb) => tb.id === initial) ? initial : "students",
  );

  useEffect(() => {
    const next = new URLSearchParams(location.search);
    if (next.get("tab") !== tab) {
      next.set("tab", tab);
      navigate(`?${next.toString()}`, { replace: true });
    }
  }, [tab, location.search, navigate]);

  return (
    <div
      data-testid="admin-dashboard"
      className="min-h-screen bg-[#fafaf9] text-[#1c1917] flex flex-col"
    >
      <header
        className="border-b border-[#e7e5e4] bg-white px-5 md:px-8 py-4 flex items-center justify-between"
        data-testid="admin-header"
      >
        <div className="flex items-center gap-3">
          <Link to="/" data-testid="admin-logo">
            <div className="font-display text-xl tracking-tight">
              Safe<span className="font-serif-i text-[#ff5a36]">Ride</span>
            </div>
          </Link>
          <span className="text-[10px] tracking-widest uppercase text-[#a8a29e] border-l border-[#e7e5e4] pl-3 ml-1 font-medium">
            CMS
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs text-[#78716c] mr-2">{user?.email}</span>
          <Link
            to="/"
            data-testid="admin-view-site"
            className="btn-ghost text-xs py-2 px-3"
          >
            <Home size={13} /> Website
          </Link>
          <button
            data-testid="admin-logout-btn"
            onClick={logout}
            className="btn-primary text-xs py-2 px-3"
          >
            <LogOut size={13} /> {t.admin.logout}
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row flex-1">
        <aside
          data-testid="admin-sidebar"
          className="lg:w-60 bg-white border-b lg:border-b-0 lg:border-r border-[#e7e5e4] px-3 md:px-4 py-5 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible"
        >
          {TABS.map((tb) => {
            const Icon = tb.icon;
            const active = tab === tb.id;
            const label = tb.label_de || (t.admin.tabs[tb.key] ?? tb.id);
            return (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id)}
                data-testid={`admin-tab-${tb.id}`}
                className={`text-left flex items-center gap-3 px-3 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap rounded-full ${
                  active
                    ? "bg-[#ff5a36] text-white"
                    : "text-[#475569] hover:text-[#0f172a] hover:bg-[#fbf9f6]"
                }`}
              >
                <Icon size={14} strokeWidth={1.75} />
                {label}
              </button>
            );
          })}
        </aside>

        <main className="flex-1 p-5 md:p-8 overflow-x-hidden">
          {tab === "students" && <StudentsManager />}
          {tab === "fk_master" && <MasterDataTab />}
          {tab === "content" && <ContentEditor />}
          {tab === "pages" && <PagesManager />}
          {tab === "blog" && <BlogManager />}
          {tab === "bookings" && <BookingsManager />}
          {tab === "vku_registrations" && <VkuRegistrationsViewer />}
          {tab === "packages" && <PackagesManager />}
          {tab === "certificates" && <CertificatesManager />}
          {tab === "partners" && <PartnersManager />}
          {tab === "testimonials" && <TestimonialsManager />}
          {tab === "gallery" && <GalleryManager />}
          {tab === "submissions" && <SubmissionsViewer />}
        </main>
      </div>
    </div>
  );
}
