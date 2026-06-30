import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Home from "@/pages/Home";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import AblaufPage from "@/pages/AblaufPage";
import VkuPage from "@/pages/VkuPage";
import LocationPage from "@/pages/LocationPage";
import LegalPage from "@/pages/LegalPage";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { EditProvider } from "@/contexts/EditContext";

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
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route
                  path="/admin"
                  element={
                    <RequireAuth>
                      <AdminDashboard />
                    </RequireAuth>
                  }
                />
                <Route path="/:fullSlug" element={<SlugDispatcher />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
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
        </AuthProvider>
      </LanguageProvider>
    </div>
  );
}

export default App;
