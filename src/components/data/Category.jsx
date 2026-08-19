import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Plus, Upload } from "lucide-react";

import CategoryTable from "../table/CategoryTable";
import CategoryDetailDrawer from "../details/CategoryDetailDrawer";
import { formatDate } from "../../utils/formatDate";

import {
  getAllCategoryList,
  deleteCategory,
  importCategories,
  updateCategory,
} from "../../redux/slices/categorySlice";
import { getAllProducts } from "../../redux/slices/productSlice";

const TableSkeleton = () => (
  <div className="p-4 space-y-3">
    <div className="skeleton h-9 w-full max-w-sm rounded-lg" />
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="skeleton h-14 w-full rounded-lg" />
    ))}
  </div>
);

const Category = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { allCategoryList = [], loading, importing } = useSelector(
    (state) => state.category || {},
  );
  const { products = [] } = useSelector((state) => state.product || {});
  const importInputRef = useRef(null);

  const [catDrawer, setCatDrawer] = useState({ open: false, categoryId: null });
  const [togglingId, setTogglingId] = useState(null);

  const loadData = () => {
    dispatch(getAllCategoryList());
    dispatch(getAllProducts());
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  /* ================= BULK IMPORT ================= */
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const res = await dispatch(importCategories(file));
    if (importCategories.fulfilled.match(res)) {
      toast.success(res.payload?.message || "Categories imported");
      loadData();
    } else {
      toast.error(res.payload || "Import failed");
    }
  };

  /* ================= TOGGLE STATUS ================= */
  // Reuses the exact same updateCategory → PUT /admin/categories/{id} call
  // the edit-category form already sends `isActive` through — no new API.
  const handleToggleStatus = async (item, nextActive) => {
    setTogglingId(item.id);
    const res = await dispatch(updateCategory({ id: item.id, data: { isActive: nextActive } }));
    setTogglingId(null);

    if (updateCategory.fulfilled.match(res)) {
      toast.success(`${item.name} marked ${nextActive ? "Active" : "Inactive"}`);
    } else {
      toast.error(res.payload || "Failed to update status");
    }
  };

  /* ================= DELETE ================= */
  const handleDelete = async (id) => {
    const res = await dispatch(deleteCategory(id));

    if (deleteCategory.fulfilled.match(res)) {
      toast.success("Deleted");
    } else {
      toast.error(res.payload || "Error");
    }
  };

  /* ================= PRODUCT COUNTS (real, cross-referenced) ================= */
  const productCountByCategory = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      const key = p.categoryId;
      if (key == null) return;
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [products]);

  /* ================= FORMAT ================= */
  const formattedData = allCategoryList.map((item) => ({
    id: item.id,
    name: item.name,
    image: item.categoryImage,
    createdAt: formatDate(item.createdAt),
    updatedAt: formatDate(item.updatedAt),
    status: item.isActive ? "active" : "inactive",
    productsCount: productCountByCategory[item.id] ?? 0,
  }));

  return (
    <div className="space-y-5">
      {/* HEADER — title + subtitle share one line (reference layout); the
          "..." menu is gone (not in the reference) but Bulk Import isn't
          removed, just relocated into the table toolbar as a compact icon
          button next to Export. */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-baseline gap-3 min-w-0">
          <h1 className="!text-[24px] !font-bold !leading-[1.2] !m-0 text-[var(--mk-ink-900)] tracking-[-0.01em] shrink-0">
            Categories
          </h1>
          <p className="text-[13px] font-medium text-[var(--mk-ink-500)] leading-[1.4] truncate">
            Organize and manage your product categories efficiently.
          </p>
        </div>

        <input
          ref={importInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleImportFile}
        />

        <button
          type="button"
          onClick={() => setCatDrawer({ open: true, categoryId: null })}
          style={{ borderRadius: "6px" }}
          className="inline-flex h-[36px] items-center justify-center gap-[8px] px-[18px] !text-[13.5px] font-bold text-white bg-[var(--mk-primary)] hover:bg-[var(--mk-primary-hover)] shadow-sm active:scale-[0.98] transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus size={16} />
          Add Category
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border border-[var(--mk-line)] overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : (
          <CategoryTable
            data={formattedData}
            title="Category"
            onEdit={(item) => setCatDrawer({ open: true, categoryId: item.id })}
            onDelete={handleDelete}
            onAddNew={() => setCatDrawer({ open: true, categoryId: null })}
            onView={(item) => setCatDrawer({ open: true, categoryId: item.id })}
            onViewProducts={() => navigate("/product")}
            onToggleStatus={handleToggleStatus}
            togglingId={togglingId}
            onBulkImportClick={() => importInputRef.current?.click()}
            importing={importing}
          />
        )}
      </div>

      {/* CATEGORY EDIT / CREATE DRAWER — no separate read-only view screen,
          same as Product: opening a row goes straight to the edit form. */}
      <CategoryDetailDrawer
        categoryId={catDrawer.categoryId}
        open={catDrawer.open}
        onClose={() => setCatDrawer({ open: false, categoryId: null })}
        onDeleted={loadData}
      />
    </div>
  );
};

export default Category;
