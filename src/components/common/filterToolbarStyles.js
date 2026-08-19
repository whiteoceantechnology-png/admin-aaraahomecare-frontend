// Single source of truth for list-page filter-toolbar control styling
// (search input, select dropdowns, filter chips, Export/Print buttons).
// The Product page is the canonical reference — every other page's toolbar
// (Category, Inventory, Orders, Customers, Tax, Brands, etc.) imports these
// instead of hand-rolling its own className strings, so every control —
// regardless of tag (input/select/button) — shares one height, border,
// radius, font, and padding: 38px tall, 1px solid var(--mk-line), 8px
// radius, 12px horizontal / 8px vertical padding.
//
// `!`-prefixed utilities throughout this file force the win over Bootstrap's
// global, unlayered form-control reset (imported app-wide in main.jsx).
// Bootstrap's reboot.css sets `button, input, select, textarea { font-size:
// inherit }` and resets button border-radius/padding — since that CSS isn't
// wrapped in a Tailwind @layer, it beats ANY Tailwind utility regardless of
// specificity (CSS Cascade Layers: unlayered always beats layered). Without
// `!important`, these controls silently inherit the body's 16px font size,
// square button corners, and wrong padding instead of the values below.
// Same root cause as the earlier `label` alignment bug this session.

// One shared height for every control in the toolbar row.
export const FILTER_CONTROL_HEIGHT = "h-[38px]"; // 38px

// The search box's own wrapper width — the one dimension that had drifted
// per-page (w-32 on Product/Category, w-40 on Inventory, w-44 on Orders).
// 280px matches the reference design's search bar exactly; import this
// instead of hand-rolling a page-specific width.
export const FILTER_SEARCH_WRAP_CLASS = "relative w-[280px] shrink-0";

export const FILTER_SEARCH_ICON_WRAP_CLASS =
  "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none";

export const FILTER_SEARCH_INPUT_CLASS =
  "w-full !h-[38px] !pl-9 !pr-3 !py-2 border !border-[var(--mk-line)] !rounded-lg !text-[13px] !font-medium !outline-none focus:ring-2 focus:ring-[var(--mk-primary-ring)] focus:border-[var(--mk-primary)] text-[var(--mk-ink-900)] transition-colors";

export const FILTER_SELECT_CLASS =
  "!h-[38px] !px-3 !py-2 !rounded-lg border !border-[var(--mk-line)] !text-[13px] !font-medium text-[var(--mk-ink-700)] bg-white !outline-none focus:ring-2 focus:ring-[var(--mk-primary-ring)] focus:border-[var(--mk-primary)] cursor-pointer";

export const filterChipClass = (active) =>
  `inline-flex items-center !h-[38px] gap-1.5 !px-3 !py-2 !rounded-full border !text-[13px] !font-medium transition-colors cursor-pointer whitespace-nowrap ${
    active
      ? "bg-[var(--mk-primary-50)] !border-[var(--mk-primary)]/30 text-[var(--mk-primary)]"
      : "bg-white !border-[var(--mk-line)] text-[var(--mk-ink-500)] hover:!border-[#C9CFDA]"
  }`;

// Count badge inside a chip — one consistent size/shape everywhere it appears.
export const filterChipBadgeClass = (active) =>
  `inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 !rounded-full !text-[10.5px] !font-semibold leading-none ${
    active ? "bg-[var(--mk-primary)]/15" : "bg-black/[0.06]"
  }`;

// Bordered rectangular action button (Export, and anything else with a label).
export const FILTER_ACTION_BTN_CLASS =
  "shrink-0 inline-flex items-center !h-[38px] gap-1.5 !px-3 !py-2 !rounded-lg !text-[13px] !font-medium text-[var(--mk-ink-700)] border !border-[var(--mk-line)] bg-white hover:border-[#C9CFDA] hover:text-[var(--mk-ink-900)] transition-colors cursor-pointer whitespace-nowrap";

// Square icon-only button (Print, View/density) — same height/border/radius
// as every other control, unlike the app-wide IconButton component (which is
// borderless and a different size) — keeps icon-only actions visually part
// of the same toolbar instead of looking like a different component.
export const FILTER_ICON_BTN_CLASS =
  "shrink-0 inline-flex items-center justify-center !h-[38px] !w-[38px] !rounded-lg border !border-[var(--mk-line)] bg-white text-[var(--mk-ink-700)] hover:border-[#C9CFDA] hover:text-[var(--mk-ink-900)] transition-colors cursor-pointer";

export const FILTER_ICON_SIZE = 16;
