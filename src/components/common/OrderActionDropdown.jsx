// The "Next Action" control for an order — a single direct-click button, not
// a dropdown. getOrderNextAction always derives at most one valid action for
// the current status (Order Placed → Pack order, Packed → Ship order,
// Shipped → Mark delivered, delivered+cod_due → Record COD payment) — never
// a list of choices — so clicking the button fires that one action straight
// away via the existing onSelect handler chain (Order.jsx's
// handleProgressStatus/handleRecordCod, same status-update/COD APIs as
// before). No popover, no chevron, nothing to open — Current Status
// (OrderStatusDropdown) is the only actual dropdown on this page. Delivered
// ("Complete") and cancelled ("—") render as a static, non-clickable label
// since neither has a valid next action right now.
import { AlertTriangle, Loader2 } from "lucide-react";
import { isConflictAction } from "../../utils/orderNextAction";

const TONE_CLASS = {
  outline:
    "border border-[var(--mk-line)] text-[var(--mk-ink-700)] bg-white hover:border-[#C9CFDA] hover:text-[var(--mk-ink-900)]",
  danger: "bg-[var(--mk-dgr)] text-white hover:brightness-110 border border-transparent",
};

// Arbitrary px-[Npx] values (not px-3/px-4) sidestep a Bootstrap/Tailwind
// class-name collision: Bootstrap ships its own !important `.px-3`/`.px-4`
// at different pixel values than Tailwind's, which otherwise silently wins —
// see filterToolbarStyles.js's cascade-layer note for the full mechanism.
// text/rounded are `!`-forced for a second, separate reason: Bootstrap's
// reboot resets `button { font-size: inherit; border-radius: 0 }` on the
// bare element, unlayered — that beats a plain (non-important) Tailwind
// class regardless of specificity, so only a `!`-prefixed class reliably
// wins on an actual <button> (confirmed via computed-style measurement:
// without `!`, this rendered at the inherited ~16px font and 0 radius).
const SIZE_CLASS = {
  sm: "h-[30px] px-[12px] !text-[12px] leading-4",
  lg: "px-[16px] py-2.5 !text-[13px]",
};

// Both sizes share the ~6px radius used across the Orders table/drawer.
const RADIUS_CLASS = { sm: "!rounded-[6px]", lg: "!rounded-[6px]" };

// Normal next actions read as medium weight; only the red conflict/error
// actions (tone="danger") get the heavier weight, matching the reference.
const WEIGHT_CLASS = { outline: "font-medium", danger: "font-semibold", neutral: "font-semibold" };

const OrderActionDropdown = ({ action, onSelect, size = "sm", toneClass = TONE_CLASS, loading = false }) => {
  if (!action) {
    return <span className="text-[var(--mk-ink-400)]">—</span>;
  }

  // Delivered has no further transition — show the state, not a control.
  if (action.type === "complete") {
    return (
      <span
        className={`inline-flex items-center ${RADIUS_CLASS[size]} font-semibold text-[var(--mk-ink-400)] bg-black/[0.04] whitespace-nowrap ${SIZE_CLASS[size]}`}
      >
        {action.label}
      </span>
    );
  }

  // In-flight (e.g. Record COD payment already submitted) — a static,
  // disabled state so a second click can't fire the same request twice
  // while the first is still resolving.
  if (loading) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 ${RADIUS_CLASS[size]} font-semibold whitespace-nowrap opacity-60 cursor-not-allowed ${SIZE_CLASS[size]} ${toneClass[action.tone] || toneClass.outline}`}
      >
        <Loader2 size={13} className="animate-spin" />
        {action.type === "cod_payment" ? "Recording…" : action.label}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(action);
      }}
      className={`inline-flex items-center gap-1.5 ${RADIUS_CLASS[size]} ${WEIGHT_CLASS[action.tone] || WEIGHT_CLASS.outline} transition-colors cursor-pointer whitespace-nowrap ${SIZE_CLASS[size]} ${toneClass[action.tone] || toneClass.outline}`}
    >
      {isConflictAction(action) && <AlertTriangle size={14} />}
      {action.label}
    </button>
  );
};

export default OrderActionDropdown;
