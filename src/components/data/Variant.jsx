import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Info } from "lucide-react";
import {
  getInventoryList,
  getLowStockInventory,
} from "../../redux/slices/inventorySlice";
import { getAllCategoryList } from "../../redux/slices/categorySlice";

import VariantTable from "../table/VariantTable";
import InventoryDetailDrawer from "../details/InventoryDetailDrawer";

const LOW_STOCK_THRESHOLD = 10;
const SEARCH_DEBOUNCE_MS = 400;

// Stock Management — backed entirely by the dedicated GET/PUT/POST
// /admin/inventory endpoints (list, low-stock, detail, update/adjust/
// reserve/release, history, bulk-update). No product-derived or mocked
// data: everything here is a real, paginated server response.
const Variant = ({ title = "Inventory" }) => {
  const dispatch = useDispatch();
  const { items, meta, loading, error, lowStock } = useSelector(
    (state) => state.inventory || {},
  );
  // Same category source Products already uses (getAllCategoryList /
  // state.category.allCategoryList) — not a second implementation, just
  // fetched here too since Inventory has to work standalone even if the
  // admin never visited Products first in this session.
  const { allCategoryList: categories = [] } = useSelector(
    (state) => state.category || {},
  );

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(new Set());
  const categoriesInitializedRef = useRef(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const [viewingProductId, setViewingProductId] = useState(null);

  useEffect(() => {
    dispatch(getAllCategoryList());
  }, [dispatch]);

  // Same "start with every category selected" default Products uses, so
  // the closed field reads "All Categories" until the admin narrows it.
  useEffect(() => {
    if (!categoriesInitializedRef.current && categories.length > 0) {
      setSelectedCategoryIds(new Set(categories.map((c) => String(c.id))));
      categoriesInitializedRef.current = true;
    }
  }, [categories]);

  // Debounce the search box — the list query re-fires SEARCH_DEBOUNCE_MS
  // after the admin stops typing, not on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Any filter change starts again at page 1 — including a category change,
  // so the new category's results are never opened at a page that only
  // existed for the previous one.
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategoryIds, statusFilter, lowStockOnly]);

  // The category filter is a server-side query parameter: the selected
  // category id goes out as ?categoryId= and the endpoint returns that
  // category's inventory, which is rendered exactly as it arrives. Nothing is
  // matched or filtered on the client.
  //
  // Omitted entirely when every category is selected — this dropdown's "All
  // categories" state, the same meaning the Products page gives it — so
  // clearing the filter returns to the plain paged list.
  //
  // One selected category sends `categoryId=21`. The dropdown is multi-select,
  // so several are sent comma-joined; the single-id form is the confirmed one.
  const categoryFilterActive =
    categories.length > 0 && selectedCategoryIds.size !== categories.length;

  const categoryIdParam = () =>
    categoryFilterActive ? Array.from(selectedCategoryIds).join(",") : undefined;

  // The dispatch promise of the list request currently in flight. Changing
  // category aborts it before starting the next, so a slow earlier response
  // can never land after — and overwrite — the newer category's rows.
  const inFlightListRef = useRef(null);

  const loadList = () => {
    const categoryId = categoryIdParam();

    inFlightListRef.current?.abort?.();

    if (lowStockOnly) {
      inFlightListRef.current = dispatch(
        getLowStockInventory({
          threshold: LOW_STOCK_THRESHOLD,
          page: currentPage,
          limit: itemsPerPage,
          ...(categoryId ? { categoryId } : {}),
        }),
      );
    } else {
      const params = { page: currentPage, limit: itemsPerPage };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== "all") params.status = statusFilter;
      if (categoryId) params.categoryId = categoryId;
      inFlightListRef.current = dispatch(getInventoryList(params));
    }

    // Keep the "Low stock" chip's own count fresh regardless of which view
    // is active, so it never shows a stale number.
    if (!lowStockOnly) {
      dispatch(
        getLowStockInventory({
          threshold: LOW_STOCK_THRESHOLD,
          page: 1,
          limit: 1,
          ...(categoryId ? { categoryId } : {}),
        }),
      );
    }
  };

  // Identifies the request the current filters imply, so changing the
  // category (or the page, search, status) re-fetches with the new query
  // while an unrelated re-render does not.
  const requestKey = [
    lowStockOnly ? "low" : "list",
    searchTerm,
    statusFilter,
    [...selectedCategoryIds].sort().join(","),
    currentPage,
    itemsPerPage,
  ].join("::");

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, requestKey]);

  // Abort whatever is still in flight when the page unmounts.
  useEffect(() => () => inFlightListRef.current?.abort?.(), []);

  const activeList = lowStockOnly ? lowStock : { items, meta, loading, error };
  // Rendered exactly as the API returned it — the category-filtered response
  // IS the list, and its meta drives pagination. Loading, error (with Try
  // again) and the "No inventory found" empty state are handled by
  // VariantTable from the props below.
  const rows = activeList.items || [];
  const totalItems = activeList.meta?.total ?? 0;

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div>
        <h2 className="!text-[26px] !font-bold !leading-[1.2] !m-0 text-[var(--mk-ink-900)] tracking-[-0.01em]">
          {title}
        </h2>
        <p className="text-[12px] font-medium text-[var(--mk-ink-500)] mt-1 leading-[1.5]">
          Stock levels by product with expandable variant details.
        </p>
      </div>

      {/* INFO BANNER */}
      <div className="flex items-start gap-2 px-[12px] py-[10px] rounded-[10px] bg-[var(--mk-info-bg)] border border-[#C9DBFA] text-[#1D4ED8] text-[12px] leading-[1.4]">
        <Info size={13} className="mt-0.5 shrink-0" />
        <div>
          <b>Products are the stock management level.</b> Expand a product to
          view its variants.
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border border-[var(--mk-line)] overflow-hidden">
        <VariantTable
          data={rows}
          title={title}
          loading={activeList.loading}
          error={activeList.error}
          onRetry={loadList}
          onView={(item) => setViewingProductId(item.productId)}
          searchTerm={searchInput}
          onSearchChange={setSearchInput}
          categories={categories}
          selectedCategoryIds={selectedCategoryIds}
          onCategoryChange={setSelectedCategoryIds}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          lowStockOnly={lowStockOnly}
          onToggleLowStock={setLowStockOnly}
          lowStockCount={lowStock?.meta?.total ?? 0}
          lowStockLoading={lowStock?.loading}
          lowStockError={lowStock?.error}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(value) => {
            setItemsPerPage(value);
            setCurrentPage(1);
          }}
        />
      </div>

      <InventoryDetailDrawer
        productId={viewingProductId}
        open={!!viewingProductId}
        onClose={() => setViewingProductId(null)}
        onMutated={loadList}
      />
    </div>
  );
};

export default Variant;
