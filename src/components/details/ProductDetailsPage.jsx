// src/components/details/ProductDetailsPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  Package,
  Tag,
  Receipt,
  Boxes,
  Star,
  Calendar,
  Clock,
  Layers,
  Images,
  UploadCloud,
  X,
  ClipboardList,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import {
  getProductById,
  addProductImage,
  deleteProductImage,
  saveProductSpecification,
  deleteProductSpecification,
} from "../../redux/slices/productSlice";
import { uploadImage } from "../../redux/slices/imageSlice";
import Breadcrumb from "../common/Breadcrumb";
import InfoCard from "../common/InfoCard";
import StatusBadge from "../common/StatusBadge";
import EmptyState from "../common/EmptyState";
import Skeleton from "../common/Skeleton";
import Modal from "../common/Modal";
import IconButton from "../common/IconButton";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import ProductDocumentsCard from "./ProductDocumentsCard";
import { formatDate } from "../../utils/formatDate";

const imageUrl = (path) =>
  `${import.meta.env.VITE_API_BASE_URL}/admin/images/${path}`;

const Row = ({ label, value, valueClass = "" }) => (
  <div className="flex items-center justify-between py-1.5">
    <span className="text-[14px] text-gray-500">{label}</span>
    <span
      className={`text-[14px] font-medium text-gray-800 text-right ${valueClass}`}
    >
      {value ?? "—"}
    </span>
  </div>
);

const ProductDetailsPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { singleProduct: product, loading } = useSelector(
    (state) => state.product || {},
  );
  const { loading: imageUploading } = useSelector((state) => state.image || {});

  const fileInputRef = useRef(null);
  const [uploadingGalleryImage, setUploadingGalleryImage] = useState(false);
  const [deleteImageTarget, setDeleteImageTarget] = useState(null);
  const [deletingImage, setDeletingImage] = useState(false);

  const [showSpecForm, setShowSpecForm] = useState(false);
  const [specRows, setSpecRows] = useState([{ key: "", value: "" }]);
  const [savingSpec, setSavingSpec] = useState(false);
  const [deletingSpec, setDeletingSpec] = useState(false);
  const [confirmDeleteSpec, setConfirmDeleteSpec] = useState(false);

  const refetchProduct = () => dispatch(getProductById(id));

  useEffect(() => {
    refetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, id]);

  const productVariants = useMemo(() => product?.variants || [], [product]);
  const productImages = useMemo(() => product?.images || [], [product]);
  const specItems = useMemo(
    () => (product?.specifications?.length ? product.specifications : product?.specItems) || [],
    [product],
  );

  const hasDiscount =
    product && Number(product.actualPrice) > Number(product.discountPrice);

  /* ================= IMAGES ================= */
  const handleGalleryFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadingGalleryImage(true);
    const uploadRes = await dispatch(uploadImage(file));
    if (uploadImage.fulfilled.match(uploadRes)) {
      const addRes = await dispatch(
        addProductImage({
          productId: id,
          data: { path: uploadRes.payload.path },
        }),
      );
      if (addProductImage.fulfilled.match(addRes)) {
        toast.success("Image added");
        refetchProduct();
      } else {
        toast.error(addRes.payload || "Failed to add image");
      }
    } else {
      toast.error(uploadRes.payload || "Upload failed");
    }
    setUploadingGalleryImage(false);
  };

  const handleConfirmDeleteImage = async () => {
    if (!deleteImageTarget) return;
    setDeletingImage(true);
    const res = await dispatch(deleteProductImage(deleteImageTarget.id));
    setDeletingImage(false);
    if (deleteProductImage.fulfilled.match(res)) {
      toast.success("Image deleted");
      refetchProduct();
    } else {
      toast.error(res.payload || "Failed to delete image");
    }
    setDeleteImageTarget(null);
  };

  /* ================= SPECIFICATIONS ================= */
  const openSpecForm = () => {
    setSpecRows(
      specItems.length
        ? specItems.map((s) => ({ key: s.key ?? s.name ?? "", value: s.value ?? "" }))
        : [{ key: "", value: "" }],
    );
    setShowSpecForm(true);
  };

  const handleSpecRowChange = (index, field, value) => {
    setSpecRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  };

  const addSpecRow = () => setSpecRows((prev) => [...prev, { key: "", value: "" }]);

  const removeSpecRow = (index) =>
    setSpecRows((prev) => prev.filter((_, i) => i !== index));

  const handleSaveSpecifications = async (e) => {
    e.preventDefault();
    const cleaned = specRows
      .map((row) => ({ key: row.key.trim(), value: row.value.trim() }))
      .filter((row) => row.key);

    setSavingSpec(true);
    const res = await dispatch(
      saveProductSpecification({
        productId: id,
        data: { specifications: cleaned },
      }),
    );
    setSavingSpec(false);

    if (saveProductSpecification.fulfilled.match(res)) {
      toast.success("Specifications saved");
      setShowSpecForm(false);
      refetchProduct();
    } else {
      toast.error(res.payload || "Failed to save specifications");
    }
  };

  const handleDeleteSpecifications = async () => {
    setDeletingSpec(true);
    const res = await dispatch(deleteProductSpecification(id));
    setDeletingSpec(false);
    setConfirmDeleteSpec(false);

    if (deleteProductSpecification.fulfilled.match(res)) {
      toast.success("Specifications deleted");
      refetchProduct();
    } else {
      toast.error(res.payload || "Failed to delete specifications");
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2.5">
        <Breadcrumb
          items={[
            { label: "Dashboard", to: "/" },
            { label: "Products", to: "/product" },
            { label: "Product Details" },
          ]}
        />
        <button
          type="button"
          onClick={() => navigate("/product")}
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-gray-500 hover:text-[var(--brand-purple)] transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back to Products
        </button>
      </div>

      {loading && !product ? (
        <div className="space-y-5">
          <Skeleton className="h-64 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Skeleton className="h-40 lg:col-span-2" />
            <Skeleton className="h-40" />
          </div>
        </div>
      ) : !product ? (
        <InfoCard>
          <EmptyState
            icon={Package}
            title="Product not found"
            description="This product may have been removed, or the link is invalid."
          />
        </InfoCard>
      ) : (
        <>
          {/* HEADER */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[var(--shadow-card)] p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-52 shrink-0">
                {product.productImage ? (
                  <img
                    src={imageUrl(product.productImage)}
                    alt={product.name}
                    className="w-full h-52 object-cover rounded-2xl border border-gray-100"
                  />
                ) : (
                  <div className="w-full h-52 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-300">
                    <Package size={32} />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-[20px] font-bold text-gray-900 tracking-[-0.02em]">
                    {product.name}
                  </h1>
                  <StatusBadge
                    status={product.status ? "Active" : "Inactive"}
                  />
                </div>

                <div className="mt-2 flex flex-wrap items-baseline gap-2.5">
                  <span className="text-[20px] font-bold text-gray-900">
                    ₹{product.discountPrice}
                  </span>
                  {hasDiscount && (
                    <span className="text-[15px] text-gray-400 line-through">
                      ₹{product.actualPrice}
                    </span>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[14px] text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <Layers size={14} className="text-gray-400" />
                    Category: {product.category?.name || "—"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Receipt size={14} className="text-gray-400" />
                    Tax:{" "}
                    {product.taxPercent != null
                      ? `${product.taxPercent}%`
                      : "—"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Tag size={14} className="text-gray-400" />
                    HSN Code: {product.hsnCode || "—"}
                  </span>
                  {product.avgRating != null && (
                    <span className="flex items-center gap-1.5">
                      <Star
                        size={14}
                        className="text-amber-400 fill-amber-400"
                      />
                      {product.avgRating}{" "}
                      {product.reviewCount != null &&
                        `(${product.reviewCount} reviews)`}
                    </span>
                  )}
                </div>

                {product.description && (
                  <p className="mt-4 text-[14px] text-gray-600 leading-relaxed">
                    {product.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* DETAILS / META */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <InfoCard title="Pricing & Tax" icon={Receipt}>
              <Row label="Actual Price" value={`₹${product.actualPrice}`} />
              <Row label="Discount Price" value={`₹${product.discountPrice}`} />
              <Row
                label="Tax %"
                value={
                  product.taxPercent != null ? `${product.taxPercent}%` : "—"
                }
              />
              <Row label="HSN Code" value={product.hsnCode} />
            </InfoCard>

            <InfoCard title="Category & Brand" icon={Layers}>
              <Row label="Category" value={product.category?.name} />
              {/* <Row label="Brand" value={product.brand?.name} /> */}
              <Row
                label="Status"
                value={
                  <StatusBadge
                    status={product.status ? "Active" : "Inactive"}
                  />
                }
              />
            </InfoCard>

            <InfoCard title="Timestamps" icon={Calendar}>
              <Row label="Created" value={formatDate(product.createdAt)} />
              <Row label="Updated" value={formatDate(product.updatedAt)} />
            </InfoCard>
          </div>

          {/* IMAGES */}
          <InfoCard
            title={`Images (${productImages.length})`}
            icon={Images}
            actions={
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleGalleryFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingGalleryImage || imageUploading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium text-[var(--brand-purple)] bg-[var(--brand-purple)]/8 hover:bg-[var(--brand-purple)]/14 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <UploadCloud size={14} />
                  {uploadingGalleryImage || imageUploading ? "Uploading..." : "Add Image"}
                </button>
              </>
            }
          >
            {productImages.length === 0 ? (
              <EmptyState icon={Images} title="No additional images for this product" />
            ) : (
              <div className="flex flex-wrap gap-3">
                {productImages.map((img) => (
                  <div key={img.id} className="relative group">
                    <img
                      src={imageUrl(img.path)}
                      alt="Product"
                      className="w-24 h-24 rounded-xl object-cover border border-gray-100"
                    />
                    <button
                      type="button"
                      onClick={() => setDeleteImageTarget(img)}
                      aria-label="Delete image"
                      className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-6 h-6 rounded-full bg-white text-red-600 shadow-sm border border-gray-200 hover:bg-red-50 transition-colors cursor-pointer !opacity-0 group-hover:!opacity-100"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </InfoCard>

          {/* VARIANTS */}
          <InfoCard title={`Variants (${productVariants.length})`} icon={Boxes}>
            {productVariants.length === 0 ? (
              <EmptyState icon={Boxes} title="No variants for this product" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {productVariants.map((v) => (
                  <div
                    key={v.id}
                    className="rounded-xl border border-gray-100 p-3.5 hover:shadow-[var(--shadow-card-hover)] transition-shadow duration-300"
                  >
                    <div className="flex items-center gap-3">
                      {v.isColor && v.variantColor ? (
                        <span
                          className="w-11 h-11 rounded-lg border border-gray-100 shrink-0"
                          style={{ backgroundColor: v.variantColor }}
                          title={v.variantColor}
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-300 shrink-0">
                          <Boxes size={16} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-gray-800 truncate">
                          {v.variantName}
                        </p>
                        <p className="text-[12px] text-gray-400">
                          SKU: {v.sku || "—"}
                          {v.packSize?.label ? ` · ${v.packSize.label}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[14px] font-semibold text-gray-900">
                          ₹{v.discountPrice ?? v.price}
                        </span>
                        {v.discountPrice != null &&
                          Number(v.price) > Number(v.discountPrice) && (
                            <span className="text-[12px] text-gray-400 line-through">
                              ₹{v.price}
                            </span>
                          )}
                      </div>
                      <span className="text-[12px] font-medium text-gray-500">
                        Stock: {v.stockQuantity ?? "—"}
                        {v.reservedQuantity != null &&
                          ` (${v.reservedQuantity} reserved)`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </InfoCard>

          {/* SPECIFICATIONS */}
          <InfoCard
            title={`Specifications (${specItems.length})`}
            icon={ClipboardList}
            actions={
              <div className="flex items-center gap-2">
                <IconButton
                  icon={Pencil}
                  label="Edit specifications"
                  tone="purple"
                  onClick={openSpecForm}
                />
                {specItems.length > 0 && (
                  <IconButton
                    icon={Trash2}
                    label="Delete all specifications"
                    tone="red"
                    onClick={() => setConfirmDeleteSpec(true)}
                  />
                )}
              </div>
            }
          >
            {specItems.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No specifications added yet"
                description="Add key details like weight, material, or dimensions."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                {specItems.map((s, i) => (
                  <Row
                    key={s.id ?? `${s.key ?? s.name}-${i}`}
                    label={s.key ?? s.name}
                    value={s.value}
                  />
                ))}
              </div>
            )}
          </InfoCard>

          {/* TECHNICAL DOCUMENTS — self-contained: fetches, uploads, edits and
              deletes its own records, and refreshes the list after each write. */}
          <ProductDocumentsCard productId={id} />
        </>
      )}

      {/* DELETE IMAGE CONFIRM */}
      <DeleteConfirmationModal
        isOpen={!!deleteImageTarget}
        title="Delete Image?"
        itemName="this image"
        loading={deletingImage}
        onCancel={() => setDeleteImageTarget(null)}
        onConfirm={handleConfirmDeleteImage}
      />

      {/* DELETE SPECIFICATIONS CONFIRM */}
      <DeleteConfirmationModal
        isOpen={confirmDeleteSpec}
        title="Delete All Specifications?"
        itemName="all specifications for this product"
        loading={deletingSpec}
        onCancel={() => setConfirmDeleteSpec(false)}
        onConfirm={handleDeleteSpecifications}
      />

      {/* EDIT SPECIFICATIONS */}
      <Modal
        open={showSpecForm}
        onClose={() => setShowSpecForm(false)}
        title="Edit Specifications"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveSpecifications} className="space-y-4">
          <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
            {specRows.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Key (e.g. Weight)"
                  value={row.key}
                  onChange={(e) => handleSpecRowChange(i, "key", e.target.value)}
                  className="w-1/3 px-3 py-2 rounded-lg border border-gray-200 text-[13px] font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand-purple)]/25 focus:border-[var(--brand-purple)]"
                />
                <input
                  type="text"
                  placeholder="Value (e.g. 500g)"
                  value={row.value}
                  onChange={(e) => handleSpecRowChange(i, "value", e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-[13px] font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand-purple)]/25 focus:border-[var(--brand-purple)]"
                />
                <button
                  type="button"
                  onClick={() => removeSpecRow(i)}
                  aria-label="Remove row"
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addSpecRow}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--brand-purple)] hover:text-[var(--brand-purple-dark)] transition-colors cursor-pointer"
          >
            <Plus size={14} />
            Add Row
          </button>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowSpecForm(false)}
              className="px-4 py-2.5 h-12 rounded-xl text-[14px] font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingSpec}
              className="px-4 py-2.5 h-12 rounded-xl text-[14px] font-semibold text-white bg-gradient-to-r from-[var(--brand-purple)] to-[var(--brand-purple-dark)] shadow-sm hover:brightness-110 active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:brightness-100"
            >
              {savingSpec ? "Saving..." : "Save Specifications"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProductDetailsPage;
