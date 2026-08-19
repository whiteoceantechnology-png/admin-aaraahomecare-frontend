import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import AuthPages from "./components/auth/AuthPages";
import AppRoutes from "./routes/AppRoutes";
import { Toaster } from "react-hot-toast";
import "./index.css";
import { useState, useEffect } from "react";

const AppContent = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(window.innerWidth < 768);

  const isAuthPage = location.pathname === "/auth";

  useEffect(() => {
    const handleResize = () => {
      setCollapsed(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      <Toaster position="top-right" />

      {/* ✅ AUTH PAGE (NO SIDEBAR) */}
      {isAuthPage ? (
        <AuthPages />
      ) : (
        <div className="flex min-h-screen" style={{ background: "var(--surface-page)" }}>
          <Sidebar collapsed={collapsed} />

          <div className="flex-1 flex flex-col overflow-hidden">
            <Header
              collapsed={collapsed}
              toggleSidebar={() => setCollapsed((prev) => !prev)}
            />

            <main
              className={`flex-1 p-4 lg:p-6 mt-14 transition-all duration-300 ease-out ${
                collapsed ? "ml-16" : "ml-60"
              }`}
            >
              <AppRoutes />
            </main>
          </div>
        </div>
      )}
    </>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;
