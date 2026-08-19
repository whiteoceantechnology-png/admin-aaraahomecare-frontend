// Right-side Category Detail drawer — matches ProductDetailDrawer's exact
// visual system (same Drawer shell, fixed footer with Delete/Close/Save) so
// Products and Categories feel like one system. Also doubles as the "Add
// Category" flow (categoryId=null) instead of a separate modal/page. There is
// no separate read-only "view" screen — same as Product, opening a row goes
// straight to the edit form.
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { Trash2, X, Plus } from "lucide-react";

import { updateCategory, addCategory, deleteCategory } from "../../redux/slices/categorySlice";
import { uploadImage } from "../../redux/slices/imageSlice";
import Drawer from "../common/Drawer";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import ImageEditorModal from "../common/ImageEditorModal";

// Same 4MB/image-type check ProductDetailDrawer.jsx applies to its primary
// image — reused verbatim rather than inventing a separate rule for
// Category, per the "identical to Product" requirement.
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const validateImageFile = (file) => {
  if (!file.type.startsWith("image/")) {
    toast.error("Please choose an image file");
    return false;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    toast.error("Image must be less than 4MB");
    return false;
  }
  return true;
};

const FORM_ID = "category-detail-drawer-form";
const imageUrl = (path) => `${import.meta.env.VITE_API_BASE_URL}/admin/images/${path}`;

// h-[35px]/text-[13px]/rounded-[6px] and the arbitrary px-[12px] (Bootstrap's
// same-named px-3 utility ships !important at a different pixel value and
// silently wins over Tailwind's — see filterToolbarStyles.js's cascade-layer
// note) are local to this drawer's Add/Edit form; ProductDetailDrawer.jsx
// has its own separate fldClass, untouched.
const fldClass = (hasError) =>
  `h-[35px] w-full px-[12px] rounded-[6px] border text-[13px] font-medium text-[var(--mk-ink-900)] placeholder:text-[var(--mk-ink-400)] bg-white outline-none transition-colors ${
    hasError
      ? "border-[var(--mk-dgr)] focus:ring-2 focus:ring-[var(--mk-dgr)]/15"
      : "border-[var(--mk-line)] focus:ring-2 focus:ring-[var(--mk-primary-ring)] focus:border-[var(--mk-primary)]"
  }`;

const Field = ({ label, error, children }) => (
  <div className="flex flex-col gap-1.5 mb-3.5">
    <label className="text-[12px] font-medium text-[var(--mk-ink-700)]">{label}</label>
    {children}
    {error && <span className="text-[11.5px] font-medium text-[var(--mk-dgr)]">{error}</span>}
  </div>
);

