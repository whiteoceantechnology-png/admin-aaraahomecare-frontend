import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { getDashboard } from "../../redux/slices/dashboardSlice";
import DashboardDetail from "./DashboardDetail";

const StatCardSkeleton = () => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-[var(--shadow-card)] p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 space-y-2.5">
        <div className="skeleton h-3 w-20 rounded-full" />
        <div className="skeleton h-6 w-16 rounded-lg" />
      </div>
      <div className="skeleton w-9 h-9 rounded-lg shrink-0" />
    </div>
  </div>
);

const SectionSkeleton = ({ rows = 4 }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-[var(--shadow-card)] p-4">
    <div className="skeleton h-4 w-32 rounded-full mb-5" />
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-4 w-full rounded-full" />
      ))}
    </div>
  </div>
);

const DashboardSkeleton = () => (
  <div className="space-y-4 pb-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 lg:gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <SectionSkeleton rows={4} />
      <SectionSkeleton rows={4} />
    </div>
    <SectionSkeleton rows={5} />
  </div>
);

const DashboardPage = ({ title }) => {
  const dispatch = useDispatch();

  const { dashboardList, loading, error } = useSelector(
    (state) => state.dashboard,
  );

  useEffect(() => {
    dispatch(getDashboard());
  }, [dispatch]);

  const summary = dashboardList?.summary || {};
  const ordersByStatus = dashboardList?.ordersByStatus || [];
  const recentOrders = dashboardList?.recentOrders || [];
  const topProducts = dashboardList?.topProducts || [];

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[20px] lg:text-[34px] font-bold text-gray-900 tracking-[-0.02em] leading-[1.2]">
          {title || "Dashboard"}
        </h1>
        <p className="text-[15px] font-medium text-gray-500 mt-1.5 leading-[1.6]">
          Welcome back — here's what's happening with your store today.
        </p>
      </div>

      {loading && <DashboardSkeleton />}

      {!loading && error && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[var(--shadow-card)] py-14 px-6 flex flex-col items-center text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-red-500 mb-4">
            <AlertTriangle size={22} />
          </div>
          <p className="text-[15px] font-semibold text-gray-800 mb-1">
            Couldn't load the dashboard
          </p>
          <p className="text-[13px] font-medium text-gray-500 mb-5 max-w-sm">
            {error}
          </p>
          <button
            type="button"
            onClick={() => dispatch(getDashboard())}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-[14px] font-semibold text-white bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] rounded-lg transition-colors cursor-pointer active:scale-[0.98]"
          >
            <RefreshCw size={15} />
            Try again
          </button>
        </div>
      )}

      {!loading && !error && (
        <DashboardDetail
          data={{
            totalOrders: summary.totalOrders || 0,
            totalCustomers: summary.totalCustomers || 0,
            totalProducts: summary.totalProducts || 0,
            pendingOrders: summary.pendingOrders || 0,
            totalRevenue: summary.totalRevenue || 0,
            ordersByStatus,
            recentOrders,
            topProducts,
          }}
        />
      )}
    </div>
  );
};

export default DashboardPage;
