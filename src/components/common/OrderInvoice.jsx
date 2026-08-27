// A4 tax-invoice template — structure, spacing and typography follow the
// approved reference PDF (a real tax invoice) exactly: bordered page frame,
// left company block + right "TAX INVOICE" heading, a labelled invoice-info
// row, Bill To / Ship To panel, an itemised table with a combined GST column,
// a totals block with Payment Made / Balance Due, Total in Words, Notes,
// and Terms & Conditions forced onto their own page. Every VALUE comes from
// the real order object already loaded by the caller (GET
// /admin/orders/{id}) — nothing here is invented. Two things are
// deliberately NOT copied from the reference verbatim:
//   1. Aaraa's own GSTIN/registered-office address isn't available from any
//      API this app calls, so — same principle this file has always
//      followed — that's left out rather than fabricated, instead of
//      copying the reference's (a different real company's) GSTIN.
//   2. The reference's Terms & Conditions are a specific supplier's legal
//      text (their GSTIN, their domain). The topics are adapted here as
//      generic, non-company-specific clauses in the same numbered
//      structure — reusing another business's exact legal wording under
//      Aaraa's name would misrepresent whose terms they are.
// GST is rendered as one combined value from the order's real tax amount.
import moment from "moment";
import logo from "../layout/aaraa_logo.png";
import { SELLER } from "../../config/seller";
import { exGstSubtotal, gstPercentFor } from "../../utils/orderTotals";
import { numberToWordsINR } from "../../utils/numberToWords";

