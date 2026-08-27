// Right-side Product Detail drawer — matches the approved mockup
// (aaraa-admin-redesign.html) exactly: a single always-editable drawer (no
// separate view/edit toggle) with a fixed header, one scrollable body, and a
// fixed footer (Delete product / Close / Save changes). Also doubles as the
// "Add Product" flow (productId=null) instead of a separately-designed form.
//
// Real field set is a strict superset of the mockup's simplified prototype:
// the mockup's product model has no brand/price fields (price lives only on
// variants there), but this app's Product entity requires brandId,
// actualPrice and discountPrice — those stay, styled to match.
import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import {
  X,
  Plus,
  Trash2,
  AlertTriangle,
  Boxes,
  Eye,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import {
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct,
  deleteProductImage,
  saveProductSpecification,
  getProductDocuments,
  addProductDocument,
  updateProductDocument,
  deleteProductDocument,
} from "../../redux/slices/productSlice";
import { getAllCategoryList } from "../../redux/slices/categorySlice";
import { getAllTaxes } from "../../redux/slices/taxSlice";
import { getAllBrands } from "../../redux/slices/brandSlice";
import { uploadImage } from "../../redux/slices/imageSlice";
import {
  addVariant,
  updateVariant,
  deleteVariant,
} from "../../redux/slices/variantSlice";

import Drawer from "../common/Drawer";
import Modal from "../common/Modal";
import IconButton from "../common/IconButton";
import ImageEditorModal from "../common/ImageEditorModal";
import RichTextEditor from "../common/RichTextEditor";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import VariantLadderEditor from "../form/VariantLadderEditor";
import ProductVariantEditor from "../form/ProductVariantEditor";
import { productHealth } from "../../utils/productHealth";
import {
  inferSizeSystemFromVariants,
  ladderBadgeLabel,
  findExistingVariantForStep,
  parseVariantLabel,
  baseQty,
  // Aliased: `unitFamily` is also used as a callback parameter name further
  // down this file, and shadowing it would turn these into a runtime crash.
  unitFamily as unitFamilyOf,
} from "../../utils/variantSizeSystems";

const FORM_ID = "product-detail-drawer-form";

// Deliberately identical to Drawer.jsx's own close-button classes (plus a
// disabled state) so the record navigator reads as part of the existing
// header rather than as newly-styled chrome.
const NAV_BTN_CLASS =
  "flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400";

// Same money format the variants table has always displayed.
const fmtMoney = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const imageUrl = (path) =>
  `${import.meta.env.VITE_API_BASE_URL}/admin/images/${path}`;

const normalizeProductImages = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value) return [value];
  return [];
};

// Fixed two-slot document set — the API's `documentType` field accepts "COA"
// and "SDS" (confirmed against the real dev API); the second slot is
// labeled "SDS / MSDS" in the UI since that's the paperwork admins actually
// search for, but it's always saved under the single "SDS" type.
const DOCUMENT_TYPES = [
  { type: "COA", label: "COA" },
  { type: "SDS", label: "SDS / MSDS" },
];

// GST slab dropdown offers exactly these two slabs, in this order. The tax
// master (GET /admin/taxes) still holds the other rows (0%, 12%, 28%) and may
// hold more than one row for the same percentage — both are filtered out when
// the options are built, so the dropdown shows one 5% and one 18% entry and
// nothing else. Nothing here edits the tax master itself; taxes already
// assigned to existing products stay assigned.
const GST_SLAB_PERCENTS = [5, 18];

// Category-driven GST/HSN defaults are read straight off the category record
// GET /admin/categories returns. This admin never writes those two fields
// (CategoryDetailDrawer only sends name/categoryImage/isActive), so the
// category master is their single source of truth and a category that has
// nothing configured must resolve to null here — never to a guessed slab, a
// zero, or a whitespace string that would look configured downstream.
//
// The alternate key names are accepted because the category payload's exact
// naming for these two isn't pinned down anywhere in this codebase; once the
// API settles on one, narrow these to it.
const categoryHsnCode = (category) => {
  const raw = category?.hsnCode ?? category?.hsn_code ?? category?.hsn;
  const value = raw == null ? "" : String(raw).trim();
  return value || null;
};

const categoryGstPercent = (category) => {
  const raw =
    category?.taxPercent ??
    category?.gstPercent ??
    category?.gst ??
    category?.tax?.percent;
  if (raw == null || raw === "") return null;
  const value = Number(raw);
  return Number.isNaN(value) ? null : value;
};

const STOCK_UNIT_OPTIONS = ["KG", "G", "L", "ML", "UNIT"];
const unitFamilyForStockUnit = (unit) =>
  unit === "UNIT" ? "unit" : unit === "ML" || unit === "L" ? "ml" : "kg";

const formatBytes = (bytes) => {
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
};

// Lucide has no dedicated PDF glyph, so this recreates the familiar
// red/white "PDF file" badge from a generic FileText icon + a label strip.
const PdfFileIcon = () => (
  <div className="relative w-12 h-14 rounded-lg border border-[var(--mk-line)] bg-white shrink-0 flex flex-col items-center justify-center overflow-hidden">
    <FileText size={22} strokeWidth={1.75} className="text-red-500 mt-1" />
    <span className="absolute bottom-0 inset-x-0 bg-red-600 text-white text-[8px] font-bold text-center leading-[14px] tracking-wide">
      PDF
    </span>
  </div>
);

const fldClass = (hasError) =>
  `h-10 w-full px-[12px] rounded-lg border text-[14px] font-medium text-[var(--mk-ink-900)] placeholder:text-[var(--mk-ink-400)] bg-white outline-none transition-colors ${
    hasError
      ? "border-[var(--mk-dgr)] focus:ring-2 focus:ring-[var(--mk-dgr)]/15"
      : "border-[var(--mk-line)] focus:ring-2 focus:ring-[var(--mk-primary-ring)] focus:border-[var(--mk-primary)]"
  }`;

const Field = ({ label, help, error, children }) => (
  <div className="flex flex-col gap-1.5 mb-3.5">
    <label className="text-[12.5px] font-medium text-[var(--mk-ink-700)]">
      {label}
    </label>
    {children}
    {help && !error && (
      <span className="text-[11.5px] text-[var(--mk-ink-400)]">{help}</span>
    )}
    {error && (
      <span className="text-[11.5px] font-medium text-[var(--mk-dgr)]">
        {error}
      </span>
    )}
  </div>
);

