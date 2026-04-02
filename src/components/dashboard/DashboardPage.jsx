import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getDashboard } from "../../redux/slices/dashboardSlice";
import DashboardDetail from "./DashboardDetail";

const DashboardPage = ({ title }) => {
  const dispatch = useDispatch();

  const { dashboardList, loading, error } = useSelector(
    (state) => state.dashboard
  );

  useEffect(() => {
    dispatch(getDashboard());
  }, [dispatch]);

  const summary = dashboardList?.summary || {};

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{title}</h2>

      {loading && (
        <div className="flex items-center justify-center py-10 text-gray-500">
          Loading Dashboard...
        </div>
      )}

      {error && (
        <div className="text-red-500 text-center py-10">
          {error}
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
          }}
        />
      )}
    </div>
  );
};

export default DashboardPage;