const fmtNum = (n) =>
  Number(n ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const fmtRs = (n) => `Rs.${fmtNum(n)}`;
const fmtDate = (v) => (v ? moment(v).format("DD/MM/YYYY") : "—");
// Slab percentages print without trailing zeros, the way the reference
// invoices label them: 18, 9, 5, 2.5 — never 18.00 or 2.50.
const fmtPercent = (n) =>
  Number(n || 0)
    .toFixed(2)
    .replace(/\.?0+$/, "");

// Aaraa Homecare is registered in Tamil Nadu (GST state code 33), so an order
// delivered inside Tamil Nadu is an intra-state supply — CGST + SGST at half
// the slab each — and anything else is inter-state, taxed as IGST at the full
// slab. addressSnapshot.state is free text captured at checkout, so every
// spelling that means the same state has to resolve the same way.
const SELLER_STATE_ALIASES = new Set(["tamilnadu", "tn", "33"]);
const normalizeState = (value) =>
  (value || "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const formatLabel = (status) =>
  (status || "")
    .toString()
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ") || "—";

const PAID_FAMILY = ["paid", "completed", "success"];

// variantId is the source of truth for WHICH variant was ordered; its name is
// read from the variant record that id points at. Never assembled from
// packSize (label/size/unit) — pack size describes the packaging, not the
// variant the customer chose.
const variantNameFor = (it, variants) => {
  if (it?.variant?.variantName) return it.variant.variantName;
  if (it?.variantId != null && Array.isArray(variants)) {
    const match = variants.find((v) => String(v.id) === String(it.variantId));
    if (match?.variantName) return match.variantName;
  }
  // Only reached when no variant record is resolvable at all; keeps an older
  // order printing a size line rather than a blank one.
  return it?.sizeLabel || "";
};

// One labelled row of the invoice-information block, matching the
// reference's "Label : Value" alignment (label column, colon, value).
const InfoRow = ({ label, value }) => (
  <div className="flex text-[10.5px] leading-[1.6]">
    <span className="w-[104px] shrink-0 text-gray-700">{label}</span>
    <span className="shrink-0 mr-1 text-gray-700">:</span>
    <span className="font-semibold text-gray-900 break-words">
      {value || "—"}
    </span>
  </div>
);

// One party panel (Bill To / Ship To). Every line is filtered before it gets
// here, so a missing address line or GSTIN closes up instead of printing
// blank.
const PartyPanel = ({ name, lines, phone, email, gstin }) => (
  <div className="px-3 py-2.5">
    <p className="!m-0 text-[12px] font-bold text-gray-900">{name || "—"}</p>
    {lines.map((line, i) => (
      <p key={i} className="!m-0 text-[10.5px] leading-[1.55] text-gray-700">
        {line}
      </p>
    ))}
    {gstin && (
      <p className="!m-0 text-[10.5px] leading-[1.55] text-gray-700">
        GSTIN {gstin}
      </p>
    )}
    {phone && (
      <p className="!m-0 text-[10.5px] leading-[1.55] text-gray-700">{phone}</p>
    )}
    {email && (
      <p className="!m-0 text-[10.5px] leading-[1.55] text-gray-700">{email}</p>
    )}
  </div>
);

const MetaRow = ({ label, value, bold }) => (
  <div className="flex text-[11px] leading-[1.5]">
    <span className="w-[110px] shrink-0 text-gray-700">{label}</span>
    <span className={`shrink-0 mr-1 text-gray-700`}>:</span>
    <span className={bold ? "font-semibold text-gray-900" : "text-gray-900"}>
      {value || "—"}
    </span>
  </div>
);

const TERMS = [
  "This supply is governed by Aaraa Homecare's Terms of Service and Returns, Refunds and Cancellations Policy, accepted at the time of order.",
  "Goods are supplied as raw materials/ingredients for further formulation, manufacturing or personal use as described on the product listing.",
  "Check the goods against this invoice and the pack label on receipt. Any incorrect or incorrectly labelled product must be reported within 24 hours of delivery and before the material is used. Claims raised after use cannot be verified and will not be accepted.",
  "Damage in transit or short quantity must be reported within 48 hours of delivery, with photographs of the outer packaging, the shipping label, the pack label, and the contents.",
  "Test a small quantity against your own requirement before bulk use. Use of a batch constitutes acceptance of that batch.",
  "Any Certificate of Analysis, Safety Data Sheet or similar document, where provided, is representative of the product code and description and is not batch-specific unless agreed in writing before the order was placed.",
  "Goods are not accepted for return except as provided in our Returns, Refunds and Cancellations Policy. Returns on account of change of mind are not accepted.",
  "Our liability is limited to the invoice value of the item concerned. We are not liable for consequential loss, including loss of production, rework, or loss of profit.",
  "Compliance of any finished product made using these goods, including licensing, safety assessment and labelling, is the responsibility of the buyer.",
  "Subject to the jurisdiction of the courts at the seller's registered location. E. & O.E.",
];

const OrderInvoice = ({ order, id, variants }) => {
  if (!order) return null;

  const items = order.items || [];
  const subtotal = items.reduce((sum, it) => {
    const fallback = Number(it.price || 0) * Number(it.quantity || 1);
    return sum + (it.subtotal != null ? Number(it.subtotal) : fallback);
  }, 0);
  const address = order.addressSnapshot;
  const payments = Array.isArray(order.payments) ? order.payments : [];
  const paymentMethod = payments[0]?.method || order.paymentMethod;
  const isPaid = PAID_FAMILY.includes(
    (order.paymentStatus || "").toLowerCase(),
  );

  // Same real-payment-first, paid-status-fallback logic already used in
  // OrderDetailDrawer.jsx's Payment history section — not reinvented here.
  const paidFromRecords = payments.reduce(
    (sum, p) => sum + Number(p?.amount || 0),
    0,
  );
  const paidAmount =
    paidFromRecords > 0
      ? paidFromRecords
      : isPaid
        ? Number(order.totalAmount || 0)
        : 0;
  const balanceDue = Math.max(0, Number(order.totalAmount || 0) - paidAmount);

  const taxAmount = Number(order.taxAmount || 0);
  // The fallback slab for lines that carry no rate of their own, measured
  // against the EX-GST base — the only base a GST rate is defined on.
  // Measuring the tax against the GST-INCLUSIVE subtotal instead gave
  // 33.56/220 = 15.25%, which is not a GST slab and printed on the invoice as
  // "IGST15.25 (15.25%)" / "CGST7.63". Against the ex-GST 186.44 it gives the
  // real 18%.
  const gstPercent = gstPercentFor(subtotal, taxAmount) ?? 0;

  // CGST+SGST vs IGST is decided by the place of supply. An order with no
  // address has no place of supply to decide on, so it keeps the single
  // combined GST column this invoice has always shown rather than splitting
  // the tax under a heading that could be the wrong one.
  const placeOfSupply = address?.state || "";
  const taxMode = !placeOfSupply
    ? "combined"
    : SELLER_STATE_ALIASES.has(normalizeState(placeOfSupply))
      ? "intra"
      : "inter";
  const isIntraState = taxMode === "intra";

  // Per-line slab, so a mixed 5%/18% basket prints each line at its own rate
  // exactly as the reference invoices do. Falls back to the order-level rate
  // this invoice has always derived from taxAmount/subtotal when the line
  // itself carries no slab.
  const itemGstPercent = (it) => {
    const raw =
      it?.taxPercent ??
      it?.gstPercent ??
      it?.variant?.taxPercent ??
      it?.product?.taxPercent;
    if (raw == null || raw === "") return gstPercent;
    const value = Number(raw);
    return Number.isNaN(value) ? gstPercent : value;
  };

  const rows = items.map((it, i) => {
    const lineAmount =
      it.subtotal != null
        ? Number(it.subtotal)
        : Number(it.price || 0) * Number(it.quantity || 1);
    const percent = itemGstPercent(it);
    return {
      it,
      key: it.id ?? i,
      lineAmount,
      percent,
      // EXTRACTED from the line, not added to it: `lineAmount` is stored
      // GST-inclusive, so the tax inside ₹110 at 18% is 110 x 18/118 = 16.78,
      // not 110 x 18/100 = 19.80. Adding it on top overstated every line whose
      // item carried a real taxPercent, and made the totals column exceed the
      // amount actually charged.
      gst: (lineAmount * percent) / (100 + percent),
      hsn: it.hsnCode || it.hsn || it.variant?.hsnCode,
    };
  });

  // Tax rows are grouped by slab, so a mixed basket prints one entry per rate
  // — "CGST9 / SGST9" alongside "CGST2.5 / SGST2.5" — the way the reference
  // totals block reads. Summed from the same per-line values the table prints
  // above, so the summary always adds up to its own column.
  const gstByPercent = new Map();
  rows.forEach((r) => {
    // 0% is a real slab, not "no tax": a zero-rated line still has to print as
    // IGST 0% (or CGST 0% + SGST 0%) rather than vanishing from the summary and
    // dropping the whole invoice back to the unlabelled combined GST row.
    if (r.percent == null || Number.isNaN(r.percent)) return;
    gstByPercent.set(r.percent, (gstByPercent.get(r.percent) || 0) + r.gst);
  });
  // Highest slab first, the order both reference invoices list them in
  // (IGST18 above IGST5; CGST9/SGST9 above CGST2.5/SGST2.5).
  const slabs = [...gstByPercent.entries()].sort((a, b) => b[0] - a[0]);
  // "combined" produces no split rows at all — with no place of supply the
  // tax cannot honestly be labelled either IGST or CGST/SGST, so the totals
  // fall through to the single combined GST row, matching the single combined
  // GST column the table shows in that same case.
  const taxRows = slabs.flatMap(([percent, amount]) =>
    taxMode === "combined"
      ? []
      : isIntraState
        ? [
            {
              label: `CGST${fmtPercent(percent / 2)}`,
              percent: percent / 2,
              amount: amount / 2,
            },
            {
              label: `SGST${fmtPercent(percent / 2)}`,
              percent: percent / 2,
              amount: amount / 2,
            },
          ]
        : [{ label: `IGST${fmtPercent(percent)}`, percent, amount }],
  );

  // Line prices are stored GST-INCLUSIVE, so `subtotal` above already
  // contains the tax. The Sub Total row must therefore show that figure with
  // the tax taken back OUT — printing the inclusive amount beside the tax
  // rows counts the GST twice and the column stops adding up to the total.
  //
  // The amount subtracted is the tax this invoice actually PRINTS (the sum of
  // the CGST/SGST or IGST rows below), not order.taxAmount, so the column
  // reconciles whichever path produced those rows: per-line slabs, the
  // blended fallback, or the single combined row.
  const displayedTaxTotal =
    taxRows.length > 0
      ? taxRows.reduce((sum, row) => sum + Number(row.amount || 0), 0)
      : taxAmount;
  const subtotalExGst = exGstSubtotal(subtotal, displayedTaxTotal);

  // Column count changes with the tax mode: 4 fixed + Amount, plus one GST
  // column, two IGST columns, or four CGST/SGST columns.
  const columnCount = taxMode === "combined" ? 6 : isIntraState ? 9 : 7;

  const addressLines = address
    ? [
        [address.addressLine1, address.addressLine2].filter(Boolean).join(", "),
        address.city,
        [address.state, address.postalCode].filter(Boolean).join(" "),
        address.country,
      ].filter(Boolean)
    : [];

  // Bill To and Ship To both describe this order's single address — the same
  // honest reuse this file has always documented, now rendered as the
  // reference's two bordered panels.
  const customerName = order.customer?.name || address?.name || "—";
  const customerPhone = order.customer?.phone || address?.phone || "";
  const customerEmail = order.customer?.email || "";
  const customerGstin =
    order.customer?.gstin || order.customer?.gstIn || address?.gstin || "";

  // Table column definitions drive BOTH header rows and every body row, so a
  // tax-mode change can never leave the two out of step.
  const taxColumns =
    taxMode === "combined"
      ? [{ key: "gst", label: "GST", span: 1 }]
      : isIntraState
        ? [
            { key: "cgst", label: "CGST", span: 2 },
            { key: "sgst", label: "SGST", span: 2 },
          ]
        : [{ key: "igst", label: "IGST", span: 2 }];

  const TH = "border border-gray-400 px-1.5 py-1 font-semibold";
  const TD = "border border-gray-400 px-1.5 py-1.5 align-top";

  return (
    <div id={id} className="invoice-page bg-white text-gray-900">
      {/* PAGE 1 */}
      <div className="invoice-sheet">
        <div className="invoice-border">
          {/* HEADER — logo + dynamic company block left, title right */}
          <div className="flex items-start justify-between gap-4 px-3 py-3 border-b border-gray-400">
            <div className="flex items-start gap-2.5 min-w-0">
              <img
                src={logo}
                alt=""
                className="h-11 w-auto object-contain shrink-0"
              />
              <div className="min-w-0 text-[10px] leading-[1.5] text-gray-700">
                <p className="!m-0 text-[13.5px] font-bold leading-tight text-gray-900">
                  {SELLER.name}
                </p>
                {SELLER.tagline && <p className="!m-0">{SELLER.tagline}</p>}
                {SELLER.addressLines.map((line, i) => (
                  <p key={i} className="!m-0">
                    {line}
                  </p>
                ))}
                {SELLER.gstin && <p className="!m-0">GSTIN {SELLER.gstin}</p>}
                {SELLER.phone && <p className="!m-0">Ph: {SELLER.phone}</p>}
                {SELLER.email && <p className="!m-0">{SELLER.email}</p>}
              </div>
            </div>
            <p className="!m-0 text-[24px] font-bold tracking-tight leading-none text-gray-900 shrink-0">
              TAX INVOICE
            </p>
          </div>

          {/* INVOICE INFORMATION — two bordered columns */}
          <div className="grid grid-cols-2 border-b border-gray-400">
            <div className="px-3 py-2 border-r border-gray-400">
              <InfoRow label="Invoice No." value={order.orderNumber} />
              <InfoRow label="Invoice Date" value={fmtDate(order.createdAt)} />
              <InfoRow
                label="Payment Method"
                value={paymentMethod ? formatLabel(paymentMethod) : "—"}
              />
              <InfoRow
                label="Payment Status"
                value={formatLabel(order.paymentStatus)}
              />
            </div>
            <div className="px-3 py-2">
              <InfoRow label="Place Of Supply" value={address?.state} />
              <InfoRow label="Order Status" value={formatLabel(order.status)} />
            </div>
          </div>

          {/* BILL TO / SHIP TO */}
          <div className="grid grid-cols-2 border-b border-gray-400 bg-gray-100">
            <div className="px-3 py-1 border-r border-gray-400">
              <p className="!m-0 text-[10px] font-bold uppercase tracking-wide text-gray-700">
                Bill To
              </p>
            </div>
            <div className="px-3 py-1">
              <p className="!m-0 text-[10px] font-bold uppercase tracking-wide text-gray-700">
                Ship To
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 border-b border-gray-400">
            <div className="border-r border-gray-400">
              <PartyPanel
                name={customerName}
                lines={addressLines}
                phone={customerPhone}
                email={customerEmail}
                gstin={customerGstin}
              />
            </div>
            <PartyPanel
              name={customerName}
              lines={
                addressLines.length > 0 ? addressLines : ["No address on file"]
              }
              phone={customerPhone}
            />
          </div>

          {/* ITEMS — fully bordered, two-row header so CGST/SGST (or IGST)
              group a %/Amt pair each, exactly as the reference does. */}
          <table className="invoice-items-table w-full text-[10px] border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-900">
                <th rowSpan={2} className={`${TH} w-[26px] text-center`}>
                  #
                </th>
                <th rowSpan={2} className={`${TH} text-left`}>
                  Item &amp; Description
                </th>
                <th rowSpan={2} className={`${TH} w-[46px] text-right`}>
                  Qty
                </th>
                <th rowSpan={2} className={`${TH} w-[62px] text-right`}>
                  Rate
                </th>
                {taxColumns.map((c) =>
                  c.span === 1 ? (
                    <th
                      key={c.key}
                      rowSpan={2}
                      className={`${TH} w-[70px] text-right`}
                    >
                      {c.label}
                    </th>
                  ) : (
                    <th
                      key={c.key}
                      colSpan={2}
                      className={`${TH} text-center ${
                        isIntraState ? "w-[92px]" : "w-[104px]"
                      }`}
                    >
                      {c.label}
                    </th>
                  ),
                )}
                <th rowSpan={2} className={`${TH} w-[76px] text-right`}>
                  Amount
                </th>
              </tr>
              <tr className="bg-gray-100 text-gray-900">
                {taxColumns
                  .filter((c) => c.span === 2)
                  .flatMap((c) => [
                    <th
                      key={`${c.key}-p`}
                      className={`${TH} w-[34px] text-right`}
                    >
                      %
                    </th>,
                    <th
                      key={`${c.key}-a`}
                      className={`${TH} w-[58px] text-right`}
                    >
                      Amt
                    </th>,
                  ])}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columnCount}
                    className={`${TD} py-6 text-center text-gray-400`}
                  >
                    No items on this order
                  </td>
                </tr>
              ) : (
                rows.map(({ it, key, lineAmount, percent, gst, hsn }, i) => {
                  // Intra-state splits the line tax evenly between the two
                  // halves of the same slab; inter-state charges the whole
                  // slab as IGST.
                  const halfGst = gst / 2;
                  const halfPercent = percent / 2;
                  const variantName = variantNameFor(it, variants);
                  return (
                    <tr key={key} className="invoice-row">
                      <td className={`${TD} text-center text-gray-600`}>
                        {i + 1}
                      </td>
                      <td className={`${TD} text-gray-900`}>
                        <div className="leading-[1.4]">{it.productName}</div>
                        {variantName && (
                          <div className="leading-[1.4] text-gray-700">
                            {variantName}
                          </div>
                        )}
                        {hsn && (
                          <div className="mt-1 text-[9px] leading-[1.3] text-gray-500">
                            HSN: {hsn}
                          </div>
                        )}
                      </td>
                      <td className={`${TD} text-right tabular-nums`}>
                        {fmtNum(it.quantity)}
                      </td>
                      <td className={`${TD} text-right tabular-nums`}>
                        {fmtNum(it.price)}
                      </td>
                      {taxMode === "combined" && (
                        <td className={`${TD} text-right tabular-nums`}>
                          {fmtNum(gst)}
                        </td>
                      )}
                      {taxMode === "inter" && (
                        <>
                          <td className={`${TD} text-right tabular-nums`}>
                            {fmtPercent(percent)}%
                          </td>
                          <td className={`${TD} text-right tabular-nums`}>
                            {fmtNum(gst)}
                          </td>
                        </>
                      )}
                      {isIntraState && (
                        <>
                          <td className={`${TD} text-right tabular-nums`}>
                            {fmtPercent(halfPercent)}%
                          </td>
                          <td className={`${TD} text-right tabular-nums`}>
                            {fmtNum(halfGst)}
                          </td>
                          <td className={`${TD} text-right tabular-nums`}>
                            {fmtPercent(halfPercent)}%
                          </td>
                          <td className={`${TD} text-right tabular-nums`}>
                            {fmtNum(halfGst)}
                          </td>
                        </>
                      )}
                      <td
                        className={`${TD} text-right tabular-nums font-semibold`}
                      >
                        {fmtNum(lineAmount)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* WORDS + NOTES  /  TOTALS — one bordered band, split by a
              vertical rule, as the reference lays it out. */}
          <div className="grid grid-cols-[1fr_280px] border-b border-gray-400">
            <div className="px-3 py-2.5 border-r border-gray-400">
              <p className="!m-0 text-[9.5px] font-semibold uppercase tracking-wide text-gray-500">
                Total In Words
              </p>
              <p className="!m-0 mt-0.5 text-[11px] italic font-semibold text-gray-800">
                Indian Rupee {numberToWordsINR(order.totalAmount)}
              </p>
              <p className="!m-0 mt-3 text-[9.5px] font-semibold uppercase tracking-wide text-gray-500">
                Notes
              </p>
              <p className="!m-0 mt-0.5 text-[10.5px] text-gray-700">
                {order.notes || "Thanks for your business."}
              </p>
            </div>

            <div className="text-[10.5px]">
              <div className="flex items-center justify-between px-3 py-1">
                <span className="text-gray-700">Sub Total (Ex-GST)</span>
                <span className="tabular-nums text-gray-900">
                  {fmtNum(subtotalExGst)}
                </span>
              </div>
              {Number(order.discountAmount) > 0 && (
                <div className="flex items-center justify-between px-3 py-1">
                  <span className="text-gray-700">Discount</span>
                  <span className="tabular-nums text-gray-900">
                    -{fmtNum(order.discountAmount)}
                  </span>
                </div>
              )}
              {/* One row per tax component, in the reference labelling
                  ("CGST9 (9%)", "IGST18 (18%)"), and only for slabs the order
                  actually uses. Falls back to the original single combined GST
                  row when the place of supply is unknown. */}
              {taxRows.length > 0 ? (
                taxRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between px-3 py-1"
                  >
                    <span className="text-gray-700">
                      {row.label} ({fmtPercent(row.percent)}%)
                    </span>
                    <span className="tabular-nums text-gray-900">
                      {fmtNum(row.amount)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-between px-3 py-1">
                  <span className="text-gray-700">
                    GST ({gstPercent.toFixed(1)}%)
                  </span>
                  <span className="tabular-nums text-gray-900">
                    {fmtNum(taxAmount)}
                  </span>
                </div>
              )}
              {Number(order.shippingAmount) > 0 && (
                <div className="flex items-center justify-between px-3 py-1">
                  <span className="text-gray-700">Shipping</span>
                  <span className="tabular-nums text-gray-900">
                    {fmtNum(order.shippingAmount)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-400 bg-gray-100">
                <span className="font-bold text-gray-900">Total</span>
                <span className="font-bold tabular-nums text-gray-900">
                  {fmtRs(order.totalAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-1">
                <span className="text-gray-700">Payment Made</span>
                <span className="tabular-nums text-gray-900">
                  (-) {fmtNum(paidAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-400">
                <span className="font-bold text-gray-900">Balance Due</span>
                <span className="font-bold tabular-nums text-gray-900">
                  {fmtRs(balanceDue)}
                </span>
              </div>
            </div>
          </div>

          <div className="invoice-page-number">1</div>
        </div>
      </div>

      {/* PAGE 2 — TERMS & CONDITIONS, always its own page (matching the
          reference exactly, regardless of how many items page 1 held). */}
      <div className="invoice-sheet invoice-page-break">
        <div className="invoice-border invoice-terms-page">
          <p className="!m-0 px-3 pt-4 mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-900">
            Terms and Conditions
          </p>
          <ol className="px-3 pb-4 space-y-1.5 text-[10px] text-gray-700 leading-[1.5] list-decimal list-outside ml-5">
            {TERMS.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ol>
          <div className="invoice-page-number">2</div>
        </div>
      </div>
    </div>
  );
};

export default OrderInvoice;
