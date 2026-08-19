// src/components/table/CategoryTable.jsx
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Download, Eye, Pencil, Archive, FolderTree, Plus, Upload } from "lucide-react";
import DeleteConfirmationModal from "../details/DeleteConfirmationModal";
import Pagination from "../common/Pagination";
import IconButton from "../common/IconButton";
import Modal from "../common/Modal";
import CommonTable from "../common/CommonTable";
import EmptyState from "../common/EmptyState";
import MkPill from "../common/MkPill";
import { mkTileColor } from "../../utils/mkTileColor";
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

// Category-relevant health chips, matching the Product page's HEALTH_DEFS
// pattern — no "All" chip here (status is already covered by the Status
// select), so a chip toggles on/off by clicking it again.
const HEALTH_DEFS = [
  { key: "noimage", label: "Missing image" },
  { key: "noproducts", label: "No products" },
];

const CategoryTable = ({
  data,
  title,
  onEdit,
  onDelete,
  onAddNew,
  onView,
  onViewProducts,
  onToggleStatus,
  togglingId,
  onBulkImportClick,
  importing,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [healthFilter, setHealthFilter] = useState(null);
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [statusConfirmTarget, setStatusConfirmTarget] = useState(null);
  const [changingStatus, setChangingStatus] = useState(false);

  // Status never flips on the raw click — same confirm-before-mutate pattern
  // as the Products page's status pill, reusing the existing onToggleStatus
  // → updateCategory({isActive}) call already wired by the caller.
  const handleConfirmStatusChange = async () => {
    if (!statusConfirmTarget) return;
    setChangingStatus(true);
    await onToggleStatus?.(statusConfirmTarget, statusConfirmTarget.status !== "active");
    setChangingStatus(false);
    setStatusConfirmTarget(null);
  };

  // Real, cross-referenced category data — `image` comes straight off the
  // category record, `productsCount` is cross-referenced from live products
  // (see Category.jsx's productCountByCategory), so both counts below reflect
  // actual data, not placeholders.
  const healthCount = (key) => {
    if (key === "noimage") return data.filter((item) => !item.image).length;
    if (key === "noproducts") return data.filter((item) => (item.productsCount ?? 0) === 0).length;
    return 0;
  };

  const filteredData = data.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (healthFilter === "noimage" && item.image) return false;
    if (healthFilter === "noproducts" && (item.productsCount ?? 0) !== 0) return false;
    if (!searchTerm) return true;
    return ["name", "status"].some((key) =>
      item[key]?.toString().toLowerCase().includes(searchTerm.toLowerCase()),
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

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const imageUrl = (image) =>
    `${import.meta.env.VITE_API_BASE_URL}/admin/images/${image}`;

  const handleDownloadCSV = () => {
    const cols = ["name", "createdAt", "updatedAt", "status"];
    const headers = cols
      .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
      .join(",");
    let csv = headers + "\r\n";

    sortedData.forEach((item) => {
      const row = cols
        .map((key) => `"${(item[key] ?? "").toString().replace(/"/g, '""')}"`)
        .join(",");
      csv += row + "\r\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase()}_data.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    await onDelete(deleteTarget.id);
    setIsDeleting(false);
    setDeleteTarget(null);
  };

  const handleDeleteClick = (item) => {
    if ((item.productsCount ?? 0) > 0) {
      toast.error(
        `Cannot delete "${item.name}" — ${item.productsCount} product${item.productsCount > 1 ? "s are" : " is"} still assigned. Reassign them first.`,
      );
      return;
    }
    setDeleteTarget(item);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, healthFilter]);

  const columns = [
    {
      key: "name",
      header: "Category",
      sortable: true,
      width: "320px",
      render: (item) => {
        const initial = (item?.name || "?").charAt(0).toUpperCase();
        const tileColor = mkTileColor(item?.id ?? item?.name);
        // Reference design always shows the deterministic colored-letter
        // tile in the row (never the real image thumbnail) — but if a real
        // image exists, the tile stays clickable and still opens the same
        // full preview modal, so nothing about viewing the image is lost.
        const tile = (
          <div
            className="w-[38px] h-[38px] rounded-[8px] flex items-center justify-center text-white text-[13px] font-semibold shrink-0"
            style={{ background: tileColor }}
          >
            {initial}
          </div>
        );
        return (
          <div className="flex items-center gap-3 min-w-0">
            {item?.image ? (
              <button
                type="button"
                onClick={() => setPreviewImage({ src: imageUrl(item.image), name: item.name })}
                aria-label={`Preview ${item.name} image`}
                className="shrink-0 rounded-[8px] ring-1 ring-transparent hover:ring-2 hover:ring-[var(--brand-purple)]/40 transition-all cursor-pointer"
              >
                {tile}
              </button>
            ) : (
              tile
            )}
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold text-[var(--mk-ink-900)] leading-[1.15] !mb-0 truncate max-w-[240px]" title={item.name}>
                {item.name}
              </p>
              <p className="text-[12px] text-[var(--mk-ink-400)] leading-[1.3] !mt-[2px] !mb-0">Added {item.updatedAt}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: "productsCount",
      header: "Products",
      width: "90px",
      align: "right",
      className: "text-[var(--mk-ink-700)] tabular-nums",
      render: (item) => item.productsCount ?? 0,
    },
    {
      key: "updatedAt",
      header: "Added",
      sortable: true,
      width: "130px",
      className: "text-[var(--mk-ink-500)]",
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "100px",
      render: (item) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setStatusConfirmTarget(item);
          }}
          disabled={togglingId === item.id}
          className="cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {item.status === "active" ? (
            <MkPill label="Active" tone="ok" size="sm" />
          ) : (
            <MkPill label="Inactive" tone="mut" size="sm" />
          )}
        </button>
      ),
    },
  ];

  if (data.length === 0) {
    return (
      <div className="py-6">
        <EmptyState
          icon={FolderTree}
          title="No Categories Found"
          description="Create your first category to start organizing products."
        />
        {onAddNew && (
          <div className="flex justify-center pb-4">
            <button
              type="button"
              onClick={onAddNew}
              className="inline-flex items-center gap-2 px-4 py-2.5 h-12 rounded-xl text-[14px] font-semibold text-white bg-[var(--mk-primary)] hover:bg-[var(--mk-primary-hover)] shadow-sm active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              <Plus size={16} />
              Add Category
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1 p-4 overflow-x-auto border-b border-[var(--mk-line)]">
        <div className={FILTER_SEARCH_WRAP_CLASS}>
          <div className={FILTER_SEARCH_ICON_WRAP_CLASS}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--mk-ink-400)]">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={FILTER_SEARCH_INPUT_CLASS}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`${selectClass} shrink-0`}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <div className="flex-1 shrink min-w-2" />

        <div className="flex items-center gap-1 shrink-0">
          {HEALTH_DEFS.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setHealthFilter((prev) => (prev === d.key ? null : d.key))}
              className={filterChipClass(healthFilter === d.key)}
            >
              {d.label}
              <span className={filterChipBadgeClass(healthFilter === d.key)}>
                {healthCount(d.key)}
              </span>
            </button>
          ))}
        </div>

        {/* Relocated from the page header's removed "..." menu — same
            underlying import feature, just a compact icon button here
            instead, matching Export's treatment. */}
        {onBulkImportClick && (
          <button
            type="button"
            onClick={onBulkImportClick}
            disabled={importing}
            aria-label={importing ? "Importing categories..." : "Bulk import categories"}
            title={importing ? "Importing..." : "Bulk import"}
            className={`${FILTER_ICON_BTN_CLASS} disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <Upload size={FILTER_ICON_SIZE} />
          </button>
        )}

        <button
          type="button"
          onClick={handleDownloadCSV}
          className={FILTER_ACTION_BTN_CLASS}
        >
          <Download size={14} />
          Export
        </button>
      </div>

      <CommonTable
        columns={columns}
        data={currentItems}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        emptyMessage={`No ${(title || "items").toLowerCase()} match your search`}
        minWidth="740px"
        headerBgClass="bg-[#FAFBFD]"
        headerTextClass="text-[10.5px] font-semibold text-[var(--mk-ink-400)] tracking-[0.08em]"
        headerHeightClass="h-[38px]"
        rowPaddingY="py-[12px]"
        zebra={false}
        onRowClick={onView}
        renderRowActions={(item) => (
          <>
            <IconButton
              icon={Eye}
              label="View products"
              tone="flat"
              size={17}
              onClick={() => onViewProducts?.(item)}
            />
            <IconButton
              icon={Pencil}
              label="Edit"
              tone="flat"
              size={17}
              onClick={() => onEdit(item)}
            />
            <IconButton
              icon={Archive}
              label="Delete"
              size={17}
              tone="flatDanger"
              onClick={() => handleDeleteClick(item)}
            />
          </>
        )}
      />

      <Pagination
        currentPage={currentPage}
        totalItems={sortedData.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={(value) => {
          setItemsPerPage(value);
          setCurrentPage(1);
        }}
      />

      <DeleteConfirmationModal
        isOpen={!!deleteTarget}
        title="Delete Category?"
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

      {/* STATUS CHANGE CONFIRMATION — same pattern as Products: status never
          flips on the raw click, the real onToggleStatus call only fires
          after Confirm. */}
      <Modal
        open={!!statusConfirmTarget}
        onClose={() => setStatusConfirmTarget(null)}
        title={statusConfirmTarget?.status === "active" ? "Mark as Inactive" : "Mark as Active"}
        maxWidth="max-w-sm"
      >
        <p className="text-[13.5px] text-[var(--mk-ink-700)] px-1 pb-1">
          Are you sure you want to change this category to{" "}
          <span className="font-semibold text-[var(--mk-ink-900)]">
            {statusConfirmTarget?.status === "active" ? "Inactive" : "Active"}
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

export default CategoryTable;
