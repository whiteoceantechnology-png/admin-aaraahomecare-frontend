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
import logo from "../../assets/images/Aaraa_Homecare_Logo.svg";
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
// day: "numeric", not "2-digit" — the reference reads "9 Sept 2026", not
// "09 Sept 2026".
const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
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

// Split an intra-state tax amount into its CGST and SGST halves so that the
// two ALWAYS add back to it exactly, with any odd paisa going to CGST:
//
//   2.29 -> CGST 1.15 + SGST 1.14   (plain halving printed 1.14 + 1.14 = 2.28
//                                    against a Total Tax Amount of 2.29)
//   2.28 -> CGST 1.14 + SGST 1.14
//
// Worked in whole paise rather than on the rupee float, because
// Math.round(1.145 * 100) is 114, not 115 — 1.145 has no exact binary
// representation and lands a hair below the midpoint, which would silently
// give the odd paisa to SGST instead.
const splitCgstSgst = (total) => {
  const paise = Math.round(Number(total || 0) * 100);
  const cgstPaise = Math.round(paise / 2);
  return { cgst: cgstPaise / 100, sgst: (paise - cgstPaise) / 100 };
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

  // Tax contained in the goods lines.
  const goodsTax =
    rows.length > 0 ? rows.reduce((sum, r) => sum + r.gst, 0) : taxAmount;

  // ---- SHIPPING IS TAXED, AND ITS TAX IS PART OF THE SAME CGST/SGST ------
  //
  // The rate is never invented. It is taken from the order when the API
  // carries one, and otherwise from the slab the order's OWN items are on —
  // shipping of a taxable supply follows that supply's rate. A mixed basket
  // takes the highest slab in use (the principal supply). With no taxable
  // line at all the rate is 0 and shipping stays untaxed.
  // The rate is always the COMBINED one (18%, not the 9% CGST half) — that
  // is what the label states and what the extraction below needs. A payload
  // that happens to carry only a half-rate is the one case this cannot
  // detect; see the implementation note in the report.
  const shippingTaxPercent = (() => {
    // 1. A rate the API states outright.
    const declared =
      order.shippingTaxPercent ??
      order.shippingGstPercent ??
      order.shippingTaxRate;
    if (declared != null && declared !== "" && !Number.isNaN(Number(declared))) {
      return Number(declared);
    }

    // 2. A shipping tax AMOUNT the API states, turned back into its rate.
    //    `shipping` is GST-inclusive, so the rate is measured against the
    //    ex-GST remainder: 18.31 of tax inside 120 is 18.31/101.69 = 18%.
    const declaredTax = Number(
      order.shippingTaxAmount ?? order.shippingTax ?? order.shippingGst ?? NaN,
    );
    if (!Number.isNaN(declaredTax) && declaredTax > 0 && shipping > declaredTax) {
      const derived = (declaredTax / (shipping - declaredTax)) * 100;
      // The stored tax amount is itself rounded to paise, so the rate backed
      // out of it lands just off: ₹18.31 inside ₹120 computes as 18.006%,
      // which would print "18.01% GST". Snap to the nearest quarter-percent
      // when the gap is that small — GST rates are expressed in quarters
      // (0.25, 2.5, 5, 12, 18) — and otherwise keep the computed figure
      // rather than forcing it onto a rate it is not.
      const quarter = Math.round(derived * 4) / 4;
      return Math.abs(derived - quarter) <= 0.05
        ? quarter
        : Number(derived.toFixed(2));
    }

    // 3. Otherwise the slab the order's OWN items are on — shipping of a
    //    taxable supply follows that supply's rate. A mixed basket takes the
    //    highest slab in use (the principal supply). Note r.percent already
    //    falls back to the order-level blended rate for a line that carries
    //    no slab of its own, so this still finds a rate when only
    //    order.taxAmount is populated.
    const itemSlabs = rows.map((r) => Number(r.percent)).filter((p) => p > 0);
    if (itemSlabs.length > 0) return Math.max(...itemSlabs);

    // 4. Nothing to go on. Shipping prints with NO percentage rather than a
    //    guessed one, and stays untaxed.
    return 0;
  })();

  // IS `shippingAmount` STORED INCLUSIVE OR EXCLUSIVE OF ITS GST?
  //
  // Nothing in the payload says, and guessing wrong moves real money: at 5%
  // on ₹40, inclusive means a ₹38.10 base plus ₹1.90 tax, exclusive means a
  // ₹40.00 base plus ₹2.00 tax and a ₹42.00 charge. So this is DECIDED FROM
  // THE ORDER'S OWN TOTALS rather than assumed — whichever reading lands
  // closer to the total the backend actually charged is the one the backend
  // used:
  //
  //   inclusive  -> payable = goods(incl) + shipping            - discount
  //   exclusive  -> payable = goods(incl) + shipping + its tax  - discount
  //
  // With no usable order total to test against, it falls back to inclusive —
  // the convention every line price in this system already uses (see
  // orderTotals.js). Either way the tax is applied exactly once.
  const shippingIsInclusive = (() => {
    if (!(shipping > 0) || !(shippingTaxPercent > 0)) return true;
    const payable = Number(order.totalAmount);
    if (!(payable > 0)) return true;
    const exclusiveTax = (shipping * shippingTaxPercent) / 100;
    const asInclusive = subtotal + shipping - discount;
    const asExclusive = subtotal + shipping + exclusiveTax - discount;
    return (
      Math.abs(payable - asInclusive) <= Math.abs(payable - asExclusive)
    );
  })();

  // Inclusive: the tax is EXTRACTED from the amount charged (₹40 at 5% is
  // ₹38.10 + ₹1.90). Exclusive: the amount IS the base and the tax sits on
  // top. Either way the three figures are derived separately and used for
  // different purposes below — base for the taxable value, tax for the GST
  // summary, and the GROSS for the payable column's Shipping row.
  const shippingTax =
    shipping > 0 && shippingTaxPercent > 0
      ? shippingIsInclusive
        ? (shipping * shippingTaxPercent) / (100 + shippingTaxPercent)
        : (shipping * shippingTaxPercent) / 100
      : 0;
  const shippingExGst = shippingIsInclusive ? shipping - shippingTax : shipping;

  // Everything the invoice reports as tax: goods + shipping.
  const displayedTaxTotal = goodsTax + shippingTax;

  // Tax grouped by slab, so a mixed 5%/18% basket prints one entry per rate.
  // A 0% slab produces no entry — a zero-rated order shows no tax line.
  // Shipping's tax joins the bucket for its own rate, so it is reported
  // under the same CGST/SGST (or IGST) heads as the goods and is counted
  // exactly once.
  const gstByPercent = new Map();
  rows.forEach((r) => {
    if (!(Number(r.percent) > 0)) return;
    gstByPercent.set(r.percent, (gstByPercent.get(r.percent) || 0) + r.gst);
  });
  // Shipping's tax joins the bucket for its OWN rate, so it is reported under
  // the same heads as the goods — CGST 9% + SGST 9% intra-state, the whole
  // 18% to IGST inter-state — and feeds both the GST summary table and the
  // payable column from one place. The Shipping row prints the ex-GST base,
  // so this is counted exactly once.
  if (shippingTax > 0) {
    gstByPercent.set(
      shippingTaxPercent,
      (gstByPercent.get(shippingTaxPercent) || 0) + shippingTax,
    );
  }

  // Per-slab CGST/SGST splits, each one exact (see splitCgstSgst). The
  // summary buckets are the SUM of these, not a second independent halving,
  // so the "CGST Amount" cell always equals the CGST rows printed in the
  // totals column beneath it.
  const slabSplits = [...gstByPercent.entries()]
    // Highest slab first, the order the reference invoices list them in.
    .sort((a, b) => b[0] - a[0])
    .map(([percent, amount]) => ({ percent, amount, ...splitCgstSgst(amount) }));


  // The three summary buckets. At most one is non-zero for any given order,
  // because the place of supply decides the whole invoice.
  //
  // The intra-state split sends the odd paisa to CGST. Halving plainly made
  // ₹2.29 print as CGST 1.14 + SGST 1.14 = 2.28 against a Total Tax Amount
  // of 2.29 — a tax document that did not add up.
  const intraSplit = isIntraState
    ? slabSplits.length > 0
      ? slabSplits.reduce(
          (acc, s) => ({ cgst: acc.cgst + s.cgst, sgst: acc.sgst + s.sgst }),
          { cgst: 0, sgst: 0 },
        )
      : // No per-line slabs (an order with no items but a recorded tax):
        // split the order-level figure directly, by the same rule.
        splitCgstSgst(displayedTaxTotal)
    : { cgst: 0, sgst: 0 };

  const cgstTotal = intraSplit.cgst;
  const sgstTotal = intraSplit.sgst;
  const igstTotal = isInterState ? displayedTaxTotal : 0;
  const totalTax = cgstTotal + sgstTotal + igstTotal;

  // Line prices are stored GST-INCLUSIVE, so `subtotal` already contains the
  // tax; the Sub Total row must show it with the tax taken back OUT or the
  // column counts the GST twice. Only the GOODS tax is removed here —
  // shipping is a separate line with its own extraction above.
  const subtotalExGst = exGstSubtotal(subtotal, goodsTax);
  // Taxable Value is the whole taxable base of the supply: goods ex-GST plus
  // shipping EX-GST. Adding the gross shipping instead would count shipping's
  // own tax inside the taxable base it is charged on.
  const taxableValue = subtotalExGst + shippingExGst;

  // What the column adds up to, built from exactly the figures it prints:
  // goods ex-GST + shipping ex-GST + every CGST/SGST/IGST row - discount.
  // totalTax already contains shipping's GST, and the Shipping row prints
  // the base, so the shipping tax is added exactly once.
  const computedTotal = subtotalExGst + shippingExGst + totalTax - discount;
  // The invoice must show the amount actually charged, and the breakdown must
  // visibly reconcile to it. The residue — paise lost to per-line rounding,
  // or a deliberate round-to-rupee at checkout — is shown as Round Off rather
  // than silently absorbed into another row. Below a tenth of a paisa it is
  // float noise, not a real adjustment, and no row is printed.
  const roundOff = Number(order.totalAmount || 0) - computedTotal;
  // Half a paisa, not a tenth: anything smaller PRINTS as 0.00, and a row
  // reading "Round Off -₹0.00" is noise rather than an adjustment. The
  // residue it suppresses is below the invoice's own display resolution.
  const showRoundOff = Math.abs(roundOff) >= 0.005;

  const customerPhone = order.customer?.phone || address?.phone || "";
  // The customer's own GSTIN, from the order detail response already loaded by
  // the caller (GET /admin/orders/{id} -> data.customer.gstIn). No extra
  // request is made for it. `gstIn` is the documented field name; the other
  // spellings are read only so a differently-cased payload still works.
  // Whitespace-only counts as absent, so a blank string can never print a
  // bare "GSTIN:" label.
  const customerGstin = (
    order.customer?.gstIn ??
    order.customer?.gstin ??
    order.customer?.GSTIN ??
    ""
  )
    .toString()
    .trim();

  // "Erode - 638104, CONT: 7397036307" — the reference folds city, postcode
  // and the contact number onto a single line. `extraLines` is what varies
  // between the two panels.
  const buildAddressLines = (extraLines = []) =>
    address
      ? [
          [address.addressLine1, address.addressLine2]
            .filter(Boolean)
            .join(", "),
          [
            [address.city, address.postalCode].filter(Boolean).join(" - "),
            customerPhone ? `CONT: ${customerPhone}` : "",
          ]
            .filter(Boolean)
            .join(", "),
          ...extraLines,
          address.state,
        ].filter(Boolean)
      : [];

  // The GSTIN sits on its own line directly BELOW the contact number, and
  // only when the customer actually has one — the phone is still shown
  // either way, so nothing is lost when a GSTIN is present. An absent,
  // null or whitespace-only value adds no line at all, so a bare "GSTIN:"
  // label can never print.
  const billToLines = buildAddressLines(
    customerGstin ? [`GSTIN: ${customerGstin}`] : [],
  );
  // SHIP TO is deliberately untouched: address + phone, no GSTIN. A tax id
  // belongs on the bill, not on a shipping label.
  const shipToLines = buildAddressLines();

  // Bill To and Ship To both describe this order's single address — the same
  // honest reuse this file has always documented.
  const customerName = order.customer?.name || address?.name || DASH;

  // The BANK DETAILS lines, built only from fields seller.js actually fills.
  // Branch and IFSC share one line when both exist, as on the reference.
  const bank = SELLER.bank || {};
  const branchAndIfsc = [bank.branch, bank.ifsc].filter(Boolean).join(" & ");
  const bankLines = [
    bank.name ? `Bank Name - ${bank.name}` : "",
    bank.accountNumber ? `Account Number - ${bank.accountNumber}` : "",
    branchAndIfsc ? `Branch & IFSC - ${branchAndIfsc}` : "",
  ].filter(Boolean);

  const TH = "border border-gray-400 px-1.5 py-1 font-bold";
  const TD = "border border-gray-400 px-1.5 py-1.5 align-top";

  // One tax cell. "—" wherever a component does not apply — a zero-rated
  // line, most commonly.
  const taxCell = (applies, value, isPercent) => {
    if (!applies || !value) return DASH;
    return isPercent ? `${fmtPercent(value)}%` : fmtNum(value);
  };

  // The tax column groups in the items table FOLLOW THE PLACE OF SUPPLY, the
  // same fact that decides the tax itself: an inter-state supply is charged
  // IGST and gets one IGST group, an intra-state supply is charged CGST+SGST
  // and gets two. Printing CGST/SGST columns full of dashes on a Karnataka
  // order (the previous fixed layout) stated the wrong tax heads and hid the
  // rate actually charged — the IGST figure only appeared in the summary
  // below. An order with no place of supply keeps CGST/SGST, since there is
  // nothing to justify calling the tax IGST.
  const taxColumns = isInterState
    ? [{ key: "igst", label: "IGST" }]
    : [
        { key: "cgst", label: "CGST" },
        { key: "sgst", label: "SGST" },
      ];
  // 4 fixed columns + 2 subcolumns per group + Amount.
  const itemColumnCount = 4 + taxColumns.length * 2 + 1;

  // Per-line cells for those groups, in the same order the headers are built.
  // The intra-state line uses the same odd-paisa-to-CGST split as the summary,
  // so a line's two halves add back to the line's own tax exactly.
  const taxCellsFor = (percent, gst) => {
    if (isInterState) {
      return [taxCell(true, percent, true), taxCell(true, gst, false)];
    }
    const { cgst, sgst } = splitCgstSgst(gst);
    return [
      taxCell(isIntraState, percent / 2, true),
      taxCell(isIntraState, cgst, false),
      taxCell(isIntraState, percent / 2, true),
      taxCell(isIntraState, sgst, false),
    ];
  };

  // One totals row per slab actually used, labelled the way the reference
  // does ("IGST18 (18%)", "CGST9 (9%)"). Built from slabSplits above — the
  // SAME numbers the summary buckets are summed from — so the rows and the
  // summary can never disagree by a paisa.
  const taxRows = slabSplits.flatMap((s) =>
    isIntraState
      ? [
          {
            label: `CGST${fmtPercent(s.percent / 2)}`,
            percent: s.percent / 2,
            amount: s.cgst,
          },
          {
            label: `SGST${fmtPercent(s.percent / 2)}`,
            percent: s.percent / 2,
            amount: s.sgst,
          },
        ]
      : isInterState
        ? [{ label: `IGST${fmtPercent(s.percent)}`, percent: s.percent, amount: s.amount }]
        : [],
  );

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
                alt="Aaraa Homecare"
                className="h-24 w-auto object-contain shrink-0"
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
              lines={billToLines}
            />
            {/* SHIP TO is deliberately unchanged — still the phone. */}
            <PartyBox
              heading="Ship To"
              name={customerName}
              lines={
                shipToLines.length > 0 ? shipToLines : ["No address on file"]
              }
            />
          </div>

          {/* ITEMS — # / Item & Description / Qty / Rate / <tax groups> /
              Amount. The tax groups are IGST(%,Amt) for an inter-state
              supply and CGST(%,Amt) + SGST(%,Amt) for an intra-state one. */}
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
                {taxColumns.map((c) => (
                  <th
                    key={c.key}
                    colSpan={2}
                    className={`${TH} w-[96px] text-center`}
                  >
                    {c.label}
                  </th>
                ))}
                <th rowSpan={2} className={`${TH} w-[76px] text-right`}>
                  Amount
                </th>
              </tr>
              <tr className="text-gray-900">
                {taxColumns.flatMap((c) => [
                  <th key={`${c.key}-p`} className={`${TH} w-[38px] text-center`}>
                    %
                  </th>,
                  <th key={`${c.key}-a`} className={`${TH} w-[58px] text-center`}>
                    Amt
                  </th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={itemColumnCount}
                    className={`${TD} py-6 text-center text-gray-400`}
                  >
                    No items on this order
                  </td>
                </tr>
              ) : (
                rows.map(({ it, key, lineAmount, percent, gst, hsn }, i) => {
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
                      {/* One %/Amt pair per tax group — IGST, or CGST+SGST. */}
                      {taxCellsFor(percent, gst).map((cell, ci) => (
                        <td
                          key={ci}
                          className={`${TD} text-center tabular-nums`}
                        >
                          {cell}
                        </td>
                      ))}
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

              {/* BANK DETAILS — rendered only when seller.js actually
                  configures them, and each line only when it has a value, so
                  an unconfigured deployment prints no empty heading. */}
              {bankLines.length > 0 && (
                <>
                  <p className="!m-0 pt-3 text-[10.5px] font-bold uppercase tracking-[0.04em] text-gray-900">
                    Bank Details
                  </p>
                  {bankLines.map((line) => (
                    <p
                      key={line}
                      className="!m-0 text-[10.5px] leading-[1.55] text-gray-800"
                    >
                      {line}
                    </p>
                  ))}
                </>
              )}
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
                <span className="text-gray-900">
                  Shipping
                  {shippingTaxPercent > 0 && shipping > 0
                    ? ` (${fmtPercent(shippingTaxPercent)}% GST)`
                    : ""}
                </span>
                {/* EX-GST, like the Sub Total above it: ₹80 charged at 18%
                    prints as ₹67.80 here, and its ₹12.20 of GST appears in
                    the CGST/SGST (or IGST) rows below. Printing the gross
                    figure here as well would bill that tax twice. */}
                <span className="tabular-nums text-gray-900">
                  {fmtRs(shippingExGst)}
                </span>
              </div>
              {/* One row per slab the order actually uses — "IGST18 (18%)",
                  or "CGST9 (9%)" + "SGST9 (9%)". Without these the column
                  jumped from Shipping straight to Total and the tax the
                  customer paid appeared nowhere in the payable breakdown. */}
              {taxRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between py-[3px]"
                >
                  <span className="text-gray-900">
                    {row.label} ({fmtPercent(row.percent)}%)
                  </span>
                  <span className="tabular-nums text-gray-900">
                    {fmtRs(row.amount)}
                  </span>
                </div>
              ))}
              {showRoundOff && (
                <div className="flex items-center justify-between py-[3px]">
                  <span className="text-gray-900">Round Off</span>
                  <span className="tabular-nums text-gray-900">
                    {roundOff < 0 ? "-" : ""}
                    {fmtRs(Math.abs(roundOff))}
                  </span>
                </div>
              )}
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
