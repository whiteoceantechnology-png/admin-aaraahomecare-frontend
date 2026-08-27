// Field resolution for GET /admin/dashboard.
//
// The response's top-level blocks are known — kpis, previousPeriodDelta,
// revenueTrend, ordersByStatus, recentOrders, topProducts, summary — but the
// names INSIDE each block are not recorded anywhere in this repo and the
// endpoint requires auth, so they could not be read from a live response.
// Each value is therefore resolved across the few names an API of this shape
// plausibly uses, in priority order.
//
// This is the ONE place to narrow once a real response is available: replace
// an alias list with the single true field name and nothing else changes.

// First value present for any of `keys`, searching `sources` in order. A
// source earlier in the list wins, so kpis beats summary.
export const pickNumber = (sources, keys) => {
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    for (const key of keys) {
      const raw = source[key];
      if (raw == null || raw === "") continue;
      const value = Number(raw);
      if (!Number.isNaN(value)) return value;
    }
  }
  return null;
};

export const KPI_KEYS = {
  revenue: ["totalRevenue", "revenue", "totalSales", "sales", "grossRevenue"],
  orders: ["totalOrders", "orders", "orderCount", "totalOrderCount"],
  customers: ["totalCustomers", "customers", "customerCount"],
  products: ["totalProducts", "products", "productCount"],
  pending: [
    "pendingOrders",
    "pending",
    "awaitingFulfillment",
    "ordersPending",
    "pendingOrderCount",
  ],
  averageOrderValue: [
    "averageOrderValue",
    "avgOrderValue",
    "aov",
    "averageOrder",
  ],
};

// ordersByStatus rows: {status, count} in this UI's terms.
export const normalizeStatusRows = (rows) =>
  (Array.isArray(rows) ? rows : []).map((row) => ({
    ...row,
    status: row?.status ?? row?.orderStatus ?? row?.name ?? row?.label ?? "",
    count: Number(row?.count ?? row?.total ?? row?.orders ?? row?.value ?? 0),
  }));

// revenueTrend points: the chart plots {date, amount}.
export const normalizeTrendPoints = (points) =>
  (Array.isArray(points) ? points : [])
    .map((point) => ({
      date:
        point?.date ??
        point?.day ??
        point?.label ??
        point?.period ??
        point?.createdAt ??
        null,
      amount: Number(
        point?.revenue ??
          point?.amount ??
          point?.total ??
          point?.totalRevenue ??
          point?.value ??
          0,
      ),
    }))
    .filter((point) => point.date != null);

// Recent-order rows already match the shape the table renders; only the id and
// number vary between plausible payloads.
export const normalizeRecentOrders = (orders) =>
  (Array.isArray(orders) ? orders : []).map((order) => ({
    ...order,
    id: order?.id ?? order?.orderId ?? null,
    orderNumber: order?.orderNumber ?? order?.number ?? order?.code ?? null,
    createdAt: order?.createdAt ?? order?.date ?? order?.placedAt ?? null,
    status: order?.status ?? order?.orderStatus ?? null,
    totalAmount: Number(order?.totalAmount ?? order?.total ?? order?.amount ?? 0),
  }));

// A KPI's movement against the previous period, as a percentage.
//
// `previousPeriodDelta` is ambiguous by name — it could carry the previous
// period's ABSOLUTE values or an already-computed change — so only two
// unambiguous shapes are accepted:
//
//   { revenue: { changePercent: 12.5 } }   -> used directly
//   { revenue: { current, previous } }     -> computed
//   { revenue: 8200 }  with a current KPI  -> treated as the PREVIOUS value
//                                             and the change computed
//
// Anything it cannot read confidently returns null and the card simply shows
// its existing note, so an unrecognised payload can never put a wrong
// business figure on the dashboard.
export const deltaPercent = (deltaBlock, keys, currentValue) => {
  if (!deltaBlock || typeof deltaBlock !== "object") return null;

  for (const key of keys) {
    const entry = deltaBlock[key];
    if (entry == null) continue;

    if (typeof entry === "object") {
      const explicit = pickNumber(
        [entry],
        ["changePercent", "percentChange", "percent", "delta", "change"],
      );
      if (explicit != null) return explicit;
      const previous = pickNumber([entry], ["previous", "prev", "lastPeriod"]);
      const current = pickNumber([entry], ["current", "value"]) ?? currentValue;
      if (previous != null && previous !== 0 && current != null) {
        return ((current - previous) / Math.abs(previous)) * 100;
      }
      continue;
    }

    const previous = Number(entry);
    if (Number.isNaN(previous) || previous === 0) continue;
    if (currentValue == null) continue;
    return ((currentValue - previous) / Math.abs(previous)) * 100;
  }
  return null;
};

// "+12.5% vs previous period" / "−4.2% vs previous period".
export const formatDeltaNote = (percent) => {
  if (percent == null || Number.isNaN(percent)) return null;
  const rounded = Math.round(percent * 10) / 10;
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "";
  return `${sign}${Math.abs(rounded)}% vs previous period`;
};
