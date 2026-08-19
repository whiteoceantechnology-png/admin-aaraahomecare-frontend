import { useState, useEffect } from "react";
import { Download, Printer, SquarePen, Trash2 } from "lucide-react";
import DeleteConfirmationModal from "../details/DeleteConfirmationModal";
import Pagination from "../common/Pagination";
import IconButton from "../common/IconButton";
import CommonTable from "../common/CommonTable";
import TableToolbar from "../common/TableToolbar";
import StatusBadge from "../common/StatusBadge";
import { formatDate } from "../../utils/formatDate";

const CouponTable = ({ data = [], title = "Coupons", onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("code");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredData = data.filter((item) => {
    if (!searchTerm) return true;
    return [item?.code, item?.description, item?.status].some((v) =>
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

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const csvColumns = [
    "code",
    "description",
    "usage_limit",
    "discount_type",
    "discount_value",
    "start_date",
    "end_date",
    "status",
  ];

  const handleDownloadCSV = () => {
    const headers = csvColumns
      .map((c) => c.replace("_", " "))
      .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
      .join(",");
    let csv = headers + "\r\n";

    sortedData.forEach((item) => {
      const row = csvColumns
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

  const handlePrint = () => {
    let html = "<html><head><title>Print</title>";
    html +=
      "<style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f2f2f2}</style></head><body>";
    html += `<h2>${title}</h2><table><thead><tr>`;
    csvColumns.forEach((c) => {
      html += `<th>${c.replace("_", " ")}</th>`;
    });
    html += "</tr></thead><tbody>";
    sortedData.forEach((item) => {
      html += "<tr>";
      csvColumns.forEach((c) => {
        html += `<td>${item[c] ?? ""}</td>`;
      });
      html += "</tr>";
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
      key: "code",
      header: "Code",
      sortable: true,
      width: "110px",
      className: "font-semibold text-gray-800 uppercase",
    },
    {
      key: "description",
      header: "Description",
      truncate: true,
      truncateWidth: "220px",
      className: "text-gray-600",
    },
    {
      key: "usage_limit",
      header: "Usage Limit",
      width: "100px",
      className: "text-gray-600 tabular-nums",
    },
    {
      key: "discount_value",
      header: "Discount",
      width: "100px",
      className: "text-gray-600 capitalize",
      render: (item) =>
        item?.discount_type === "percentage"
          ? `${item?.discount_value}%`
          : `₹${item?.discount_value}`,
    },
    {
      key: "start_date",
      header: "Start",
      width: "110px",
      className: "text-gray-500",
      render: (item) =>
        formatDate(item?.start_date),
    },
    {
      key: "end_date",
      header: "End",
      width: "110px",
      className: "text-gray-500",
      render: (item) =>
        formatDate(item?.end_date),
    },
    {
      key: "status",
      header: "Status",
      width: "110px",
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
        searchPlaceholder="Search by code, description..."
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
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        emptyMessage={`No ${(title || "coupons").toLowerCase()} found`}
        minWidth="920px"
        renderRowActions={(item) => (
          <>
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
        title="Delete Coupon"
        itemName={deleteTarget?.code}
        loading={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default CouponTable;
