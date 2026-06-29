import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Home from "@/pages/Home";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f0] text-[#0a0a0a]">
        <span className="font-accent tracking-widest text-sm uppercase opacity-60">
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
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin"
                element={
                  <RequireAuth>
                    <AdminDashboard />
                  </RequireAuth>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster
            theme="light"
            position="top-right"
            toastOptions={{
              style: {
                background: "#ffffff",
                color: "#0a0a0a",
                border: "2px solid #0033ff",
                borderRadius: "16px",
              },
            }}
          />
        </AuthProvider>
      </LanguageProvider>
    </div>
  );
}

export default App;
