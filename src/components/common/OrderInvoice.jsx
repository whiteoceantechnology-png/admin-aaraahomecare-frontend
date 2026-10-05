// A4 tax-invoice template — structure, spacing and typography reproduce the
// approved reference tax invoice as closely as HTML allows.
//
// The reference is NOT one outer bordered frame: it is a sequence of discrete
// blocks — an unboxed header closed by a rule, then a bordered invoice-info
// panel, two side-by-side party boxes, the items table, a five-column tax
// summary, an unboxed words/totals band, and a centred "Page n of 2" footer.
// Terms and Conditions always occupy page 2 on their own, under a right-
// aligned signature block.
//
// Every VALUE comes from the real order object already loaded by the caller
// (GET /admin/orders/{id}) — nothing here is invented. The seller block and
// the ten Terms come from src/config/seller.js and TERMS below: Aaraa's own
// details and Aaraa's own legal text, as printed on the reference invoice.
//
// Printing/pagination is unchanged: InvoiceModal portals this onto <body>
// and index.css turns each .invoice-sheet into one physical A4 page.
import logo from "../layout/aaraa_logo.png";
import { SELLER } from "../../config/seller";
import { exGstSubtotal, gstPercentFor } from "../../utils/orderTotals";
import { amountInWordsINR } from "../../utils/numberToWords";

const fmtNum = (n) =>
  Number(n ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const fmtRs = (n) => `₹${fmtNum(n)}`;
const inWords = (n) => `Indian Rupee ${amountInWordsINR(n)}`;

// "17 Sept 2026" — the reference's date format. en-GB is what produces the
// four-letter "Sept" (en-US gives "Sep"), so the locale is doing real work
// here and must not be dropped.
const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

// An em dash is what the reference puts wherever a value does not apply — a
// zero-rated tax cell shows "—", not "0%" and not "0.00".
const DASH = "—";

const fmtDate = (v) => {
  if (!v) return DASH;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? DASH : DATE_FMT.format(d);
};

// Slab percentages print without trailing zeros, the way the reference
// labels them: 18, 9, 5, 2.5 — never 18.00 or 2.50.
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

// One "Label : Value" row of the invoice-information panel, with the colon on
// its own fixed column so every colon lines up exactly as the reference's do.
const InfoRow = ({ label, value }) => (
  <div className="flex text-[10.5px] leading-[1.75]">
    <span className="w-[104px] shrink-0 font-bold text-gray-900">{label}</span>
    <span className="shrink-0 mr-1 font-bold text-gray-900">:</span>
    <span className="font-bold text-gray-900 break-words">{value || DASH}</span>
  </div>
);

// One party box (BILL TO / SHIP TO). Lines are filtered before they get here,
// so a missing address line closes up instead of printing blank.
const PartyBox = ({ heading, name, lines }) => (
  <div className="border border-gray-400 px-3 py-2.5">
    {/* pb-, not mb-: !m-0 (see the note in OrderInvoice below) would zero a
        margin utility here. */}
    <p className="!m-0 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-gray-500">
      {heading}
    </p>
    <p className="!m-0 text-[11px] font-bold text-gray-900">{name || DASH}</p>
    {lines.map((line, i) => (
      <p key={i} className="!m-0 text-[10.5px] leading-[1.6] text-gray-800">
        {line}
      </p>
    ))}
  </div>
);

// The reference's ten terms, verbatim.
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
  "Subject to Salem Jurisdiction. E. & O.E.",
];

