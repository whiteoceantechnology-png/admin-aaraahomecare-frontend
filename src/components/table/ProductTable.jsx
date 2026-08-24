import { useState, useEffect, useRef } from "react";
import {
  Download,
  Printer,
  SquarePen,
  Archive,
  AlertTriangle,
  AlignJustify,
  Image as ImageIcon,
} from "lucide-react";
import DeleteConfirmationModal from "../details/DeleteConfirmationModal";
import Pagination from "../common/Pagination";
import IconButton from "../common/IconButton";
import Modal from "../common/Modal";
import CommonTable from "../common/CommonTable";
import ImageCell from "../common/ImageCell";
import MkPill from "../common/MkPill";
import CategoryFilterDropdown from "../common/CategoryFilterDropdown";
import { productHealth } from "../../utils/productHealth";
import {
  FILTER_SEARCH_WRAP_CLASS,
  FILTER_SEARCH_ICON_WRAP_CLASS,
  FILTER_SEARCH_INPUT_CLASS,
  FILTER_SELECT_CLASS as selectClass,
  filterChipClass,
  filterChipBadgeClass,
  FILTER_ACTION_BTN_CLASS,
  FILTER_ICON_BTN_CLASS,
  FILTER_ICON_SIZE,
} from "../common/filterToolbarStyles";

