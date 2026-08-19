// src/components/details/ProductDocumentsCard.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import {
  FileText,
  FileCheck2,
  TriangleAlert,
  ShieldCheck,
  UploadCloud,
  Pencil,
  Trash2,
  ExternalLink,
  Eye,
} from "lucide-react";

import {
  getProductDocuments,
  addProductDocument,
  updateProductDocument,
  deleteProductDocument,
} from "../../redux/slices/productSlice";
import InfoCard from "../common/InfoCard";
import EmptyState from "../common/EmptyState";
import Skeleton from "../common/Skeleton";
import Modal from "../common/Modal";
import IconButton from "../common/IconButton";
import DeleteConfirmationModal from "./DeleteConfirmationModal";

/**
 * Document types the API accepts today, from the OpenAPI enum on
 * POST /admin/products/{productId}/documents.
 *
 * Adding a type later is one entry here — the form's dropdown, the badge and
 * the icon all read from this map, and anything the API sends that is not
 * listed still renders through DEFAULT_TYPE rather than breaking the row.
 */
const DOCUMENT_TYPES = {
  COA: { label: "COA", icon: FileCheck2, className: "bg-emerald-50 text-emerald-700" },
  MSDS: { label: "MSDS", icon: TriangleAlert, className: "bg-amber-50 text-amber-700" },
  SDS: { label: "SDS", icon: ShieldCheck, className: "bg-blue-50 text-blue-700" },
};
const DEFAULT_TYPE = { icon: FileText, className: "bg-gray-100 text-gray-600" };

const typeMeta = (type) => {
  const key = String(type || "").toUpperCase();
  const meta = DOCUMENT_TYPES[key] || DEFAULT_TYPE;
  return { ...meta, label: meta.label || key || "FILE" };
};

/** What the API will take. Anything else is rejected before the request. */
const ACCEPTED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];
const ACCEPTED_MIME = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const MAX_FILE_MB = 10;

const validateFile = (file) => {
  if (!file) return null;
  const name = file.name.toLowerCase();
  const okExtension = ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
  const okMime = !file.type || ACCEPTED_MIME.includes(file.type);
  if (!okExtension || !okMime) {
    return `Unsupported file type. Upload a PDF or an image (${ACCEPTED_EXTENSIONS.join(", ")}).`;
  }
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    return `File is too large. The limit is ${MAX_FILE_MB} MB.`;
  }
  return null;
};

/** The public streaming endpoint — the same URL the storefront previews. */
const documentFileUrl = (documentId) =>
  `${import.meta.env.VITE_API_BASE_URL}/products/documents/${documentId}/file`;

