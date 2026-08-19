// Shared icon-only action button with a hover tooltip, used across every
// table's action column and toolbar (Edit/Delete/View/Print/Export/...).
const ICON_TONE = {
  neutral: "bg-gray-100 text-gray-600 hover:bg-gray-200",
  purple:
    "bg-[var(--brand-purple)]/10 text-[var(--brand-purple)] hover:bg-[var(--brand-purple)]/20",
  red: "bg-red-50 text-red-600 hover:bg-red-100",
  blue: "bg-blue-50 text-blue-600 hover:bg-blue-100",
  green: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
  // "flat" / "flatDanger" — no persistent pill background, matching the
  // Product/Category mockup's .iconbtn (transparent, tints only on hover).
  // Opt-in only; every other tone above is unchanged.
  flat: "bg-transparent text-[var(--mk-ink-500)] hover:bg-[var(--mk-bg)] hover:text-[var(--mk-ink-900)]",
  flatDanger: "bg-transparent text-[var(--mk-dgr)] hover:bg-[var(--mk-dgr-bg)]",
  // White + thin border, colored icon only — used where a filled tint pill
  // (the tones above) would be too heavy next to a filled "+" action in the
  // same row (e.g. Technical Documents' View/Delete buttons).
  purpleOutline: "bg-white border border-[var(--mk-line)] text-[var(--brand-purple)] hover:bg-[var(--brand-purple)]/5",
  redOutline: "bg-white border border-[var(--mk-line)] text-red-600 hover:bg-red-50",
};

const IconButton = ({
  icon: Icon,
  label,
  onClick,
  tone = "neutral",
  size = 16,
  type = "button",
  disabled = false,
}) => (
  <div className="relative inline-flex group/tooltip">
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 cursor-pointer hover:-translate-y-px active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:translate-y-0 ${ICON_TONE[tone]}`}
    >
      <Icon size={size} />
    </button>
    <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[12px] font-medium text-white !opacity-0 scale-95 transition-all duration-150 group-hover/tooltip:!opacity-100 group-hover/tooltip:scale-100 z-20">
      {label}
    </span>
  </div>
);

export default IconButton;
