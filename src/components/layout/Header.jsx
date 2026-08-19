import { Menu, ChevronRight, Bell, ChevronDown, LogOut, User, Mail } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import logo from "./aaraa_logo.png";
import api, { clearAuthAndRedirect } from "../../utils/api";

// Path prefix -> breadcrumb label. Checked longest-prefix-first isn't needed
// since these are all single-segment top-level routes; detail routes like
// /products/:id or /categories/:id/edit fall through via startsWith.
const PAGE_LABELS = [
  { prefix: "/product", label: "Products" },
  { prefix: "/categories", label: "Categories" },
  { prefix: "/category", label: "Categories" },
  { prefix: "/variant", label: "Inventory" },
  { prefix: "/order", label: "Orders" },
  { prefix: "/customer", label: "Customers" },
  { prefix: "/brand", label: "Brands" },
  { prefix: "/tax", label: "Tax" },
  { prefix: "/banner", label: "Banners" },
  { prefix: "/coupon", label: "Coupons" },
  { prefix: "/notification", label: "Notifications" },
  { prefix: "/subscription", label: "Subscriptions" },
  { prefix: "/review", label: "Reviews" },
  { prefix: "/partner", label: "Partners" },
  { prefix: "/allusers", label: "Users" },
  { prefix: "/userdetails", label: "Users" },
  { prefix: "/storeservices", label: "Store Services" },
  { prefix: "/admin", label: "Admin Users" },
];

const getPageLabel = (pathname) => {
  if (pathname === "/") return "Dashboard";
  return PAGE_LABELS.find((p) => pathname.startsWith(p.prefix))?.label || "Dashboard";
};

const Header = ({ collapsed, toggleSidebar }) => {
  const location = useLocation();
  const pageLabel = getPageLabel(location.pathname);

  // ---- RIGHT SIDE (unchanged from the original implementation) ----
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const modalRef = useRef(null);
  const notificationsRef = useRef(null);

  const profile = useSelector((state) => state.profile.profileList);

  const toggleProfileModal = () => setShowProfileModal((prev) => !prev);

  const handleLogout = async () => {
    try {
      const response = await api.post(
        "/admin/auth/logout",
        {},
        { headers: { "Content-Type": "application/json" }, withCredentials: false },
      );
      if (response.data.data == "logout successful") {
        clearAuthAndRedirect();
      }
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setShowProfileModal(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setShowProfileModal(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }

    if (showProfileModal || showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileModal, showNotifications]);

  return (
    <header
      className={`fixed top-0 right-0 z-40 h-14 bg-white border-b border-gray-200 transition-all duration-300 ease-out ${
        collapsed ? "left-16" : "left-60"
      }`}
    >
      <div className="h-14 pl-6 pr-4 lg:pr-6 flex items-center justify-between gap-4">
        {/* LEFT — hamburger + breadcrumb */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex items-center justify-center w-8 h-8 -ml-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-[var(--brand-purple)] transition-colors cursor-pointer shrink-0"
            aria-label="Toggle sidebar"
          >
            <Menu size={20} />
          </button>

          <nav className="flex items-center gap-2 text-[13px] min-w-0" aria-label="Breadcrumb">
            <span className="text-gray-400 font-medium shrink-0">Admin</span>
            <ChevronRight size={14} className="text-gray-300 shrink-0" />
            <span className="text-gray-900 font-semibold truncate">{pageLabel}</span>
          </nav>
        </div>

        {/* RIGHT — unchanged from the original implementation */}
        <div className="flex items-center gap-2 lg:gap-3 shrink-0">
          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => setShowNotifications((prev) => !prev)}
              className="relative flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-[var(--brand-purple)] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--brand-purple)]/20"
              aria-label="Notifications"
            >
              <Bell size={20} />
              <span
                className="absolute top-2 right-2 w-2 h-2 rounded-full ring-2 ring-white"
                style={{ backgroundColor: "var(--brand-gold)" }}
              />
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-lg border border-gray-200/80 z-10 overflow-hidden animate-fade-in-up">
                <div className="px-4 py-3.5 border-b border-gray-100">
                  <p className="text-[14px] font-semibold text-gray-800">
                    Notifications
                  </p>
                </div>
                <div className="px-4 py-8 text-center">
                  <p className="text-[13px] text-gray-400">
                    You're all caught up
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-gray-200 hidden sm:block" />

          {/* User Profile */}
          <div
            className="flex items-center relative cursor-pointer rounded-lg px-2 py-1.5 hover:bg-gray-100 transition-colors"
            onClick={toggleProfileModal}
          >
            <div className="relative">
              <img
                src={logo}
                alt="User"
                className="w-8 h-8 rounded-full ring-2 ring-[var(--brand-gold)] object-cover"
              />
              <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-white" />
            </div>

            <div className="ml-2.5 hidden md:block">
              <p className="text-[13.5px] font-semibold text-gray-800 capitalize leading-tight">
                {profile?.username}
              </p>
              <p className="text-[11.5px] text-gray-500 leading-tight mt-0.5">
                {profile?.email}
              </p>
            </div>

            <button
              type="button"
              className="ml-1 text-gray-400 focus:outline-none cursor-pointer"
              aria-label="Open profile menu"
            >
              <ChevronDown size={16} />
            </button>

            {/* Profile Modal */}
            {showProfileModal && (
              <div
                ref={modalRef}
                className="absolute right-0 top-16 w-64 bg-white rounded-2xl shadow-lg border border-gray-200/80 z-10 overflow-hidden animate-fade-in-up"
              >
                <div className="p-4 border-b border-gray-100 bg-gray-50/60">
                  <div className="flex items-center">
                    <img
                      src={logo}
                      alt="User"
                      className="w-12 h-12 rounded-full ring-2 ring-[var(--brand-gold)] object-cover"
                    />
                    <div className="ml-3 min-w-0">
                      <p className="text-[13.5px] font-semibold text-gray-800 capitalize truncate">
                        {profile?.username}
                      </p>
                      <p className="text-[11.5px] text-gray-500 truncate mt-0.5">
                        {profile?.email}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-2 space-y-0.5">
                  <div className="flex items-center px-2.5 py-2 rounded-lg text-gray-600">
                    <User size={16} className="mr-3 text-[var(--brand-purple)] shrink-0" />
                    <p className="text-[13px] capitalize truncate">
                      {profile?.username}
                    </p>
                  </div>

                  <div className="flex items-center px-2.5 py-2 rounded-lg text-gray-600">
                    <Mail size={16} className="mr-3 text-[var(--brand-purple)] shrink-0" />
                    <p className="text-[13px] truncate">{profile?.email}</p>
                  </div>
                </div>

                <div className="p-2 border-t border-gray-100">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-2.5 py-2 text-red-600 cursor-pointer hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut size={16} className="mr-3" />
                    <span className="text-[13px] font-semibold">Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
