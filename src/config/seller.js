// Aaraa's own company details — the single source of truth for every
// outbound document (tax invoice header/footer, packing slip FROM block).
//
// These live here rather than coming from the API because no endpoint this
// app calls returns the seller's own registered details: the order API
// carries only the customer side of a transaction.
//
// The address and GSTIN below are Aaraa's real registered details, taken
// from the approved reference tax invoice supplied by the business. They
// were previously blank/placeholder precisely because inventing a GSTIN on
// a tax invoice would be worse than omitting it — that no longer applies now
// that the real one has been provided. Any field left blank is still HIDDEN
// by the documents rather than printed as an empty placeholder.
//
// Edit this one object to change every document at once.
export const SELLER = {
  name: "AARAA HOMECARE",

  addressLines: [
    "3/325 (OLD NO. 8/280), OLD POST OFFICE STREET",
    "Naduvaneri, Salem - 637504",
  ],
  phone: "+91 87781 63790",
  email: "aaraahomecare@gmail.com",
  website: "",
  gstin: "33ACJFA3570G1ZL",

  // Printed as the invoice's BANK DETAILS block. Every field is optional and
  // the block is HIDDEN entirely when `bank` is absent or has no filled
  // fields — same rule the rest of this file follows, so a deployment that
  // does not want bank details on its invoices simply clears this.
  bank: {
    name: "Canara Bank",
    accountNumber: "120034382423",
    branch: "Elampillai Branch",
    ifsc: "CNRB0001048",
  },
};

export default SELLER;
