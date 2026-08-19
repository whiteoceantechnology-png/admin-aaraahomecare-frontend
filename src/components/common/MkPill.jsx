// Dot-style status pill matching the approved mockup (aaraa-admin-redesign.html)
// exactly — a small solid dot in front of the label, same color as the text.
const TONE = {
  ok: "bg-[var(--mk-ok-bg)] text-[var(--mk-ok)]",
  warn: "bg-[var(--mk-warn-bg)] text-[var(--mk-warn)]",
  dgr: "bg-[var(--mk-dgr-bg)] text-[var(--mk-dgr)]",
  info: "bg-[var(--mk-info-bg)] text-[var(--mk-info)]",
  mut: "bg-[#EEF1F6] text-[#5B6472]",
};

// size="sm" is an opt-in, smaller variant (used by the Products table to
// match a denser reference design) — default "md" is pixel-identical to the
// original markup so every existing caller (Customers, etc.) is unaffected.
const SIZE = {
  md: "gap-1.5 px-2.5 py-1 text-[11.5px]",
  sm: "gap-1 px-2 py-[3px] text-[11px]",
};
const DOT_SIZE = {
  md: "w-1.5 h-1.5",
  sm: "w-[5px] h-[5px]",
};

const MkPill = ({ label, tone = "mut", size = "md" }) => (
  <span
    className={`inline-flex items-center rounded-full font-semibold tracking-wide whitespace-nowrap ${SIZE[size] || SIZE.md} ${TONE[tone] || TONE.mut}`}
  >
    <span className={`rounded-full bg-current shrink-0 ${DOT_SIZE[size] || DOT_SIZE.md}`} />
    {label}
  </span>
);

export default MkPill;
