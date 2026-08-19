// Single source of truth for the "Order Placed" bucket and the 4-stage
// Current Status flow (Order Placed → Packed → Shipped → Delivered), shared
// by the Current Status dropdown, the Order Tabs, and the Next Action logic
// so all three can never drift apart on what counts as "Order Placed".
//
// NOTE: whether backend "processing" (and pending/pending_payment/confirmed)
// truly map 1:1 to the business status "Order Placed" is a frontend
// assumption pending backend/business confirmation — flagged in the
// implementation report, never asserted as settled fact.
export const PLACED_ALIASES = ["pending_payment", "confirmed", "pending", "processing"];

export const STAGE_ORDER = ["order_placed", "packed", "shipped", "delivered"];

export const isPlacedStatus = (status) => {
  const s = (status || "").toString().toLowerCase();
  return !s || PLACED_ALIASES.includes(s);
};

// Maps a raw backend status to the display stage key used throughout the
// Current Status UI — "order_placed" for anything pre-packed, otherwise the
// raw value itself (packed/shipped/delivered/cancelled/anything else).
export const getCurrentStageKey = (status) => {
  const s = (status || "").toString().toLowerCase();
  return isPlacedStatus(s) ? "order_placed" : s;
};
