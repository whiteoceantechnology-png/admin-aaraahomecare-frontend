// Sales Export dataset builder.
//
// Everything here is derived from the EXISTING admin orders API
// (GET /admin/orders) — no new data source, no sample data, nothing
// fabricated. The counts the preview shows and the rows a future workbook
// would contain come from this one function, so the two can never disagree.
//
// INVOICE DATE SOURCE
// -------------------
// There is no `invoiceDate` or `invoiceNumber` field anywhere in this
// codebase or in any payload it reads — grep confirms it. The tax invoice
// (OrderInvoice.jsx) prints `order.createdAt` as "Invoice Date" and
// `order.orderNumber` as "Invoice No.", so those two fields ARE the
// invoice date and number as far as this system is concerned, and this
// report uses the same ones. If the backend later gains dedicated invoice
// fields, change INVOICE_DATE_FIELDS / INVOICE_NUMBER_FIELDS below and
// nothing else moves.
export const INVOICE_DATE_FIELDS = ["invoiceDate", "invoicedAt", "createdAt"];
export const INVOICE_NUMBER_FIELDS = ["invoiceNumber", "invoiceNo", "orderNumber"];

const firstValue = (obj, fields) => {
  for (const f of fields) {
    const v = obj?.[f];
    if (v !== null && v !== undefined && v !== "") return v;
  }
  return null;
};

export const invoiceDateOf = (order) => firstValue(order, INVOICE_DATE_FIELDS);
export const invoiceNumberOf = (order) => firstValue(order, INVOICE_NUMBER_FIELDS);

// Whether the order's invoice date falls inside [from, to], inclusive of both
// days. Compared on calendar days in local time so a 31 Oct 23:30 order is in
// October rather than slipping into November through a UTC conversion.
const dayKey = (value) => {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
};

export const periodBounds = ({ mode, month, year, fromDate, toDate }) => {
  if (mode === "monthly") {
    const m = Number(month);
    const y = Number(year);
    if (!(y > 1970)) return null;
    // 0 = "All months": the whole selected year, 1 Jan to 31 Dec.
    if (m === 0) return { from: new Date(y, 0, 1), to: new Date(y, 11, 31) };
    if (!(m >= 1 && m <= 12)) return null;
    // Day 0 of the next month is the last day of this one — handles 28/29/30/31
    // without a lookup table.
    return { from: new Date(y, m - 1, 1), to: new Date(y, m, 0) };
  }
  if (!fromDate || !toDate) return null;
  const from = new Date(fromDate);
  const to = new Date(toDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  if (from > to) return null;
  return { from, to };
};

export const inPeriod = (order, bounds) => {
  if (!bounds) return false;
  const key = dayKey(invoiceDateOf(order));
  if (key == null) return false;
  return key >= dayKey(bounds.from) && key <= dayKey(bounds.to);
};

const CANCELLED = ["cancelled", "canceled"];
const RETURN_LIKE = ["returned", "return_requested", "refunded"];

const lower = (v) => (v ?? "").toString().trim().toLowerCase();

// A line's GST rate, read from the same places the tax invoice reads it.
// Returns null when the order carries none — the caller raises that as a
// validation warning rather than substituting a rate.
const lineGstPercent = (it) => {
  const raw =
    it?.taxPercent ?? it?.gstPercent ?? it?.variant?.taxPercent ?? it?.product?.taxPercent;
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
};

const lineHsn = (it) => it?.hsnCode || it?.hsn || it?.variant?.hsnCode || null;

/**
 * The export dataset for a period.
 *
 * Returns the orders in scope plus the counts the preview reports and the
 * validation warnings for master data the report cannot invent.
 */
export const buildSalesExportDataset = (orders, bounds) => {
  const all = Array.isArray(orders) ? orders : [];
  const scoped = all.filter((o) => inPeriod(o, bounds));

  const cancelled = scoped.filter((o) => CANCELLED.includes(lower(o?.status)));
  const returnLike = scoped.filter((o) => RETURN_LIKE.includes(lower(o?.status)));

  let productLines = 0;
  let shippingLines = 0;
  const warnings = [];
  const addWarning = (key, label) => {
    const found = warnings.find((w) => w.key === key);
    if (found) found.count += 1;
    else warnings.push({ key, label, count: 1 });
  };

  scoped.forEach((order) => {
    const items = Array.isArray(order?.items) ? order.items : [];
    productLines += items.length;
    if (Number(order?.shippingAmount || 0) > 0) shippingLines += 1;

    // Billing state decides CGST/SGST vs IGST for this report, so its absence
    // is a blocking data problem, not a cosmetic one.
    const billingState =
      order?.billingAddress?.state ?? order?.addressSnapshot?.state ?? null;
    if (!lower(billingState)) addWarning("billingState", "Orders with no billing state");
    if (!lower(order?.customer?.name ?? order?.addressSnapshot?.name))
      addWarning("customerName", "Orders with no customer name");

    items.forEach((it) => {
      if (!lineHsn(it)) addWarning("hsn", "Product lines with no HSN code");
      if (lineGstPercent(it) === null)
        addWarning("gstRate", "Product lines with no GST rate");
      const qty = Number(it?.quantity);
      if (!(qty > 0)) addWarning("quantity", "Product lines with no quantity");
      if (!lower(it?.uqc ?? it?.unit ?? it?.variant?.unit))
        addWarning("uqc", "Product lines with no UQC unit");
    });
  });

  return {
    orders: scoped,
    counts: {
      invoices: scoped.length,
      productLines,
      shippingLines,
      cancelledOrders: cancelled.length,
      // Credit notes / refunds: see the note returned alongside. No refund or
      // credit-note record exists in any payload this app reads, so this is
      // the count of orders in a return/refund STATE, not of credit notes.
      returnStateOrders: returnLike.length,
    },
    warnings,
  };
};

// One list row per invoice, carrying exactly the seven columns the Sales
// Export table shows. Derived from the same scoped dataset the counts come
// from, so the list and the export period can never diverge.
export const toListRows = (orders) =>
  (Array.isArray(orders) ? orders : []).map((o) => ({
    id: o?.id,
    invoiceNumber: invoiceNumberOf(o) || "—",
    invoiceDate: invoiceDateOf(o),
    customerName:
      o?.customer?.name || o?.addressSnapshot?.name || o?.customerName || "—",
    status: o?.status ?? null,
    paymentStatus: o?.paymentStatus ?? null,
    invoiceTotal: Number(o?.totalAmount ?? 0),
    productLines: Array.isArray(o?.items) ? o.items.length : 0,
  }));

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
