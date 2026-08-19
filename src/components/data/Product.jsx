import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { Upload, Boxes } from "lucide-react";
import {
  getAllProducts,
  deleteProduct,
  importProducts,
  updateProduct,
} from "../../redux/slices/productSlice";
import { getAllCategoryList } from "../../redux/slices/categorySlice";
import { importVariants } from "../../redux/slices/variantSlice";
import {
  fetchVariantsTemplate,
  fetchVariantsExport,
} from "../../redux/slices/variantApi";
import ProductTable from "../table/ProductTable";
import ProductDetailDrawer from "../details/ProductDetailDrawer";
import BulkImportModal from "../common/BulkImportModal";
import api from "../../utils/api";
import { toast } from "react-hot-toast";

const Product = ({ title = "Products" }) => {
  const dispatch = useDispatch();

  const {
    products = [],
    loading,
    importing,
  } = useSelector((state) => state.product);
  const { allCategoryList = [] } = useSelector((state) => state.category || {});
  const importInputRef = useRef(null);

  const [drawer, setDrawer] = useState({ open: false, productId: null });
  const [showVariantImport, setShowVariantImport] = useState(false);

  // List filters (category/status/search/page) live in the URL — not in
  // ProductTable's local state — so they survive both a save-triggered
  // refetch and a hard page refresh, and are entirely independent of the
  // edit drawer's own open/closed state.
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get("search") || "";
  const statusFilter = searchParams.get("status") || "all";
  const currentPage = Number(searchParams.get("page")) || 1;
  // categoryId absent = "all categories" (default); present-but-empty =
  // deliberately cleared to none; otherwise a comma-separated id list.
  const categoryIdParam = searchParams.get("categoryId");
  const selectedCategoryIds =
    categoryIdParam === null
      ? new Set(allCategoryList.map((c) => String(c.id)))
      : categoryIdParam === ""
        ? new Set()
        : new Set(categoryIdParam.split(","));

  const handleSearchChange = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("search", value);
    else next.delete("search");
    next.set("page", "1");
    setSearchParams(next, { replace: true });
  };

  const handleCategoryChange = (nextSet) => {
    const next = new URLSearchParams(searchParams);
    if (allCategoryList.length > 0 && nextSet.size === allCategoryList.length) {
      next.delete("categoryId");
    } else {
      next.set("categoryId", Array.from(nextSet).join(","));
    }
    next.set("page", "1");
    setSearchParams(next, { replace: true });
  };

  const handleStatusChange = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== "all") next.set("status", value);
    else next.delete("status");
    next.set("page", "1");
    setSearchParams(next, { replace: true });
  };

  const handlePageChange = (page) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(page));
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    dispatch(getAllProducts());
    dispatch(getAllCategoryList());
  }, [dispatch]);

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const res = await dispatch(importProducts(file));
    if (importProducts.fulfilled.match(res)) {
      toast.success(res.payload?.message || "Products imported");
      dispatch(getAllProducts());
    } else {
      toast.error(res.payload || "Import failed");
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get("/admin/masterdata/products/export", {
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "products_export.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to export products");
    }
  };

  const handleDelete = async (id) => {
    const res = await dispatch(deleteProduct(id));
    if (deleteProduct.fulfilled.match(res)) {
      toast.success("Product deleted");
    } else {
      toast.error(res.payload || "Error");
    }
  };

  // Reuses the existing updateProduct → PUT /admin/products/{id} call (same
  // endpoint the Add/Edit drawer already saves through) — no new API. The
  // confirmation itself lives in ProductTable.jsx; this only runs after the
  // admin has explicitly confirmed the change.
  const handleToggleStatus = async (item, nextStatus) => {
    const res = await dispatch(
      updateProduct({ id: item.id, data: { status: nextStatus } }),
    );
    if (updateProduct.fulfilled.match(res)) {
      toast.success(
        `${item.name} marked ${nextStatus ? "In Stock" : "Out of Stock"}`,
      );
    } else {
      toast.error(res.payload || "Failed to update status");
    }
  };

  const handleBulkDelete = async (ids) => {
    const results = await Promise.all(
      ids.map((id) => dispatch(deleteProduct(id))),
    );
    const failed = results.filter(
      (res) => !deleteProduct.fulfilled.match(res),
    ).length;
    if (failed === 0) {
      toast.success(
        `${ids.length} product${ids.length > 1 ? "s" : ""} deleted`,
      );
    } else {
      toast.error(`${failed} of ${ids.length} could not be deleted`);
    }
  };

  const handleUploadVariants = async (file) => {
    const res = await dispatch(importVariants(file));
    if (importVariants.fulfilled.match(res)) {
      dispatch(getAllProducts());
      return res.payload;
    }
    throw res.payload || "Failed to upload variants";
  };

  const handleDownloadVariantsTemplate = async () => {
    const res = await fetchVariantsTemplate();
    return res.data;
  };

  const handleExportVariants = async () => {
    const res = await fetchVariantsExport();
    return res.data;
  };

  const openEdit = (item) => setDrawer({ open: true, productId: item.id });
  const openNew = () => setDrawer({ open: true, productId: null });
  const closeDrawer = () => setDrawer({ open: false, productId: null });

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[12px]">
        <div>
          <h2 className="!text-[22px] !font-bold !leading-[1.2] !m-0 text-[var(--mk-ink-900)] tracking-[-0.01em]">
            {title}
          </h2>
          <p className="text-[12.5px] font-medium text-[var(--mk-ink-500)] mt-0.5 leading-[1.5]">
            Manage the products available in your store.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportFile}
          />
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            disabled={importing}
            className="inline-flex h-[36px] items-center justify-center gap-[8px] px-[18px] rounded-md !text-[13.5px] font-semibold text-[var(--mk-ink-700)] bg-white border border-[var(--mk-line)] hover:border-[#C9CFDA] hover:text-[var(--mk-ink-900)] active:scale-[0.98] transition-all duration-200 cursor-pointer whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ borderRadius: "8px" }} >
            <Upload size={16} />
            {importing ? "Importing..." : "Bulk Import"}
          </button>

          <button
            type="button"
            onClick={() => setShowVariantImport(true)}
            className="inline-flex h-[36px] items-center justify-center gap-[8px] px-[18px] rounded-md !text-[13.5px] font-semibold text-[var(--mk-ink-700)] bg-white border border-[var(--mk-line)] hover:border-[#C9CFDA] hover:text-[var(--mk-ink-900)] active:scale-[0.98] transition-all duration-200 cursor-pointer whitespace-nowrap"
            style={{ borderRadius: "8px" }}
          >
            <Boxes size={16} />
            Bulk Import Variants
          </button>

          <button
            type="button"
            onClick={openNew}
            className="inline-flex h-[36px] items-center justify-center gap-[8px] px-[18px] rounded-md !text-[13.5px] font-semibold text-white bg-[var(--mk-primary)] hover:bg-[var(--mk-primary-hover)] shadow-sm active:scale-[0.98] transition-all duration-200 cursor-pointer whitespace-nowrap"
         style={{ borderRadius: "8px" }} >
            Add Product
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border border-[var(--mk-line)] overflow-hidden">
        {loading && products.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            Loading products…
          </div>
        ) : (
          <ProductTable
            data={products}
            categories={allCategoryList}
            title={title}
            onEdit={openEdit}
            onDelete={handleDelete}
            onBulkDelete={handleBulkDelete}
            onExport={handleExport}
            onToggleStatus={handleToggleStatus}
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            selectedCategoryIds={selectedCategoryIds}
            onCategoryChange={handleCategoryChange}
            statusFilter={statusFilter}
            onStatusChange={handleStatusChange}
            currentPage={currentPage}
            onPageChange={handlePageChange}
          />
        )}
      </div>

      {/* PRODUCT DETAIL / EDIT / ADD DRAWER (one drawer, matches mockup) */}
      <ProductDetailDrawer
        productId={drawer.productId}
        open={drawer.open}
        onClose={closeDrawer}
        onSaved={() => dispatch(getAllProducts())}
        onDeleted={() => dispatch(getAllProducts())}
      />

      {/* BULK IMPORT VARIANTS — same drawer/modal pattern as Product's own import */}
      <BulkImportModal
        open={showVariantImport}
        onClose={() => setShowVariantImport(false)}
        title="Bulk Import Variants"
        onDownloadTemplate={handleDownloadVariantsTemplate}
        onUpload={handleUploadVariants}
        onExport={handleExportVariants}
        templateFilename="variants_template.xlsx"
        exportFilename="variants_export.xlsx"
      />
    </div>
  );
};

export default Product;
