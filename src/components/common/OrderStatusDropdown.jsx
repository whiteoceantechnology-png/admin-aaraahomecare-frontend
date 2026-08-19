// Clickable "Current Status" pill — fully editable: every stage (Order
// Placed / Packed / Shipped / Delivered) is always selectable, regardless
// of which one is current or which Orders tab is active. No client-side
// "only the next step" gating — the existing PUT /admin/orders/{id} status
// endpoint is the actual authority on valid transitions; if the backend
// rejects one, the existing error toast surfaces it same as any other
// update. Order Placed is a synthetic display bucket over whatever real
// status the backend reports pre-fulfillment (pending_payment/confirmed/
// pending/processing — see utils/orderStatusStages.js), so selecting it
// sends "processing" as the concrete value — an unconfirmed frontend
// assumption (same one orderStatusStages.js already flags), swap it if the
// backend expects a different one of those four. Delivered keeps its "Auto"
// badge (it's normally set by an automatic process) but is still a real,
// clickable option here, same as the others. Cancellation keeps its own
// dedicated Cancel Order action elsewhere and isn't part of this dropdown;
// a cancelled order stays a static pill since there's nothing to progress.
// Portaled to document.body using the same floating pattern as the Product
// page's category filter, so it isn't clipped by an ancestor's
// overflow-x-auto.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import OrderStatusPill from "./OrderStatusPill";
import { isPlacedStatus } from "../../utils/orderStatusStages";

const STAGES = [
  { key: "order_placed", label: "Order Placed" },
  { key: "packed", label: "Packed" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered", note: "Auto" },
];

// See the file-header comment — "order_placed" isn't itself a real backend
// status, so picking it from the dropdown sends this concrete stand-in.
const ORDER_PLACED_BACKEND_STATUS = "processing";
const stageBackendStatus = (key) => (key === "order_placed" ? ORDER_PLACED_BACKEND_STATUS : key);

const OrderStatusDropdown = ({ order, onChange }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const currentStatus = (order?.status || "").toLowerCase();
  const isPlaced = isPlacedStatus(currentStatus);
  const isCancelled = currentStatus === "cancelled";
  // The pill shown on the trigger uses the synthetic "order_placed" key for
  // every pre-packed status so it always reads "Order Placed", never the
  // raw backend value (e.g. "Confirmed" or "Processing").
  const displayStatus = isPlaced ? "order_placed" : currentStatus;

  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.left });
    };
    updatePosition();

    const handleClickOutside = (e) => {
      const insideTrigger = triggerRef.current?.contains(e.target);
      const insidePanel = panelRef.current?.contains(e.target);
      if (!insideTrigger && !insidePanel) setOpen(false);
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  // Cancelled is the only terminal state left for this dropdown — a
  // cancelled order is a closed record with its own dedicated Cancel Order
  // action elsewhere, so it renders as a static pill instead of a dropdown.
  if (isCancelled) {
    return <OrderStatusPill status={order?.status} />;
  }

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change current status"
        className="inline-flex items-center gap-1 cursor-pointer group"
      >
        <OrderStatusPill status={displayStatus} />
        <ChevronDown
          size={13}
          className={`text-[var(--mk-ink-400)] transition-transform group-hover:text-[var(--mk-ink-700)] ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: pos.top, left: pos.left }}
            className="z-50 w-48 bg-white rounded-lg border border-[var(--mk-line)] shadow-lg overflow-hidden py-1"
            role="listbox"
          >
            {STAGES.map((stage) => {
              const isCurrent = stage.key === "order_placed" ? isPlaced : currentStatus === stage.key;
              // Every stage is always selectable — no "only the next step",
              // no gating by which Orders tab is open. The backend is the
              // real authority on valid transitions; an invalid pick just
              // surfaces the existing error toast like any other update.
              return (
                <button
                  key={stage.key}
                  type="button"
                  role="option"
                  aria-selected={isCurrent}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    onChange?.(stageBackendStatus(stage.key));
                  }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[12.5px] font-medium text-[var(--mk-ink-700)] hover:bg-gray-50 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    {stage.label}
                    {stage.note && (
                      <span className="px-1.5 py-0.5 rounded-full bg-black/[0.06] text-[10px] font-semibold text-[var(--mk-ink-500)]">
                        {stage.note}
                      </span>
                    )}
                  </span>
                  {isCurrent && <Check size={13} className="text-[var(--mk-primary)] shrink-0" />}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
};

export default OrderStatusDropdown;
