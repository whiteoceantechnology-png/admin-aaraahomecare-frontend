import { useEffect } from "react";
import { X } from "lucide-react";

// Slide-over panel (right-anchored) used for the Add/Edit Category flow —
// same backdrop/esc/scroll-lock behavior as Modal, but as a drawer.
//
// `compact` is opt-in (default false = every existing caller's exact current
// look/size, untouched) — it switches to a fixed-height header/footer, a
// single-line/truncated title (never grows with a long name), and tighter
// body padding, for callers that need a denser panel. headerHeightPx/
// titleSizePx/bodyPaddingXPx/footerHeightPx default to the values the
// Product drawer already ships with (64/16/26/64) — pass your own to get a
// differently-sized compact drawer (e.g. Category's Add form) without
// touching Product's. These are plain numbers applied via inline style, not
// Tailwind arbitrary-value classes, because a class built from a runtime
// prop (`` `px-[${n}px]` ``) can't be found by Tailwind's static build-time
// scanner — only literal class text in source gets compiled.
const Drawer = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  headerActions,
  width = "max-w-md",
  compact = false,
  headerHeightPx = 64,
  titleSizePx = 16,
  bodyPaddingXPx = 26,
  footerHeightPx = 64,
  headerAlignTop = false,
}) => {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-gray-900/50 backdrop-blur-sm animate-modal-backdrop"
      onClick={onClose}
    >
      <div
        className={`w-full ${width} h-full bg-white shadow-2xl flex flex-col animate-drawer-panel`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div
          className={
            compact
              ? `flex ${headerAlignTop ? "items-start pt-[24px]" : "items-center"} justify-between gap-3 border-b border-gray-100 shrink-0`
              : "flex items-start justify-between px-6 py-5 border-b border-gray-100 shrink-0"
          }
          style={compact ? { height: headerHeightPx, paddingLeft: bodyPaddingXPx, paddingRight: bodyPaddingXPx } : undefined}
        >
          <div className="min-w-0">
            <h3
              id="drawer-title"
              className={compact ? "!font-semibold !leading-[1.2] !m-0 truncate text-gray-900" : "text-base font-semibold text-gray-900"}
              style={compact ? { fontSize: titleSizePx } : undefined}
              title={compact && typeof title === "string" ? title : undefined}
            >
              {title}
            </h3>
            {/* !mb-0: bare <p> picks up Bootstrap's unlayered default
                margin-bottom (1rem), which no layered Tailwind class here
                overrides on its own — left unchecked it adds a stray 16px
                gap below the subtitle regardless of what the caller does. */}
            {subtitle && <p className="!mb-0 mt-0.5 text-[13px] text-gray-500">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div
          className={compact ? "flex-1 overflow-y-auto overflow-x-hidden pt-[18px] pb-6" : "flex-1 overflow-y-auto overflow-x-hidden px-6 py-5"}
          style={compact ? { paddingLeft: bodyPaddingXPx, paddingRight: bodyPaddingXPx } : undefined}
        >
          {children}
        </div>
        {footer && (
          <div
            className={
              compact
                ? "flex items-center gap-3 border-t border-gray-100 bg-white shrink-0"
                : "flex items-center gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/60 shrink-0"
            }
            style={compact ? { height: footerHeightPx, paddingLeft: bodyPaddingXPx, paddingRight: bodyPaddingXPx } : undefined}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Drawer;
