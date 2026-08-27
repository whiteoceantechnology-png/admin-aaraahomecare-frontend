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
import { AlertTriangle, ChevronRight } from "lucide-react";
import { useState } from "react";
import Pagination from "../common/Pagination";
import CommonTable from "../common/CommonTable";
import CategoryFilterDropdown from "../common/CategoryFilterDropdown";
import {
  productStockPool,
  availableUnitsFromPool,
} from "../../utils/sharedStock";
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

// A derived variant figure counts SELLABLE UNITS, never the stock unit: 117
// against a 25 ml variant means 117 bottles of 25 ml, not 117 ml. The suffix
// is what stops that being misread, and it is the same word whatever the
// product is measured in — ml, g, kg or pieces all divide down to a count of
// things you can ship.
const fmtUnits = (n) => `${Number(n).toLocaleString("en-IN")} ${Number(n) === 1 ? "unit" : "units"}`;

const fmtPrice = (n) =>
  Number(n ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const sellPrice = (item) =>
  hasValue(item?.discountPrice) ? item.discountPrice : item?.price;

const reservedOf = (item) =>
  hasValue(item?.reservedQuantity) ? item.reservedQuantity : item?.reserved;

const availableOf = (item) => {
  if (hasValue(item?.availableQuantity)) return Number(item.availableQuantity);
  if (hasValue(item?.available)) return Number(item.available);
  const stock = item?.stockQuantity;
  const reserved = reservedOf(item);
  return hasValue(stock) && hasValue(reserved)
    ? Number(stock) - Number(reserved)
    : null;
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
}) => {
  const [expandedProducts, setExpandedProducts] = useState(new Set());

  const groupedRows = [];
  const productGroups = new Map();
  data.forEach((item) => {
    const productKey = String(
      item?.productId ?? item?.product?.id ?? item?.productName ?? "unknown",
    );
    if (!productGroups.has(productKey)) {
      productGroups.set(productKey, {
        productKey,
        product: item,
        variants: [],
      });
    }
    productGroups.get(productKey).variants.push(item);
  });
  productGroups.forEach((group) => {
    // The product's stock is one shared pool (e.g. 2925 ML) that the API
    // repeats on every variant row. Summing it across variants multiplies one
    // pool by the variant count — 2925 x 6 = 17,550 — which is why the
    // product row shows the pool itself and each variant row shows how many
    // whole units of ITS OWN size that pool can fill.
    const pool = productStockPool(group.product, group.variants);

    // Only meaningful without a shared pool: with one, "reserved units"
    // differ per size and cannot be added across sizes.
    const totalStock =
      pool || !group.variants.every((item) => hasValue(item?.stockQuantity))
        ? null
        : group.variants.reduce(
            (sum, item) => sum + Number(item.stockQuantity),
            0,
          );
    const totalReserved =
      pool || !group.variants.every((item) => hasValue(reservedOf(item)))
        ? null
        : group.variants.reduce(
            (sum, item) => sum + Number(reservedOf(item)),
            0,
          );
    const totalAvailable =
      pool || !group.variants.every((item) => availableOf(item) != null)
        ? null
        : group.variants.reduce(
            (sum, item) => sum + Number(availableOf(item)),
            0,
          );

    groupedRows.push({
      ...group.product,
      id: `product-${group.productKey}`,
      rowType: "product",
      productKey: group.productKey,
      variantCount: group.variants.length,
      inventoryId: group.product.id,
      stockPool: pool,
      stockQuantity: totalStock,
      reservedQuantity: totalReserved,
      availableQuantity: totalAvailable,
      productVariants: group.variants,
    });
    if (expandedProducts.has(group.productKey)) {
      group.variants.forEach((variant) =>
        groupedRows.push({
          ...variant,
          rowType: "variant",
          parentProductKey: group.productKey,
          stockPool: pool,
          // floor(pool / this variant's size); null when there is no pool, so
          // the row falls back to whatever the API gave it.
          derivedUnits: availableUnitsFromPool(pool, variant?.variantName),
        }),
      );
    }
  });

  const handleRowClick = (item) => {
    if (item.rowType === "product") {
      onView?.({ ...item, id: item.inventoryId });
      return;
    }
    return;
  };

  const toggleProduct = (item, event) => {
    event.stopPropagation();
    setExpandedProducts((previous) => {
      const next = new Set(previous);
      if (next.has(item.productKey)) next.delete(item.productKey);
      else next.add(item.productKey);
      return next;
    });
  };

  const columns = [
    {
      key: "select",
      header: null,
      width: "36px",
      render: (item) => (item.rowType === "product" ? null : null),
    },
    {
      key: "productName",
      header: "Product",
      width: "260px",
      truncate: true,
      truncateWidth: "240px",
      className: "font-bold text-[12.5px] text-[var(--mk-ink-900)]",
      render: (item) =>
        item.rowType === "product" ? (
          <button
            type="button"
            onClick={(event) => toggleProduct(item, event)}
            className="inline-flex items-center gap-1.5 font-bold cursor-pointer text-left"
          >
            <ChevronRight
              size={14}
              className={`transition-transform ${expandedProducts.has(item.productKey) ? "rotate-90" : ""}`}
            />
            {item?.productName || item?.product?.name || "—"}
            <span className="font-normal text-[var(--mk-ink-400)]">
              ({item.variantCount})
            </span>
          </button>
        ) : (
          <span className="pl-6 text-[var(--mk-ink-400)]">↳</span>
        ),
    },
    {
      key: "variantName",
      header: "Variant",
      width: "110px",
      truncate: true,
      truncateWidth: "100px",
      className: "text-[12px] text-[var(--mk-ink-700)]",
      render: (item) =>
        item.rowType === "product"
          ? `${item.variantCount} variants`
          : item?.variantName || "—",
    },
    {
      key: "sku",
      header: "SKU",
      width: "110px",
      truncate: true,
      truncateWidth: "100px",
      className: "text-[var(--mk-ink-500)] text-[12px]",
      render: (item) => (item.rowType === "product" ? "—" : item?.sku || "—"),
    },
    {
      key: "price",
      header: "Price (ex-GST)",
      width: "120px",
      align: "right",
      render: (item) => {
        if (item.rowType === "product") return "—";
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
      width: "110px",
      align: "right",
      className: "text-[var(--mk-ink-700)] tabular-nums",
      render: (item) => {
        // Product row: the pool exactly as stocked, with its unit ("2,925 ML")
        // — never a sum across variants.
        if (item.rowType === "product") {
          if (item.stockPool) return item.stockPool.label;
          return hasValue(item?.stockQuantity) ? item.stockQuantity : "—";
        }
        // Variant row: whole units of this size the pool can fill.
        if (item.derivedUnits != null) return fmtUnits(item.derivedUnits);
        // Not derived from a pool — this is whatever the API sent, so it is
        // left exactly as it came rather than relabelled as units.
        return hasValue(item?.stockQuantity) ? item.stockQuantity : "—";
      },
    },
    {
      key: "reservedQuantity",
      header: "Reserved",
      width: "90px",
      align: "right",
      className: "text-[var(--mk-ink-700)] tabular-nums",
      render: (item) => {
        // A shared pool has no product-level reserved figure: reservations are
        // counted in units, and units differ per variant size, so adding them
        // across sizes would be meaningless.
        if (item.rowType === "product" && item.stockPool) return "—";
        const reserved = reservedOf(item);
        return hasValue(reserved) ? reserved : "—";
      },
    },
    {
      key: "available",
      header: "Available",
      width: "116px",
      align: "right",
      render: (item) => {
        // Product row: the stock actually remaining, in the base stock unit
        // ("2,975 ML") — the same figure On hand shows, because a shared pool
        // has nothing reserved against it at product level. Every variant row
        // below divides THIS number. No low-stock icon here: that threshold
        // counts units, and 10 ML means something quite different from 10
        // bottles.
        if (item.rowType === "product" && item.stockPool)
          return (
            <span className="text-[var(--mk-ink-700)] font-medium tabular-nums">
              {item.stockPool.label}
            </span>
          );
        // Derived units, less anything reserved against that variant.
        let avail = availableOf(item);
        // Only a pool-derived figure is a unit count; an API-supplied one is
        // shown as it arrived.
        let derived = false;
        if (item.derivedUnits != null) {
          const reserved = reservedOf(item);
          avail = hasValue(reserved)
            ? Math.max(0, item.derivedUnits - Number(reserved))
            : item.derivedUnits;
          derived = true;
        }
        const isLow = avail != null && avail <= 10;
        if (avail == null)
          return <span className="text-[var(--mk-ink-400)]">—</span>;
        const shown = derived ? fmtUnits(avail) : avail;
        return isLow ? (
          <span className="inline-flex items-center gap-1 text-[var(--mk-warn)] font-semibold tabular-nums">
            <AlertTriangle size={13} />
            {shown}
          </span>
        ) : (
          <span className="text-[var(--mk-ink-700)] font-medium tabular-nums">
            {shown}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      width: "90px",
      render: (item) => {
        const active =
          item?.rowType === "product"
            ? item.productVariants.some(
                (variant) =>
                  variant?.status === true || variant?.status === "active",
              )
            : item?.status === true || item?.status === "active";
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
              active
                ? "bg-[var(--mk-ok-bg)] text-[var(--mk-ok)]"
                : "bg-black/[0.05] text-[var(--mk-ink-500)]"
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
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-[var(--mk-ink-400)]"
            >
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
            title={
              lowStockOnly
                ? "Search isn't available in Low stock view"
                : undefined
            }
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
          <span className={filterChipBadgeClass(lowStockOnly)}>
            {lowStockLoading ? "…" : lowStockCount}
          </span>
        </button>
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
        <div className="py-16 text-center text-sm text-gray-400">
          Loading inventory…
        </div>
      ) : (
        <CommonTable
          columns={columns}
          data={groupedRows}
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
          onRowClick={handleRowClick}
          rowClassName={(item) =>
            item.rowType === "product"
              ? "bg-[var(--mk-primary-50)]/35 font-semibold"
              : "bg-white"
          }
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
