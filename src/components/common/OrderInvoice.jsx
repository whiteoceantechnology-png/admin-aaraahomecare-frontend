// A4 tax-invoice template — structure, spacing and typography follow the
// approved reference PDF (a real tax invoice) exactly: bordered page frame,
// left company block + right "TAX INVOICE" heading, a labelled invoice-info
// row, Bill To / Ship To panel, an itemised table with a CGST/SGST split,
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
// CGST/SGST is an even split of the order's real tax amount (standard
// intra-state GST presentation) — this app has no per-line CGST/SGST
// fields, and no seller/buyer state comparison to confirm intra-state, so
// this is a disclosed assumption, not confirmed against the backend.
import moment from "moment";
import logo from "../layout/aaraa_logo.png";
import { numberToWordsINR } from "../../utils/numberToWords";

const fmtNum = (n) =>
  Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtRs = (n) => `Rs.${fmtNum(n)}`;
const fmtDate = (v) => (v ? moment(v).format("DD/MM/YYYY") : "—");

const formatLabel = (status) =>
  (status || "")
    .toString()
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ") || "—";

const PAID_FAMILY = ["paid", "completed", "success"];

const MetaRow = ({ label, value, bold }) => (
  <div className="flex text-[11px] leading-[1.5]">
    <span className="w-[110px] shrink-0 text-gray-700">{label}</span>
    <span className={`shrink-0 mr-1 text-gray-700`}>:</span>
    <span className={bold ? "font-semibold text-gray-900" : "text-gray-900"}>{value || "—"}</span>
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

const OrderInvoice = ({ order, id }) => {
  if (!order) return null;

  const items = order.items || [];
  const subtotal = items.reduce((sum, it) => {
    const fallback = Number(it.price || 0) * Number(it.quantity || 1);
    return sum + (it.subtotal != null ? Number(it.subtotal) : fallback);
  }, 0);
  const address = order.addressSnapshot;
  const payments = Array.isArray(order.payments) ? order.payments : [];
  const paymentMethod = payments[0]?.method || order.paymentMethod;
  const isPaid = PAID_FAMILY.includes((order.paymentStatus || "").toLowerCase());

  // Same real-payment-first, paid-status-fallback logic already used in
  // OrderDetailDrawer.jsx's Payment history section — not reinvented here.
  const paidFromRecords = payments.reduce((sum, p) => sum + Number(p?.amount || 0), 0);
  const paidAmount = paidFromRecords > 0 ? paidFromRecords : isPaid ? Number(order.totalAmount || 0) : 0;
  const balanceDue = Math.max(0, Number(order.totalAmount || 0) - paidAmount);

  const taxAmount = Number(order.taxAmount || 0);
  const gstPercent = subtotal > 0 && taxAmount > 0 ? (taxAmount / subtotal) * 100 : 0;
  const halfGstPercent = gstPercent / 2;
  const cgstTotal = taxAmount / 2;
  const sgstTotal = taxAmount / 2;

  const addressLines = address
    ? [
        [address.addressLine1, address.addressLine2].filter(Boolean).join(", "),
        address.city,
        [address.state, address.postalCode].filter(Boolean).join(" "),
        address.country,
      ].filter(Boolean)
    : [];

  return (
    <div id={id} className="invoice-page bg-white text-gray-900">
      {/* PAGE 1 */}
      <div className="invoice-sheet">
        <div className="invoice-border">
          {/* HEADER */}
          <div className="flex items-start justify-between px-6 pt-6 pb-3">
            <div className="flex items-start gap-2.5">
              <img src={logo} alt="Aaraa Homecare" className="h-10 w-auto object-contain shrink-0" />
              <div>
                <p className="text-[14px] font-bold text-gray-900 leading-tight">Aaraa Homecare</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Ingredients &amp; formulation supplies</p>
              </div>
            </div>
            <p className="text-[26px] font-bold text-gray-900 tracking-tight leading-none">TAX INVOICE</p>
          </div>

          {/* INVOICE META */}
          <div className="flex items-start justify-between px-6 py-3 border-t border-gray-300">
            <div className="space-y-0.5">
              <MetaRow label="Invoice No." value={order.orderNumber} bold />
              <MetaRow label="Invoice Date" value={fmtDate(order.createdAt)} bold />
              <MetaRow label="Payment Method" value={paymentMethod ? formatLabel(paymentMethod) : "—"} bold />
              <MetaRow label="Payment Status" value={formatLabel(order.paymentStatus)} bold />
            </div>
            <div className="space-y-0.5 text-right">
              <div className="flex justify-end text-[11px]">
                <span className="text-gray-700 mr-1">Place Of Supply :</span>
                <span className="font-semibold text-gray-900">{address?.state || "—"}</span>
              </div>
              <div className="flex justify-end text-[11px]">
                <span className="text-gray-700 mr-1">Order Status :</span>
                <span className="font-semibold text-gray-900">{formatLabel(order.status)}</span>
              </div>
            </div>
          </div>

          {/* BILL TO / SHIP TO — this order model carries one address, used
              honestly for both rather than inventing a second one. */}
          <div className="grid grid-cols-2 border-t border-gray-300">
            <div className="px-6 py-2 border-r border-gray-300 bg-gray-50">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Bill To</p>
            </div>
            <div className="px-6 py-2 bg-gray-50">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Ship To</p>
            </div>
          </div>
          <div className="grid grid-cols-2 border-t border-gray-300 pb-4">
            <div className="px-6 pt-2.5 pr-4 border-r border-gray-300">
              <p className="text-[12px] font-bold text-gray-900">{order.customer?.name || address?.name || "—"}</p>
              {addressLines.map((line, i) => (
                <p key={i} className="text-[11px] text-gray-700 leading-[1.5]">
                  {line}
                </p>
              ))}
              {order.customer?.phone && <p className="text-[11px] text-gray-700 leading-[1.5]">{order.customer.phone}</p>}
              {order.customer?.email && <p className="text-[11px] text-gray-700 leading-[1.5]">{order.customer.email}</p>}
            </div>
            <div className="px-6 pt-2.5 pl-4">
              <p className="text-[12px] font-bold text-gray-900">{order.customer?.name || address?.name || "—"}</p>
              {addressLines.length > 0 ? (
                addressLines.map((line, i) => (
                  <p key={i} className="text-[11px] text-gray-700 leading-[1.5]">
                    {line}
                  </p>
                ))
              ) : (
                <p className="text-[11px] text-gray-400">No address on file</p>
              )}
              {order.customer?.phone && <p className="text-[11px] text-gray-700 leading-[1.5]">{order.customer.phone}</p>}
            </div>
          </div>

          {/* ITEMS */}
          <table className="invoice-items-table w-full text-[10.5px] border-t-2 border-gray-900">
            <thead>
              <tr className="border-b border-gray-400">
                <th rowSpan={2} className="align-bottom px-2 py-1.5 text-left font-semibold w-[28px]">
                  #
                </th>
                <th rowSpan={2} className="align-bottom px-2 py-1.5 text-left font-semibold">
                  Item &amp; Description
                </th>
                <th rowSpan={2} className="align-bottom px-2 py-1.5 text-right font-semibold w-[48px]">
                  Qty
                </th>
                <th rowSpan={2} className="align-bottom px-2 py-1.5 text-right font-semibold w-[72px]">
                  Rate
                </th>
                <th colSpan={2} className="px-2 py-1 text-center font-semibold border-l border-gray-300">
                  CGST
                </th>
                <th colSpan={2} className="px-2 py-1 text-center font-semibold border-l border-gray-300">
                  SGST
                </th>
                <th rowSpan={2} className="align-bottom px-2 py-1.5 text-right font-semibold w-[76px] border-l border-gray-300">
                  Amount
                </th>
              </tr>
              <tr className="border-b-2 border-gray-900">
                <th className="px-2 pb-1.5 text-right font-semibold w-[42px] border-l border-gray-300">%</th>
                <th className="px-2 pb-1.5 text-right font-semibold w-[56px]">Amt</th>
                <th className="px-2 pb-1.5 text-right font-semibold w-[42px] border-l border-gray-300">%</th>
                <th className="px-2 pb-1.5 text-right font-semibold w-[56px]">Amt</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-gray-400">
                    No items on this order
                  </td>
                </tr>
              ) : (
                items.map((it, i) => {
                  const lineAmount = it.subtotal != null ? Number(it.subtotal) : Number(it.price || 0) * Number(it.quantity || 1);
                  const lineCgst = (lineAmount * halfGstPercent) / 100;
                  const lineSgst = lineCgst;
                  const hsn = it.hsnCode || it.hsn || it.variant?.hsnCode;
                  return (
                    <tr key={it.id ?? i} className="invoice-row border-b border-gray-200 align-top">
                      <td className="px-2 py-2 text-gray-600">{i + 1}</td>
                      <td className="px-2 py-2 text-gray-900">
                        <div>
                          {it.productName}
                          {it.sizeLabel ? ` / ${it.sizeLabel}` : ""}
                        </div>
                        {hsn && <div className="text-[9.5px] text-gray-400 mt-1">HSN: {hsn}</div>}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmtNum(it.quantity).replace(".00", "")}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmtNum(it.price)}</td>
                      <td className="px-2 py-2 text-right tabular-nums border-l border-gray-200">{halfGstPercent.toFixed(1)}%</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmtNum(lineCgst)}</td>
                      <td className="px-2 py-2 text-right tabular-nums border-l border-gray-200">{halfGstPercent.toFixed(1)}%</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmtNum(lineSgst)}</td>
                      <td className="px-2 py-2 text-right tabular-nums font-semibold border-l border-gray-200">{fmtNum(lineAmount)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* WORDS + NOTES  /  TOTALS */}
          <div className="flex items-start justify-between px-6 pt-4 pb-6 gap-6">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Total In Words</p>
              <p className="text-[11.5px] italic font-semibold text-gray-800 mt-0.5">
                Indian Rupee {numberToWordsINR(order.totalAmount)}
              </p>
              {Number(order.notes ? 1 : 0) >= 0 && (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mt-4">Notes</p>
                  <p className="text-[11px] text-gray-700 mt-0.5">{order.notes || "Thanks for your business."}</p>
                </>
              )}
            </div>

            <div className="w-[280px] shrink-0 text-[11px]">
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-700">Sub Total (Ex-GST)</span>
                <span className="tabular-nums text-gray-900">{fmtNum(subtotal)}</span>
              </div>
              {Number(order.discountAmount) > 0 && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-700">Discount</span>
                  <span className="tabular-nums text-gray-900">-{fmtNum(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-700">CGST{halfGstPercent.toFixed(1)} ({halfGstPercent.toFixed(1)}%)</span>
                <span className="tabular-nums text-gray-900">{fmtNum(cgstTotal)}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-700">SGST{halfGstPercent.toFixed(1)} ({halfGstPercent.toFixed(1)}%)</span>
                <span className="tabular-nums text-gray-900">{fmtNum(sgstTotal)}</span>
              </div>
              {Number(order.shippingAmount) > 0 && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-700">Shipping</span>
                  <span className="tabular-nums text-gray-900">{fmtNum(order.shippingAmount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-1.5 border-t-2 border-gray-900 mt-1">
                <span className="font-bold text-gray-900">Total</span>
                <span className="font-bold text-gray-900 tabular-nums">{fmtRs(order.totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-700">Payment Made</span>
                <span className="tabular-nums text-gray-900">(-) {fmtNum(paidAmount)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-t border-gray-300">
                <span className="font-bold text-gray-900">Balance Due</span>
                <span className="font-bold text-gray-900 tabular-nums">{fmtRs(balanceDue)}</span>
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
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-900 px-6 pt-6 mb-2">
            Terms and Conditions
          </p>
          <ol className="px-6 pb-6 space-y-1.5 text-[10.5px] text-gray-700 leading-[1.5] list-decimal list-outside ml-4">
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