const CategoryDetailDrawer = ({ categoryId, open, onClose, onDeleted }) => {
  const dispatch = useDispatch();
  const { allCategoryList = [] } = useSelector((state) => state.category || {});
  const { products = [] } = useSelector((state) => state.product || {});
  const { loading: imageLoading } = useSelector((state) => state.image || {});

  const [saving, setSaving] = useState(false);
  const [imagePath, setImagePath] = useState("");
  const imageInputRef = useRef(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Same crop-then-upload flow as ProductDetailDrawer.jsx's primary image:
  // picking a file opens ImageEditorModal first (free-form crop/rotate/
  // flip), and only the cropped blob is uploaded — never the raw file.
  const [editorSrc, setEditorSrc] = useState(null);
  const [editorFileName, setEditorFileName] = useState("image.jpg");
  const [primaryPreviewUrl, setPrimaryPreviewUrl] = useState(null);
  const [primaryUploading, setPrimaryUploading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { name: "", isActive: "active" } });

  const isCreate = categoryId == null;
  const category = useMemo(
    () => allCategoryList.find((c) => String(c.id) === String(categoryId)),
    [allCategoryList, categoryId],
  );

  // Still needed for the delete-guard toast in handleDeleteClick below, even
  // though the read-only "Products in this category" list that used to show
  // them has been removed along with the view screen.
  const categoryProducts = useMemo(
    () => products.filter((p) => String(p.categoryId) === String(categoryId)),
    [products, categoryId],
  );

  useEffect(() => {
    if (!open) return;
    // Opening fresh (or switching categories) invalidates any leftover
    // local preview from a previous session — same cleanup
    // ProductDetailDrawer.jsx does on open.
    setPrimaryPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (isCreate) {
      reset({ name: "", isActive: "active" });
      setImagePath("");
    } else if (category) {
      reset({ name: category.name, isActive: category.isActive ? "active" : "inactive" });
      setImagePath(category.categoryImage || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, categoryId]);

  // Opens the crop editor instead of uploading the raw file directly —
  // identical entry point to ProductDetailDrawer.jsx's
  // handlePrimaryImageChange.
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !validateImageFile(file)) return;
    setEditorFileName(file.name || "image.jpg");
    setEditorSrc(URL.createObjectURL(file));
  };

  const closeEditor = () => {
    if (editorSrc) URL.revokeObjectURL(editorSrc);
    setEditorSrc(null);
  };

  // Same immediate-upload-on-Apply flow as ProductDetailDrawer.jsx's
  // handleEditorApply ("primary" branch): the cropped blob is uploaded via
  // the same generic uploadImage thunk right away, with an optimistic local
  // preview shown until the real server path comes back. Save only ever
  // sends whatever imagePath currently holds — the upload itself already
  // happened by the time the admin clicks Save/Add category.
  const handleEditorApply = async (blob) => {
    const finalFile = new File([blob], editorFileName, { type: blob.type });
    closeEditor();

    const localUrl = URL.createObjectURL(blob);
    setPrimaryPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return localUrl;
    });
    setPrimaryUploading(true);
    const res = await dispatch(uploadImage(finalFile));
    setPrimaryUploading(false);
    if (uploadImage.fulfilled.match(res)) {
      setImagePath(res.payload.path);
      setPrimaryPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    } else {
      toast.error(res.payload || "Upload failed — showing your selected image locally, but it hasn't been saved");
    }
  };

  const onFormSubmit = async (data) => {
    const payload = {
      name: data.name,
      categoryImage: imagePath,
      isActive: data.isActive === "active",
    };
    setSaving(true);
    const res = isCreate
      ? await dispatch(addCategory(payload))
      : await dispatch(updateCategory({ id: category.id, data: payload }));
    setSaving(false);

    const success = isCreate ? addCategory.fulfilled.match(res) : updateCategory.fulfilled.match(res);
    if (success) {
      toast.success(isCreate ? "Category added" : "Category updated");
      onClose();
    } else {
      toast.error(res.payload || "Error");
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    const res = await dispatch(deleteCategory(category.id));
    setDeleting(false);
    setDeleteConfirmOpen(false);
    if (deleteCategory.fulfilled.match(res)) {
      toast.success("Category deleted");
      onDeleted?.();
      onClose();
    } else {
      toast.error(res.payload || "Error");
    }
  };

  const handleDeleteClick = () => {
    if (categoryProducts.length > 0) {
      toast.error(
        `Cannot delete "${category.name}" — ${categoryProducts.length} product${categoryProducts.length > 1 ? "s are" : " is"} still assigned. Reassign them first.`,
      );
      return;
    }
    setDeleteConfirmOpen(true);
  };

  const title = isCreate ? "Add category" : `Edit ${category?.name || "category"}`;

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title={title}
        width="max-w-[500px]"
        compact
        headerHeightPx={110}
        titleSizePx={24}
        bodyPaddingXPx={20}
        footerHeightPx={72}
        headerAlignTop
        footer={
          <>
            {!isCreate && category && (
              <button
                type="button"
                onClick={handleDeleteClick}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--mk-ink-500)] hover:text-[var(--mk-dgr)] transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
                Delete category
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              style={{ borderRadius: "6px" }}
              className="h-[36px] px-[16px] !text-[13.5px] font-semibold text-[var(--mk-ink-700)] border border-[var(--mk-line)] bg-white hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form={FORM_ID}
              disabled={saving || imageLoading}
              style={{ borderRadius: "6px" }}
              className="inline-flex items-center justify-center gap-[8px] h-[36px] px-[16px] !text-[13.5px] font-semibold text-white bg-[var(--mk-primary)] hover:bg-[var(--mk-primary-hover)] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isCreate && !saving && <Plus size={16} />}
              {saving ? "Saving..." : isCreate ? "Add category" : "Save changes"}
            </button>
          </>
        }
      >
        <form id={FORM_ID} onSubmit={handleSubmit(onFormSubmit)}>
          <Field label="Category name" error={errors.name?.message}>
            <input
              {...register("name", { required: "Category name is required", minLength: { value: 2, message: "At least 2 characters" } })}
              placeholder="e.g. Essential Oils"
              className={fldClass(errors.name)}
            />
          </Field>

          <Field label="Status">
            <select {...register("isActive")} className={fldClass(false)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>

          <div className="flex flex-col gap-1.5 mb-1">
            <label className="text-[12px] font-medium text-[var(--mk-ink-700)]">Category image</label>
            <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            {/* Identical box to ProductDetailDrawer.jsx's primary image:
                64x64, dashed border, object-cover, hover-fade remove ×
                offset outside the top-right corner, uploading overlay. */}
            {(() => {
              const previewSrc = primaryPreviewUrl || (imagePath ? imageUrl(imagePath) : null);
              return (
                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    aria-label={previewSrc ? "Replace category image" : "Add category image"}
                    title={previewSrc ? "Click to replace" : "Add image"}
                    className="w-16 h-16 rounded-lg border-[1.5px] border-dashed border-[var(--mk-line)] hover:border-[var(--mk-primary)]/40 flex items-center justify-center text-[var(--mk-ink-400)] text-center overflow-hidden cursor-pointer"
                  >
                    {previewSrc ? (
                      <img src={previewSrc} alt="Category" className="w-full h-full object-cover" />
                    ) : (
                      <span className="flex flex-col items-center gap-0.5">
                        <Plus size={16} />
                        <span className="text-[10px] font-medium">Add</span>
                      </span>
                    )}
                  </button>
                  {primaryUploading && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg text-white text-[10px] font-medium pointer-events-none">
                      Uploading…
                    </span>
                  )}
                  {previewSrc && !primaryUploading && (
                    <button
                      type="button"
                      onClick={() => {
                        setPrimaryPreviewUrl((prev) => {
                          if (prev) URL.revokeObjectURL(prev);
                          return null;
                        });
                        setImagePath("");
                      }}
                      aria-label="Remove category image"
                      className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-white text-red-600 shadow-sm border border-gray-200 hover:bg-red-50 transition-colors cursor-pointer !opacity-0 group-hover:!opacity-100"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </form>
      </Drawer>

      <DeleteConfirmationModal
        isOpen={deleteConfirmOpen}
        title="Delete Category?"
        itemName={category?.name}
        loading={deleting}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
      />

      <ImageEditorModal open={!!editorSrc} imageSrc={editorSrc} onCancel={closeEditor} onApply={handleEditorApply} />
    </>
  );
};

export default CategoryDetailDrawer;