const fmtPrice = (n) =>
  Number(n ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const productImages = (value) =>
  Array.isArray(value)
    ? value.filter(Boolean)
    : typeof value === "string" && value
      ? [value]
      : [];
const stockLabel = (item) => {
  if (item?.stock == null || item.stock === "") return "—";
  return `${item.stock}${item.stockUnit ? ` ${item.stockUnit}` : ""}`;
};

const HEALTH_DEFS = [
  // { key: "all", label: "All" },
  { key: "noprice", label: "Missing price" },
  { key: "noimage", label: "Missing image" },
  { key: "novariant", label: "No variants" },
];

const ProductTable = ({
  data = [],
  categories = [],
  title = "Products",
  onEdit,
  onDelete,
  onBulkDelete,
  onExport,
  onToggleStatus,
  // Category/status/search/page are controlled from Product.jsx (backed by
  // URL query params) rather than owned here, so they survive both a
  // save-triggered list refetch and a hard page refresh. See Product.jsx.
  searchTerm = "",
  onSearchChange,
  selectedCategoryIds = new Set(),
  onCategoryChange,
  statusFilter = "all",
  onStatusChange,
  currentPage = 1,
  onPageChange,
}) => {
  const [healthFilter, setHealthFilter] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [compact] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkArchiving, setBulkArchiving] = useState(false);
  const [statusConfirmTarget, setStatusConfirmTarget] = useState(null);
  const [changingStatus, setChangingStatus] = useState(false);

  const handleConfirmStatusChange = async () => {
    if (!statusConfirmTarget) return;
    setChangingStatus(true);
    await onToggleStatus?.(statusConfirmTarget, !statusConfirmTarget.status);
    setChangingStatus(false);
    setStatusConfirmTarget(null);
  };

  const healthCount = (key) =>
    data.filter((item) => productHealth(item).some((f) => f.key === key))
      .length;
  // Multi-select category filter: all categories selected (or none loaded
  // yet) means no filtering — same as the old "All Categories" default.
  const allCategoriesSelected =
    categories.length === 0 || selectedCategoryIds.size === categories.length;

  const filteredData = data.filter((item) => {
    if (
      !allCategoriesSelected &&
      !selectedCategoryIds.has(String(item?.category?.id))
    )
      return false;
    if (statusFilter !== "all") {
      const isActive = statusFilter === "active";
      if (Boolean(item?.status) !== isActive) return false;
    }
    if (
      healthFilter !== "all" &&
      !productHealth(item).some((f) => f.key === healthFilter)
    )
      return false;
    if (!searchTerm) return true;
    return [item?.name, item?.category?.name, item?.hsnCode].some((v) =>
      v?.toString().toLowerCase().includes(searchTerm.toLowerCase()),
    );
  });

  const sortedData = [...filteredData].sort((a, b) => {
    const av = a[sortField] ?? "";
    const bv = b[sortField] ?? "";
    if (av < bv) return sortDirection === "asc" ? -1 : 1;
    if (av > bv) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedData.slice(indexOfFirstItem, indexOfLastItem);

  const pageAllSelected =
    currentItems.length > 0 &&
    currentItems.every((item) => selected.has(item.id));

  const toggleSelectAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (pageAllSelected) {
        currentItems.forEach((item) => next.delete(item.id));
      } else {
        currentItems.forEach((item) => next.add(item.id));
      }
      return next;
    });
  };

  const toggleSelectOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkArchive = async () => {
    if (!onBulkDelete || selected.size === 0) return;
    setBulkArchiving(true);
    await onBulkDelete(Array.from(selected));
    setBulkArchiving(false);
    setSelected(new Set());
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const imageUrl = (path) =>
    `${import.meta.env.VITE_API_BASE_URL}/admin/images/${path}`;

  const handlePrint = () => {
    let html = "<html><head><title>Print</title>";
    html +=
      "<style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f2f2f2}</style></head><body>";
    html += `<h2>${title}</h2><table><thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Tax</th><th>Status</th></tr></thead><tbody>`;
    sortedData.forEach((item) => {
      html += `<tr><td>${item.name ?? ""}</td><td>${item.category?.name ?? ""}</td><td>₹${item.discountPrice ?? ""}</td><td>${item.taxPercent ?? ""}%</td><td>${item.status ? "Active" : "Inactive"}</td></tr>`;
    });
    html += "</tbody></table></body></html>";

    const frame = document.createElement("iframe");
    frame.style.position = "absolute";
    frame.style.top = "-999px";
    document.body.appendChild(frame);
    frame.contentDocument.write(html);
    frame.contentDocument.close();
    setTimeout(() => {
      frame.contentWindow.print();
      document.body.removeChild(frame);
    }, 300);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    await onDelete(deleteTarget.id);
    setIsDeleting(false);
    setDeleteTarget(null);
  };

  // searchTerm/selectedCategoryIds/statusFilter changes already reset the
  // page themselves (see Product.jsx's handlers) — only healthFilter, which
  // stays local to this component, needs to do it here. Skipped on mount so
  // it doesn't rewrite a freshly-restored ?page= from the URL back to 1.
  const healthFilterMountedRef = useRef(false);
  useEffect(() => {
    if (!healthFilterMountedRef.current) {
      healthFilterMountedRef.current = true;
      return;
    }
    onPageChange?.(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [healthFilter]);

  const columns = [
    {
      key: "select",
      header: (
        <input
          type="checkbox"
          checked={pageAllSelected}
          onChange={toggleSelectAllOnPage}
          className="w-[15px] h-[15px] rounded border-[var(--mk-line)] accent-[var(--mk-primary)] cursor-pointer"
          aria-label="Select all on this page"
        />
      ),
      width: "36px",
      render: (item) => (
        <input
          type="checkbox"
          checked={selected.has(item.id)}
          onChange={() => toggleSelectOne(item.id)}
          onClick={(e) => e.stopPropagation()}
          className="w-[15px] h-[15px] rounded border-[var(--mk-line)] accent-[var(--mk-primary)] cursor-pointer"
          aria-label={`Select ${item.name}`}
        />
      ),
    },
    {
      key: "productImage",
      header: "",
      width: "150px",
      render: (item) => {
        const images = productImages(item?.productImage);
        return images.length > 0 ? (
          <div className="flex items-center gap-1.5">
            {images.map((path, index) => (
              <ImageCell
                key={`${path}-${index}`}
                src={imageUrl(path)}
                alt={`${item.name} ${index + 1}`}
                size={38}
                onClick={() =>
                  setPreviewImage({ src: imageUrl(path), name: item?.name })
                }
              />
            ))}
          </div>
        ) : (
          <div className="w-[38px] h-[38px] rounded-lg border-[1.5px] border-dashed border-[var(--mk-line)] bg-[#EEF1F6] flex items-center justify-center text-[var(--mk-ink-400)] shrink-0">
            <ImageIcon size={16} />
          </div>
        );
      },
    },
    {
      key: "name",
      header: "Product",
      sortable: true,
      width: "290px",
      render: (item) => {
        const flags = productHealth(item);
        const isLive = Boolean(item?.status) && Number(item?.discountPrice) > 0;
        return (
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => onEdit?.(item)}
              className="flex items-center gap-1.5 font-semibold text-[14px] leading-[1.2] text-[var(--mk-ink-900)] hover:text-[var(--mk-primary)] transition-colors cursor-pointer text-left truncate max-w-[260px]"
              title={item.name}
            >
              {item.name}
              {isLive && (
                <span
                  className="inline-block w-[7px] h-[7px] rounded-full bg-[#35BEC9] shrink-0"
                  title="Visible on storefront"
                />
              )}
            </button>
            <p className="text-[11.5px] leading-[1.3] text-[var(--mk-ink-400)] !mt-0.5 !mb-0 truncate max-w-[260px]">
              {item?.hsnCode ? `HSN ${item.hsnCode} · ` : ""}
              {item?.variants?.length ?? 0} variant
              {(item?.variants?.length ?? 0) === 1 ? "" : "s"}
              {flags.length > 0 && ` · ${flags.map((f) => f.label).join(", ")}`}
            </p>
          </div>
        );
      },
    },
    {
      key: "category",
      header: "Category",
      width: "170px",
      truncate: true,
      truncateWidth: "150px",
      className: "text-[var(--mk-ink-700)]",
      render: (item) => item?.category?.name || "—",
    },
    {
      key: "brand",
      header: "Brand",
      width: "140px",
      truncate: true,
      truncateWidth: "120px",
      className: "text-[var(--mk-ink-700)]",
      render: (item) => item?.brand?.name || "—",
    },
    {
      key: "discountPrice",
      header: "Price",
      width: "140px",
      align: "right",
      render: (item) =>
        Number(item?.discountPrice) > 0 ? (
          <div className="flex items-baseline justify-end gap-2">
            <span className="text-[var(--mk-ink-900)] font-semibold tabular-nums">
              ₹{fmtPrice(item?.discountPrice)}
            </span>
            {Number(item?.actualPrice) > Number(item?.discountPrice) && (
              <span className="text-[12px] text-[var(--mk-ink-400)] line-through tabular-nums">
                ₹{fmtPrice(item?.actualPrice)}
              </span>
            )}
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 text-[var(--mk-warn)] text-[12px] font-medium">
            <AlertTriangle size={12} />
            No price set
          </span>
        ),
    },
    {
      key: "taxPercent",
      header: "Tax",
      width: "70px",
      align: "right",
      className: "text-[var(--mk-ink-700)] tabular-nums",
      render: (item) => `${item?.taxPercent ?? 0}%`,
    },
    {
      key: "stock",
      header: "Stock",
      width: "100px",
      align: "right",
      className: "text-[var(--mk-ink-700)] tabular-nums",
      render: (item) => stockLabel(item),
    },
    {
      key: "status",
      header: "Status",
      width: "110px",
      render: (item) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setStatusConfirmTarget(item);
          }}
          className="cursor-pointer"
        >
          {item?.status ? (
            <MkPill label="In Stock" tone="ok" size="sm" />
          ) : (
            <MkPill label="Out of Stock" tone="mut" size="sm" />
          )}
        </button>
      ),
    },
  ];

  return (
    <div>
      {/* {zeroPriceActiveCount > 0 && (
        <div className="flex items-center gap-2 mx-[16px] mt-[16px] mb-1 min-h-[42px] px-[12px] py-2 rounded-[10px] bg-[var(--mk-warn-bg)] border border-[#F2D9B8] text-[#7A3A08] text-[12.5px] leading-[1.35]">
          <AlertTriangle size={14} className="shrink-0" />
          <div>
            <b>{zeroPriceActiveCount}</b> In Stock product{zeroPriceActiveCount > 1 ? "s are" : " is"} missing a
            price. Set a price or mark the product Out of Stock.{" "}
            <button
              type="button"
              onClick={() => setHealthFilter("noprice")}
              className="underline font-semibold cursor-pointer"
            >
              View
            </button>
          </div>
        </div>
      )} */}

      {/* Alignment is intentionally matched to aaraa-admin-redesign.html, which
          is the approved design reference. This was previously communicated
          but was not carried over correctly into the React implementation for
          every page — the toolbar padding, search box (280px/38px via
          FILTER_SEARCH_WRAP_CLASS + FILTER_SEARCH_INPUT_CLASS), filter/select
          height and card wrapping below are the same shared values already
          verified against the reference for Orders/Customers/Category, reused
          here rather than re-derived. */}
      <div className="flex items-center gap-1 p-[16px] overflow-x-auto border-b border-[var(--mk-line)]">
        <div className={FILTER_SEARCH_WRAP_CLASS}>
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
            placeholder="Search by name, category or HSN..."
            value={searchTerm}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className={FILTER_SEARCH_INPUT_CLASS}
          />
        </div>

        <CategoryFilterDropdown
          categories={categories}
          selectedIds={selectedCategoryIds}
          onChange={onCategoryChange}
        />

        <select
          value={statusFilter}
          onChange={(e) => onStatusChange?.(e.target.value)}
          className={`${selectClass} shrink-0`}
          aria-label="Filter by status"
        >
          <option value="all">All Status</option>
          <option value="active">In Stock</option>
          <option value="inactive">Out of Stock</option>
        </select>

        <div className="flex-1 shrink min-w-2" />

        <div className="flex items-center gap-1 shrink-0">
          {HEALTH_DEFS.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setHealthFilter(d.key)}
              className={filterChipClass(healthFilter === d.key)}
            >
              {d.label}
              {d.key !== "all" && (
                <span className={filterChipBadgeClass(healthFilter === d.key)}>
                  {healthCount(d.key)}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* <IconButton
          icon={AlignJustify}
          label={compact ? "Comfortable density" : "Compact density"}
          tone={compact ? "purple" : "flat"}
          onClick={() => setCompact((v) => !v)}
        /> */}
        <button
          type="button"
          onClick={onExport}
          className={FILTER_ACTION_BTN_CLASS}
        >
          <Download size={FILTER_ICON_SIZE} />
          Export
        </button>
        <button
          type="button"
          onClick={handlePrint}
          aria-label="Print"
          className={FILTER_ICON_BTN_CLASS}
        >
          <Printer size={FILTER_ICON_SIZE} />
        </button>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-[var(--mk-primary-50)] border-b border-[var(--mk-primary)]/20 text-[12.5px] font-semibold text-[var(--mk-primary)]">
          <span>{selected.size} selected</span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleBulkArchive}
            disabled={bulkArchiving}
            className="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold text-white bg-[var(--mk-primary)] hover:bg-[var(--mk-primary-hover)] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {bulkArchiving ? "Deleting..." : "Delete"}
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold text-[var(--mk-ink-500)] hover:bg-black/[0.04] transition-colors cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      <CommonTable
        columns={columns}
        data={currentItems}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        emptyMessage={`No ${(title || "items").toLowerCase()} found`}
        minWidth="900px"
        headerBgClass="bg-[#FAFBFD]"
        headerTextClass="text-[10.5px] font-semibold text-[var(--mk-ink-400)] tracking-[0.08em]"
        headerHeightClass="h-[38px]"
        rowPaddingY={compact ? "py-1.5" : "py-[12px]"}
        rowMinH={compact ? "min-h-6" : "min-h-8"}
        onRowClick={onEdit}
        renderRowActions={(item) => (
          <>
            <IconButton
              icon={SquarePen}
              label="Edit"
              tone="flat"
              size={17}
              onClick={() => onEdit(item)}
            />
            <IconButton
              icon={Archive}
              label="Delete"
              tone="flatDanger"
              size={17}
              onClick={() => setDeleteTarget(item)}
            />
          </>
        )}
      />

      <Pagination
        currentPage={currentPage}
        totalItems={sortedData.length}
        itemsPerPage={itemsPerPage}
        onPageChange={onPageChange}
        onItemsPerPageChange={(value) => {
          setItemsPerPage(value);
          onPageChange?.(1);
        }}
      />

      <DeleteConfirmationModal
        isOpen={!!deleteTarget}
        title="Delete Product"
        itemName={deleteTarget?.name}
        loading={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />

      <Modal
        open={!!previewImage}
        onClose={() => setPreviewImage(null)}
        title={previewImage?.name || "Image preview"}
        maxWidth="max-w-xl"
      >
        {previewImage && (
          <img
            src={previewImage.src}
            alt={previewImage.name || "preview"}
            className="w-full max-h-[70vh] object-contain rounded-xl"
          />
        )}
      </Modal>

      {/* STATUS CHANGE CONFIRMATION — status never flips on the raw click;
          the real updateProduct call only fires after Confirm. */}
      <Modal
        open={!!statusConfirmTarget}
        onClose={() => setStatusConfirmTarget(null)}
        title={
          statusConfirmTarget?.status
            ? "Mark as Out of Stock"
            : "Mark as In Stock"
        }
        maxWidth="max-w-sm"
      >
        <p className="text-[13.5px] text-[var(--mk-ink-700)] px-1 pb-1">
          Are you sure you want to change this product to{" "}
          <span className="font-semibold text-[var(--mk-ink-900)]">
            {statusConfirmTarget?.status ? "Out of Stock" : "In Stock"}
          </span>
          ?
        </p>
        <div className="flex justify-end gap-2.5 px-1 pt-4">
          <button
            type="button"
            onClick={() => setStatusConfirmTarget(null)}
            disabled={changingStatus}
            className="px-4 py-2.5 rounded-lg text-[13px] font-semibold text-[var(--mk-ink-700)] border border-[var(--mk-line)] bg-white hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmStatusChange}
            disabled={changingStatus}
            className="px-4 py-2.5 rounded-lg text-[13px] font-semibold text-white bg-[var(--mk-primary)] hover:bg-[var(--mk-primary-hover)] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {changingStatus ? "Saving..." : "Confirm"}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default ProductTable;
