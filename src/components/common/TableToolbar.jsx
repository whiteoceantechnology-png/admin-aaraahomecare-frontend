// Shared table header bar: search input on the left, action icon buttons
// (Export/Print/...) on the right, all on one aligned row. Search input uses
// the same shared filter-control styling (height/border/radius/font) as
// every other list page's toolbar — see src/components/common/filterToolbarStyles.js.
import { Search } from "lucide-react";
import { FILTER_SEARCH_INPUT_CLASS } from "./filterToolbarStyles";

const TableToolbar = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  actions,
  children,
}) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 p-4 border-b border-[var(--mk-line)]">
    <div className="relative w-full md:w-64">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
        <Search size={16} className="text-[var(--mk-ink-400)]" />
      </div>
      <input
        type="text"
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        className={FILTER_SEARCH_INPUT_CLASS}
      />
    </div>

    <div className="flex items-center gap-1 shrink-0">
      {children}
      {actions}
    </div>
  </div>
);

export default TableToolbar;