const readableSize = (bytes) => {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

const fieldClass =
  "w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand-purple)]/25 focus:border-[var(--brand-purple)]";

/**
 * Technical Documents section of the product detail page.
 *
 * Owns the whole COA / MSDS / SDS lifecycle for one product: list, upload,
 * retitle, replace the file, delete. Every write refreshes the list from the
 * API rather than patching local state, so what is on screen is what the
 * server holds — no page reload.
 */
const ProductDocumentsCard = ({ productId }) => {
  const dispatch = useDispatch();
  const { documents, documentsLoading, documentsError } = useSelector(
    (state) => state.product || {},
  );

  const [showForm, setShowForm] = useState(false);
  /** null = uploading a new document; a document = editing that one. */
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ documentType: "COA", documentTitle: "" });
  const [file, setFile] = useState(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  const refetch = () => dispatch(getProductDocuments(productId));

  useEffect(() => {
    if (productId) dispatch(getProductDocuments(productId));
  }, [dispatch, productId]);

  const rows = useMemo(
    () => (Array.isArray(documents) ? documents : []),
    [documents],
  );

  /* ================= FORM ================= */

  const openUpload = () => {
    setEditing(null);
    setForm({ documentType: "COA", documentTitle: "" });
    setFile(null);
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (doc) => {
    setEditing(doc);
    setForm({
      documentType: String(doc.documentType || doc.type || "COA").toUpperCase(),
      documentTitle: doc.documentTitle || doc.title || "",
    });
    setFile(null);
    setFormError("");
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setEditing(null);
    setFile(null);
    setFormError("");
  };

  const handleFileChange = (e) => {
    const picked = e.target.files?.[0] || null;
    e.target.value = "";
    if (!picked) return;

    const problem = validateFile(picked);
    if (problem) {
      setFile(null);
      setFormError(problem);
      toast.error(problem);
      return;
    }
    setFormError("");
    setFile(picked);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const title = form.documentTitle.trim();
    if (!title) {
      setFormError("Enter a document title.");
      return;
    }
    if (!editing && !file) {
      setFormError("Choose a PDF or image file to upload.");
      return;
    }
    if (editing && !file && title === (editing.documentTitle || editing.title || "")) {
      setFormError("Change the title or pick a new file first.");
      return;
    }

    const data = new FormData();
    data.append("documentTitle", title);
    if (!editing) data.append("documentType", form.documentType);
    if (file) data.append("document", file);

    setSaving(true);
    const res = editing
      ? await dispatch(
          updateProductDocument({ productId, documentId: editing.id, data }),
        )
      : await dispatch(addProductDocument({ productId, data }));
    setSaving(false);

    const action = editing ? updateProductDocument : addProductDocument;
    if (action.fulfilled.match(res)) {
      toast.success(editing ? "Document updated" : "Document uploaded");
      closeForm();
      refetch();
    } else {
      const message = res.payload || "Something went wrong";
      setFormError(message);
      toast.error(message);
    }
  };

  /* ================= DELETE ================= */

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await dispatch(
      deleteProductDocument({ productId, documentId: deleteTarget.id }),
    );
    setDeleting(false);

    if (deleteProductDocument.fulfilled.match(res)) {
      toast.success("Document deleted");
      refetch();
    } else {
      toast.error(res.payload || "Failed to delete document");
    }
    setDeleteTarget(null);
  };

  /* ================= RENDER ================= */

  return (
    <>
      <InfoCard
        title={`Technical Documents (${rows.length})`}
        icon={FileText}
        actions={
          <button
            type="button"
            onClick={openUpload}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium text-[var(--brand-purple)] bg-[var(--brand-purple)]/8 hover:bg-[var(--brand-purple)]/14 transition-colors cursor-pointer"
          >
            <UploadCloud size={14} />
            Upload Document
          </button>
        }
      >
        {documentsLoading && rows.length === 0 ? (
          <div className="space-y-2.5">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : documentsError ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm font-medium text-red-600">{documentsError}</p>
            <button
              type="button"
              onClick={refetch}
              className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Try again
            </button>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No technical documents yet"
            description="Upload the COA or MSDS so customers can download it from the product page."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {rows.map((doc) => {
              const meta = typeMeta(doc.documentType || doc.type);
              const Icon = meta.icon;
              const title = doc.documentTitle || doc.title || doc.fileName || "Document";
              const size = readableSize(doc.fileSize ?? doc.size);
              return (
                <div
                  key={doc.id}
                  className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-100 bg-white hover:border-gray-200 transition-colors"
                >
                  <span
                    className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${meta.className}`}
                  >
                    <Icon size={18} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${meta.className}`}
                    >
                      {meta.label}
                    </span>
                    <p className="mt-1 text-[14px] font-medium text-gray-900 break-words">
                      {title}
                    </p>
                    <p className="text-[12px] text-gray-400 truncate">
                      {[doc.fileName || doc.originalName, size].filter(Boolean).join(" · ")}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <IconButton
                      icon={Eye}
                      label="Preview"
                      tone="neutral"
                      onClick={() => setPreview({ ...doc, title })}
                    />
                    <IconButton
                      icon={Pencil}
                      label="Edit document"
                      tone="purple"
                      onClick={() => openEdit(doc)}
                    />
                    <IconButton
                      icon={Trash2}
                      label="Delete document"
                      tone="red"
                      onClick={() => setDeleteTarget({ ...doc, title })}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </InfoCard>

      {/* UPLOAD / EDIT */}
      <Modal
        open={showForm}
        onClose={closeForm}
        title={editing ? "Edit Document" : "Upload Document"}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <div>
            <label className="block mb-1.5 text-[13px] font-medium text-gray-700">
              Document type
            </label>
            <select
              value={form.documentType}
              onChange={(e) => setForm((f) => ({ ...f, documentType: e.target.value }))}
              disabled={Boolean(editing)}
              className={`${fieldClass} disabled:bg-gray-50 disabled:text-gray-500`}
            >
              {Object.keys(DOCUMENT_TYPES).map((type) => (
                <option key={type} value={type}>
                  {DOCUMENT_TYPES[type].label}
                </option>
              ))}
            </select>
            {editing && (
              <p className="mt-1 text-[12px] text-gray-400">
                The type cannot be changed — delete and re-upload to switch it.
              </p>
            )}
          </div>

          <div>
            <label className="block mb-1.5 text-[13px] font-medium text-gray-700">
              Document title
            </label>
            <input
              type="text"
              value={form.documentTitle}
              onChange={(e) => setForm((f) => ({ ...f, documentTitle: e.target.value }))}
              placeholder="e.g. Apricot Carrier Oil COA"
              className={fieldClass}
            />
          </div>

          <div>
            <label className="block mb-1.5 text-[13px] font-medium text-gray-700">
              {editing ? "Replace file (optional)" : "File"}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept={`${ACCEPTED_EXTENSIONS.join(",")},${ACCEPTED_MIME.join(",")}`}
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium text-[var(--brand-purple)] bg-[var(--brand-purple)]/8 hover:bg-[var(--brand-purple)]/14 transition-colors cursor-pointer"
              >
                <UploadCloud size={14} />
                Choose file
              </button>
              <span className="min-w-0 flex-1 truncate text-[13px] text-gray-500">
                {file
                  ? `${file.name} (${readableSize(file.size)})`
                  : editing
                    ? editing.fileName || editing.originalName || "Keeping the current file"
                    : "No file chosen"}
              </span>
            </div>
            <p className="mt-1 text-[12px] text-gray-400">
              PDF or image, up to {MAX_FILE_MB} MB.
            </p>
          </div>

          {formError && (
            <p className="text-[13px] font-medium text-red-600">{formError}</p>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              className="px-4 py-2.5 h-12 rounded-xl text-[14px] font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 h-12 rounded-xl text-[14px] font-semibold text-white bg-gradient-to-r from-[var(--brand-purple)] to-[var(--brand-purple-dark)] shadow-sm hover:brightness-110 active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:brightness-100"
            >
              {saving
                ? editing
                  ? "Saving..."
                  : "Uploading..."
                : editing
                  ? "Save Changes"
                  : "Upload Document"}
            </button>
          </div>
        </form>
      </Modal>

      {/* PREVIEW — the browser's own PDF/image viewer, never a download */}
      <Modal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title={preview?.title || "Document"}
        maxWidth="max-w-3xl"
      >
        {preview && (
          <div className="p-2 space-y-3">
            <iframe
              src={documentFileUrl(preview.id)}
              title={preview.title}
              className="w-full h-[65vh] rounded-xl border border-gray-100 bg-gray-50"
            />
            <a
              href={documentFileUrl(preview.id)}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--brand-purple)] hover:text-[var(--brand-purple-dark)] transition-colors"
            >
              <ExternalLink size={14} />
              Open in new tab
            </a>
          </div>
        )}
      </Modal>

      {/* DELETE CONFIRM */}
      <DeleteConfirmationModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Document?"
        itemName={deleteTarget?.title || "this document"}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};

export default ProductDocumentsCard;
