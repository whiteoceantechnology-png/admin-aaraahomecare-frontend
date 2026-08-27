// Order summary maths for GST-INCLUSIVE pricing.
//
// An order line's stored price already contains its GST: ₹110 on an 18% slab
// is ₹93.22 of goods plus ₹16.78 of tax. A summary therefore has to EXTRACT
// the tax from the subtotal, never add it on top — printing
//
//     Subtotal ₹110.00 + GST ₹16.78 + Shipping ₹50.00
//
// bills the GST twice and comes to ₹176.78 against a real total of ₹160.00.
// The correct breakdown splits the same ₹110 into its two parts:
//
//     Subtotal (ex-GST) ₹93.22
//     GST               ₹16.78
//     Shipping          ₹50.00
//     Total            ₹160.00      = 93.22 + 16.78 + 50
//
// The payable total is unchanged by any of this — it is still
// inclusiveSubtotal + shipping − discount. Only the breakdown changes.
//
// The tax figure itself is always taken from the order (order.taxAmount) and
// never recomputed here, so the admin shows exactly what was charged rather
// than a second opinion about it.

const round2 = (n) => Math.round(Number(n) * 100) / 100;

// The goods value with the included GST taken back out.
export const exGstSubtotal = (inclusiveSubtotal, taxAmount) => {
  const sub = Number(inclusiveSubtotal || 0);
  const tax = Number(taxAmount || 0);
  // With no tax recorded there is nothing to extract; the subtotal is already
  // the goods value.
  if (!(sub > 0) || !(tax > 0)) return round2(sub);
  return Math.max(0, round2(sub - tax));
};

// The GST rate, measured against the EX-GST base — the only base a GST rate
// is defined on.
//
// This is why the displayed rate changes: measuring ₹16.78 against the
// INCLUSIVE ₹110 gives 15.3%, which is not a GST slab and not what was
// charged. Against the ex-GST ₹93.22 it gives the real 18%.
export const gstPercentFor = (inclusiveSubtotal, taxAmount) => {
  const ex = exGstSubtotal(inclusiveSubtotal, taxAmount);
  const tax = Number(taxAmount || 0);
  if (!(ex > 0) || !(tax > 0)) return null;
  const percent = (tax / ex) * 100;
  // Two decimals at most, trailing zeros dropped: 18, not 18.00.
  return Number(percent.toFixed(2));
};
