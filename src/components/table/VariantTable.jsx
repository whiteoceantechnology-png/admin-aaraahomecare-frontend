// src/components/table/VariantTable.jsx — Stock Management list. Fully
// controlled/presentational: all data, filters and pagination live in
// Variant.jsx and are driven by the real GET /admin/inventory (or
// /admin/inventory/low-stock) endpoints — this component owns no filtering
// or pagination logic of its own, since real server-side paging means it
// only ever sees one page of rows at a time.
//
// Field names (stockQuantity/reservedQuantity/sku/variantName/...) mirror
// what this app's variant objects have always used elsewhere; the dedicated
// inventory API's exact response shape isn't confirmed from a live backend,
// so a few fields are read defensively (multiple plausible names) rather
// than assumed — adjust the fallbacks below if the real response differs.
import { AlertTriangle, Layers } from "lucide-react";
import Pagination from "../common/Pagination";
import CommonTable from "../common/CommonTable";
import CategoryFilterDropdown from "../common/CategoryFilterDropdown";
import {
  FILTER_SEARCH_ICON_WRAP_CLASS,
  FILTER_SEARCH_INPUT_CLASS,
  FILTER_SELECT_CLASS,
  filterChipClass,
  filterChipBadgeClass,
} from "../common/filterToolbarStyles";

// Inventory's reference design calls for a narrower ~225px search box —
// deliberately different from the 280px FILTER_SEARCH_WRAP_CLASS shared by
// Products/Categories/Orders, so this page defines its own wrap width while
// still reusing the shared icon/input styling (height, border, radius, font).
const SEARCH_WRAP_CLASS = "relative w-[225px] shrink-0";

const hasValue = (v) => v !== null && v !== undefined;

const fmtPrice = (n) =>
  Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const sellPrice = (item) => (hasValue(item?.discountPrice) ? item.discountPrice : item?.price);

const reservedOf = (item) => (hasValue(item?.reservedQuantity) ? item.reservedQuantity : item?.reserved);

const availableOf = (item) => {
  if (hasValue(item?.availableQuantity)) return Number(item.availableQuantity);
  if (hasValue(item?.available)) return Number(item.available);
  const stock = item?.stockQuantity;
  const reserved = reservedOf(item);
  return hasValue(stock) && hasValue(reserved) ? Number(stock) - Number(reserved) : null;
};