// "AARAA HOMECARE" -> "Aaraa Homecare" for the signature line, which the
// reference sets in title case while the header block is uppercase.
const titleCaseName = (s) =>
  (s || "").replace(
    /\b\w+/g,
    (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
  );

const OrderInvoice = ({ order, id, variants }) => {
  if (!order) return null;

  const items = order.items || [];
  const address = order.addressSnapshot;

  // GST-INCLUSIVE line total, as stored.
  const subtotal = items.reduce((sum, it) => {
    const fallback = Number(it.price || 0) * Number(it.quantity || 1);
    return sum + (it.subtotal != null ? Number(it.subtotal) : fallback);
  }, 0);

  const taxAmount = Number(order.taxAmount || 0);
  const shipping = Number(order.shippingAmount || 0);
  const discount = Number(order.discountAmount || 0);

  // The fallback slab for lines that carry no rate of their own, measured
  // against the EX-GST base — the only base a GST rate is defined on.
  const gstPercent = gstPercentFor(subtotal, taxAmount) ?? 0;

  // CGST+SGST vs IGST is decided by the place of supply. An order with no
  // address has no place of supply to decide on; its tax cannot honestly be
  // labelled either way, so it lands in neither column and appears only in
  // Total Tax Amount.
  const placeOfSupply = address?.state || "";
  const isIntraState =
    !!placeOfSupply && SELLER_STATE_ALIASES.has(normalizeState(placeOfSupply));
  const isInterState = !!placeOfSupply && !isIntraState;

  // Per-line slab, so a mixed 5%/18% basket prints each line at its own rate.
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
      // not 110 x 18/100 = 19.80.
      gst: (lineAmount * percent) / (100 + percent),
      hsn: it.hsnCode || it.hsn || it.variant?.hsnCode,
    };
  });

  // Falls back to the order's own tax figure when no line carried a slab, so
  // the summary never silently reports zero tax on a taxed order.
  const displayedTaxTotal =
    rows.length > 0 ? rows.reduce((sum, r) => sum + r.gst, 0) : taxAmount;

  // The three summary buckets. At most one is non-zero for any given order,
  // because the place of supply decides the whole invoice.
  const cgstTotal = isIntraState ? displayedTaxTotal / 2 : 0;
  const sgstTotal = isIntraState ? displayedTaxTotal / 2 : 0;
  const igstTotal = isInterState ? displayedTaxTotal : 0;
  const totalTax = cgstTotal + sgstTotal + igstTotal;

  // Line prices are stored GST-INCLUSIVE, so `subtotal` already contains the
  // tax; the Sub Total row must show it with the tax taken back OUT or the
  // column counts the GST twice.
  const subtotalExGst = exGstSubtotal(subtotal, displayedTaxTotal);
  // Taxable Value is the whole taxable base of the supply — goods ex-GST plus
  // shipping. On the reference: 0.10 + 1.00 = 1.10.
  const taxableValue = subtotalExGst + shipping;

  const customerPhone = order.customer?.phone || address?.phone || "";
  const addressLines = address
    ? [
        [address.addressLine1, address.addressLine2].filter(Boolean).join(", "),
        // "Erode - 638104, CONT: 7397036307" — the reference folds city,
        // postcode and contact number onto one line.
        [
          [address.city, address.postalCode].filter(Boolean).join(" - "),
          customerPhone ? `CONT: ${customerPhone}` : "",
        ]
          .filter(Boolean)
          .join(", "),
        address.state,
      ].filter(Boolean)
    : [];

  // Bill To and Ship To both describe this order's single address — the same
  // honest reuse this file has always documented.
  const customerName = order.customer?.name || address?.name || DASH;

  const TH = "border border-gray-400 px-1.5 py-1 font-bold";
  const TD = "border border-gray-400 px-1.5 py-1.5 align-top";

  // One tax cell. The reference prints "—" wherever a component does not
  // apply: a zero-rated line, or CGST/SGST on an inter-state supply.
  const taxCell = (applies, value, isPercent) => {
    if (!applies || !value) return DASH;
    return isPercent ? `${fmtPercent(value)}%` : fmtNum(value);
  };

  return (
    <div id={id} className="invoice-page bg-white text-gray-900">
      {/* ============================ PAGE 1 ============================ */}
      <div className="invoice-sheet">
        <div className="invoice-content">
          {/* HEADER — company block left, TAX INVOICE right, closed by a
              rule. No box, exactly as the reference. */}
          <div className="flex items-start justify-between gap-6 pb-4 border-b border-gray-400">
            <div className="flex items-start gap-3 min-w-0">
              <img
                src={logo}
                alt=""
                className="h-12 w-auto object-contain shrink-0"
              />
              <div className="min-w-0 text-[10.5px] font-bold leading-[1.5] text-gray-900">
                <p className="!m-0 text-[12px] font-bold">{SELLER.name}</p>
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
            <p className="!m-0 text-[26px] font-bold tracking-tight leading-none text-gray-900 shrink-0">
              TAX INVOICE
            </p>
          </div>

          {/* INVOICE INFORMATION — one bordered panel, two columns. */}
          <div className="mt-4 grid grid-cols-2 gap-x-8 border border-gray-400 px-4 py-3">
            <div>
              <InfoRow label="Invoice No." value={order.orderNumber} />
              <InfoRow label="Invoice Date" value={fmtDate(order.createdAt)} />
              <InfoRow
                label="Terms"
                value={order.paymentTerms || "100% advance payment."}
              />
              <InfoRow
                label="Due Date"
                value={fmtDate(order.dueDate || order.createdAt)}
              />
            </div>
            <div>
              <InfoRow label="Place Of Supply" value={placeOfSupply} />
              <InfoRow label="Destination" value={address?.city} />
              <InfoRow
                label="Mode of Delivery"
                value={order.shippingMethod || order.deliveryMode || "Standard"}
              />
            </div>
          </div>

          {/* BILL TO / SHIP TO — two separate boxes side by side. */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <PartyBox
              heading="Bill To"
              name={customerName}
              lines={addressLines}
            />
            <PartyBox
              heading="Ship To"
              name={customerName}
              lines={
                addressLines.length > 0 ? addressLines : ["No address on file"]
              }
            />
          </div>

          {/* ITEMS — fixed columns: # / Item & Description / Qty / Rate /
              CGST(%,Amt) / SGST(%,Amt) / Amount, exactly as the reference. */}
          <table className="invoice-items-table mt-3 w-full text-[10px] border-collapse">
            <thead>
              <tr className="text-gray-900">
                <th rowSpan={2} className={`${TH} w-[30px] text-center`}>
                  #
                </th>
                <th rowSpan={2} className={`${TH} text-left`}>
                  Item &amp; Description
                </th>
                <th rowSpan={2} className={`${TH} w-[52px] text-right`}>
                  Qty
                </th>
                <th rowSpan={2} className={`${TH} w-[58px] text-right`}>
                  Rate
                </th>
                <th colSpan={2} className={`${TH} w-[96px] text-center`}>
                  CGST
                </th>
                <th colSpan={2} className={`${TH} w-[96px] text-center`}>
                  SGST
                </th>
                <th rowSpan={2} className={`${TH} w-[76px] text-right`}>
                  Amount
                </th>
              </tr>
              <tr className="text-gray-900">
                <th className={`${TH} w-[38px] text-center`}>%</th>
                <th className={`${TH} w-[58px] text-center`}>Amt</th>
                <th className={`${TH} w-[38px] text-center`}>%</th>
                <th className={`${TH} w-[58px] text-center`}>Amt</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className={`${TD} py-6 text-center text-gray-400`}
                  >
                    No items on this order
                  </td>
                </tr>
              ) : (
                rows.map(({ it, key, lineAmount, percent, gst, hsn }, i) => {
                  // Intra-state splits the line tax evenly between the two
                  // halves of the same slab.
                  const halfGst = gst / 2;
                  const halfPercent = percent / 2;
                  const variantName = variantNameFor(it, variants);
                  return (
                    <tr key={key} className="invoice-row">
                      <td className={`${TD} text-center text-gray-800`}>
                        {i + 1}
                      </td>
                      <td className={`${TD} text-gray-900`}>
                        {/* "health-check-brand-zero — 50 g" — one line. */}
                        <div className="leading-[1.4]">
                          {it.productName}
                          {variantName ? ` ${DASH} ${variantName}` : ""}
                        </div>
                        {hsn && (
                          <div className="mt-0.5 text-[9px] leading-[1.3] text-gray-500">
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
                      <td className={`${TD} text-center tabular-nums`}>
                        {taxCell(isIntraState, halfPercent, true)}
                      </td>
                      <td className={`${TD} text-center tabular-nums`}>
                        {taxCell(isIntraState, halfGst, false)}
                      </td>
                      <td className={`${TD} text-center tabular-nums`}>
                        {taxCell(isIntraState, halfPercent, true)}
                      </td>
                      <td className={`${TD} text-center tabular-nums`}>
                        {taxCell(isIntraState, halfGst, false)}
                      </td>
                      <td className={`${TD} text-right tabular-nums font-bold`}>
                        {fmtNum(lineAmount)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* TAX SUMMARY — five bordered columns. */}
          <table className="mt-3 w-full text-[10px] border-collapse">
            <thead>
              <tr>
                {[
                  "Taxable Value",
                  "CGST Amount",
                  "SGST Amount",
                  "IGST Amount",
                  "Total Tax Amount",
                ].map((h) => (
                  <th key={h} className={`${TH} text-left`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {[taxableValue, cgstTotal, sgstTotal, igstTotal, totalTax].map(
                  (v, i) => (
                    <td
                      key={i}
                      className={`${TD} font-bold tabular-nums text-gray-900`}
                    >
                      {fmtNum(v)}
                    </td>
                  ),
                )}
              </tr>
            </tbody>
          </table>

          {/* TAX AMOUNT IN WORDS */}
          <p className="!m-0 pt-2.5 text-[10.5px] text-gray-900">
            <span className="font-bold">Tax Amount (in words):</span>{" "}
            <span className="italic">{inWords(totalTax)}</span>
          </p>

          {/* TOTAL IN WORDS  /  TOTALS — unboxed band, as the reference. */}
          <div className="mt-3 grid grid-cols-[1fr_260px] gap-8">
            <div>
              <p className="!m-0 text-[10.5px] font-bold uppercase tracking-[0.04em] text-gray-900">
                Total In Words
              </p>
              <p className="!m-0 pt-0.5 text-[10.5px] italic text-gray-800">
                {inWords(order.totalAmount)}
              </p>
            </div>

            <div className="text-[10.5px]">
              <div className="flex items-center justify-between py-[3px]">
                <span className="text-gray-900">Sub Total (Ex-GST)</span>
                <span className="tabular-nums text-gray-900">
                  {fmtRs(subtotalExGst)}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between py-[3px]">
                  <span className="text-gray-900">Discount</span>
                  <span className="tabular-nums text-gray-900">
                    -{fmtRs(discount)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between py-[3px]">
                <span className="text-gray-900">Shipping</span>
                <span className="tabular-nums text-gray-900">
                  {fmtRs(shipping)}
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between border-t border-gray-400 pt-2">
                <span className="text-[13px] font-bold text-gray-900">
                  Total
                </span>
                <span className="text-[13px] font-bold tabular-nums text-gray-900">
                  {fmtRs(order.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          <div className="invoice-page-number">Page 1 of 2</div>
        </div>
      </div>

      {/* ============================ PAGE 2 ============================
          Signature block + Terms and Conditions, always its own page
          regardless of how many items page 1 held. */}
      <div className="invoice-sheet invoice-page-break">
        <div className="invoice-content">
          <div className="text-right text-[10.5px] text-gray-900">
            <p className="!m-0">For {titleCaseName(SELLER.name)}</p>
            {/* Signing space. A spacer element, not a margin on the <p>
                below: every <p> here carries !m-0 to neutralise Bootstrap's
                unlayered `p { margin-bottom: 1rem }`, and that !important
                also beats any mt-* utility beside it — the gap measured as
                0px until this div replaced it. */}
            <div className="h-[56px]" aria-hidden="true" />
            <p className="!m-0">Authorised Signatory</p>
          </div>

          <p className="!m-0 pt-8 text-[13px] font-bold text-gray-900">
            TERMS AND CONDITIONS
          </p>
          <ol className="mt-3 pl-6 space-y-2 text-[10.5px] leading-[1.55] text-gray-900 list-decimal list-outside">
            {TERMS.map((t, i) => (
              <li key={i} className="pl-1">
                {t}
              </li>
            ))}
          </ol>

          <div className="invoice-page-number">Page 2 of 2</div>
        </div>
      </div>
    </div>
  );
};

export default OrderInvoice;
