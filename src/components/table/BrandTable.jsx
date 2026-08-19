import { useState, useEffect } from "react";
import { Download, Pencil, Trash2, RefreshCw, Tags, Plus, Search } from "lucide-react";
import DeleteConfirmationModal from "../details/DeleteConfirmationModal";
import Pagination from "../common/Pagination";
import IconButton from "../common/IconButton";
import Modal from "../common/Modal";
import CommonTable from "../common/CommonTable";
import ImageCell from "../common/ImageCell";
import StatusBadge from "../common/StatusBadge";
import EmptyState from "../common/EmptyState";
import {
  FILTER_SEARCH_ICON_WRAP_CLASS,
  FILTER_SEARCH_INPUT_CLASS,
  FILTER_SELECT_CLASS as selectClass,
  FILTER_ACTION_BTN_CLASS,
  FILTER_ICON_BTN_CLASS,
  FILTER_ICON_SIZE,
} from "../common/filterToolbarStyles";

const BrandTable = ({ data, title, onEdit, onDelete, onAddNew, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const filteredData = data.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
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
    `${import.meta.env.VITE_API_BASE_URL}/${image}`;

  const handleDownloadCSV = () => {
    const cols = ["name", "createdAt", "status"];
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

  const handleRefresh = async () => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    await onDelete(deleteTarget.id);
    setIsDeleting(false);
    setDeleteTarget(null);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const columns = [
    {
      key: "name",
      header: "Brand",
      sortable: true,
      width: "300px",
      render: (item) => (
        <div className="flex items-center gap-3 min-w-0">
          <ImageCell
            src={item?.logoUrl ? imageUrl(item.logoUrl) : null}
            alt={item.name}
            size={44}
            onClick={
              item?.logoUrl
                ? () => setPreviewImage({ src: imageUrl(item.logoUrl), name: item.name })
                : undefined
            }
          />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-gray-800 truncate max-w-[200px]" title={item.name}>
              {item.name}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">Added {item.createdAt}</p>
          </div>
        </div>
      ),
    },
    {
      key: "productsCount",
      header: "Products",
      width: "130px",
      render: (item) => (
        <span className="px-2.5 py-1 rounded-full bg-[var(--brand-purple)]/8 text-[var(--brand-purple)] text-[12px] font-semibold whitespace-nowrap">
          {item.productsCount ?? 0} {item.productsCount === 1 ? "Product" : "Products"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "110px",
      render: (item) => <StatusBadge status={item.status} />,
    },
  ];

  if (data.length === 0) {
    return (
      <div className="py-6">
        <EmptyState
          icon={Tags}
          title="No Brands Found"
          description="Create your first brand to start tagging products."
        />
        {onAddNew && (
          <div className="flex justify-center pb-4">
            <button
              type="button"
              onClick={onAddNew}
              className="inline-flex items-center gap-2 px-4 py-2.5 h-12 rounded-xl text-[14px] font-semibold text-white bg-gradient-to-r from-[var(--brand-purple)] to-[var(--brand-purple-dark)] shadow-sm hover:brightness-110 active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              <Plus size={16} />
              Add Brand
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1 p-4 overflow-x-auto border-b border-[var(--mk-line)]">
        <div className="relative w-44 shrink-0">
          <div className={FILTER_SEARCH_ICON_WRAP_CLASS}>
            <Search size={16} className="text-[var(--mk-ink-400)]" />
          </div>
          <input
            type="text"
            placeholder="Search brand by name or status..."
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
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="Refresh"
          className={`${FILTER_ICON_BTN_CLASS} disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          <RefreshCw size={FILTER_ICON_SIZE} className={refreshing ? "animate-spin" : ""} />
        </button>

        <button
          type="button"
          onClick={handleDownloadCSV}
          className={FILTER_ACTION_BTN_CLASS}
        >
          <Download size={FILTER_ICON_SIZE} />
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
        minWidth="620px"
        rowPaddingY="py-4"
        rowMinH="min-h-11"
        actionsWidth="100px"
        renderRowActions={(item) => (
          <>
            <IconButton
              icon={Pencil}
              label="Edit"
              tone="purple"
              onClick={() => onEdit(item)}
            />
            <IconButton
              icon={Trash2}
              label="Delete"
              tone="red"
              onClick={() => setDeleteTarget(item)}
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
        title="Delete Brand?"
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
    </div>
  );
};

export default BrandTable;
