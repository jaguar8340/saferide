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
