import { useEffect, useState } from "react";
import {
  LogOut,
  Home,
  FileText,
  MessageSquare,
  Image as ImageIcon,
  Inbox,
  Map,
  BookOpen,
  Calendar,
  Package,
  Award,
  Users,
  GraduationCap,
  UserRound,
  ClipboardList,
  Building2,
  Wallet,
  UserCog,
  HardDriveDownload,
  Menu,
  X,
  Mail,
} from "lucide-react";
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
import BusinessSettingsManager from "@/components/admin/BusinessSettingsManager";
import UsersManager from "@/components/admin/UsersManager";
import BackupManager from "@/components/admin/BackupManager";
import CalendarManager from "@/components/admin/CalendarManager";
import EmailSettingsManager from "@/components/admin/EmailSettingsManager";
import AccountingPage from "@/pages/AccountingPage";
import {
  BlogManager,
  PackagesManager,
  CertificatesManager,
  PartnersManager,
} from "@/components/admin/EntityManagers";

const TABS = [
  { id: "students", icon: UserRound, key: "students", label_de: "Schüler", label_en: "Students" },
  { id: "calendar", icon: Calendar, key: "calendar", label_de: "Kalender", label_en: "Calendar" },
  { id: "accounting", icon: Wallet, key: "accounting", label_de: "Buchhaltung", label_en: "Accounting" },
  { id: "fk_master", icon: ClipboardList, key: "fk_master", label_de: "Fahrkontrolle-Stammdaten", label_en: "Fahrkontrolle Masters" },
  { id: "business", icon: Building2, key: "business", label_de: "Fahrschul-Daten", label_en: "Business Settings" },
  { id: "email", icon: Mail, key: "email", label_de: "E-Mail-Versand", label_en: "Email" },
  { id: "backup", icon: HardDriveDownload, key: "backup", label_de: "Datensicherung", label_en: "Backup" },
  { id: "users", icon: UserCog, key: "users", label_de: "Benutzer", label_en: "Users" },
  { id: "content", icon: FileText, key: "content", label_de: "Inhalte", label_en: "Content" },
  { id: "pages", icon: Map, key: "pages", label_de: "Seiten & Standorte", label_en: "Pages & Locations" },
  { id: "blog", icon: BookOpen, key: "blog", label_de: "Blog", label_en: "Blog" },
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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const next = new URLSearchParams(location.search);
    if (next.get("tab") !== tab) {
      next.set("tab", tab);
      navigate(`?${next.toString()}`, { replace: true });
    }
  }, [tab, location.search, navigate]);

  // close the drawer when switching tabs on mobile
  useEffect(() => {
    setMenuOpen(false);
  }, [tab]);

  // prevent body scroll when the mobile drawer is open
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const activeTab = TABS.find((tb) => tb.id === tab);
  const ActiveIcon = activeTab?.icon;
  const activeLabel = activeTab?.label_de || activeTab?.id;

  return (
    <div
      data-testid="admin-dashboard"
      className="min-h-screen bg-[#fafaf9] text-[#1c1917] flex flex-col"
    >
      <header
        className="border-b border-[#e7e5e4] bg-white px-4 md:px-8 py-3 md:py-4 flex items-center justify-between gap-2 sticky top-0 z-30"
        data-testid="admin-header"
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* burger menu on mobile only */}
          <button
            onClick={() => setMenuOpen(true)}
            data-testid="admin-menu-toggle"
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full text-[#0f172a] hover:bg-[#f5f5f4]"
            aria-label="Menü öffnen"
          >
            <Menu size={18} />
          </button>
          <Link to="/" data-testid="admin-logo" className="min-w-0">
            <div className="font-display text-xl tracking-tight truncate">
              Safe<span className="font-serif-i text-[#ff5a36]">Ride</span>
            </div>
          </Link>
          <span className="hidden sm:inline text-[10px] tracking-widest uppercase text-[#a8a29e] border-l border-[#e7e5e4] pl-3 ml-1 font-medium">
            CMS
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="hidden md:inline text-xs text-[#78716c] mr-2 truncate max-w-[180px]">
            {user?.email}
          </span>
          <Link
            to="/"
            data-testid="admin-view-site"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#475569] hover:text-[#0f172a] bg-white border border-[#e2e8f0] rounded-full px-3 py-2"
          >
            <Home size={13} />
            <span className="hidden sm:inline">Website</span>
          </Link>
          <button
            data-testid="admin-logout-btn"
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest bg-[#ff5a36] text-white rounded-full px-3 py-2 hover:opacity-90"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">{t.admin.logout}</span>
          </button>
        </div>
      </header>

      {/* Mobile active-tab breadcrumb (helps orientation) */}
      <div className="lg:hidden bg-white border-b border-[#e7e5e4] px-4 py-2.5 flex items-center gap-2 text-xs text-[#475569] font-semibold">
        {ActiveIcon && <ActiveIcon size={13} className="text-[#ff5a36]" />}
        <span className="truncate">{activeLabel}</span>
        <button
          onClick={() => setMenuOpen(true)}
          data-testid="admin-change-tab"
          className="ml-auto text-[10px] uppercase tracking-widest text-[#ff5a36] hover:opacity-80"
        >
          Bereich wechseln
        </button>
      </div>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside
          data-testid="admin-sidebar"
          className="hidden lg:flex lg:w-60 bg-white border-r border-[#e7e5e4] px-4 py-5 flex-col gap-1 overflow-y-auto sticky top-[65px] self-start max-h-[calc(100vh-65px)]"
        >
          <SidebarTabs tabs={TABS} tab={tab} onSelect={setTab} t={t} />
        </aside>

        {/* Mobile drawer */}
        {menuOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40"
            data-testid="admin-drawer"
            onClick={() => setMenuOpen(false)}
          >
            <div className="absolute inset-0 bg-[#0f172a]/60" />
            <div
              className="absolute inset-y-0 left-0 w-[85%] max-w-[320px] bg-white shadow-2xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-4 border-b border-[#e7e5e4] sticky top-0 bg-white">
                <div className="text-[10px] font-semibold tracking-widest uppercase text-[#475569]">
                  Verwaltung
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  data-testid="admin-drawer-close"
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#f5f5f4]"
                  aria-label="Menü schliessen"
                >
                  <X size={16} />
                </button>
              </div>
              <nav className="px-3 py-4 flex flex-col gap-1">
                <SidebarTabs tabs={TABS} tab={tab} onSelect={setTab} t={t} />
              </nav>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 md:p-8 overflow-x-hidden min-w-0">
          {tab === "students" && <StudentsManager />}
          {tab === "calendar" && <CalendarManager />}
          {tab === "accounting" && <AccountingPage />}
          {tab === "fk_master" && <MasterDataTab />}
          {tab === "business" && <BusinessSettingsManager />}
          {tab === "email" && <EmailSettingsManager />}
          {tab === "backup" && <BackupManager />}
          {tab === "users" && <UsersManager />}
          {tab === "content" && <ContentEditor />}
          {tab === "pages" && <PagesManager />}
          {tab === "blog" && <BlogManager />}
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

function SidebarTabs({ tabs, tab, onSelect, t }) {
  return (
    <>
      {tabs.map((tb) => {
        const Icon = tb.icon;
        const active = tab === tb.id;
        const label = tb.label_de || (t.admin.tabs[tb.key] ?? tb.id);
        return (
          <button
            key={tb.id}
            onClick={() => onSelect(tb.id)}
            data-testid={`admin-tab-${tb.id}`}
            className={`text-left flex items-center gap-3 px-3 py-3 text-sm font-semibold transition-colors rounded-full ${
              active
                ? "bg-[#ff5a36] text-white"
                : "text-[#475569] hover:text-[#0f172a] hover:bg-[#fbf9f6]"
            }`}
          >
            <Icon size={15} strokeWidth={1.75} />
            {label}
          </button>
        );
      })}
    </>
  );
}
