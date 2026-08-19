import { useState, useEffect } from "react";
import { Download, Printer, Eye, SquarePen, Trash2 } from "lucide-react";
import DeleteConfirmationModal from "../details/DeleteConfirmationModal";
import Pagination from "../common/Pagination";
import IconButton from "../common/IconButton";
import Modal from "../common/Modal";
import CommonTable from "../common/CommonTable";
import TableToolbar from "../common/TableToolbar";
import ImageCell from "../common/ImageCell";
import StatusBadge from "../common/StatusBadge";

const baseUrl = import.meta.env.VITE_API_BASE_URL;

const BannerTable = ({ data = [], title = "Banners", onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const filteredData = data.filter((item) => {
    if (!searchTerm) return true;
    return [item?.type, item?.status]
      .filter(Boolean)
      .some((v) => v.toString().toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const imageUrl = (image) => `${baseUrl}/profilepic/${image}`;

  const handleDownloadCSV = () => {
    const headers = "Image,Status\r\n";
    let csv = headers;

    filteredData.forEach((item) => {
      const row = [item.image, item.status]
        .map((v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`)
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

  const handlePrint = () => {
    let html = "<html><head><title>Print</title>";
    html +=
      "<style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f2f2f2}</style></head><body>";
    html += `<h2>${title}</h2><table><thead><tr><th>Image</th><th>Status</th></tr></thead><tbody>`;
    filteredData.forEach((item) => {
      html += `<tr><td>${item.image ?? ""}</td><td>${item.status ?? ""}</td></tr>`;
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const columns = [
    {
      key: "image",
      header: "Image",
      width: "80px",
      render: (item) =>
        item?.image ? (
          <ImageCell
            src={imageUrl(item.image)}
            alt={`banner-${item.id}`}
            size={56}
            onClick={() => setPreviewImage(imageUrl(item.image))}
          />
        ) : (
          <ImageCell src={null} size={56} />
        ),
    },
    {
      key: "status",
      header: "Status",
      width: "120px",
      render: (item) => (
        <StatusBadge
          status={item?.status}
          tone={
            item?.status === "active" || item?.status === "terminated"
              ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
              : "bg-red-50 text-red-700 ring-red-600/20"
          }
        />
      ),
    },
  ];

  return (
    <div>
      <TableToolbar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by status..."
        actions={
          <>
            <IconButton
              icon={Download}
              label="Export"
              tone="green"
              onClick={handleDownloadCSV}
            />
            <IconButton
              icon={Printer}
              label="Print"
              tone="neutral"
              onClick={handlePrint}
            />
          </>
        }
      />

      <CommonTable
        columns={columns}
        data={currentItems}
        emptyMessage={`No ${(title || "banners").toLowerCase()} found`}
        minWidth="420px"
        renderRowActions={(item) => (
          <>
            {item?.image && (
              <IconButton
                icon={Eye}
                label="View"
                tone="blue"
                onClick={() => setPreviewImage(imageUrl(item.image))}
              />
            )}
            <IconButton
              icon={SquarePen}
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
        totalItems={filteredData.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={(value) => {
          setItemsPerPage(value);
          setCurrentPage(1);
        }}
      />

      <DeleteConfirmationModal
        isOpen={!!deleteTarget}
        title="Delete Banner"
        itemName="this banner"
        loading={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />

      <Modal
        open={!!previewImage}
        onClose={() => setPreviewImage(null)}
        title="Image preview"
        maxWidth="max-w-xl"
      >
        {previewImage && (
          <img
            src={previewImage}
            alt="preview"
            className="w-full max-h-[70vh] object-contain rounded-xl"
          />
        )}
      </Modal>
    </div>
  );
};

export default BannerTable;
