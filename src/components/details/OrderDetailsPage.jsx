// src/components/details/OrderDetailsPage.jsx
import { useEffect, useRef, useState } from "react";
import { exGstSubtotal } from "../../utils/orderTotals";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  MapPin,
  CreditCard,
  Truck,
  PackageSearch,
  PackageCheck,
  Package,
  Receipt,
  History,
  Printer,
  MoreVertical,
  CheckCircle2,
  Copy,
  Tag,
  FileText,
  Activity,
  Pencil,
  Ban,
  ShoppingBag,
  Wallet,
} from "lucide-react";

import { getOrderDetail, updateOrder, cancelOrder } from "../../redux/slices/orderSlice";
import Breadcrumb from "../common/Breadcrumb";
import Skeleton from "../common/Skeleton";
import EmptyState from "../common/EmptyState";
import InfoCard from "../common/InfoCard";
import StatusBadge from "../common/StatusBadge";
import ImageCell from "../common/ImageCell";
import Modal from "../common/Modal";
import InvoiceModal from "../common/InvoiceModal";
import TrackOrderForm from "../form/TrackOrderForm";
import CancelOrder from "../data/CancelOrder";
import { formatDate, formatDateTime } from "../../utils/formatDate";

const formatStatus = (status) =>
  (status || "")
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "Unknown";

const STATUS_TONE = {
  pending_payment: "bg-amber-50 text-amber-700 ring-amber-600/20",
  confirmed: "bg-blue-50 text-blue-700 ring-blue-600/20",
  processing: "bg-amber-50 text-amber-700 ring-amber-600/20",
  packed: "bg-blue-50 text-blue-700 ring-blue-600/20",
  shipped: "bg-blue-50 text-blue-700 ring-blue-600/20",
  delivered: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  cancelled: "bg-red-50 text-red-700 ring-red-600/20",
};

// "Packed" is its own real status (distinct from "processing") — the
// timeline previously conflated the two under one "Packed" step, which
// meant a packed order never actually appeared as packed here.
const TIMELINE_STEPS = [
  { key: "pending_payment", label: "Order Placed", icon: Receipt },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "processing", label: "Processing", icon: PackageSearch },
  { key: "packed", label: "Packed", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: PackageCheck },
];

const SummaryCard = ({ icon: Icon, iconClass, title, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-300 ease-out p-3">
    <div className="flex items-center gap-3 mb-4">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}
      >
        <Icon size={18} />
      </div>
      <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">
        {title}
      </p>
    </div>
    {children}
  </div>
);

const Row = ({ label, value, valueClass = "" }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-[13px] text-gray-500">{label}</span>
    <span
      className={`text-[13px] font-medium text-gray-800 text-right ${valueClass}`}
    >
      {value}
    </span>
  </div>
);

const CardLinkButton = ({ children, disabled, ...props }) => (
  <button
    type="button"
    disabled={disabled}
    className="mt-3.5 w-full text-center px-3 py-2 rounded-lg text-[13px] font-medium text-[var(--brand-purple)] bg-[var(--brand-purple)]/8 hover:bg-[var(--brand-purple)]/14 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--brand-purple)]/8"
    {...props}
  >
    {children}
  </button>
);

const OrderDetailsPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { selectedOrder: order, detailLoading } = useSelector(
    (state) => state.order || {},
  );

  const [activeModal, setActiveModal] = useState(null); // "track" | "cancel" | null
  const [submitting, setSubmitting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    dispatch(getOrderDetail(id));
  }, [dispatch, id]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const address = order?.addressSnapshot;
  const items = order?.items || [];
  // GST-INCLUSIVE, like every stored line price — the summary splits it into
  // goods + tax so the rows add up to the grand total instead of exceeding it
  // by the tax amount. See utils/orderTotals.js.
  const subtotal = items.reduce((sum, it) => sum + Number(it.subtotal || 0), 0);
  const subtotalExGst = exGstSubtotal(subtotal, order?.taxAmount);
  const paymentMethod = order?.payments?.[0]?.method || order?.paymentMethod;

  const currentStatus = (order?.status || "").toLowerCase();
  const isCancelled = currentStatus === "cancelled";
  const isPaid = ["paid", "completed", "success"].includes(
    (order?.paymentStatus || "").toLowerCase(),
  );
  const paidAmount = isPaid ? Number(order?.totalAmount || 0) : 0;
  const pendingAmount = Number(order?.totalAmount || 0) - paidAmount;

  const closeModal = () => setActiveModal(null);

  const handleUpdateSubmit = async (data) => {
    if (!order) return;
    setSubmitting(true);
    const res = await dispatch(updateOrder({ id: order.id, data }));
    setSubmitting(false);

    if (updateOrder.fulfilled.match(res)) {
      toast.success("Order updated");
      closeModal();
    } else {
      toast.error(res.payload || "Something went wrong");
    }
  };

  // POST /admin/orders/{id}/cancel is a dedicated endpoint taking { reason },
  // not the generic status-update PUT — kept separate from handleUpdateSubmit
  // above rather than special-cased inside it.
  const handleCancelSubmit = async (data) => {
    if (!order) return;
    setSubmitting(true);
    const res = await dispatch(cancelOrder({ id: order.id, data }));
    setSubmitting(false);

    if (cancelOrder.fulfilled.match(res)) {
      toast.success("Order cancelled");
      closeModal();
    } else {
      toast.error(res.payload || "Something went wrong");
    }
  };

  const handleCopyAddress = () => {
    if (!address) return;
    const text = [
      address.name,
      address.addressLine1,
      address.addressLine2,
      address.city,
      address.state,
      address.postalCode,
      address.country,
      address.phone,
    ]
      .filter(Boolean)
      .join(", ");
    navigator.clipboard.writeText(text);
    toast.success("Address copied");
  };

  const handleCopyTracking = () => {
    if (!order?.trackingId) return;
    navigator.clipboard.writeText(order.trackingId);
    toast.success("Tracking ID copied");
  };

  const handleViewPayment = () => {
    document
      .getElementById("order-summary")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const customerId = order?.customer?.id || order?.customerId;

  // Honest, non-fabricated activity feed — only entries backed by real timestamps.
  const activity = [];
  if (order?.createdAt) {
    activity.push({
      icon: Receipt,
      label: "Order Created",
      time: order.createdAt,
      tone: "bg-[var(--brand-purple)]/10 text-[var(--brand-purple)]",
    });
  }
  if (order?.updatedAt && order.updatedAt !== order.createdAt) {
    activity.push({
      icon: isCancelled ? Ban : Activity,
      label: isCancelled
        ? "Order Cancelled"
        : `Status Updated to ${formatStatus(order.status)}`,
      time: order.updatedAt,
      tone: isCancelled ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600",
    });
  }

  const timelineIndex = TIMELINE_STEPS.findIndex(
    (s) => s.key === currentStatus,
  );

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Breadcrumb
          items={[
            { label: "Dashboard", to: "/" },
            { label: "Orders", to: "/order" },
            { label: "Order Details" },
          ]}
        />
      </div>

      {detailLoading ? (
        <div className="space-y-5">
          <Skeleton className="h-28 w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !order ? (
        <InfoCard>
          <EmptyState
            icon={PackageSearch}
            title="Order not found"
            description="This order may have been removed, or the link is invalid."
          />
        </InfoCard>
      ) : (
        <>
          {/* HEADER */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[var(--shadow-card)]  lg:p-6 animate-fade-in-up">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">
                    {order.orderNumber}
                  </h1>
                  <StatusBadge
                    status={formatStatus(order.status)}
                    tone={STATUS_TONE[currentStatus]}
                  />
                  {order.paymentStatus && (
                    <StatusBadge
                      status={formatStatus(order.paymentStatus)}
                      tone={
                        isPaid
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                          : "bg-amber-50 text-amber-700 ring-amber-600/20"
                      }
                    />
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-gray-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar size={14} className="text-gray-400" />
                    Placed on {formatDateTime(order.createdAt)}
                  </span>
                  {order.updatedAt && order.updatedAt !== order.createdAt && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={14} className="text-gray-400" />
                      Updated {formatDateTime(order.updatedAt)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setInvoiceOpen(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-[13px] font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <Printer size={15} />
                  <span className="hidden sm:inline">Print Invoice</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal("track")}
                  className="inline-flex items-center gap-2 px-4 py-2.5 h-12 rounded-xl text-[14px] font-semibold text-white bg-gradient-to-r from-[var(--brand-purple)] to-[var(--brand-purple-dark)] shadow-sm hover:brightness-110 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                >
                  Update Status
                </button>
                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-label="More actions"
                    className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-11 w-48 bg-white rounded-xl shadow-lg border border-gray-200/80 z-10 overflow-hidden animate-fade-in-up p-1.5">
                      <button
                        type="button"
                        disabled={isCancelled || currentStatus === "delivered"}
                        onClick={() => {
                          setMenuOpen(false);
                          setActiveModal("cancel");
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        <Ban size={15} />
                        Cancel Order
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <SummaryCard
              icon={Wallet}
              iconClass="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white"
              title="Order Amount"
            >
              <div className="divide-y divide-gray-50">
                <Row
                  label="Grand Total"
                  value={`₹${order.totalAmount}`}
                  valueClass="font-semibold text-gray-900"
                />
                <Row
                  label="Paid"
                  value={`₹${paidAmount}`}
                  valueClass="text-emerald-600"
                />
                <Row
                  label="Pending"
                  value={`₹${pendingAmount}`}
                  valueClass="text-amber-600"
                />
              </div>
            </SummaryCard>

            <SummaryCard
              icon={User}
              iconClass="bg-gradient-to-br from-violet-500 to-purple-600 text-white"
              title="Customer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--brand-purple)]/10 text-[var(--brand-purple)] flex items-center justify-center text-sm font-semibold shrink-0">
                  {(order.customer?.name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-gray-800 truncate">
                    {order.customer?.name || "—"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {order.customer?.phone || "—"}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500 truncate mt-2">
                {order.customer?.email || "—"}
              </p>
              <CardLinkButton
                disabled={!customerId}
                onClick={() => navigate(`/customers/${customerId}`)}
              >
                View Profile
              </CardLinkButton>
            </SummaryCard>

            <SummaryCard
              icon={Truck}
              iconClass="bg-gradient-to-br from-blue-500 to-cyan-500 text-white"
              title="Shipping"
            >
              <div className="divide-y divide-gray-50">
                <Row
                  label="Delivery Type"
                  value={order.deliveryType || order.shippingMethod || "—"}
                />
                <Row label="Tracking ID" value={order.trackingId || "—"} />
                <Row
                  label="Expected Delivery"
                  value={formatDate(order.expectedDeliveryDate)}
                />
              </div>
              <CardLinkButton
                disabled={!order.trackingId}
                onClick={handleCopyTracking}
              >
                <span className="inline-flex items-center justify-center gap-1.5">
                  <Copy size={13} /> View Tracking
                </span>
              </CardLinkButton>
            </SummaryCard>

            <SummaryCard
              icon={CreditCard}
              iconClass="bg-gradient-to-br from-amber-400 to-orange-500 text-white"
              title="Payment"
            >
              <div className="divide-y divide-gray-50">
                <Row
                  label="Status"
                  value={
                    <StatusBadge
                      status={formatStatus(order.paymentStatus)}
                      tone={
                        isPaid
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                          : "bg-amber-50 text-amber-700 ring-amber-600/20"
                      }
                    />
                  }
                />
                <Row
                  label="Method"
                  value={paymentMethod ? formatStatus(paymentMethod) : "—"}
                />
                <Row
                  label="Coupon"
                  value={order.couponCode || "—"}
                  valueClass={order.couponCode ? "text-emerald-600" : ""}
                />
              </div>
              <CardLinkButton onClick={handleViewPayment}>
                View Payment
              </CardLinkButton>
            </SummaryCard>
          </div>

          {/* ITEMS */}
          <InfoCard title={`Items (${items.length})`} icon={ShoppingBag}>
            {items.length === 0 ? (
              <EmptyState icon={PackageSearch} title="No items on this order" />
            ) : (
              <div className="divide-y divide-gray-50">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap sm:flex-nowrap items-center gap-4 py-3.5 px-1 -mx-1 rounded-lg hover:bg-gray-50/80 transition-colors"
                  >
                    <ImageCell src={null} size={48} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-gray-800 truncate">
                        {item.productName}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {item.sizeLabel && (
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[11px] font-medium text-gray-600">
                            {item.sizeLabel}
                          </span>
                        )}
                        {item.variant?.sku && (
                          <span className="text-[11px] text-gray-400">
                            SKU: {item.variant.sku}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-[var(--brand-purple)]/8 text-[var(--brand-purple)] text-[12px] font-semibold shrink-0">
                      × {item.quantity}
                    </span>
                    <div className="text-right shrink-0 w-24">
                      <p className="text-[13px] text-gray-500">₹{item.price}</p>
                    </div>
                    <div className="text-right shrink-0 w-24">
                      <p className="text-[13px] font-semibold text-gray-900">
                        ₹{item.subtotal}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </InfoCard>

          {/* CUSTOMER / SHIPPING / ORDER SUMMARY */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <InfoCard title="Customer Details" icon={User}>
              <div className="flex items-center gap-3 mb-3.5">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-purple-dark)] text-white flex items-center justify-center text-base font-semibold shrink-0">
                  {(order.customer?.name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-gray-800 truncate">
                    {order.customer?.name || "—"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {order.customer?.email || "—"}
                  </p>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                <Row label="Phone" value={order.customer?.phone || "—"} />
                <Row
                  label="Total Orders"
                  value={order.customer?.totalOrders ?? "—"}
                />
              </div>
              <CardLinkButton
                disabled={!customerId}
                onClick={() => navigate(`/customers/${customerId}`)}
              >
                View Full Profile
              </CardLinkButton>
            </InfoCard>

            <InfoCard
              title="Shipping Address"
              icon={MapPin}
              className="relative overflow-hidden"
            >
              <div
                className="absolute inset-0 opacity-[0.04] pointer-events-none"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, #493a78 1.5px, transparent 1.5px)",
                  backgroundSize: "16px 16px",
                }}
              />
              <div className="relative">
                {address ? (
                  <div className="text-[13px] text-gray-600 space-y-2">
                    <p className="font-medium text-gray-800">{address.name}</p>
                    <p className="leading-relaxed">
                      {[
                        address.addressLine1,
                        address.addressLine2,
                        address.city,
                        address.state,
                        address.postalCode,
                        address.country,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    {address.phone && (
                      <p className="text-gray-500">{address.phone}</p>
                    )}
                  </div>
                ) : (
                  <EmptyState icon={MapPin} title="No address on file" />
                )}
                <CardLinkButton disabled={!address} onClick={handleCopyAddress}>
                  <span className="inline-flex items-center justify-center gap-1.5">
                    <Copy size={13} /> Copy Address
                  </span>
                </CardLinkButton>
              </div>
            </InfoCard>

            <InfoCard title="Order Summary" icon={Receipt} id="order-summary">
              <dl className="space-y-1">
                <Row label="Subtotal (ex-GST)" value={`₹${subtotalExGst}`} />
                <Row
                  label="Discount"
                  value={`-₹${order.discountAmount ?? 0}`}
                  valueClass="text-red-600"
                />
                <Row label="Tax" value={`₹${order.taxAmount ?? 0}`} />
                <Row label="Shipping" value={`₹${order.shippingAmount ?? 0}`} />
              </dl>
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
                <span className="text-[13px] font-semibold text-gray-800">
                  Grand Total
                </span>
                <span className="text-xl font-bold text-gray-900">
                  ₹{order.totalAmount}
                </span>
              </div>
              {Number(order.discountAmount) > 0 && (
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                  <Tag size={12} />
                  You saved ₹{order.discountAmount}
                </div>
              )}
            </InfoCard>
          </div>

          {/* TIMELINE / NOTES */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <InfoCard
              title="Order Timeline"
              icon={History}
              className="lg:col-span-2"
            >
              {isCancelled ? (
                <ol className="relative">
                  <li className="relative pl-9 pb-6">
                    <span className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-red-200" />
                    <span className="absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-600">
                      <Receipt size={15} />
                    </span>
                    <p className="text-sm font-medium text-gray-900">
                      Order Placed
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDateTime(order.createdAt)}
                    </p>
                  </li>
                  <li className="relative pl-9">
                    <span className="absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center bg-red-100 text-red-600">
                      <Ban size={15} />
                    </span>
                    <p className="text-sm font-medium text-red-600">
                      Order Cancelled
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDateTime(order.updatedAt)}
                    </p>
                    {order.notes && (
                      <p className="text-xs text-gray-500 mt-1">
                        {order.notes}
                      </p>
                    )}
                  </li>
                </ol>
              ) : (
                <ol className="relative">
                  {TIMELINE_STEPS.map((step, i) => {
                    const complete = timelineIndex >= 0 && i <= timelineIndex;
                    const isCurrent = i === timelineIndex;
                    const nextComplete =
                      timelineIndex >= 0 && i + 1 <= timelineIndex;
                    const date =
                      i === 0
                        ? order.createdAt
                        : isCurrent
                          ? order.updatedAt
                          : null;
                    const Icon = step.icon;
                    return (
                      <li
                        key={step.key}
                        className="relative pl-9 pb-6 last:pb-0"
                      >
                        {i !== TIMELINE_STEPS.length - 1 && (
                          <span
                            className={`absolute left-[15px] top-8 bottom-0 w-0.5 ${
                              nextComplete ? "bg-emerald-300" : "bg-gray-200"
                            }`}
                          />
                        )}
                        <span
                          className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            complete
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          <Icon size={15} />
                        </span>
                        <p
                          className={`text-sm font-medium ${complete ? "text-gray-900" : "text-gray-400"}`}
                        >
                          {step.label}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {date ? formatDateTime(date) : complete ? "—" : "Pending"}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              )}
            </InfoCard>

            <InfoCard
              title="Internal Notes"
              icon={FileText}
              actions={
                <button
                  type="button"
                  onClick={() => setActiveModal("track")}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-[var(--brand-purple)] hover:bg-[var(--brand-purple)]/8 transition-colors cursor-pointer"
                >
                  <Pencil size={13} />
                  Edit
                </button>
              }
            >
              {order.notes ? (
                <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                  <p className="text-[13px] text-gray-700 leading-relaxed">
                    {order.notes}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-2">
                    Added {formatDateTime(order.updatedAt)}
                  </p>
                </div>
              ) : (
                <EmptyState
                  icon={FileText}
                  title="No internal notes yet"
                  description="Add tracking or handling notes for this order."
                />
              )}
            </InfoCard>
          </div>

          {/* RECENT ACTIVITY */}
          <InfoCard title="Recent Activity" icon={Activity}>
            {activity.length === 0 ? (
              <EmptyState icon={Activity} title="No activity recorded" />
            ) : (
              <div className="flex flex-wrap gap-3">
                {activity.map((a, i) => {
                  const Icon = a.icon;
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-gray-50/80 border border-gray-100 flex-1 min-w-[200px]"
                    >
                      <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${a.tone}`}
                      >
                        <Icon size={15} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-gray-800 truncate">
                          {a.label}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {formatDateTime(a.time)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </InfoCard>
        </>
      )}

      {/* UPDATE STATUS / CANCEL MODAL */}
      <Modal
        open={!!activeModal}
        onClose={closeModal}
        title={activeModal === "cancel" ? "Cancel Order" : "Update Status"}
        maxWidth="max-w-lg"
      >
        {activeModal === "track" && (
          <TrackOrderForm
            order={order}
            onSubmit={handleUpdateSubmit}
            loading={submitting}
          />
        )}
        {activeModal === "cancel" && (
          <CancelOrder
            order={order}
            onSubmit={handleCancelSubmit}
            loading={submitting}
          />
        )}
      </Modal>

      {/* INVOICE PREVIEW — real, data-driven invoice, not window.print() on
          the whole page. */}
      <InvoiceModal open={invoiceOpen} onClose={() => setInvoiceOpen(false)} order={order} />
    </div>
  );
};

export default OrderDetailsPage;
