import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Wallet,
  ShoppingCart,
  TrendingUp,
  Clock,
  PackageX,
  Package,
  PackageSearch,
  Users,
  Trophy,
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
import { getLowStockInventory } from "../../redux/slices/inventorySlice";
import { formatDate } from "../../utils/formatDate";

// A variant at or below this stock count is surfaced on the Low Stock panel.
// The backend has no configurable per-variant threshold today, so this is a
// fixed, documented client-side cutoff rather than a real API value.
// Display-only: the number shown beside a row's available stock. The
// BACKEND decides what counts as low (below 1000 g / 1000 ml / 25 units) and
// this value is never sent to it.
const LOW_STOCK_THRESHOLD = 10;

// Big enough to hold a whole low-stock result set in one request, which is
// what makes the out-of-stock count below exact.
const LOW_STOCK_FETCH_LIMIT = 500;

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

// Area/line chart over the dashboard API's own `revenueTrend` series. Falls
// back to deriving a series from recent orders when the response carries no
// trend, which is what this chart did before the API provided one — so the
// panel never goes blank on a response that omits the block.
//
// The SVG below is unchanged: this only changes where its points come from.
// Plots revenueTrend AND NOTHING ELSE.
//
// This used to fall back to plotting `recentOrders` whenever revenueTrend
// came back empty — which drew a confident-looking revenue line out of a
// different field, on a different aggregation, for a different period. With
// the API currently returning `revenueTrend: []` that chart was pure
// fabrication. An empty array is now an empty state, which is the honest
// answer and what the reference shows.
const OrderTrendChart = ({ trend = [] }) => {
  const points = useMemo(
    () =>
      (Array.isArray(trend) ? trend : [])
        .slice()
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map((p) => ({ date: p.date, amount: Number(p.amount) || 0 })),
    [trend],
  );

  if (points.length < 2) {
    return (
      <EmptyState
        icon={TrendingUp}
        message="No revenue data available for the selected period"
      />
    );
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
  // Server-side total from GET /admin/orders (data.total) — EVERY order,
  // independent of the page size this screen requests.
  const ordersPagination = useSelector((state) => state.order?.pagination) || {};
  const { products = [] } = useSelector((state) => state.product || {});
  // THE authoritative low-stock figures: GET /admin/inventory/low-stock.
  // The dashboard used to filter `state.variant.variants` on stockQuantity
  // instead, which is why it showed 0 while this endpoint reported 302 —
  // the variants list carries no per-variant stock, so the filter matched
  // nothing. The endpoint is now the source of truth.
  const lowStockState = useSelector((state) => state.inventory?.lowStock) || {};

  // Cross-reference against real data already used by their own pages —
  // additive read-only fetches, same pattern as Category/ProductDetails pages.
  useEffect(() => {
    dispatch(getAllTaxes());
    // Explicit limit. Called with no params the endpoint applies its own
    // default (limit=10), so `allOrders` held only the FIRST PAGE — and the
    // "Orders missing shipping address" count below was then computed over
    // 10 of N orders and presented as a total. Same limit the Orders page
    // uses for its own full-list fetch.
    dispatch(getAllOrders({ page: 1, limit: 1000 }));
    dispatch(getAllProducts());
    // No `threshold` — the backend owns that rule. The generous `limit` is
    // what lets the out-of-stock figure below be exact: every out-of-stock
    // product is by definition also low stock, so counting the zero-stock
    // rows in this one response needs no second request.
    dispatch(getLowStockInventory({ page: 1, limit: LOW_STOCK_FETCH_LIMIT }));
  }, [dispatch]);

  // "Recent orders" is the dashboard API's own `recentOrders` block. It used
  // to be read from GET /admin/orders instead, because the API field was
  // coming back empty and the panel rendered "No data available"; that
  // fallback is kept for exactly that case rather than removed, so an empty
  // block still shows real orders instead of an empty table.
  const recentOrders = useMemo(() => {
    const apiRecentOrders = data?.recentOrders || [];
    if (apiRecentOrders.length > 0) {
      return [...apiRecentOrders]
        .sort((a, b) => new Date(b?.createdAt) - new Date(a?.createdAt))
        .slice(0, 8);
    }
    return [...allOrders]
      .filter((o) => o?.createdAt)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8);
  }, [data?.recentOrders, allOrders]);

  // TWO DIFFERENT ORDER COUNTS, deliberately kept apart.
  //
  // `data.totalOrders` is the dashboard endpoint's KPI, and it counts PAID
  // orders only: it tracks Collected Revenue, and revenue ÷ it lands exactly
  // on the Average Order Value the API reports (₹610 / 4 = ₹152.50). That
  // makes it the right denominator for AOV and the wrong number for a card
  // headed "Total Orders" — which is why the dashboard could show 4 total
  // orders alongside 31 awaiting fulfillment.
  //
  // The card now shows the orders endpoint's own `total` instead. AOV below
  // still divides by the PAID count, or it would read ₹610 / 37 = ₹16.49.
  const paidOrders = Number(data.totalOrders) || 0;
  const allOrdersTotal = Number(ordersPagination?.total ?? 0);
  // Falls back to the KPI only while the orders request is still in flight,
  // so the card is never blank.
  const totalOrdersDisplay = allOrdersTotal > 0 ? allOrdersTotal : paidOrders;

  // The API's own average when it reports one; otherwise the same
  // revenue ÷ orders this card has always computed.
  const avgOrderValue =
    data?.averageOrderValue != null
      ? Number(data.averageOrderValue)
      : paidOrders > 0
        ? data.totalRevenue / paidOrders
        : 0;

  // Previous-period movement, rendered in the notes the cards already have.
  const deltaNotes = data?.deltaNotes || {};

  const totalStatusCount = ordersByStatus.reduce((sum, item) => sum + (item?.count ?? 0), 0);
  const pipelineMax = Math.max(...ordersByStatus.map((s) => s?.count ?? 0), 1);

  // Counts come from the API's own totals, never from the length of the
  // current page — the request asks for a handful of rows and the server
  // reports how many exist.
  const lowStockCount = Number(lowStockState?.meta?.total ?? 0);
  const inventoryLoading = !!lowStockState?.loading;
  const inventoryError = lowStockState?.error || null;

  // Out of stock is a SUBSET of low stock, so it is counted from the rows
  // this response already carries rather than guessed or re-requested. It is
  // exact only while the fetched page covers every matching row; if the
  // catalogue ever exceeds LOW_STOCK_FETCH_LIMIT the card says so instead of
  // reporting a page-limited number as a total.
  const loadedRows = Array.isArray(lowStockState?.items) ? lowStockState.items : [];
  const outOfStockExact = loadedRows.length >= lowStockCount;
  const outOfStockCount = loadedRows.filter(
    (r) =>
      Number(
        r?.availableQuantity ?? r?.availableProductStock ?? r?.productStock ?? 0,
      ) <= 0,
  ).length;

  // The preview rows for the alerts list. These are PRODUCTS: the response
  // carries productStock / availableProductStock / availableQuantity per
  // product and a `variants` array with no individual quantities in it, so
  // the array length is deliberately NOT treated as a count of low variants.
  const lowStockRows = useMemo(() => {
    const rows = Array.isArray(lowStockState?.items) ? lowStockState.items : [];
    return rows.map((row, index) => ({
      key: row?.id ?? row?.productId ?? `low-${index}`,
      name: row?.productName ?? row?.name ?? row?.product?.name ?? "—",
      // Available first, falling back to the raw stock figure; the two are
      // distinct fields and only one may be populated.
      available: Number(
        row?.availableQuantity ??
          row?.availableProductStock ??
          row?.productStock ??
          0,
      ),
      unit: row?.stockUnit ?? row?.productStockUnit ?? "",
      sku: row?.sku ?? null,
    }));
  }, [lowStockState?.items]);

  // topProducts from the dashboard API. The aggregate lives under `_sum`
  // (quantity / subtotal); the flat spellings are accepted only as
  // fallbacks so a differently-shaped payload still renders rather than
  // showing zeroes.
  const topProducts = useMemo(() => {
    const rows = Array.isArray(data?.topProducts) ? data.topProducts : [];
    return rows
      .map((row, index) => ({
        key: row?.productId ?? row?.id ?? `top-${index}`,
        name: row?.productName ?? row?.name ?? row?.product?.name ?? "—",
        units: Number(row?._sum?.quantity ?? row?.quantity ?? 0),
        revenue: Number(row?._sum?.subtotal ?? row?.subtotal ?? row?.revenue ?? 0),
      }))
      .sort((a, b) => b.units - a.units);
  }, [data?.topProducts]);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4">
        {/* "Collected", not "total order value": this is money actually
            taken, and must never be conflated with the value of unpaid
            orders. */}
        <KpiCard
          label="Collected Revenue"
          value={data.totalRevenue}
          displayValue={formatMoney(data.totalRevenue)}
          icon={Wallet}
          tone="emerald"
          note={deltaNotes.revenue || "from paid orders"}
          delay={0}
        />
        <KpiCard
          label="Total Orders"
          value={totalOrdersDisplay}
          displayValue={formatCompactNumber(totalOrdersDisplay)}
          icon={ShoppingCart}
          tone="purple"
          // No period delta here: previousPeriodDelta describes the PAID
          // KPI, so pairing it with this all-orders figure would compare two
          // different measures.
          note="all orders"
          delay={40}
        />
        <KpiCard
          label="Average Order Value"
          value={avgOrderValue}
          displayValue={formatMoney(avgOrderValue)}
          icon={TrendingUp}
          tone="blue"
          note={deltaNotes.averageOrderValue || "based on paid orders"}
          delay={80}
        />
        <KpiCard
          label="Awaiting Fulfillment"
          value={data.pendingOrders}
          displayValue={formatCompactNumber(data.pendingOrders)}
          icon={Clock}
          tone="amber"
          note={deltaNotes.pendingOrders || "orders to process"}
          delay={120}
        />
        <KpiCard
          label="Total Customers"
          value={data.totalCustomers}
          displayValue={formatCompactNumber(data.totalCustomers)}
          icon={Users}
          tone="blue"
          note="registered customers"
          delay={160}
        />
        <KpiCard
          label="Total Products"
          value={data.totalProducts}
          displayValue={formatCompactNumber(data.totalProducts)}
          icon={Package}
          tone="amber"
          note="active products"
          delay={200}
        />
        {/* PRODUCTS, not variants — see the note in lowStockRows above. */}
        <KpiCard
          label="Low Stock Products"
          value={lowStockCount}
          displayValue={
            inventoryLoading && lowStockCount === 0
              ? "—"
              : formatCompactNumber(lowStockCount)
          }
          icon={PackageX}
          tone="red"
          note={
            inventoryError ? "could not load inventory" : "below stock threshold"
          }
          delay={240}
        />
      </div>

      {/* TREND + PIPELINE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Revenue & Orders Trend">
          <OrderTrendChart trend={data?.revenueTrend} />
        </SectionCard>

        <SectionCard
          title="Order Pipeline"
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
          title="Recent Orders"
          className="lg:col-span-2"
          action={
            <Link to="/order" className="inline-flex items-center gap-1 text-xs font-medium text-[var(--brand-purple)] hover:text-[var(--brand-purple-dark)] transition-colors">
              View all <ArrowRight size={13} />
            </Link>
          }
        >
          {recentOrders.length > 0 ? (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full min-w-[640px] text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    <th className="px-1 pb-3">Order #</th>
                    <th className="px-1 pb-3">Date</th>
                    <th className="px-1 pb-3">Customer</th>
                    <th className="px-1 pb-3">Status</th>
                    <th className="px-1 pb-3">Payment</th>
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
                        <td className="px-1 py-3 min-w-0">
                          {/* Read across the shapes the API may use; the
                              normalizer spreads the raw order through. */}
                          <span className="block text-gray-800 font-medium truncate max-w-[150px]">
                            {order?.customer?.name || order?.customerName || "—"}
                          </span>
                          {(order?.customer?.email || order?.customerEmail) && (
                            <span className="block text-[11.5px] text-gray-400 truncate max-w-[150px]">
                              {order?.customer?.email || order?.customerEmail}
                            </span>
                          )}
                        </td>
                        <td className="px-1 py-3">
                          <span className={`px-2.5 py-1 inline-flex text-xs font-medium rounded-full ${STATUS_META[key].badge}`}>
                            {formatStatus(order?.status)}
                          </span>
                        </td>
                        <td className="px-1 py-3">
                          {/* paymentStatus, never status - the two are
                              separate fields on an order. */}
                          <span
                            className={`px-2.5 py-1 inline-flex text-xs font-medium rounded-full ${
                              STATUS_META[getStatusKey(order?.paymentStatus)].badge
                            }`}
                          >
                            {formatStatus(order?.paymentStatus)}
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

        <SectionCard
          title="Inventory Alerts"
          action={
            <Link to="/variant" className="inline-flex items-center gap-1 text-xs font-medium text-[var(--brand-purple)] hover:text-[var(--brand-purple-dark)] transition-colors">
              View inventory <ArrowRight size={13} />
            </Link>
          }
        >
          {/* Two counts, kept distinct on purpose: a variant AT or below the
              threshold is low, a variant with NO stock is out. The API's
              lowStockCount is not the out-of-stock count and is never shown
              as one. */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2.5">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                <PackageSearch size={13} /> Low Stock
              </span>
              <span className="block mt-1 text-[22px] font-bold text-amber-700 leading-none tabular-nums">
                {formatCompactNumber(lowStockCount)}
              </span>
              <span className="block mt-1 text-[11.5px] text-amber-700/70">
                products below stock threshold
              </span>
            </div>
            <div className="rounded-xl border border-red-100 bg-red-50/60 px-3 py-2.5">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-red-700">
                <PackageX size={13} /> Out of Stock
              </span>
              <span className="block mt-1 text-[22px] font-bold text-red-700 leading-none tabular-nums">
                {outOfStockExact ? formatCompactNumber(outOfStockCount) : "—"}
              </span>
              <span className="block mt-1 text-[11.5px] text-red-700/70">
                no stock available
              </span>
            </div>
          </div>
          {inventoryError ? (
            <EmptyState icon={PackageX} message={inventoryError} />
          ) : inventoryLoading ? (
            <EmptyState icon={PackageX} message="Loading inventory alerts…" />
          ) : lowStockRows.length === 0 ? (
            <EmptyState
              icon={PackageX}
              message="No product is below the stock threshold"
            />
          ) : (
            <div className="-mx-5 -mb-5 divide-y divide-gray-100">
              {lowStockRows.slice(0, 4).map((row) => (
                <div key={row.key} className="flex items-center gap-3 px-5 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-medium text-gray-900 truncate">
                      {row.name}
                    </span>
                    <span className="block text-[11.5px] text-gray-500 truncate mt-0.5">
                      SKU {row.sku || "—"}
                    </span>
                  </span>
                  {/* available / configured threshold */}
                  <span
                    className={`text-[12px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                      row.available <= 0
                        ? "bg-red-50 text-red-600"
                        : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    {row.available}
                    {row.unit ? ` ${row.unit}` : ""}
                    {row.available <= 0 ? " · out" : " · low"}
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
            <span>
              {/* The server's total, not the length of this preview list. */}
              Showing {Math.min(lowStockRows.length, 4)} of {lowStockCount}
            </span>
            <Link to="/variant" className="inline-flex items-center gap-1 font-medium text-[var(--brand-purple)] hover:text-[var(--brand-purple-dark)] transition-colors">
              View inventory <ArrowRight size={13} />
            </Link>
          </div>
        </SectionCard>
      </div>

      {/* TOP PRODUCTS + ATTENTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* TOP SELLING PRODUCTS — topProducts straight from the dashboard
            API: productName, _sum.quantity, _sum.subtotal. */}
        <SectionCard
          title="Top Selling Products"
          className="lg:col-span-2"
          action={
            <Link to="/products" className="inline-flex items-center gap-1 text-xs font-medium text-[var(--brand-purple)] hover:text-[var(--brand-purple-dark)] transition-colors">
              View all <ArrowRight size={13} />
            </Link>
          }
        >
          {topProducts.length === 0 ? (
            <EmptyState icon={Trophy} message="No product sales in this period" />
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full min-w-[420px] text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    <th className="px-1 pb-3 w-[40px]">#</th>
                    <th className="px-1 pb-3">Product</th>
                    <th className="px-1 pb-3 text-right">Units Sold</th>
                    <th className="px-1 pb-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {topProducts.map((row, index) => (
                    <tr key={row.key} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-1 py-3 text-gray-400 font-semibold tabular-nums">{index + 1}</td>
                      <td className="px-1 py-3 text-gray-800 font-medium truncate max-w-[260px]">{row.name}</td>
                      <td className="px-1 py-3 text-right text-gray-600 tabular-nums">{formatCompactNumber(row.units)}</td>
                      <td className="px-1 py-3 text-right font-semibold text-gray-900 tabular-nums">{formatMoney(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
        <SectionCard title="Attention Required">
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
      </div>
    </div>
  );
};

export default DashboardDetail;
