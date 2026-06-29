import { useState } from "react";
import { LogOut, Home, FileText, MessageSquare, Image as ImageIcon, Inbox } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import ContentEditor from "@/components/admin/ContentEditor";
import TestimonialsManager from "@/components/admin/TestimonialsManager";
import GalleryManager from "@/components/admin/GalleryManager";
import SubmissionsViewer from "@/components/admin/SubmissionsViewer";

const TABS = [
  { id: "content", icon: FileText, key: "content" },
  { id: "testimonials", icon: MessageSquare, key: "testimonials" },
  { id: "gallery", icon: ImageIcon, key: "gallery" },
  { id: "submissions", icon: Inbox, key: "submissions" },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { t } = useLang();
  const [tab, setTab] = useState("content");

  return (
    <div
      data-testid="admin-dashboard"
      className="min-h-screen bg-[#0a0a0a] text-white flex flex-col"
    >
      <header
        className="border-b border-white/10 px-6 md:px-10 py-4 flex items-center justify-between"
        data-testid="admin-header"
      >
        <div className="flex items-center gap-3">
          <Link to="/" data-testid="admin-logo">
            <div className="font-display font-black tracking-tighter text-xl uppercase">
              Safe<span className="text-[#FF2E00]">Ride</span>
            </div>
          </Link>
          <span className="text-[10px] tracking-[0.3em] uppercase text-white/40 border-l border-white/15 pl-3 ml-1">
            CMS
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs text-white/55 mr-2">
            {user?.email}
          </span>
          <Link
            to="/"
            data-testid="admin-view-site"
            className="btn-ghost text-[10px] py-2 px-3"
            style={{ borderRadius: 2 }}
          >
            <Home size={13} /> Website
          </Link>
          <button
            data-testid="admin-logout-btn"
            onClick={logout}
            className="btn-primary text-[10px] py-2 px-3"
            style={{ borderRadius: 2 }}
          >
            <LogOut size={13} /> {t.admin.logout}
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row flex-1">
        <aside
          data-testid="admin-sidebar"
          className="lg:w-64 border-b lg:border-b-0 lg:border-r border-white/10 px-3 md:px-5 py-5 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible"
        >
          {TABS.map((tb) => {
            const Icon = tb.icon;
            const active = tab === tb.id;
            return (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id)}
                data-testid={`admin-tab-${tb.id}`}
                className={`text-left flex items-center gap-3 px-3 py-3 text-xs tracking-widest uppercase font-bold transition-colors whitespace-nowrap ${
                  active
                    ? "bg-[#FF2E00] text-white"
                    : "text-white/55 hover:text-white hover:bg-white/5"
                }`}
                style={{ borderRadius: 2 }}
              >
                <Icon size={14} />
                {t.admin.tabs[tb.key]}
              </button>
            );
          })}
        </aside>

        <main className="flex-1 p-5 md:p-8 overflow-x-hidden">
          {tab === "content" && <ContentEditor />}
          {tab === "testimonials" && <TestimonialsManager />}
          {tab === "gallery" && <GalleryManager />}
          {tab === "submissions" && <SubmissionsViewer />}
        </main>
      </div>
    </div>
  );
}
