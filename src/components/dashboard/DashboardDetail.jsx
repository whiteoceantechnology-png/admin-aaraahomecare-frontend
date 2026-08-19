import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Wallet,
  ShoppingCart,
  TrendingUp,
  Clock,
  PackageX,
  Inbox,
  ArrowRight,
  MapPinOff,
  Percent,
  BadgeAlert,
  ChevronRight,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { getAllTaxes } from "../../redux/slices/taxSlice";
import { getAllOrders } from "../../redux/slices/orderSlice";
import { getAllProducts } from "../../redux/slices/productSlice";
import { getAllVariants } from "../../redux/slices/variantSlice";
import { formatDate } from "../../utils/formatDate";

// A variant at or below this stock count is surfaced on the Low Stock panel.
// The backend has no configurable per-variant threshold today, so this is a
// fixed, documented client-side cutoff rather than a real API value.
const LOW_STOCK_THRESHOLD = 10;

const STATUS_META = {
  good: { dot: "bg-emerald-500", bar: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20" },
  warning: { dot: "bg-amber-500", bar: "bg-amber-500", badge: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20" },
  critical: { dot: "bg-red-500", bar: "bg-red-500", badge: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20" },
  info: { dot: "bg-blue-500", bar: "bg-blue-500", badge: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20" },
  neutral: { dot: "bg-gray-300", bar: "bg-gray-300", badge: "bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-300/40" },
};

const GOOD_STATUSES = ["COMPLETED", "DELIVERED", "PAID", "SUCCESS", "CONFIRMED"];
const WARNING_STATUSES = ["PENDING_PAYMENT", "PENDING", "PROCESSING", "AWAITING_PAYMENT"];
const INFO_STATUSES = ["PACKED", "SHIPPED"];
const CRITICAL_STATUSES = ["CANCELLED", "FAILED", "REJECTED", "REFUNDED"];

const getStatusKey = (status) => {
  const normalized = (status || "").toUpperCase();
  if (GOOD_STATUSES.includes(normalized)) return "good";
  if (WARNING_STATUSES.includes(normalized)) return "warning";
  if (INFO_STATUSES.includes(normalized)) return "info";
  if (CRITICAL_STATUSES.includes(normalized)) return "critical";
  return "neutral";
};

const formatStatus = (status) =>
  (status || "")
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "Unknown";

const formatCompactNumber = (value) => {
  const num = Number(value) || 0;
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(num);
};

const formatMoney = (value) =>
  `₹${(Number(value) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const EmptyState = ({ icon: Icon = Inbox, message = "No data available" }) => (
  <div className="flex flex-col items-center justify-center py-10 text-center">
    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 text-gray-300 mb-2">
      <Icon size={18} />
    </div>
    <p className="text-sm text-gray-400">{message}</p>
  </div>
);

const KPI_TONE = {
  emerald: "bg-emerald-50 text-emerald-600",
  purple: "bg-[var(--brand-purple)]/10 text-[var(--brand-purple)]",
  blue: "bg-blue-50 text-blue-600",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
};

const KpiCard = ({ label, value, displayValue, prefix, icon: Icon, tone, note, delay = 0 }) => (
  <div
    className="animate-fade-in-up bg-white rounded-2xl border border-gray-100 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow duration-300 p-4"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex items-start justify-between gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      <span className={`flex items-center justify-center w-9 h-9 rounded-[10px] shrink-0 ${KPI_TONE[tone]}`}>
        <Icon size={17} />
      </span>
    </div>
    <p className="mt-2.5 flex items-baseline gap-0.5 text-[26px] font-bold text-gray-900 tracking-[-0.02em]" title={String(value)}>
      {prefix && <span className="text-[15px] font-semibold text-gray-500 shrink-0">{prefix}</span>}
      <span className="truncate">{displayValue ?? value}</span>
    </p>
    <p className="mt-1.5 text-[12px] text-gray-400 min-h-[16px]">{note}</p>
  </div>
);

const SectionCard = ({ title, action, children, className = "" }) => (
  <div className={`animate-fade-in-up bg-white rounded-2xl border border-gray-100 shadow-[var(--shadow-card)] p-5 ${className}`}>
    <div className="flex items-center justify-between mb-4 gap-3">
      <h3 className="text-[16px] font-semibold text-gray-900">{title}</h3>
      {action}
    </div>
    {children}
  </div>
);

// Simple honest area/line sparkline over the recent orders the dashboard API
// already returns — no fabricated "collected vs GMV" series, since the
// backend doesn't distinguish captured payments from order totals yet.
const OrderTrendChart = ({ orders }) => {
  const points = useMemo(() => {
    const withDates = orders
      .filter((o) => o?.createdAt)
      .slice()
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    return withDates.map((o) => ({
      date: o.createdAt,
      amount: Number(o.totalAmount) || 0,
    }));
  }, [orders]);

  if (points.length < 2) {
    return <EmptyState icon={TrendingUp} message="Not enough recent orders to plot a trend yet" />;
  }

  const W = 640, H = 200, padL = 44, padR = 12, padT = 12, padB = 26;
  const iw = W - padL - padR, ih = H - padT - padB;
  const maxY = Math.max(...points.map((p) => p.amount), 10) * 1.15;
  const x = (i) => padL + (points.length === 1 ? iw / 2 : (i * iw) / (points.length - 1));
  const y = (v) => padT + ih - (v / maxY) * ih;
  const pathPts = points.map((p, i) => `${x(i)},${y(p.amount)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[200px]" preserveAspectRatio="none" role="img" aria-label="Recent order amounts over time">
      {[0, 1, 2, 3].map((g) => {
        const val = (maxY * g) / 3;
        const yy = y(val);
        return (
          <g key={g}>
            <line x1={padL} x2={W - padR} y1={yy} y2={yy} stroke="#E4E7EE" strokeWidth="1" />
            <text x={padL - 6} y={yy + 4} textAnchor="end" fontSize="10" fill="#8A91A5">
              {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : Math.round(val)}
            </text>
          </g>
        );
      })}
      <polygon points={`${x(0)},${y(0)} ${pathPts} ${x(points.length - 1)},${y(0)}`} fill="#443C8E" opacity="0.08" />
      <polyline points={pathPts} fill="none" stroke="#443C8E" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.amount)} r="3.5" fill="#fff" stroke="#443C8E" strokeWidth="2">
          <title>{`${formatDate(p.date)} — ${formatMoney(p.amount)}`}</title>
        </circle>
      ))}
    </svg>
  );
};