const VariantTable = ({
  data = [],
  title,
  loading = false,
  error = null,
  onView,
  onRetry,

  searchTerm = "",
  onSearchChange,
  categories = [],
  selectedCategoryIds = new Set(),
  onCategoryChange,
  statusFilter = "all",
  onStatusFilterChange,

  lowStockOnly = false,
  onToggleLowStock,
  lowStockCount = 0,
  lowStockLoading = false,
  lowStockError = null,

  currentPage = 1,
  itemsPerPage = 25,
  totalItems = 0,
  onPageChange,
  onItemsPerPageChange,

  selectedIds = new Set(),
  onToggleSelect,
  onToggleSelectAll,
  onOpenBulkUpdate,
}) => {
  const allSelected = data.length > 0 && data.every((item) => selectedIds.has(item.id));

  const columns = [
    {
      key: "select",
      header: (
        <input
          type="checkbox"
          checked={allSelected}
          onChange={(e) => onToggleSelectAll?.(e.target.checked)}
          aria-label="Select all rows on this page"
          className="cursor-pointer"
        />
      ),
      width: "36px",
      render: (item) => (
        <input
          type="checkbox"
          checked={selectedIds.has(item.id)}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect?.(item.id, e.target.checked);
          }}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select ${item?.variantName || "row"}`}
          className="cursor-pointer"
        />
      ),
    },
    {
      key: "productName",
      header: "Product",
      width: "260px",
      truncate: true,
      truncateWidth: "240px",
      className: "font-bold text-[12.5px] text-[var(--mk-ink-900)]",
      render: (item) => item?.productName || item?.product?.name || "—",
    },
    {
      key: "variantName",
      header: "Variant",
      width: "110px",
      truncate: true,
      truncateWidth: "100px",
      className: "text-[12px] text-[var(--mk-ink-700)]",
    },
    {
      key: "sku",
      header: "SKU",
      width: "110px",
      truncate: true,
      truncateWidth: "100px",
      className: "text-[var(--mk-ink-500)] text-[12px]",
      render: (item) => item?.sku || "—",
    },
    {
      key: "price",
      header: "Price (ex-GST)",
      width: "120px",
      align: "right",
      render: (item) => {
        const sell = sellPrice(item);
        return (
          <div className="text-[var(--mk-ink-900)] font-semibold tabular-nums">
            {hasValue(sell) ? `₹${fmtPrice(sell)}` : "—"}
          </div>
        );
      },
    },
    {
      key: "stockQuantity",
      header: "On hand",
      width: "90px",
      align: "right",
      className: "text-[var(--mk-ink-700)] tabular-nums",
      render: (item) => (hasValue(item?.stockQuantity) ? item.stockQuantity : "—"),
    },
    {
      key: "reservedQuantity",
      header: "Reserved",
      width: "90px",
      align: "right",
      className: "text-[var(--mk-ink-700)] tabular-nums",
      render: (item) => {
        const r = reservedOf(item);
        return hasValue(r) ? r : "—";
      },
    },
    {
      key: "available",
      header: "Available",
      width: "100px",
      align: "right",
      render: (item) => {
        const avail = availableOf(item);
        const isLow = avail != null && avail <= 10;
        if (avail == null) return <span className="text-[var(--mk-ink-400)]">—</span>;
        return isLow ? (
          <span className="inline-flex items-center gap-1 text-[var(--mk-warn)] font-semibold tabular-nums">
            <AlertTriangle size={13} />
            {avail}
          </span>
        ) : (
          <span className="text-[var(--mk-ink-700)] font-medium tabular-nums">{avail}</span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      width: "90px",
      render: (item) => {
        const active = item?.status === true || item?.status === "active";
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
              active ? "bg-[var(--mk-ok-bg)] text-[var(--mk-ok)]" : "bg-black/[0.05] text-[var(--mk-ink-500)]"
            }`}
          >
            {active ? "Active" : "Inactive"}
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 p-4 overflow-x-auto border-b border-[var(--mk-line)]">
        <div className={SEARCH_WRAP_CLASS}>
          <div className={FILTER_SEARCH_ICON_WRAP_CLASS}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--mk-ink-400)]">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by product, size or SKU"
            value={searchTerm}
            onChange={(e) => onSearchChange?.(e.target.value)}
            disabled={lowStockOnly}
            title={lowStockOnly ? "Search isn't available in Low stock view" : undefined}
            className={`${FILTER_SEARCH_INPUT_CLASS} disabled:opacity-50 disabled:cursor-not-allowed`}
          />
        </div>

        {/* Same CategoryFilterDropdown Products uses — reused, not
            re-implemented (see that page's ProductTable.jsx). Disabled in
            Low stock view for the same reason Search/Status are: that view
            has its own dedicated endpoint/params. */}
        <CategoryFilterDropdown
          categories={categories}
          selectedIds={selectedCategoryIds}
          onChange={onCategoryChange}
          disabled={lowStockOnly}
        />

        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange?.(e.target.value)}
          disabled={lowStockOnly}
          className={`${FILTER_SELECT_CLASS} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <button
          type="button"
          onClick={() => onToggleLowStock?.(!lowStockOnly)}
          disabled={lowStockLoading || !!lowStockError}
          title={lowStockError ? "Low stock data unavailable" : undefined}
          className={`${filterChipClass(lowStockOnly)} shrink-0 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          Low stock
          <span className={filterChipBadgeClass(lowStockOnly)}>{lowStockLoading ? "…" : lowStockCount}</span>
        </button>

        {selectedIds.size > 0 && (
          <button
            type="button"
            onClick={onOpenBulkUpdate}
            className="ml-auto shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-semibold text-white bg-[var(--mk-primary)] hover:bg-[var(--mk-primary-hover)] transition-colors cursor-pointer"
          >
            <Layers size={14} />
            Bulk update stock ({selectedIds.size})
          </button>
        )}
      </div>

      {error ? (
        <div className="py-16 text-center">
          <p className="text-sm text-[var(--mk-dgr)] mb-2">{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="text-[12.5px] font-semibold text-[var(--mk-primary)] hover:underline cursor-pointer"
            >
              Try again
            </button>
          )}
        </div>
      ) : loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading inventory…</div>
      ) : (
        <CommonTable
          columns={columns}
          data={data}
          emptyMessage={
            lowStockOnly
              ? "No low-stock variants"
              : `No ${(title || "inventory").toLowerCase()} found`
          }
          minWidth="960px"
          headerBgClass="bg-[#FAFBFD]"
          headerTextClass="text-[10.5px] font-semibold text-[var(--mk-ink-400)] tracking-[0.08em]"
          headerHeightClass="h-[38px]"
          rowPaddingY="py-[9px]"
          onRowClick={onView}
        />
      )}

      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={onPageChange}
        onItemsPerPageChange={onItemsPerPageChange}
      />
    </div>
  );
};

export default VariantTable;
