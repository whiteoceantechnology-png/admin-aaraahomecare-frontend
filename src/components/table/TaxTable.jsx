import { useState, useEffect } from "react";
import { Download, Printer, SquarePen, Trash2 } from "lucide-react";
import DeleteConfirmationModal from "../details/DeleteConfirmationModal";
import Pagination from "../common/Pagination";
import IconButton from "../common/IconButton";
import CommonTable from "../common/CommonTable";
import TableToolbar from "../common/TableToolbar";
import { FILTER_ACTION_BTN_CLASS, FILTER_ICON_BTN_CLASS, FILTER_ICON_SIZE } from "../common/filterToolbarStyles";

const TaxTable = ({ data, title = "Tax", onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredData = data.filter((item) => {
    if (!searchTerm) return true;
    return item?.name?.toLowerCase().includes(searchTerm.toLowerCase());
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

  const handleDownloadCSV = () => {
    const headers = "Name,Percent,Created\r\n";
    let csv = headers;

    sortedData.forEach((item) => {
      const row = [item.name, `${item.percent}%`, item.createdAt]
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
    html += `<h2>${title}</h2><table><thead><tr><th>Name</th><th>Percent</th><th>Created</th></tr></thead><tbody>`;
    sortedData.forEach((item) => {
      html += `<tr><td>${item.name ?? ""}</td><td>${item.percent ?? ""}%</td><td>${item.createdAt ?? ""}</td></tr>`;
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
      key: "name",
      header: "Name",
      sortable: true,
      width: "45%",
      truncate: true,
      truncateWidth: "320px",
      className: "font-medium text-gray-800 capitalize",
    },
    {
      key: "percent",
      header: "Percentage",
      sortable: true,
      width: "25%",
      // align: "right",
      className: "text-gray-600 tabular-nums",
      render: (item) => `${item.percent}%`,
    },
    {
      key: "createdAt",
      header: "Created",
      width: "30%",
      className: "text-gray-500",
    },
  ];

  return (
    <div>
      <TableToolbar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by name..."
        actions={
          <>
            <button type="button" onClick={handleDownloadCSV} className={FILTER_ACTION_BTN_CLASS}>
              <Download size={FILTER_ICON_SIZE} />
              Export
            </button>
            <button type="button" onClick={handlePrint} aria-label="Print" className={FILTER_ICON_BTN_CLASS}>
              <Printer size={FILTER_ICON_SIZE} />
            </button>
          </>
        }
      />

      <CommonTable
        columns={columns}
        data={currentItems}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        emptyMessage={`No ${(title || "items").toLowerCase()} found`}
        minWidth="480px"
        fixedLayout
        rowPaddingY="py-2.5"
        rowMinH="min-h-6"
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
        title="Delete Tax"
        itemName={deleteTarget?.name}
        loading={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default TaxTable;
