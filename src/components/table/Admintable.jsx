import { useState, useEffect } from "react";
import { Download, Printer } from "lucide-react";
import Pagination from "../common/Pagination";
import IconButton from "../common/IconButton";
import CommonTable from "../common/CommonTable";
import TableToolbar from "../common/TableToolbar";
import StatusBadge from "../common/StatusBadge";

const AdminTable = ({ data = [], title = "Admins" }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filteredData = data.filter((item) => {
    if (!searchTerm) return true;
    return [item?.username, item?.email, item?.phone].some((v) =>
      v?.toString().toLowerCase().includes(searchTerm.toLowerCase()),
    );
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const handleDownloadCSV = () => {
    const headers = "Username,Email,Phone,Status\r\n";
    let csv = headers;
    filteredData.forEach((item) => {
      const row = [item.username, item.email, item.phone, item.status]
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
    html += `<h2>${title}</h2><table><thead><tr><th>Username</th><th>Email</th><th>Phone</th><th>Status</th></tr></thead><tbody>`;
    filteredData.forEach((item) => {
      html += `<tr><td>${item.username ?? ""}</td><td>${item.email ?? ""}</td><td>${item.phone ?? ""}</td><td>${item.status ?? ""}</td></tr>`;
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const columns = [
    {
      key: "username",
      header: "Name",
      truncate: true,
      truncateWidth: "180px",
      className: "font-medium text-gray-800 capitalize",
    },
    {
      key: "email",
      header: "Email",
      truncate: true,
      truncateWidth: "220px",
      className: "text-gray-600",
    },
    {
      key: "phone",
      header: "Phone",
      width: "140px",
      className: "text-gray-600 tabular-nums",
    },
    {
      key: "status",
      header: "Status",
      width: "110px",
      render: (item) => (
        <StatusBadge
          status={item.status || "active"}
          tone={
            item.status === "active" || item.status === "terminated" || !item.status
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
        searchPlaceholder="Search admins..."
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
        emptyMessage={`No ${(title || "admins").toLowerCase()} found`}
        minWidth="640px"
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
    </div>
  );
};

export default AdminTable;
