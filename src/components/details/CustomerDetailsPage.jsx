// src/components/details/CustomerDetailsPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  ShoppingBag,
  Wallet,
  Package,
  Eye,
  UserRound,
} from "lucide-react";

import { getCustomerDetail } from "../../redux/slices/customerSlice";
import Breadcrumb from "../common/Breadcrumb";
import Skeleton from "../common/Skeleton";
import EmptyState from "../common/EmptyState";
import InfoCard from "../common/InfoCard";
import StatTile from "../common/StatTile";
import StatusBadge from "../common/StatusBadge";
import CommonTable from "../common/CommonTable";
import Pagination from "../common/Pagination";
import IconButton from "../common/IconButton";
import { formatDate } from "../../utils/formatDate";

const CustomerDetailsPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { selectedCustomer: customer, detailLoading } = useSelector(
    (state) => state.customer || {},
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    dispatch(getCustomerDetail(id));
  }, [dispatch, id]);

  const orders = customer?.orders || [];
  const totalOrders = orders.length;
  const totalSpent = customer?.totalSpent ?? 0;
  const totalProducts = orders.some((o) => Array.isArray(o.items))
    ? orders.reduce(
        (sum, o) => sum + (o.items?.reduce((s, it) => s + (it.quantity || 0), 0) || 0),
        0,
      )
    : null;

  const indexOfLast = currentPage * itemsPerPage;
  const currentOrders = orders.slice(indexOfLast - itemsPerPage, indexOfLast);

  const orderColumns = [
    {
      key: "orderNumber",
      header: "Order",
      truncate: true,
      truncateWidth: "260px",
      className: "font-medium text-gray-800",
    },
    {
      key: "createdAt",
      header: "Date",
      width: "140px",
      className: "text-gray-500",
      render: (item) => formatDate(item.createdAt),
    },
    {
      key: "status",
      header: "Status",
      width: "140px",
      render: (item) => <StatusBadge status={(item?.status || "").replace(/_/g, " ")} />,
    },
    {
      key: "paymentStatus",
      header: "Payment",
      width: "110px",
      className: "text-gray-600 capitalize",
    },
    {
      key: "totalAmount",
      header: "Amount",
      width: "110px",
      align: "right",
      className: "font-medium text-gray-900 tabular-nums",
      render: (item) => `₹${item.totalAmount}`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Breadcrumb
          items={[
            { label: "Dashboard", to: "/" },
            { label: "Customers", to: "/customer" },
            { label: "Customer Details" },
          ]}
        />
       
      </div>

      {detailLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !customer ? (
        <InfoCard>
          <EmptyState
            icon={UserRound}
            title="Customer not found"
            description="This customer may have been removed, or the link is invalid."
          />
        </InfoCard>
      ) : (
        <>
          {/* PROFILE CARD */}
          <InfoCard>
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-purple-dark)] text-white flex items-center justify-center text-lg font-semibold shrink-0">
                {(customer.name || "?").charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-lg font-bold text-gray-900">{customer.name}</h2>
                  <StatusBadge
                    status={customer.isBlocked ? "Blocked" : "Active"}
                    tone={
                      customer.isBlocked
                        ? "bg-red-50 text-red-700 ring-red-600/20"
                        : "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                    }
                  />
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <Mail size={14} className="text-gray-400" />
                    {customer.email || "—"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Phone size={14} className="text-gray-400" />
                    {customer.phone || "—"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-gray-400" />
                    Joined {formatDate(customer.createdAt)}
                  </span>
                  {/* <span className="flex items-center gap-1.5">
                    <Clock size={14} className="text-gray-400" />
                    Updated {formatDate(customer.updatedAt)}
                  </span> */}
                </div>

                {customer.addresses?.length > 0 && (
                  <div className="mt-3 flex items-start gap-1.5 text-sm text-gray-600">
                    <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                    <span>
                      {[
                        customer.addresses[0].addressLine1,
                        customer.addresses[0].addressLine2,
                        customer.addresses[0].city,
                        customer.addresses[0].state,
                        customer.addresses[0].postalCode,
                        customer.addresses[0].country,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </InfoCard>

          {/* STATS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatTile icon={ShoppingBag} label="Total Orders" value={totalOrders} />
            <StatTile
              icon={Wallet}
              label="Total Amount Spent"
              value={`₹${totalSpent}`}
              tone="gold"
            />
            <StatTile
              icon={Package}
              label="Total Products Purchased"
              value={totalProducts ?? "—"}
            />
          </div>

          {/* ORDER HISTORY */}
          <InfoCard title="Order History" icon={ShoppingBag}>
            {orders.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="No orders yet"
                description="Orders placed by this customer will show up here."
              />
            ) : (
              <>
                <CommonTable
                  columns={orderColumns}
                  data={currentOrders}
                  minWidth="640px"
                  renderRowActions={(item) => (
                    <IconButton
                      icon={Eye}
                      label="View order"
                      tone="blue"
                      onClick={() => navigate(`/orders/${item.id}`)}
                    />
                  )}
                />
                <Pagination
                  currentPage={currentPage}
                  totalItems={orders.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(value) => {
                    setItemsPerPage(value);
                    setCurrentPage(1);
                  }}
                />
              </>
            )}
          </InfoCard>
        </>
      )}
    </div>
  );
};

export default CustomerDetailsPage;
