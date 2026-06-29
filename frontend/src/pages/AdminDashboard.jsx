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
      className="min-h-screen bg-[#f4f5f0] text-[#0a0a0a] flex flex-col"
    >
      <header
        className="border-b-2 border-[#0a0a0a]/10 bg-white px-5 md:px-8 py-4 flex items-center justify-between"
        data-testid="admin-header"
      >
        <div className="flex items-center gap-3">
          <Link to="/" data-testid="admin-logo">
            <div className="font-display font-black tracking-tighter text-xl uppercase">
              Safe<span className="text-[#0033ff]">Ride</span>
            </div>
          </Link>
          <span className="text-[10px] tracking-widest uppercase text-[#0a0a0a]/40 border-l-2 border-[#0a0a0a]/10 pl-3 ml-1 font-bold">
            CMS
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs text-[#0a0a0a]/55 mr-2 font-medium">
            {user?.email}
          </span>
          <Link
            to="/"
            data-testid="admin-view-site"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-extrabold tracking-widest uppercase border-2 border-[#0a0a0a] text-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-white transition-colors"
          >
            <Home size={13} /> Website
          </Link>
          <button
            data-testid="admin-logout-btn"
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-extrabold tracking-widest uppercase bg-[#0033ff] text-[#ccff00] hover:bg-[#0022cc] transition-colors"
          >
            <LogOut size={13} /> {t.admin.logout}
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row flex-1">
        <aside
          data-testid="admin-sidebar"
          className="lg:w-64 bg-white border-b-2 lg:border-b-0 lg:border-r-2 border-[#0a0a0a]/10 px-3 md:px-4 py-5 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible"
        >
          {TABS.map((tb) => {
            const Icon = tb.icon;
            const active = tab === tb.id;
            return (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id)}
                data-testid={`admin-tab-${tb.id}`}
                className={`text-left flex items-center gap-3 px-3 py-3 text-xs tracking-widest uppercase font-extrabold transition-colors whitespace-nowrap rounded-full ${
                  active
                    ? "bg-[#0033ff] text-[#ccff00]"
                    : "text-[#0a0a0a]/55 hover:text-[#0a0a0a] hover:bg-[#0a0a0a]/5"
                }`}
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