const DashboardDetail = ({ data }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const ordersByStatus = data?.ordersByStatus || [];

  const { taxes = [] } = useSelector((state) => state.taxes || {});
  const { allOrders = [] } = useSelector((state) => state.order || {});
  const { products = [] } = useSelector((state) => state.product || {});
  const { variants = [] } = useSelector((state) => state.variant || {});

  // Cross-reference against real data already used by their own pages —
  // additive read-only fetches, same pattern as Category/ProductDetails pages.
  useEffect(() => {
    dispatch(getAllTaxes());
    dispatch(getAllOrders());
    dispatch(getAllProducts());
    dispatch(getAllVariants());
  }, [dispatch]);

  // "Recent orders" reads from the same GET /admin/orders data the Orders
  // list page already uses (state.order.allOrders, fetched above) instead of
  // the separate /admin/dashboard aggregate's own `recentOrders` field — that
  // field was coming back empty/absent, which silently rendered this whole
  // section as "No data available" even though real order data exists.
  const recentOrders = useMemo(
    () =>
      [...allOrders]
        .filter((o) => o?.createdAt)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 8),
    [allOrders],
  );

  const avgOrderValue = data.totalOrders > 0 ? data.totalRevenue / data.totalOrders : 0;

  const totalStatusCount = ordersByStatus.reduce((sum, item) => sum + (item?.count ?? 0), 0);
  const pipelineMax = Math.max(...ordersByStatus.map((s) => s?.count ?? 0), 1);

  const lowStockVariants = useMemo(
    () =>
      variants
        .filter((v) => Number(v?.stockQuantity) <= LOW_STOCK_THRESHOLD)
        .sort((a, b) => Number(a.stockQuantity) - Number(b.stockQuantity)),
    [variants],
  );

  const attentionItems = useMemo(() => {
    const items = [];

    const ordersMissingAddress = allOrders.filter((o) => !o?.addressSnapshot);
    if (ordersMissingAddress.length > 0) {
      items.push({
        key: "missing-address",
        severity: "high",
        icon: MapPinOff,
        title: "Orders missing shipping address",
        meta: `${ordersMissingAddress[0]?.orderNumber || "1 order"} can't be fulfilled`,
        count: ordersMissingAddress.length,
        onClick: () => navigate(`/orders/${ordersMissingAddress[0].id}`),
      });
    }

    const overpriced = products.filter(
      (p) => p?.actualPrice != null && p?.discountPrice != null && Number(p.discountPrice) > Number(p.actualPrice),
    );
    if (overpriced.length > 0) {
      items.push({
        key: "over-mrp",
        severity: "high",
        icon: BadgeAlert,
        title: "Product priced above MRP",
        meta: `${overpriced[0]?.name} — ₹${overpriced[0]?.discountPrice} over ₹${overpriced[0]?.actualPrice}`,
        count: overpriced.length,
        onClick: () => navigate(`/products/${overpriced[0].id}`),
      });
    }

    const percentMap = new Map();
    taxes.forEach((t) => {
      const pct = String(t?.percent);
      if (!percentMap.has(pct)) percentMap.set(pct, []);
      percentMap.get(pct).push(t);
    });
    const duplicateTaxGroups = [...percentMap.values()].filter((g) => g.length > 1);
    if (duplicateTaxGroups.length > 0) {
      const names = duplicateTaxGroups[0].map((t) => `"${t.name}"`).join(" and ");
      items.push({
        key: "duplicate-tax",
        severity: "medium",
        icon: Percent,
        title: "Duplicate tax entries",
        meta: `${names} are both ${duplicateTaxGroups[0][0].percent}%`,
        count: duplicateTaxGroups.reduce((sum, g) => sum + g.length, 0),
        onClick: () => navigate("/tax"),
      });
    }

    return items;
  }, [allOrders, products, taxes, navigate]);

  return (
    <div className="space-y-5 pb-4">
      {/* KPI ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-4">
        <KpiCard
          label="Revenue"
          value={data.totalRevenue}
          displayValue={formatMoney(data.totalRevenue)}
          icon={Wallet}
          tone="emerald"
          note="total order value"
          delay={0}
        />
        <KpiCard
          label="Orders"
          value={data.totalOrders}
          displayValue={formatCompactNumber(data.totalOrders)}
          icon={ShoppingCart}
          tone="purple"
          note="in this dataset"
          delay={40}
        />
        <KpiCard
          label="Avg order value"
          value={avgOrderValue}
          displayValue={formatMoney(avgOrderValue)}
          icon={TrendingUp}
          tone="blue"
          note="revenue ÷ orders"
          delay={80}
        />
        <KpiCard
          label="Awaiting fulfillment"
          value={data.pendingOrders}
          displayValue={formatCompactNumber(data.pendingOrders)}
          icon={Clock}
          tone="amber"
          note={`of ${data.totalOrders} orders`}
          delay={120}
        />
        <KpiCard
          label="Low stock"
          value={lowStockVariants.length}
          displayValue={formatCompactNumber(lowStockVariants.length)}
          icon={PackageX}
          tone="red"
          note={`variants ≤ ${LOW_STOCK_THRESHOLD} units`}
          delay={160}
        />
      </div>

      {/* TREND + PIPELINE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Recent order trend">
          <OrderTrendChart orders={recentOrders} />
        </SectionCard>

        <SectionCard
          title="Fulfillment pipeline"
          action={
            totalStatusCount > 0 && (
              <span className="text-xs font-medium text-gray-400">{totalStatusCount} total</span>
            )
          }
        >
          {ordersByStatus.length > 0 ? (
            <div className="space-y-3.5">
              {ordersByStatus.map((item, index) => {
                const key = getStatusKey(item?.status);
                const widthPct = Math.round(((item?.count ?? 0) / pipelineMax) * 100);
                return (
                  <div key={item?.status || index} className="grid grid-cols-[88px_1fr_32px] items-center gap-3 text-[13px]">
                    <span className="text-gray-600 font-medium truncate">{formatStatus(item?.status)}</span>
                    <span className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <span
                        className={`block h-full rounded-full transition-all duration-700 ease-out ${STATUS_META[key].bar}`}
                        style={{ width: `${Math.max(widthPct, item?.count ? 2 : 0)}%` }}
                      />
                    </span>
                    <span className="text-right font-semibold text-gray-700 tabular-nums">{item?.count ?? 0}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState />
          )}
          <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between text-[13px] text-gray-500">
            <span>{totalStatusCount} orders</span>
            <Link to="/order" className="inline-flex items-center gap-1 font-medium text-[var(--brand-purple)] hover:text-[var(--brand-purple-dark)] transition-colors">
              Manage orders <ArrowRight size={13} />
            </Link>
          </div>
        </SectionCard>
      </div>

      {/* ORDERS TABLE + RIGHT STACK */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <SectionCard
          title="Recent orders"
          className="lg:col-span-2"
          action={
            <Link to="/order" className="inline-flex items-center gap-1 text-xs font-medium text-[var(--brand-purple)] hover:text-[var(--brand-purple-dark)] transition-colors">
              View all <ArrowRight size={13} />
            </Link>
          }
        >
          {recentOrders.length > 0 ? (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full min-w-[420px] text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    <th className="px-1 pb-3">Order</th>
                    <th className="px-1 pb-3">Date</th>
                    <th className="px-1 pb-3">Status</th>
                    <th className="px-1 pb-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentOrders.map((order, index) => {
                    const key = getStatusKey(order?.status);
                    return (
                      <tr
                        key={order?.id ?? index}
                        onClick={() => order?.id && navigate(`/orders/${order.id}`)}
                        className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                      >
                        <td className="px-1 py-3 text-gray-800 font-semibold">{order?.orderNumber || "—"}</td>
                        <td className="px-1 py-3 text-gray-500">{formatDate(order?.createdAt)}</td>
                        <td className="px-1 py-3">
                          <span className={`px-2.5 py-1 inline-flex text-xs font-medium rounded-full ${STATUS_META[key].badge}`}>
                            {formatStatus(order?.status)}
                          </span>
                        </td>
                        <td className="px-1 py-3 text-right font-semibold text-gray-900 tabular-nums">
                          {formatMoney(order?.totalAmount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState />
          )}
        </SectionCard>

        <div className="space-y-4">
          {/* ATTENTION REQUIRED */}
          <SectionCard title="Attention required">
            {attentionItems.length === 0 ? (
              <EmptyState icon={Inbox} message="No data-quality issues detected" />
            ) : (
              <div className="-mx-5 -mb-5 divide-y divide-gray-100">
                {attentionItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={item.onClick}
                      className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-gray-50/80 transition-colors cursor-pointer"
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          item.severity === "high" ? "bg-red-500" : "bg-amber-500"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-medium text-gray-900 truncate">{item.title}</span>
                        <span className="block text-[11.5px] text-gray-500 truncate mt-0.5">{item.meta}</span>
                      </span>
                      <span className="text-[11px] font-bold text-gray-700 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5 shrink-0">
                        {item.count}
                      </span>
                      <ChevronRight size={15} className="text-gray-300 shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* LOW STOCK */}
          <SectionCard title="Low stock">
            {lowStockVariants.length === 0 ? (
              <EmptyState icon={PackageX} message="Every tracked variant is above the threshold" />
            ) : (
              <div className="-mx-5 -mb-5 divide-y divide-gray-100">
                {lowStockVariants.slice(0, 4).map((v) => (
                  <div key={v.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-medium text-gray-900 truncate">{v.variantName}</span>
                      <span className="block text-[11.5px] text-gray-500 truncate mt-0.5">
                        {v.packSize?.label ? `${v.packSize.label} · ` : ""}SKU {v.sku || "—"}
                      </span>
                    </span>
                    <span
                      className={`text-[12px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                        Number(v.stockQuantity) <= 5 ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      {v.stockQuantity ?? 0} left
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate("/variant")}
                      className="text-[12px] font-semibold text-[var(--brand-purple)] hover:text-[var(--brand-purple-dark)] transition-colors shrink-0 cursor-pointer"
                    >
                      Restock
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between text-[13px] text-gray-500">
              <span>{lowStockVariants.length} of {variants.length} variants tracked low</span>
              <Link to="/variant" className="inline-flex items-center gap-1 font-medium text-[var(--brand-purple)] hover:text-[var(--brand-purple-dark)] transition-colors">
                View inventory <ArrowRight size={13} />
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

export default DashboardDetail;
