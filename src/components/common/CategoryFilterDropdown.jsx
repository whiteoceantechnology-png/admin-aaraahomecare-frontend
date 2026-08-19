// Multi-select category filter — the single implementation shared by every
// page that filters by category (Products first, Inventory reusing it
// exactly rather than re-building its own). Controlled: the caller owns the
// selected-ids Set (and, on Products, its own client-side filtering off of
// it; on Inventory, turning it into a server-side categoryId param) — this
// component only renders the closed chip field + the searchable checkbox
// panel and reports selection changes back via onChange.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { FILTER_SEARCH_ICON_WRAP_CLASS, FILTER_SEARCH_INPUT_CLASS, FILTER_SELECT_CLASS as selectClass } from "./filterToolbarStyles";

const MAX_VISIBLE_CATEGORY_CHIPS = 2;

const CategoryFilterDropdown = ({ categories = [], selectedIds, onChange, triggerWidthClass = "w-36", disabled = false }) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const selectAllCheckboxRef = useRef(null);

  const allSelected = categories.length === 0 || selectedIds.size === categories.length;

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = !allSelected && selectedIds.size > 0 && categories.length > 0;
    }
  }, [allSelected, selectedIds, categories.length]);

  // Portaled to document.body so the dropdown floats over the table instead
  // of being clipped by the toolbar's own overflow-x-auto (an ancestor with
  // only overflow-x set still forces overflow-y to behave as "auto" too,
  // per the CSS Overflow spec). Position is computed from the trigger's
  // real screen position and kept in sync on scroll/resize.
  useEffect(() => {
    if (!open) {
      setSearchTerm("");
      setPos(null);
      return;
    }

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.left, width: rect.width });
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

  const toggleCategory = (id) => {
    const key = String(id);
    const next = new Set(selectedIds);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  };

  const toggleSelectAll = () => {
    onChange(selectedIds.size === categories.length ? new Set() : new Set(categories.map((c) => String(c.id))));
  };

  const clearAll = () => onChange(new Set());

  const selectedCategoryObjs = categories.filter((c) => selectedIds.has(String(c.id)));
  const visibleChips = allSelected ? [] : selectedCategoryObjs.slice(0, MAX_VISIBLE_CATEGORY_CHIPS);
  const extraChipCount = allSelected ? 0 : Math.max(0, selectedCategoryObjs.length - MAX_VISIBLE_CATEGORY_CHIPS);

  const visibleDropdownCategories = searchTerm
    ? categories.filter((c) => c.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    : categories;

  return (
    <div className="relative shrink-0" ref={triggerRef}>
      {/* Closed state: compact chip field, single row, never expands —
          selected categories render as removable tags, overflow collapses
          into a "+N" badge. Plain div (not <button>) so the per-chip ×
          buttons inside it stay valid, unnested interactive elements. */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        aria-label="Filter by category"
        aria-haspopup="listbox"
        aria-expanded={open}
        title={disabled ? "Category filter isn't available in this view" : undefined}
        className={`${selectClass} ${triggerWidthClass} flex items-center gap-1 overflow-hidden ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
          {categories.length === 0 || allSelected ? (
            <span className="truncate text-[var(--mk-ink-700)]">All Categories</span>
          ) : selectedIds.size === 0 ? (
            <span className="truncate text-[var(--mk-ink-400)]">Select categories</span>
          ) : (
            <>
              {visibleChips.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md bg-[var(--mk-primary-50)] text-[var(--mk-primary)] text-[11.5px] font-medium shrink-0 max-w-[56px]"
                >
                  <span className="truncate">{c.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCategory(c.id);
                    }}
                    aria-label={`Remove ${c.name}`}
                    className="shrink-0 hover:opacity-70 cursor-pointer"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
              {extraChipCount > 0 && (
                <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-black/[0.06] text-[var(--mk-ink-700)] text-[11.5px] font-semibold">
                  +{extraChipCount}
                </span>
              )}
            </>
          )}
        </div>
        <ChevronDown size={14} className={`shrink-0 text-[var(--mk-ink-400)] transition-transform ${open ? "rotate-180" : ""}`} />
      </div>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: pos.top, left: pos.left }}
            className="z-50 w-72 bg-white rounded-lg border border-[var(--mk-line)] shadow-lg overflow-hidden"
          >
            <div className="p-2 border-b border-[var(--mk-line)]">
              <div className="relative">
                <div className={FILTER_SEARCH_ICON_WRAP_CLASS}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--mk-ink-400)]">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <input
                  type="text"
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search categories..."
                  className={FILTER_SEARCH_INPUT_CLASS}
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--mk-line)] bg-[#FAFBFD]">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--mk-ink-400)]">
                {selectedIds.size} selected
              </span>
              <button
                type="button"
                onClick={clearAll}
                className="text-[12px] font-semibold text-[var(--mk-primary)] hover:underline cursor-pointer"
              >
                Clear All
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto py-1">
              {/* !flex + !mb-0 force the win over Bootstrap's global, unlayered
                  `label { display: inline-block; margin-bottom: .5rem }` reset —
                  Tailwind's utilities live in a CSS layer, so without `!important`
                  Bootstrap's unlayered rule silently wins the cascade and these
                  rows shrink-wrap into columns instead of stacking full-width. */}
              {!searchTerm && (
                <label className="!flex w-full !mb-0 items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-[var(--mk-line)]">
                  <input
                    type="checkbox"
                    ref={selectAllCheckboxRef}
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="w-[15px] h-[15px] rounded border-[var(--mk-line)] accent-[var(--mk-primary)] cursor-pointer shrink-0"
                  />
                  <span className="text-[13px] font-semibold text-[var(--mk-ink-900)]">All Categories</span>
                </label>
              )}

              {visibleDropdownCategories.length === 0 ? (
                <p className="px-3 py-3 text-[12.5px] text-[var(--mk-ink-400)]">
                  {categories.length === 0 ? "No categories available" : "No categories match your search"}
                </p>
              ) : (
                visibleDropdownCategories.map((c) => (
                  <label key={c.id} className="!flex w-full !mb-0 items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(String(c.id))}
                      onChange={() => toggleCategory(c.id)}
                      className="w-[15px] h-[15px] rounded border-[var(--mk-line)] accent-[var(--mk-primary)] cursor-pointer shrink-0"
                    />
                    <span className="text-[13px] text-[var(--mk-ink-700)] truncate">{c.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default CategoryFilterDropdown;
