// Shared "⋮" order actions menu — the same trigger/panel is used from both
// the Orders table row and the Order Detail drawer; each caller supplies its
// own `items` so only actions that make sense in that context are wired.
// `comingSoon` renders a disabled row tagged "Soon" instead of a working
// handler, for actions with no backend support yet — never a fake success.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";

// Estimated panel height (items.length rows @ ~34px + 8px padding) — used
// to decide open direction before the panel has actually rendered/measured.
const ROW_HEIGHT = 34;

const OrderActionMenu = ({ items = [] }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    // Anchors below the trigger when there's room; flips to open upward
    // when there isn't — e.g. the last few rows of a table near the bottom
    // of the viewport, where opening downward pushed the panel off-screen
    // or got it clipped by the table/page container.
    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const estPanelHeight = items.length * ROW_HEIGHT + 8;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < estPanelHeight + 6 && rect.top > spaceBelow;
      setPos(
        openUpward
          ? { bottom: window.innerHeight - rect.top + 6, right: window.innerWidth - rect.right }
          : { top: rect.bottom + 6, right: window.innerWidth - rect.right },
      );
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

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[var(--mk-ink-500)] hover:bg-gray-100 hover:text-[var(--mk-ink-900)] transition-colors cursor-pointer shrink-0"
      >
        <MoreVertical size={16} />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: pos.top, bottom: pos.bottom, right: pos.right }}
            className="z-[9999] w-56 bg-white rounded-lg border border-[var(--mk-line)] shadow-lg overflow-hidden py-1"
            role="menu"
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((item) => {
              const Icon = item.icon;
              const disabled = item.disabled || item.comingSoon;
              return (
                <button
                  key={item.key}
                  type="button"
                  role="menuitem"
                  disabled={disabled}
                  onClick={() => {
                    if (disabled) return;
                    setOpen(false);
                    item.onClick?.();
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-[12.5px] font-medium transition-colors ${
                    disabled
                      ? "text-[var(--mk-ink-400)] cursor-not-allowed"
                      : item.tone === "danger"
                        ? "text-[var(--mk-dgr)] hover:bg-[var(--mk-dgr-bg)] cursor-pointer"
                        : "text-[var(--mk-ink-700)] hover:bg-gray-50 cursor-pointer"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {Icon && <Icon size={14} className="shrink-0" />}
                    {item.label}
                  </span>
                  {item.comingSoon && (
                    <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-black/[0.06] text-[10px] font-semibold text-[var(--mk-ink-500)]">
                      Soon
                    </span>
                  )}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
};

export default OrderActionMenu;
