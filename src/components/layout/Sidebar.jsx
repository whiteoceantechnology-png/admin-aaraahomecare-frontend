import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tags,
  Boxes,
  ShoppingCart,
  Users,
  Image,
  Ticket,
  Receipt,
  Bell,
  CreditCard,
  Truck,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

// Grouped nav matching the locked design spec — every entry below routes to a
// real, working page. Items with no backing page/API yet (Reports, Shipping,
// Store profile) are intentionally left out rather than linked to dead pages.
const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ path: "/", icon: LayoutDashboard, text: "Dashboard" }],
  },
  {
    label: "Catalog",
    items: [
      { path: "/product", icon: Package, text: "Products" },
      { path: "/variant", icon: Boxes, text: "Inventory" },
      { path: "/category", icon: FolderTree, text: "Categories" },
      // { path: "/brand", icon: Tags, text: "Brands" },
    ],
  },
  {
    label: "Sales",
    items: [
      { path: "/order", icon: ShoppingCart, text: "Orders" },
      { path: "/customer", icon: Users, text: "Customers" },
      { path: "/payment", icon: CreditCard, text: "Payments" },
      { path: "/logistics", icon: Truck, text: "Logistics" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { path: "/banner", icon: Image, text: "Banners" },
      { path: "/coupon", icon: Ticket, text: "Coupons" },
    ],
  },
  {
    label: "Settings",
    items: [
      { path: "/tax", icon: Receipt, text: "Tax" },
      // { path: "/notification", icon: Bell, text: "Notifications" },
    ],
  },
];

const Sidebar = ({ collapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-50 flex flex-col bg-[#171B2D] border-r border-[#242A44] transition-[width] duration-300 ease-out ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Logo / header area — small rounded-square "a" mark + "aaraa
          Homecare" wordmark + "ADMIN CONSOLE" label, matching the approved
          reference exactly. No matching icon-only asset exists in the repo
          (aaraa_logo.png is the full decorative arc wordmark, wrong shape
          for this spot), so the mark is built from the app's own existing
          tokens: the gold already used for the active-nav accent bar and
          the same muted-label styling NAV_GROUPS headings use below. */}
      <div
        className={`flex items-center shrink-0 overflow-hidden transition-all duration-300 ease-out gap-2.5 ${
          collapsed ? "justify-center px-2 py-[18px]" : "px-[18px] pt-[18px] pb-[14px]"
        }`}
      >
        <div className="w-9 h-9 rounded-[10px] bg-[#D3A430] flex items-center justify-center shrink-0">
          <span className="text-[19px] font-bold text-[#171B2D] leading-none">a</span>
        </div>
        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            collapsed ? "max-w-0 opacity-0" : "max-w-[10rem] opacity-100"
          }`}
        >
          <p className="text-[14.5px] font-bold text-white leading-tight whitespace-nowrap">aaraa Homecare</p>
          <p className="text-[9.5px] font-semibold text-[#6C7390] uppercase tracking-[1.6px] whitespace-nowrap">
            Admin Console
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-scroll mt-2 flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 pb-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mt-3.5 first:mt-3">
            <div
              className={`overflow-hidden transition-all duration-300 ease-out ${
                collapsed ? "max-h-0 opacity-0" : "max-h-6 opacity-100 mb-1 px-2.5"
              }`}
            >
              <span className="text-[10.5px] font-semibold text-[#6C7390] uppercase tracking-[1.6px] whitespace-nowrap">
                {group.label}
              </span>
            </div>

            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    type="button"
                    title={collapsed ? item.text : undefined}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => navigate(item.path)}
                    className={`group relative flex items-center w-full rounded-[10px] cursor-pointer transition-colors duration-150 ${
                      collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
                    } ${
                      isActive
                        ? "bg-[#2A2C55] text-white"
                        : "text-[#AEB4C9] hover:bg-[#20253D] hover:text-white"
                    }`}
                  >
                    {isActive && !collapsed && (
                      <span className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-r-[3px] bg-[#D3A430]" />
                    )}
                    <Icon size={18} strokeWidth={1.8} className="shrink-0" />
                    <span
                      className={`text-[14px] font-medium text-left whitespace-nowrap overflow-hidden transition-all duration-300 ease-out ${
                        collapsed ? "max-w-0 opacity-0" : "max-w-[10rem] opacity-100 flex-1"
                      }`}
                    >
                      {item.text}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div
        className={`shrink-0 border-t border-[#242A44] py-3.5 flex items-center ${
          collapsed ? "justify-center px-0" : "px-5"
        }`}
      >
        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            collapsed ? "max-w-0 opacity-0" : "max-w-[12rem] opacity-100"
          }`}
        >
          <p className="text-[11px] text-[#6C7390] whitespace-nowrap">
            © {new Date().getFullYear()} Aaraa Homecare
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
