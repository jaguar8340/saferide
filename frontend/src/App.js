import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Home from "@/pages/Home";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminStudentDetail from "@/pages/AdminStudentDetail";
import PortalLogin from "@/pages/PortalLogin";
import PortalSetup from "@/pages/PortalSetup";
import PortalDashboard from "@/pages/PortalDashboard";
import AgbConfirm from "@/pages/AgbConfirm";
import AblaufPage from "@/pages/AblaufPage";
import VkuPage from "@/pages/VkuPage";
import LocationPage from "@/pages/LocationPage";
import LegalPage from "@/pages/LegalPage";
import BlogList from "@/pages/BlogList";
import BlogPost from "@/pages/BlogPost";
import BuchungPage from "@/pages/BuchungPage";
import PartnerPage from "@/pages/PartnerPage";
import SportPreview from "@/pages/SportPreview";
import ElegantPreview from "@/pages/ElegantPreview";
import VividPreview from "@/pages/VividPreview";
import LiveryPreview from "@/pages/LiveryPreview";
import CouturePreview from "@/pages/CouturePreview";
import WhatsAppFab from "@/components/site/WhatsAppFab";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { EditProvider } from "@/contexts/EditContext";
import { PortalAuthProvider } from "@/contexts/PortalAuthContext";

// React Router v6 does not support `-` inside a single dynamic segment
// (e.g. "/fahrschule-:slug"), so we use a single-segment dispatcher.
function SlugDispatcher() {
  const { fullSlug } = useParams();
  if (fullSlug && fullSlug.startsWith("fahrschule-")) {
    return <LocationPage />;
  }
  return <Navigate to="/" replace />;
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbf9f6] text-[#0f172a]">
        <span className="text-xs font-semibold tracking-widest uppercase opacity-50">
          Lade…
        </span>
      </div>
    );
  }
  if (!user) return <Navigate to="/admin/login" replace />;
  return children;
}

function App() {
  return (
    <div className="App">
      <LanguageProvider>
        <AuthProvider>
          <PortalAuthProvider>
            <EditProvider>
              <BrowserRouter>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/ablauf" element={<AblaufPage />} />
                <Route path="/ablauf-zum-fuehrerschein" element={<AblaufPage />} />
                <Route path="/vku" element={<VkuPage />} />
                <Route path="/vku-unterricht" element={<VkuPage />} />
                <Route
                  path="/impressum"
                  element={<LegalPage pageKey="impressum" titleFallback={{ de: "Impressum", en: "Imprint" }} />}
                />
                <Route
                  path="/datenschutz"
                  element={<LegalPage pageKey="datenschutz" titleFallback={{ de: "Datenschutz", en: "Privacy" }} />}
                />
                <Route path="/blog" element={<BlogList />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/buchung" element={<BuchungPage />} />
                <Route path="/partner" element={<PartnerPage />} />
                <Route path="/preview/sport" element={<SportPreview />} />
                <Route path="/preview/elegant" element={<ElegantPreview />} />
                <Route path="/preview/vivid" element={<VividPreview />} />
                <Route path="/preview/livery" element={<LiveryPreview />} />
                <Route path="/preview/couture" element={<CouturePreview />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/portal/login" element={<PortalLogin />} />
                <Route path="/portal/setup" element={<PortalSetup />} />
                <Route path="/portal" element={<PortalDashboard />} />
                <Route path="/agb/:token" element={<AgbConfirm />} />
                <Route
                  path="/admin"
                  element={
                    <RequireAuth>
                      <AdminDashboard />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/admin/students/:studentId"
                  element={
                    <RequireAuth>
                      <AdminStudentDetail />
                    </RequireAuth>
                  }
                />
                <Route path="/:fullSlug" element={<SlugDispatcher />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              <WhatsAppFab />
            </BrowserRouter>
            <Toaster
              theme="light"
              position="top-right"
              toastOptions={{
                style: {
                  background: "#ffffff",
                  color: "#0f172a",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                },
              }}
            />
            </EditProvider>
          </PortalAuthProvider>
        </AuthProvider>
      </LanguageProvider>
    </div>
  );
}

export default App;
