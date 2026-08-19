// Pill-shaped Active/Inactive switch — solid green track + white knob on the
// right when Active, light grey track + knob on the left when Inactive,
// matching the approved reference design exactly. No page in this app
// currently has a working inline status toggle (Product's Status column is
// only a static read-only pill too) — this is a new, shared component so any
// list page (Category now, Product later if desired) reuses the identical
// look/interaction instead of a one-off design.
const StatusToggle = ({ checked, onChange, disabled, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label || (checked ? "Active — click to deactivate" : "Inactive — click to activate")}
    disabled={disabled}
    onClick={(e) => {
      e.stopPropagation();
      onChange?.(!checked);
    }}
    className={`relative inline-flex items-center h-[24px] w-[48px] rounded-full shrink-0 transition-colors duration-200 ${
      disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
    } ${checked ? "bg-[#22C55E]" : "bg-[#D8DCE3]"}`}
  >
    <span
      className={`inline-block w-[20px] h-[20px] bg-white rounded-full shadow-sm transform transition-transform duration-200 ${
        checked ? "translate-x-[26px]" : "translate-x-[2px]"
      }`}
    />
  </button>
);

export default StatusToggle;
