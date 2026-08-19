import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { Plus } from "lucide-react";

import {
  getAllBrands,
  addBrand,
  updateBrand,
  deleteBrand,
} from "../../redux/slices/brandSlice";
import { getAllProducts } from "../../redux/slices/productSlice";

import BrandTable from "../table/BrandTable";
import BrandForm from "../form/BrandForm";
import Modal from "../common/Modal";
import Breadcrumb from "../common/Breadcrumb";
import { formatDate } from "../../utils/formatDate";

const TableSkeleton = () => (
  <div className="p-4 space-y-3">
    <div className="skeleton h-9 w-full max-w-sm rounded-lg" />
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="skeleton h-14 w-full rounded-lg" />
    ))}
  </div>
);

const Brand = () => {
  const dispatch = useDispatch();
  const { brands = [], loading } = useSelector((state) => state.brand || {});
  const { products = [] } = useSelector((state) => state.product || {});

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ id: null, name: "", logoUrl: "" });

  const loadData = () => {
    dispatch(getAllBrands());
    dispatch(getAllProducts());
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const isEdit = Boolean(formData.id);

  /* ADD */
  const handleAddData = async ({ data }) => {
    setSubmitting(true);
    const res = await dispatch(addBrand(data));
    setSubmitting(false);

    if (addBrand.fulfilled.match(res)) {
      toast.success("Brand added");
      setShowForm(false);
    } else {
      toast.error(res.payload || "Error");
    }
  };

  /* UPDATE */
  const handleUpdateData = async ({ id, data }) => {
    setSubmitting(true);
    const res = await dispatch(updateBrand({ id, data }));
    setSubmitting(false);

    if (updateBrand.fulfilled.match(res)) {
      toast.success("Brand updated");
      setShowForm(false);
    } else {
      toast.error(res.payload || "Error");
    }
  };

  /* DELETE */
  const handleDelete = async (id) => {
    const res = await dispatch(deleteBrand(id));

    if (deleteBrand.fulfilled.match(res)) {
      toast.success("Brand deleted");
    } else {
      toast.error(res.payload || "Error");
    }
  };

  /* EDIT */
  const handleEdit = (item) => {
    setFormData({ id: item.id, name: item.name, logoUrl: item.logoUrl });
    setShowForm(true);
  };

  /* ADD NEW */
  const handleAddNew = () => {
    setFormData({ id: null, name: "", logoUrl: "" });
    setShowForm(true);
  };

  /* PRODUCT COUNTS (real, cross-referenced) */
  const productCountByBrand = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      const key = p.brandId;
      if (key == null) return;
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [products]);

  const formattedData = brands.map((item) => ({
    id: item.id,
    name: item.name,
    logoUrl: item.logoUrl,
    createdAt: formatDate(item.createdAt),
    status: item.isActive ? "active" : "inactive",
    productsCount: productCountByBrand[item.id] ?? 0,
  }));

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="space-y-2.5">
        <Breadcrumb
          items={[
            { label: "Dashboard", to: "/" },
            { label: "Catalog" },
            { label: "Brands" },
          ]}
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-[20px] lg:text-[34px] font-bold text-gray-900 tracking-[-0.02em] leading-[1.2]">
              Brand Management
            </h1>
            <p className="text-[15px] font-medium text-gray-500 mt-1.5 leading-[1.6]">
              Manage the brands your products are tagged with.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddNew}
            className="inline-flex items-center gap-2 h-12 px-5 rounded-xl text-[14px] font-semibold text-white bg-gradient-to-r from-[var(--brand-purple)] to-[var(--brand-purple-dark)] shadow-sm hover:brightness-110 active:scale-[0.98] transition-all duration-200 cursor-pointer whitespace-nowrap"
          >
            <Plus size={16} />
            Add Brand
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[var(--shadow-card)] overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : (
          <BrandTable
            data={formattedData}
            title="Brand"
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddNew={handleAddNew}
            onRefresh={loadData}
          />
        )}
      </div>

      {/* MODAL */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={isEdit ? "Edit Brand" : "Add Brand"}
        maxWidth="max-w-lg"
      >
        <BrandForm
          defaultValues={formData}
          loading={submitting}
          onSubmit={isEdit ? handleUpdateData : handleAddData}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
};

export default Brand;