const ProductDetailDrawer = ({
  productId,
  open,
  onClose,
  onSaved,
  onDeleted,
  viewOnly = false,
  // Previous/Next record navigation. The ordered list itself lives in
  // Product.jsx (fed by ProductTable's own filtered+sorted rows), so the
  // drawer only has to know whether a neighbour exists and how to ask for
  // it — switching products never closes or remounts this drawer, it just
  // changes `productId` and lets the existing fetch effect below reload.
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  navPosition = 0,
  navTotal = 0,
}) => {
  const dispatch = useDispatch();
  const {
    singleProduct: product,
    loading,
    documents = [],
  } = useSelector((state) => state.product || {});
  const { allCategoryList = [] } = useSelector((state) => state.category || {});
  const { taxes = [] } = useSelector((state) => state.taxes || {});
  const { brands = [] } = useSelector((state) => state.brand || {});
  const { loading: imageLoading } = useSelector((state) => state.image || {});

  const isCreate = productId == null;

  const [saving, setSaving] = useState(false);
  // True while THIS drawer is fetching the product `productId` currently
  // points at. Redux's `loading` only tracks getAllProducts (getProductById
  // has no pending case), so without this the body would keep rendering the
  // PREVIOUS product's values for the whole round-trip after Previous/Next,
  // making the click look like it did nothing. Tagged with the request's own
  // productId so a slower earlier request can't clear the flag belonging to a
  // newer one when the admin clicks Next several times quickly.
  const [detailLoading, setDetailLoading] = useState(false);
  const detailRequestRef = useRef(null);
  const [imagePaths, setImagePaths] = useState([]);
  // Optimistic local preview — shown immediately after Apply, before the
  // upload round-trip resolves, so the box never sits empty waiting on the
  // network. Swapped out for the real server URL once the upload confirms;
  // revoked (not left dangling) whenever it's superseded.
  const [primaryPreviewUrl, setPrimaryPreviewUrl] = useState(null);
  const [primaryUploading, setPrimaryUploading] = useState(false);
  const [galleryPreviews, setGalleryPreviews] = useState([]); // [{ tempId, url }]
  const [draggedImageIndex, setDraggedImageIndex] = useState(null);
  const galleryInputRef = useRef(null);
  const primaryImageInputRef = useRef(null);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [deleteImageTarget, setDeleteImageTarget] = useState(null);
  const [deletingImage, setDeletingImage] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [deleteVariantTarget, setDeleteVariantTarget] = useState(null);
  const [deletingVariant, setDeletingVariant] = useState(false);

  // The ladder hands its save function up here so one click on "Save
  // changes" commits the product fields, the specification, edits to existing
  // variants and newly priced ladder rows together. It stays a ref (not
  // state) because it is re-registered on every child render to stay closed
  // over the child's current drafts — as state that would loop.
  const ladderSaveRef = useRef(null);

  // Specification — edited inline (no modal), grouped as
  // [{ title, items: [{key, value}] }] matching the real
  // PUT /admin/products/{id}/specification contract exactly. Populated from
  // product.specifications[0].productSpecification when the product loads;
  // stays in local form state until the main Save Changes submits it.
  const [specGroups, setSpecGroups] = useState([]);

  // Technical Documents — one hidden file input per document type, reused
  // for both first upload and replace (see handleDocumentFileChange).
  const documentInputRefs = useRef({});
  const [uploadingDocType, setUploadingDocType] = useState(null);
  // Real byte size from the just-picked File object, keyed by document
  // type — the server's document record has no size field and the file
  // endpoint sends no Content-Length, so this is the only source of truth
  // available; only ever populated right after an upload/replace in this
  // session, never fabricated for documents loaded fresh from the server.
  const [docSizes, setDocSizes] = useState({});
  const [deleteDocTarget, setDeleteDocTarget] = useState(null);
  const [deletingDoc, setDeletingDoc] = useState(false);

  // Add Product only — variants staged here are plain local state, never
  // POSTed until the product itself exists (POST /admin/variants requires a
  // real productId). See ProductVariantEditor.jsx's own header comment.
  const [stagedVariantsByUnit, setStagedVariantsByUnit] = useState({
    kg: [],
    ml: [],
    unit: [],
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm({ defaultValues: {} });

  const watchedName = watch("name");
  const watchedCategoryId = watch("categoryId");
  const watchedTaxPercent = watch("taxPercent");
  const watchedStockUnit = watch("stockUnit") || "KG";
  const selectedUnitFamily = unitFamilyForStockUnit(watchedStockUnit);
  const watchedCategoryName = allCategoryList.find(
    (c) => String(c.id) === String(watchedCategoryId),
  )?.name;

  useEffect(() => {
    dispatch(getAllCategoryList());
    dispatch(getAllTaxes());
    dispatch(getAllBrands());
  }, [dispatch]);

  const refetch = () => productId && dispatch(getProductById(productId));
  const refetchDocuments = () =>
    productId && dispatch(getProductDocuments(productId));

  useEffect(() => {
    if (!open) return;
    // Opening fresh (or switching products) invalidates any leftover local
    // preview from a previous session — revoke it rather than leaking it.
    setPrimaryPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setGalleryPreviews((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
    setDocSizes({});
    if (isCreate) {
      reset({
        name: "",
        categoryId: "",
        brandId: "",
        taxId: "",
        taxPercent: "",
        hsnCode: "",
        actualPrice: "",
        discountPrice: "",
        stock: "",
        stockUnit: "KG",
        description: "",
      });
      setImagePaths([]);
      setStagedVariantsByUnit({ kg: [], ml: [], unit: [] });
      setSpecGroups([]);
    } else {
      const requestId = productId;
      detailRequestRef.current = requestId;
      setDetailLoading(true);
      Promise.allSettled([refetch(), refetchDocuments()]).then(() => {
        if (detailRequestRef.current === requestId) setDetailLoading(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productId]);

  useEffect(() => {
    if (!isCreate && product && product.id === productId) {
      reset({
        name: product.name,
        categoryId: product.category?.id ?? product.categoryId ?? "",
        brandId: product.brand?.id ?? product.brandId ?? "",
        taxId: product.taxId ?? "",
        taxPercent: product.taxPercent ?? "",
        hsnCode: product.hsnCode ?? "",
        actualPrice: product.actualPrice ?? "",
        discountPrice: product.discountPrice ?? "",
        stock: product.stock ?? product.quantity ?? "",
        stockUnit: product.stockUnit ?? product.stock_unit ?? "KG",
        description: product.description ?? "",
      });
      setImagePaths(normalizeProductImages(product.productImage));
      // Deep-copied into fresh local objects — these came straight off the
      // Redux store and must never be mutated in place by the row editors
      // below.
      const rawGroups = product.specifications?.[0]?.productSpecification || [];
      setSpecGroups(
        rawGroups.map((g) => ({
          title: g.title ?? "",
          items: (g.items || []).map((it) => ({
            key: it.key ?? "",
            value: it.value ?? "",
          })),
        })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, isCreate]);

  // True only once `product` actually belongs to the product currently
  // being edited — `product` is Redux's single shared `singleProduct` slot,
  // which still holds the PREVIOUSLY viewed product's data (old category,
  // old variants) for one render while `getProductById(productId)` is in
  // flight for a newly opened/switched product. VariantLadderEditor's
  // default-tab detection locks in on the first real data it sees, so
  // feeding it that stale cross-product data below would lock the ladder
  // tab to the wrong product's unit family before the real fetch resolves.
  const productDataReady = !isCreate && !!product && product.id === productId;
  const variants = (!isCreate && product?.variants) || [];
  const flags = !isCreate && product ? productHealth(product) : [];

  /* ================= SPECIFICATION (inline, no modal) ================= */
  const addSpecGroup = () =>
    setSpecGroups((prev) => [
      ...prev,
      { title: "", items: [{ key: "", value: "" }] },
    ]);
  const removeSpecGroup = (gi) =>
    setSpecGroups((prev) => prev.filter((_, i) => i !== gi));
  const updateSpecGroupTitle = (gi, title) =>
    setSpecGroups((prev) =>
      prev.map((g, i) => (i === gi ? { ...g, title } : g)),
    );
  const addSpecItem = (gi) =>
    setSpecGroups((prev) =>
      prev.map((g, i) =>
        i === gi ? { ...g, items: [...g.items, { key: "", value: "" }] } : g,
      ),
    );
  const removeSpecItem = (gi, ii) =>
    setSpecGroups((prev) =>
      prev.map((g, i) =>
        i === gi ? { ...g, items: g.items.filter((_, j) => j !== ii) } : g,
      ),
    );
  const updateSpecItem = (gi, ii, field, value) =>
    setSpecGroups((prev) =>
      prev.map((g, i) =>
        i === gi
          ? {
              ...g,
              items: g.items.map((it, j) =>
                j === ii ? { ...it, [field]: value } : it,
              ),
            }
          : g,
      ),
    );

  // Same 4MB/image-type check BannerForm.jsx already applies to its image
  // uploads — kept consistent here rather than inventing a new limit.
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

  /* ================= IMAGE EDITOR (crop/flip/rotate before upload) =================
     Selecting a file never uploads it directly — it opens the editor first;
     only the processed (cropped/flipped/rotated) result from Apply is ever
     sent to the existing uploadImage API. Cancel discards the pick entirely
     and leaves whatever images already exist untouched. */
  const [editorTarget, setEditorTarget] = useState(null); // "primary" | "gallery" | null
  const [editorSrc, setEditorSrc] = useState(null);
  const [editorFileName, setEditorFileName] = useState("image.jpg");

  const openEditorFor = (target, file) => {
    setEditorTarget(target);
    setEditorFileName(file.name || "image.jpg");
    setEditorSrc(URL.createObjectURL(file));
  };

  const closeEditor = () => {
    if (editorSrc) URL.revokeObjectURL(editorSrc);
    setEditorTarget(null);
    setEditorSrc(null);
  };

  /* ================= IMAGE (primary) ================= */
  const handlePrimaryImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (isCreate) {
      handleCreateImageUpload(files);
      return;
    }
    const file = files[0];
    if (!file || !validateImageFile(file)) return;
    openEditorFor("primary", file);
  };

  const handleCreateImageUpload = async (files) => {
    const validFiles = files.filter(validateImageFile);
    if (validFiles.length === 0) return;

    setPrimaryUploading(true);
    const uploadedPaths = [];
    for (const file of validFiles) {
      const res = await dispatch(uploadImage(file));
      if (uploadImage.fulfilled.match(res)) {
        uploadedPaths.push(res.payload.path);
      } else {
        toast.error(res.payload || `Failed to upload ${file.name}`);
      }
    }
    setImagePaths((prev) => [...prev, ...uploadedPaths]);
    setPrimaryUploading(false);
  };

  const handleCreateImageDrop = (e) => {
    e.preventDefault();
    handleCreateImageUpload(Array.from(e.dataTransfer.files || []));
  };

  const moveImage = (fromIndex, toIndex) => {
    setImagePaths((prev) => {
      if (toIndex < 0 || toIndex >= prev.length || fromIndex === toIndex) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  /* ================= IMAGES (gallery) ================= */
  const handleGalleryFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || isCreate || !validateImageFile(file)) return;
    openEditorFor("gallery", file);
  };

  const handleEditorApply = async (blob) => {
    const finalFile = new File([blob], editorFileName, { type: blob.type });
    const target = editorTarget;
    closeEditor();

    // Show the actual edited image immediately — a real object URL over the
    // real processed blob, not a placeholder — while the upload happens in
    // the background. This is what was missing before: the box previously
    // stayed empty until the network round-trip finished, which read as "no
    // preview" whenever the upload was slow (or failed).
    const localUrl = URL.createObjectURL(blob);

    if (target === "primary") {
      setPrimaryPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return localUrl;
      });
      setPrimaryUploading(true);
      const res = await dispatch(uploadImage(finalFile));
      setPrimaryUploading(false);
      if (uploadImage.fulfilled.match(res)) {
        setImagePaths((prev) => [res.payload.path, ...prev.slice(1)]);
        // The confirmed server path takes over rendering now — the local
        // blob URL is no longer needed, so free it instead of leaking it.
        setPrimaryPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
      } else {
        toast.error(
          res.payload ||
            "Upload failed — showing your selected image locally, but it hasn't been saved",
        );
      }
      return;
    }

    // Gallery: show the local preview in its own box right away, alongside
    // whatever real images already exist; drop it once refetch() brings
    // back the real, server-confirmed image (or on failure, so a failed
    // upload doesn't linger as a fake permanent entry).
    const tempId = `pending-${Date.now()}`;
    setGalleryPreviews((prev) => [...prev, { tempId, url: localUrl }]);
    setUploadingGallery(true);
    const uploadRes = await dispatch(uploadImage(finalFile));
    if (uploadImage.fulfilled.match(uploadRes)) {
      const nextImagePaths = [...imagePaths, uploadRes.payload.path];
      const addRes = await dispatch(
        updateProduct({
          id: product.id,
          data: { productImage: nextImagePaths },
        }),
      );
      if (updateProduct.fulfilled.match(addRes)) {
        toast.success("Image added");
        await refetch();
      } else {
        toast.error(addRes.payload || "Failed to add image");
      }
    } else {
      toast.error(uploadRes.payload || "Upload failed");
    }
    setGalleryPreviews((prev) => {
      const match = prev.find((p) => p.tempId === tempId);
      if (match) URL.revokeObjectURL(match.url);
      return prev.filter((p) => p.tempId !== tempId);
    });
    setUploadingGallery(false);
  };

  const handleConfirmDeleteImage = async () => {
    if (!deleteImageTarget) return;
    setDeletingImage(true);
    const res = await dispatch(deleteProductImage(deleteImageTarget.id));
    setDeletingImage(false);
    setDeleteImageTarget(null);
    if (deleteProductImage.fulfilled.match(res)) {
      toast.success("Image deleted");
      refetch();
    } else {
      toast.error(res.payload || "Failed to delete image");
    }
  };

  /* ================= TECHNICAL DOCUMENTS (COA / SDS-MSDS) =================
     One fixed upload slot per type. The same + button uploads (POST) when
     no document of that type exists yet, or replaces (PUT) the existing
     one — never two separate buttons for that. */
  const documentFileUrl = (doc) =>
    `${import.meta.env.VITE_API_BASE_URL}${doc.fileUrl}`;

  const handleViewDocument = (doc) => {
    window.open(documentFileUrl(doc), "_blank", "noopener,noreferrer");
  };

  const handleDocumentFileChange = async (e, docType, existingDoc) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !product) return;
    if (file.type !== "application/pdf") {
      toast.error("Please choose a PDF file");
      return;
    }

    const label =
      DOCUMENT_TYPES.find((d) => d.type === docType)?.label || docType;
    const formData = new FormData();
    formData.append("documentType", docType);
    formData.append("documentTitle", label);
    formData.append("document", file);

    setUploadingDocType(docType);
    const res = existingDoc
      ? await dispatch(
          updateProductDocument({
            productId: product.id,
            documentId: existingDoc.id,
            data: formData,
          }),
        )
      : await dispatch(
          addProductDocument({ productId: product.id, data: formData }),
        );
    setUploadingDocType(null);

    const success = existingDoc
      ? updateProductDocument.fulfilled.match(res)
      : addProductDocument.fulfilled.match(res);
    if (success) {
      toast.success(`${label} ${existingDoc ? "replaced" : "uploaded"}`);
      setDocSizes((prev) => ({ ...prev, [docType]: file.size }));
      refetchDocuments();
    } else {
      toast.error(
        res.payload ||
          `Failed to ${existingDoc ? "replace" : "upload"} ${label}`,
      );
    }
  };

  const handleConfirmDeleteDocument = async () => {
    if (!deleteDocTarget || !product) return;
    setDeletingDoc(true);
    const res = await dispatch(
      deleteProductDocument({
        productId: product.id,
        documentId: deleteDocTarget.id,
      }),
    );
    setDeletingDoc(false);
    const removedType = deleteDocTarget.documentType;
    setDeleteDocTarget(null);
    if (deleteProductDocument.fulfilled.match(res)) {
      toast.success("Document deleted");
      setDocSizes((prev) => {
        const next = { ...prev };
        delete next[removedType];
        return next;
      });
      refetchDocuments();
    } else {
      toast.error(res.payload || "Failed to delete document");
    }
  };

  /* ================= SAVE PRODUCT ================= */
  const onFormSubmit = async (data) => {
    // A product stored on a slab that's no longer offered renders as an
    // unselected <select>, which submits "". Keep whatever is already stored
    // rather than zeroing that product's taxId during an otherwise unrelated
    // edit — the same leave-it-alone behaviour taxPercent already has. Never
    // consulted on Add, where `product` is the previously-viewed product.
    const taxId =
      Number(data.taxId) || (isCreate ? 0 : Number(product?.taxId) || 0);

    const payload = {
      categoryId: Number(data.categoryId),
      brandId: Number(data.brandId),
      name: data.name,
      description: data.description,
      hsnCode: data.hsnCode,
      taxId,
      taxPercent: Number(data.taxPercent),
      actualPrice: Number(data.actualPrice),
      discountPrice: Number(data.discountPrice),
      productImage: imagePaths,
      stock: Number(data.stock),
      stockUnit: data.stockUnit || null,
    };

    setSaving(true);
    const res = isCreate
      ? await dispatch(addProduct(payload))
      : await dispatch(updateProduct({ id: product.id, data: payload }));

    const success = isCreate
      ? addProduct.fulfilled.match(res)
      : updateProduct.fulfilled.match(res);
    if (!success) {
      setSaving(false);
      toast.error(res.payload || "Error");
      return;
    }

    // Specification lives on its own endpoint (PUT /admin/products/{id}/
    // specification, grouped {title, items:[{key,value}]} — confirmed
    // against the real API), separate from the core product fields above,
    // but from the admin's perspective it's one Save Changes click: this
    // second request fires right after the first succeeds, before either
    // toast is shown. Edit-only, same as the section itself.
    if (!isCreate) {
      const cleanedGroups = specGroups
        .map((g) => ({
          title: g.title.trim(),
          items: g.items
            .map((it) => ({ key: it.key.trim(), value: it.value.trim() }))
            .filter((it) => it.key || it.value),
        }))
        .filter((g) => g.title || g.items.length > 0);

      const specRes = await dispatch(
        saveProductSpecification({
          productId: product.id,
          data: { specification: cleanedGroups },
        }),
      );
      if (!saveProductSpecification.fulfilled.match(specRes)) {
        toast.error(
          specRes.payload || "Product saved, but specifications failed to save",
        );
      }
    }

    // Ladder rows the admin edited or filled in but did not press the
    // ladder's own button for are part of the same Save changes click: this
    // flushes both its updates (existing variants, by id) and its additions.
    // It runs after the product update above succeeds and reports its own
    // failures through its existing toasts, so a variant problem never masks
    // the fact that the product itself saved.
    if (!isCreate) {
      const variantsOk = await ladderSaveRef.current?.();
      if (variantsOk === false) {
        toast.error("Product saved, but some variant changes were not saved");
      }
    }

    // Staged variants only exist on Add Product — POST /admin/variants needs
    // a real productId, which doesn't exist until the product above just
    // got created, so they're created one by one right here, immediately
    // after. Reuses the exact same addVariant payload shape Edit Product's
    // ladder editor already sends (packSizeId: 1 included, same reason: no
    // real per-size pack lookup exists yet — see variantSizeSystems.js).
    const stagedVariants = stagedVariantsByUnit[selectedUnitFamily] || [];
    if (isCreate && stagedVariants.length > 0) {
      const newProductId = res.payload.id;
      const variantResults = await Promise.all(
        stagedVariants.map((v) =>
          dispatch(
            addVariant({
              productId: newProductId,
              variantName: v.label,
              packSizeId: 1,
              price: v.price,
              discountedPrice:
                v.offerPrice !== "" && v.offerPrice != null
                  ? v.offerPrice
                  : v.price,
              // Same sku VariantLadderEditor already generated and showed in
              // the preview table — never a second formula computed
              // independently at submit time.
              sku: v.sku,
              stockQuantity: v.stock || 0,
              status: true,
              imagePath: [],
            }),
          ),
        ),
      );
      const failedCount = variantResults.filter(
        (r) => !addVariant.fulfilled.match(r),
      ).length;
      setSaving(false);
      if (failedCount > 0) {
        toast.error(
          `Product added, but ${failedCount} of ${stagedVariants.length} variant${stagedVariants.length === 1 ? "" : "s"} failed to save — open the product to add ${failedCount === 1 ? "it" : "them"} again.`,
        );
      } else {
        toast.success(
          `Product added with ${stagedVariants.length} variant${stagedVariants.length === 1 ? "" : "s"}`,
        );
      }
    } else {
      setSaving(false);
      toast.success(isCreate ? "Product added" : "Product updated");
    }

    onSaved?.();
    onClose();
  };

  /* ================= DELETE PRODUCT ================= */
  const handleDeleteProduct = async () => {
    setDeleting(true);
    const res = await dispatch(deleteProduct(product.id));
    setDeleting(false);
    setDeleteConfirmOpen(false);
    if (deleteProduct.fulfilled.match(res)) {
      toast.success("Product deleted");
      onDeleted?.();
      onClose();
    } else {
      toast.error(res.payload || "Error");
    }
  };

  /* ================= VARIANTS ================= */
  // Last line of defence before POST /admin/variants. The ladder already
  // hides sizes the product has, but that is a UI affordance: this re-checks
  // every addition against the product's variants as they exist right now and
  // drops any that would duplicate one, so a stale drawer, a double-submit or
  // a hand-crafted call still cannot create the same size twice. Matching is
  // by base quantity within the unit family, so "0.5 L" is rejected against an
  // existing "500 ml".
  const rejectDuplicateSizes = (additions) => {
    const kept = [];
    const skipped = [];
    additions.forEach((v) => {
      // Ladder and custom additions both carry qty/unit directly; the label
      // parse is only the fallback for an addition that carries just a name.
      const parsed =
        v.qty != null ? { qty: v.qty, unit: v.unit } : parseVariantLabel(v.label);
      const clashesWithSaved =
        parsed?.qty != null &&
        !!findExistingVariantForStep(variants, parsed.qty, parsed.unit);
      // Also guards against the same size appearing twice inside one batch.
      const clashesWithinBatch = kept.some((k) => {
        const p = k.qty != null ? { qty: k.qty, unit: k.unit } : parseVariantLabel(k.label);
        return (
          p?.qty != null &&
          parsed?.qty != null &&
          baseQty(p.qty, p.unit) === baseQty(parsed.qty, parsed.unit) &&
          unitFamilyOf(p.unit) === unitFamilyOf(parsed.unit)
        );
      });
      if (clashesWithSaved || clashesWithinBatch) skipped.push(v);
      else kept.push(v);
    });
    return { kept, skipped };
  };

  const handleAddVariantBatch = async (rawAdditions) => {
    const { kept: additions, skipped } = rejectDuplicateSizes(rawAdditions);
    if (skipped.length > 0) {
      toast.error(
        `${skipped.map((v) => v.label).join(", ")} already exist${skipped.length === 1 ? "s" : ""} on this product`,
      );
    }
    if (additions.length === 0) return false;

    const results = await Promise.all(
      additions.map((v) =>
        dispatch(
          addVariant({
            productId: product.id,
            variantName: v.label,
            packSizeId: 1,
            price: v.price,
            discountedPrice: v.offerPrice !== "" ? v.offerPrice : v.price,
            sku: v.sku,
            status: true,
            imagePath: [],
          }),
        ),
      ),
    );
    const failedCount = results.filter(
      (r) => !addVariant.fulfilled.match(r),
    ).length;
    refetch();
    if (failedCount > 0) {
      toast.error(
        `${failedCount} of ${additions.length} variant${additions.length === 1 ? "" : "s"} failed to add`,
      );
      return false;
    }
    toast.success(
      `Added ${additions.length} variant${additions.length === 1 ? "" : "s"}`,
    );
    return true;
  };

  // Ladder rows that matched an existing variant are pre-filled inline —
  // saving them updates that variant's id directly, never creates a new one.
  const handleUpdateVariantBatch = async (updates) => {
    const results = await Promise.all(
      updates.map((v) =>
        dispatch(
          updateVariant({
            id: v.id,
            data: {
              variantName: v.label,
              price: v.price,
              discountedPrice: v.offerPrice !== "" ? v.offerPrice : v.price,
              sku: v.sku,
              stockQuantity: v.stock,
            },
          }),
        ),
      ),
    );
    const failedCount = results.filter(
      (r) => !updateVariant.fulfilled.match(r),
    ).length;
    refetch();
    if (failedCount > 0) {
      toast.error(
        `${failedCount} of ${updates.length} variant${updates.length === 1 ? "" : "s"} failed to update`,
      );
      return false;
    }
    toast.success(
      `Updated ${updates.length} variant${updates.length === 1 ? "" : "s"}`,
    );
    return true;
  };

  const handleDeleteVariant = async () => {
    if (!deleteVariantTarget) return;
    setDeletingVariant(true);
    const res = await dispatch(deleteVariant(deleteVariantTarget.id));
    setDeletingVariant(false);
    setDeleteVariantTarget(null);
    if (deleteVariant.fulfilled.match(res)) {
      toast.success("Variant deleted");
      refetch();
    } else {
      toast.error(res.payload || "Error");
    }
  };

  const taxSelectValue = (id) => taxes.find((t) => String(t.id) === String(id));

  // One option per allowed percentage: mapping over GST_SLAB_PERCENTS (rather
  // than filtering `taxes`) fixes the 5%-then-18% order and inherently drops
  // duplicates, since `find` keeps only the first tax record matching each
  // percentage no matter how many the master holds.
  const gstSlabOptions = GST_SLAB_PERCENTS.map((percent) =>
    taxes.find((t) => Number(t.percent) === percent),
  ).filter(Boolean);

  // Both selects need their own register() result rather than an inline
  // spread, because each also runs extra work on change: overriding the
  // `onChange` that comes out of the spread would replace react-hook-form's
  // own handler, so the field's value would stop being tracked and submit
  // stale. Each handler below calls field.onChange(e) first for that reason.
  const categoryField = register("categoryId", {
    required: "Category is required",
  });
  const taxIdField = register("taxId");

  // GST slab + HSN code follow the selected category, so neither has to be
  // typed by hand. Driven from the select's change event (not a watcher on
  // categoryId) so it only ever fires on a deliberate pick — a watcher would
  // also fire for the reset() that loads an existing product and would
  // overwrite that product's saved GST/HSN with its category's the instant
  // the drawer opened.
  const applyCategoryTaxDefaults = (categoryId) => {
    const category = allCategoryList.find(
      (c) => String(c.id) === String(categoryId),
    );

    // Only a slab the dropdown actually offers can be applied. A category
    // configured at 0/12/28% — or configured with nothing at all — clears the
    // field instead of falling back to a default that would be quietly wrong.
    const percent = categoryGstPercent(category);
    const slab =
      percent == null
        ? null
        : gstSlabOptions.find((t) => Number(t.percent) === percent);
    setValue("taxId", slab ? String(slab.id) : "", { shouldDirty: true });
    setValue("taxPercent", slab ? slab.percent : "", { shouldDirty: true });

    const hsnCode = categoryHsnCode(category);
    setValue("hsnCode", hsnCode ?? "", { shouldDirty: true });
  };

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title={
          isCreate
            ? "Add product"
            : (productDataReady && product?.name) || "Product"
        }
        width="max-w-[900px]"
        compact
        headerActions={
          // Previous/Next sit in Drawer's existing headerActions slot, left of
          // the close button, so nothing about the header's height, padding or
          // title layout changes. Only rendered while editing an existing
          // product that belongs to a known list (never in Add mode).
          !isCreate && navTotal > 0 ? (
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={onPrev}
                disabled={!hasPrev}
                aria-label="Previous product"
                title="Previous product"
                className={NAV_BTN_CLASS}
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-[12px] font-medium text-gray-400 tabular-nums select-none px-0.5">
                {navPosition}/{navTotal}
              </span>
              <button
                type="button"
                onClick={onNext}
                disabled={!hasNext}
                aria-label="Next product"
                title="Next product"
                className={NAV_BTN_CLASS}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          ) : null
        }
        footer={
          <>
            {!isCreate && product && (
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--mk-ink-500)] hover:text-[var(--mk-dgr)] transition-colors cursor-pointer"
              >
                <Trash2 size={15} />
                Delete product
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-[16px] rounded-lg text-[13px] font-semibold text-[var(--mk-ink-700)] border border-[var(--mk-line)] bg-white hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              form={FORM_ID}
              disabled={saving || imageLoading}
              className="h-10 px-[16px] rounded-lg text-[13px] font-semibold text-white bg-[var(--mk-primary)] hover:bg-[var(--mk-primary-hover)] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : isCreate ? "Add product" : "Save changes"}
            </button>
          </>
        }
      >
        {!isCreate && !productDataReady && (detailLoading || loading) ? (
          <p className="text-[13px] text-[var(--mk-ink-400)]">Loading…</p>
        ) : (
          <form id={FORM_ID} onSubmit={handleSubmit(onFormSubmit)}>
            {flags.length > 0 && (
              <div className="flex items-center gap-2 px-[12px] py-2.5 rounded-[10px] bg-[var(--mk-warn-bg)] border border-[#F2D9B8] text-[#7A3A08] text-[12.5px] leading-[1.4] mb-[16px]">
                <AlertTriangle size={15} className="shrink-0" />
                <div>
                  <b>Data health:</b> {flags.map((f) => f.label).join(" · ")}.
                </div>
              </div>
            )}

            {/* PRODUCT INFORMATION — Product name/Category, then GST slab/HSN
                code, matching the reference's exact field pairing. GST slab
                is the only tax-related field; selecting one still drives
                `taxPercent` in the submitted payload (via setValue below),
                it's just no longer shown as a separate, redundant input. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3.5">
              <Field label="Product name" error={errors.name?.message}>
                <input
                  {...register("name", {
                    required: "Product name is required",
                  })}
                  placeholder="e.g. Aloe Vera Gel"
                  className={fldClass(errors.name)}
                />
              </Field>

              <Field label="Category" error={errors.categoryId?.message}>
                <select
                  {...categoryField}
                  onChange={(e) => {
                    categoryField.onChange(e);
                    applyCategoryTaxDefaults(e.target.value);
                  }}
                  className={fldClass(errors.categoryId)}
                >
                  <option value="">Select category</option>
                  {allCategoryList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="GST slab"
               
              >
                <select
                  {...taxIdField}
                  className={fldClass(false)}
                  onChange={(e) => {
                    taxIdField.onChange(e);
                    const t = taxSelectValue(e.target.value);
                    setValue("taxPercent", t ? t.percent : "");
                  }}
                >
                  <option value="">Select GST slab</option>
                  {gstSlabOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.percent}% GST
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="HSN code">
                <input
                  {...register("hsnCode")}
                  placeholder="e.g. 12119029"
                  className={fldClass(false)}
                />
              </Field>

              {/* <Field label="Brand" error={errors.brandId?.message}>
                <select
                  {...register("brandId", { required: "Brand is required" })}
                  className={fldClass(errors.brandId)}
                >
                  <option value="">Select brand</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Field> */}

              {/* <Field
                label="Actual price (₹)"
                error={errors.actualPrice?.message}
              >
                <input
                  type="number"
                  step="0.01"
                  {...register("actualPrice", {
                    required: "Required",
                    min: { value: 0, message: "Must be ≥ 0" },
                  })}
                  className={fldClass(errors.actualPrice)}
                />
              </Field> */}

              {/* <Field
                label="Discount price (₹)"
                error={errors.discountPrice?.message}
              >
                <input
                  type="number"
                  step="0.01"
                  {...register("discountPrice", {
                    required: "Required",
                    min: { value: 0, message: "Must be ≥ 0" },
                  })}
                  className={fldClass(errors.discountPrice)}
                />
              </Field> */}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3.5">
              <Field label="Stock Quantity" error={errors.stock?.message}>
                <input
                  type="number"
                  min="0"
                  step="1"
                  {...register("stock", {
                    min: { value: 0, message: "Must be ≥ 0" },
                  })}
                  className={fldClass(errors.stock)}
                  placeholder="0"
                />
              </Field>

              <Field label="Stock Unit" error={errors.stockUnit?.message}>
                <select
                  {...register("stockUnit", {
                    required: "Stock unit is required",
                  })}
                  className={fldClass(errors.stockUnit)}
                  defaultValue="KG"
                >
                  {STOCK_UNIT_OPTIONS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {/* DESCRIPTION — rich text, no max-height/overflow: it grows to
                fit the real content and the drawer scrolls around it. */}
            <Field label="Description">
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <RichTextEditor
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </Field>

            {/* IMAGES */}
            <div className="mt-1 mb-[20px]">
              <h4 className="!text-[14px] !font-semibold !leading-[1.2] !m-0 text-[var(--mk-ink-900)] mb-2">
                Upload Images{" "}
              </h4>
              <div className="flex gap-2.5 flex-wrap">
                <input
                  ref={primaryImageInputRef}
                  type="file"
                  accept="image/*"
                  multiple={isCreate}
                  onChange={handlePrimaryImageChange}
                  className="hidden"
                />
                {isCreate && (
                  <button
                    type="button"
                    onClick={() => primaryImageInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleCreateImageDrop}
                    disabled={primaryUploading || imageLoading}
                    className="w-full min-h-24 rounded-lg border-[1.5px] border-dashed border-[var(--mk-line)] hover:border-[var(--mk-primary)]/40 flex flex-col items-center justify-center gap-1 text-[var(--mk-ink-500)] cursor-pointer disabled:opacity-60"
                  >
                    <Plus size={18} className="text-[var(--mk-primary)]" />
                    <span className="text-[12px] font-semibold">
                      Drop images here or Browse Files
                    </span>
                    <span className="text-[11px] text-[var(--mk-ink-400)]">
                      Select multiple images at once
                    </span>
                  </button>
                )}
                {/* The just-applied local blob always wins over the confirmed
                  server path while a fresh pick is mid-upload. */}
                {!isCreate &&
                  (() => {
                    const primarySrc =
                      primaryPreviewUrl ||
                      (imagePaths[0] ? imageUrl(imagePaths[0]) : null);
                    return (
                      <div className="relative group">
                        <button
                          type="button"
                          onClick={() => primaryImageInputRef.current?.click()}
                          aria-label={
                            primarySrc
                              ? "Replace primary image"
                              : "Add primary image"
                          }
                          title={primarySrc ? "Click to replace" : "Add image"}
                          className="w-16 h-16 rounded-lg border-[1.5px] border-dashed border-[var(--mk-line)] hover:border-[var(--mk-primary)]/40 flex items-center justify-center text-[var(--mk-ink-400)] text-center overflow-hidden cursor-pointer"
                        >
                          {primarySrc ? (
                            <img
                              src={primarySrc}
                              alt="Primary"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="flex flex-col items-center gap-0.5">
                              <Plus size={16} />
                              <span className="text-[10px] font-medium">
                                Add
                              </span>
                            </span>
                          )}
                        </button>
                        {primaryUploading && (
                          <span className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg text-white text-[10px] font-medium pointer-events-none">
                            Uploading…
                          </span>
                        )}
                        {primarySrc && !primaryUploading && (
                          <button
                            type="button"
                            onClick={() => {
                              setPrimaryPreviewUrl((prev) => {
                                if (prev) URL.revokeObjectURL(prev);
                                return null;
                              });
                              setImagePaths((prev) => prev.slice(1));
                            }}
                            aria-label="Remove primary image"
                            className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-white text-red-600 shadow-sm border border-gray-200 hover:bg-red-50 transition-colors cursor-pointer !opacity-0 group-hover:!opacity-100"
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>
                    );
                  })()}

                {isCreate &&
                  imagePaths.map((path, index) => (
                    <div
                      key={`${path}-${index}`}
                      draggable
                      onDragStart={() => setDraggedImageIndex(index)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedImageIndex != null) {
                          moveImage(draggedImageIndex, index);
                        }
                        setDraggedImageIndex(null);
                      }}
                      onDragEnd={() => setDraggedImageIndex(null)}
                      className="relative group cursor-grab active:cursor-grabbing"
                    >
                      <img
                        src={imageUrl(path)}
                        alt={
                          index === 0
                            ? "Primary product"
                            : `Product ${index + 1}`
                        }
                        className="w-20 h-20 rounded-lg object-cover border border-[var(--mk-line)]"
                      />
                      {index === 0 && (
                        <span className="absolute left-1 bottom-1 rounded bg-black/65 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                          Primary
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setImagePaths((prev) =>
                            prev.filter((_, i) => i !== index),
                          )
                        }
                        aria-label="Remove image"
                        className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-white text-red-600 shadow-sm border border-gray-200 hover:bg-red-50 transition-colors cursor-pointer !opacity-0 group-hover:!opacity-100"
                      >
                        <X size={11} />
                      </button>
                      <div className="absolute inset-x-0 -bottom-6 hidden justify-center gap-1 group-hover:flex">
                        <button
                          type="button"
                          onClick={() => moveImage(index, index - 1)}
                          disabled={index === 0}
                          aria-label="Move image left"
                          className="rounded border border-[var(--mk-line)] bg-white px-1.5 text-[11px] disabled:opacity-30"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          onClick={() => moveImage(index, index + 1)}
                          disabled={index === imagePaths.length - 1}
                          aria-label="Move image right"
                          className="rounded border border-[var(--mk-line)] bg-white px-1.5 text-[11px] disabled:opacity-30"
                        >
                          →
                        </button>
                      </div>
                    </div>
                  ))}

                {!isCreate &&
                  imagePaths.slice(1).map((path, index) => (
                    <div key={`${path}-${index}`} className="relative group">
                      <img
                        src={imageUrl(path)}
                        alt={`Product ${index + 2}`}
                        className="w-16 h-16 rounded-lg object-cover border border-[var(--mk-line)]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setImagePaths((prev) =>
                            prev.filter((currentPath) => currentPath !== path),
                          )
                        }
                        aria-label="Remove image"
                        className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-white text-red-600 shadow-sm border border-gray-200 hover:bg-red-50 transition-colors cursor-pointer !opacity-0 group-hover:!opacity-100"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}

                {/* Optimistic gallery previews — the real, just-selected
                    images, shown in their own boxes immediately while their
                    uploads are still in flight. */}
                {galleryPreviews.map((p) => (
                  <div
                    key={p.tempId}
                    className="relative w-16 h-16 rounded-lg overflow-hidden border border-[var(--mk-line)]"
                  >
                    <img
                      src={p.url}
                      alt="Uploading"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-[10px] font-medium">
                      Uploading…
                    </span>
                  </div>
                ))}

                {!isCreate && (
                  <>
                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleGalleryFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      disabled={uploadingGallery || imageLoading}
                      aria-label="Add image"
                      title="Add image"
                      className="w-16 h-16 rounded-lg border-[1.5px] border-dashed border-[var(--mk-line)] hover:border-[var(--mk-primary)]/40 flex items-center justify-center text-[var(--mk-ink-400)] cursor-pointer disabled:opacity-60"
                    >
                      <span className="flex flex-col items-center gap-0.5">
                        <Plus size={16} />
                        <span className="text-[10px] font-medium">Add</span>
                      </span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* VARIANTS */}
            {isCreate ? (
              <ProductVariantEditor
                key={selectedUnitFamily}
                categoryName={watchedCategoryName}
                productName={watchedName}
                taxPercent={watchedTaxPercent}
                unitFamily={selectedUnitFamily}
                variantsByUnit={stagedVariantsByUnit}
                onChange={(unitFamily, nextVariants) =>
                  setStagedVariantsByUnit((prev) => ({
                    ...prev,
                    [unitFamily]: nextVariants,
                  }))
                }
              />
            ) : (
              <div className="mb-[20px]">
                {/* Product header — identifies which product this variant
                    ladder belongs to: name, category, its inferred size
                    ladder, and the GST/ex-GST storage convention. */}
                {product && (
                  <div className="mb-3 pb-3 border-b border-[var(--mk-line)]">
                    {/* <h3 className="!m-0 text-[15px] font-bold uppercase tracking-wide text-[var(--mk-ink-900)]">
                      {product.name}
                    </h3> */}
                    <div className="flex items-center flex-wrap gap-2 mt-1.5">
                      {/* <span className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--mk-primary)]">
                        {product?.category?.name}
                      </span> */}
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[11.5px] font-semibold bg-[var(--mk-primary-50)] text-[var(--mk-primary)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                        {ladderBadgeLabel(
                          inferSizeSystemFromVariants(
                            variants,
                            product?.category?.name,
                          ),
                        )}
                      </span>
                      <span className="text-[var(--mk-ink-400)]">|</span>
                      <span className="text-[12px] text-[var(--mk-ink-500)]">
                        GST {product?.taxPercent ?? 0}% · stored ex-GST
                      </span>
                    </div>
                  </div>
                )}

                <h4 className="!text-[14px] !font-semibold !leading-[1.2] !m-0 text-[var(--mk-ink-900)] mb-1">
                  Variants
                </h4>
                <p className="!text-[12px] !m-0 text-[var(--mk-ink-400)] mb-2">
                  price lives here · the product shows From ₹min
                </p>

                {variants.length === 0 ? (
                  <div className="border border-dashed border-[var(--mk-line)] rounded-lg py-[12px] flex flex-col items-center gap-1 text-center">
                    <Boxes size={16} className="text-[var(--mk-ink-400)]" />
                    <p className="text-[12px] text-[var(--mk-ink-500)]">
                      No variants yet — this product cannot go Active until one
                      priced variant exists.
                    </p>
                  </div>
                ) : (
                  /* Saved variants, shown as a list. Editing happens in the
                     ladder below, where each of these sizes appears again as
                     a pre-filled editable row carrying its variantId. This
                     list re-renders from `variants`, so it picks up new
                     values as soon as a save refetches the product. */
                  <div className="border border-[var(--mk-line)] rounded-lg overflow-hidden overflow-x-auto">
                    <table className="w-full text-[12.5px]">
                      <thead>
                        <tr className="bg-[#FAFBFD] text-[10.5px] uppercase tracking-wide text-[var(--mk-ink-400)]">
                          <th className="text-left font-semibold px-2.5 py-2 whitespace-nowrap">
                            Size
                          </th>
                          <th className="text-left font-semibold px-2.5 py-2 whitespace-nowrap">
                            SKU
                          </th>
                          <th className="text-left font-semibold px-2.5 py-2 whitespace-nowrap">
                            List ₹ (ex-GST)
                          </th>
                          <th className="text-left font-semibold px-2.5 py-2 whitespace-nowrap">
                            Offer ₹
                          </th>
                          {!viewOnly && <th className="px-2 py-2" />}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--mk-line)]">
                        {variants.map((v) => {
                          // The API stores discountPrice = price to mean "no
                          // offer"; showing that back would make every row
                          // look discounted.
                          const hasOffer =
                            v.discountPrice != null &&
                            Number(v.discountPrice) !== Number(v.price);
                          return (
                            <tr key={v.id}>
                              <td className="px-2.5 py-1.5 font-medium text-[var(--mk-ink-900)] whitespace-nowrap">
                                {v.variantName}
                              </td>
                              <td className="px-2.5 py-1.5 text-[var(--mk-ink-400)] whitespace-nowrap">
                                {v.sku || "—"}
                              </td>
                              <td className="px-2.5 py-1.5 tabular-nums text-[var(--mk-ink-700)] whitespace-nowrap">
                                {fmtMoney(v.price)}
                              </td>
                              <td className="px-2.5 py-1.5 tabular-nums text-[var(--mk-ink-700)] whitespace-nowrap">
                                {hasOffer ? fmtMoney(v.discountPrice) : "—"}
                              </td>
                              {!viewOnly && (
                                <td className="px-2 py-1.5 text-right">
                                  <button
                                    type="button"
                                    onClick={() => setDeleteVariantTarget(v)}
                                    aria-label={`Remove ${v.variantName}`}
                                    className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[var(--mk-ink-400)] hover:bg-[var(--mk-dgr-bg)] hover:text-[var(--mk-dgr)] transition-colors cursor-pointer"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Standard ladder — EDIT + ADD. Every standard size shows a
                    row: one matching an existing variant is pre-filled from it
                    and saves through onUpdateBatch against that variant's id
                    (never a duplicate); a size with no variant yet saves
                    through onAddBatch as a new one. */}
                {!viewOnly && (
                  <VariantLadderEditor
                    categoryName={
                      productDataReady ? product?.category?.name : undefined
                    }
                    productName={product?.name}
                    taxPercent={product?.taxPercent}
                    existingVariants={productDataReady ? variants : undefined}
                    onAddBatch={handleAddVariantBatch}
                    onUpdateBatch={handleUpdateVariantBatch}
                    registerSave={(fn) => {
                      ladderSaveRef.current = fn;
                    }}
                  />
                )}
              </div>
            )}

            {/* SPECIFICATION — below the entire Variants section (moved down
                from right after Description), no modal (the old "Edit
                Specifications" popup is gone). Same fldClass inputs as the
                rest of this form. Grouped as
                [{ title, items: [{key, value}] }] to match the real
                PUT /admin/products/{id}/specification contract exactly.
                Edit-only; stays in specGroups until the main Save Changes
                submits it alongside the core product fields. */}
            {!isCreate && (
              <div className="mb-1 mt-5">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="!text-[14px] !font-semibold !leading-[1.2] !m-0 text-[var(--mk-ink-900)]">
                    Specification
                  </h4>
                  <button
                    type="button"
                    onClick={addSpecGroup}
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--mk-primary)] hover:text-[var(--mk-primary-hover)] transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    Add group
                  </button>
                </div>

                {specGroups.length === 0 ? (
                  <p className="text-[12.5px] text-[var(--mk-ink-400)]">
                    No specifications added yet.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {specGroups.map((group, gi) => (
                      <div
                        key={gi}
                        className="rounded-xl border border-[var(--mk-line)] bg-white p-4"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <input
                            type="text"
                            placeholder="Group title (e.g. Product Details)"
                            value={group.title}
                            onChange={(e) =>
                              updateSpecGroupTitle(gi, e.target.value)
                            }
                            className={`${fldClass(false)} flex-1 font-semibold`}
                          />
                          <IconButton
                            icon={Trash2}
                            label="Remove group"
                            tone="flatDanger"
                            size={15}
                            onClick={() => removeSpecGroup(gi)}
                          />
                        </div>

                        <div className="flex flex-col gap-2">
                          {group.items.map((item, ii) => (
                            <div key={ii} className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Key"
                                value={item.key}
                                onChange={(e) =>
                                  updateSpecItem(gi, ii, "key", e.target.value)
                                }
                                className={`${fldClass(false)} flex-1`}
                              />
                              <input
                                type="text"
                                placeholder="Value"
                                value={item.value}
                                onChange={(e) =>
                                  updateSpecItem(
                                    gi,
                                    ii,
                                    "value",
                                    e.target.value,
                                  )
                                }
                                className={`${fldClass(false)} flex-1`}
                              />
                              <IconButton
                                icon={X}
                                label="Remove row"
                                tone="flat"
                                size={14}
                                onClick={() => removeSpecItem(gi, ii)}
                              />
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => addSpecItem(gi)}
                          className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--mk-primary)] hover:text-[var(--mk-primary-hover)] transition-colors cursor-pointer"
                        >
                          <Plus size={13} />
                          Add row
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TECHNICAL DOCUMENTS — directly below Specification (not
                nested inside it), both below the entire Variants section.
                One fixed upload slot each for COA and SDS/MSDS; the same +
                button uploads when empty and replaces when a document
                already exists. */}
            {!isCreate && (
              <div className="mb-1 mt-5">
                <h4 className="!text-[14px] !font-semibold !leading-[1.2] !m-0 text-[var(--mk-ink-900)] mb-2">
                  Technical Documents
                </h4>
                <div className="flex flex-col gap-3">
                  {DOCUMENT_TYPES.map(({ type, label }) => {
                    const doc = documents.find((d) => d.documentType === type);
                    const isUploading = uploadingDocType === type;
                    const sizeBytes = doc ? docSizes[type] : null;
                    return (
                      <div
                        key={type}
                        className="rounded-xl border border-[var(--mk-line)] bg-white p-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[14px] font-semibold text-[var(--mk-ink-900)]">
                            {label}
                          </span>
                          <div className="flex items-center gap-2">
                            {isUploading && (
                              <span className="text-[11.5px] text-[var(--mk-ink-400)]">
                                Uploading…
                              </span>
                            )}
                            <input
                              ref={(el) => {
                                documentInputRefs.current[type] = el;
                              }}
                              type="file"
                              accept="application/pdf"
                              className="hidden"
                              onChange={(e) =>
                                handleDocumentFileChange(e, type, doc)
                              }
                            />
                            <IconButton
                              icon={Plus}
                              label={
                                doc ? `Replace ${label}` : `Upload ${label}`
                              }
                              tone="purple"
                              size={16}
                              disabled={isUploading}
                              onClick={() =>
                                documentInputRefs.current[type]?.click()
                              }
                            />
                          </div>
                        </div>

                        {doc && !isUploading && (
                          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[var(--mk-line)] px-3.5 py-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <PdfFileIcon />
                              <div className="min-w-0">
                                <p className="text-[14px] font-semibold text-[var(--mk-ink-900)] truncate">
                                  {doc.fileName}
                                </p>
                                {sizeBytes != null && (
                                  <p className="text-[12px] text-[var(--mk-ink-400)] mt-0.5">
                                    {formatBytes(sizeBytes)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <IconButton
                                icon={Eye}
                                label={`View ${label}`}
                                tone="purpleOutline"
                                size={16}
                                onClick={() => handleViewDocument(doc)}
                              />
                              <IconButton
                                icon={Trash2}
                                label={`Delete ${label}`}
                                tone="redOutline"
                                size={16}
                                onClick={() => setDeleteDocTarget(doc)}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </form>
        )}
      </Drawer>

      {/* NESTED: Crop/flip/rotate — required before any picked file uploads */}
      <ImageEditorModal
        open={!!editorTarget}
        imageSrc={editorSrc}
        onCancel={closeEditor}
        onApply={handleEditorApply}
      />

      {/* CONFIRMATIONS */}
      <DeleteConfirmationModal
        isOpen={deleteConfirmOpen}
        title="Delete Product"
        itemName={product?.name}
        loading={deleting}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteProduct}
      />
      <DeleteConfirmationModal
        isOpen={!!deleteVariantTarget}
        title="Delete Variant"
        itemName={deleteVariantTarget?.variantName}
        loading={deletingVariant}
        onCancel={() => setDeleteVariantTarget(null)}
        onConfirm={handleDeleteVariant}
      />
      <DeleteConfirmationModal
        isOpen={!!deleteImageTarget}
        title="Delete Image"
        itemName="this image"
        loading={deletingImage}
        onCancel={() => setDeleteImageTarget(null)}
        onConfirm={handleConfirmDeleteImage}
      />
      <DeleteConfirmationModal
        isOpen={!!deleteDocTarget}
        title="Delete Document"
        itemName={deleteDocTarget?.fileName}
        loading={deletingDoc}
        onCancel={() => setDeleteDocTarget(null)}
        onConfirm={handleConfirmDeleteDocument}
      />
    </>
  );
};

export default ProductDetailDrawer;
