// Dot-style status pill for order payment/fulfillment states — same visual
// language as MkPill, but with an open status vocabulary (order lifecycles
// use more distinct states than MkPill's 5 fixed tones cover), so this stays
// a separate small component rather than widening MkPill's shared API.
const TONE_BY_STATUS = {
  paid: "bg-[var(--mk-ok-bg)] text-[var(--mk-ok)]",
  delivered: "bg-[var(--mk-ok-bg)] text-[var(--mk-ok)]",

  pending: "bg-[var(--mk-warn-bg)] text-[var(--mk-warn)]",
  pending_payment: "bg-[var(--mk-warn-bg)] text-[var(--mk-warn)]",
  processing: "bg-[var(--mk-warn-bg)] text-[var(--mk-warn)]",
  // Synthetic key (not a real backend value) — the Current Status dropdown
  // uses this to display any pre-"packed" order status as "Order Placed".
  order_placed: "bg-[var(--mk-warn-bg)] text-[var(--mk-warn)]",

  cod_due: "bg-[#EFF4FF] text-[#2563EB]",
  confirmed: "bg-[#EFF4FF] text-[#2563EB]",
  packed: "bg-[#EFF4FF] text-[#2563EB]",

  shipped: "bg-[#F3EEFF] text-[#7C3AED]",
  refund_due: "bg-[#F3EEFF] text-[#7C3AED]",

  review: "bg-[var(--mk-dgr-bg)] text-[var(--mk-dgr)]",
  failed: "bg-[var(--mk-dgr-bg)] text-[var(--mk-dgr)]",

  not_captured: "bg-[#EEF1F6] text-[#5B6472]",
  void: "bg-[#EEF1F6] text-[#5B6472]",
  cancelled: "bg-[#EEF1F6] text-[#5B6472]",
};

const formatLabel = (status) =>
  (status || "")
    .toString()
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ") || "—";

const OrderStatusPill = ({ status }) => {
  const key = (status || "").toString().toLowerCase();
  const toneClass = TONE_BY_STATUS[key] || "bg-[#EEF1F6] text-[#5B6472]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-[10px] py-[3px] rounded-full text-[11px] font-medium leading-4 whitespace-nowrap ${toneClass}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
      {formatLabel(status)}
    </span>
  );
};

export default OrderStatusPill;
