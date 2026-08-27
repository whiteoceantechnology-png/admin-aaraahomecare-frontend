// Aaraa's own company details — the single source of truth for every
// outbound document (tax invoice header/footer, packing slip FROM block).
//
// These live here rather than coming from the API because no endpoint this
// app calls returns the seller's own registered details: the order API
// carries only the customer side of a transaction. Any field left blank is
// HIDDEN by the documents rather than printed as an empty placeholder, which
// is why `gstin` and `website` are empty — putting an invented GSTIN on a tax
// invoice would be considerably worse than omitting it.
//
// Edit this one object to change every document at once.
export const SELLER = {
  name: "Aaraa Homecare",
  
  addressLines: [
    "8/230/1, SR Compound, N.Vembadithalam",
    "Salem - 637504",
    "Tamil Nadu, India",
  ],
  phone: "+91 8778163790",
  email: "aaraahomecare@gmail.com",
  website: "",
  gstin: "",
};

export default SELLER;
