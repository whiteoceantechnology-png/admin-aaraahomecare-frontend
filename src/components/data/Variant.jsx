import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { Info } from "lucide-react";
import {
  getInventoryList,
  getLowStockInventory,
  clearSelectedInventory,
} from "../../redux/slices/inventorySlice";
import { getAllCategoryList } from "../../redux/slices/categorySlice";

import VariantTable from "../table/VariantTable";
import InventoryDetailDrawer from "../details/InventoryDetailDrawer";
import ProductDetailDrawer from "../details/ProductDetailDrawer";
import BulkStockUpdateModal from "../form/BulkStockUpdateModal";

const LOW_STOCK_THRESHOLD = 10;
const SEARCH_DEBOUNCE_MS = 400;

// Stock Management — backed entirely by the dedicated GET/PUT/POST
// /admin/inventory endpoints (list, low-stock, detail, update/adjust/
// reserve/release, history, bulk-update). No product-derived or mocked
// data: everything here is a real, paginated server response.
const Variant = ({ title = "Inventory" }) => {
  const dispatch = useDispatch();
  const { items, meta, loading, error, lowStock } = useSelector((state) => state.inventory || {});
  // Same category source Products already uses (getAllCategoryList /
  // state.category.allCategoryList) — not a second implementation, just
  // fetched here too since Inventory has to work standalone even if the
  // admin never visited Products first in this session.
  const { allCategoryList: categories = [] } = useSelector((state) => state.category || {});

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(new Set());
  const categoriesInitializedRef = useRef(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [viewingVariantId, setViewingVariantId] = useState(null);
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategoryIds, statusFilter, lowStockOnly]);

  // Inventory rows carry no category info of their own (the real API
  // response is {id, productId, productName, variantName, sku,
  // stockQuantity, reservedQuantity, availableQuantity, status} — no
  // category field), so unlike Products' client-side filter this has to be
  // a real server-side param. Omitted entirely when every category is
  // selected (== no filter), same as Products' "all selected" meaning.
  // Comma-joining multiple ids is an unconfirmed assumption for the
  // multi-select case — the single-category case (?categoryId=27) is the
  // one actually confirmed against the backend.
  const categoryIdParam = () =>
    categories.length > 0 && selectedCategoryIds.size !== categories.length
      ? Array.from(selectedCategoryIds).join(",")
      : undefined;

  const loadList = () => {
    const categoryId = categoryIdParam();
    if (lowStockOnly) {
      dispatch(
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
      dispatch(getInventoryList(params));
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

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, searchTerm, selectedCategoryIds, statusFilter, lowStockOnly, currentPage, itemsPerPage]);

  const activeList = lowStockOnly ? lowStock : { items, meta, loading, error };
  const rows = activeList.items || [];

  const toggleSelect = (id, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAll = (checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      rows.forEach((r) => (checked ? next.add(r.id) : next.delete(r.id)));
      return next;
    });
  };

  const handleRefreshAfterMutation = () => {
    loadList();
  };

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div>
        <h2 className="!text-[26px] !font-bold !leading-[1.2] !m-0 text-[var(--mk-ink-900)] tracking-[-0.01em]">
          {title}
        </h2>
        <p className="text-[12px] font-medium text-[var(--mk-ink-500)] mt-1 leading-[1.5]">
          Stock levels across every variant — search, adjust, reserve/release, and bulk-update from here.
        </p>
      </div>

      {/* INFO BANNER */}
      <div className="flex items-start gap-2 px-[12px] py-[10px] rounded-[10px] bg-[var(--mk-info-bg)] border border-[#C9DBFA] text-[#1D4ED8] text-[12px] leading-[1.4]">
        <Info size={13} className="mt-0.5 shrink-0" />
        <div>
          <b>New variants are still created inside a product.</b> Open a row here to update stock, adjust
          quantities, or reserve/release units — or select rows and use Bulk update stock.
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
          onView={(item) => setViewingVariantId(item.id)}
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
          totalItems={activeList.meta?.total ?? 0}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(value) => {
            setItemsPerPage(value);
            setCurrentPage(1);
          }}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          onOpenBulkUpdate={() => setShowBulkUpdate(true)}
        />
      </div>

      {/* STOCK DETAILS DRAWER — real detail + write actions */}
      <InventoryDetailDrawer
        variantId={viewingVariantId}
        open={!!viewingVariantId}
        onClose={() => {
          setViewingVariantId(null);
          dispatch(clearSelectedInventory());
        }}
        onViewProduct={(productId) => {
          setViewingVariantId(null);
          dispatch(clearSelectedInventory());
          setViewingProductId(productId);
        }}
        onMutated={handleRefreshAfterMutation}
      />

      {/* PRODUCT DETAIL DRAWER (cross-navigation target — variants are managed here) */}
      <ProductDetailDrawer
        productId={viewingProductId}
        open={!!viewingProductId}
        onClose={() => setViewingProductId(null)}
        onSaved={handleRefreshAfterMutation}
        onDeleted={handleRefreshAfterMutation}
      />

      {/* BULK STOCK UPDATE */}
      <BulkStockUpdateModal
        open={showBulkUpdate}
        onClose={() => setShowBulkUpdate(false)}
        rows={rows.filter((r) => selectedIds.has(r.id))}
        onDone={() => {
          setShowBulkUpdate(false);
          setSelectedIds(new Set());
          toast.success("Stock updated");
          handleRefreshAfterMutation();
        }}
      />
    </div>
  );
};

export default Variant;
