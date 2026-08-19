import { useState, useEffect } from "react";
import { Download, Printer } from "lucide-react";
import Pagination from "../common/Pagination";
import IconButton from "../common/IconButton";
import CommonTable from "../common/CommonTable";
import TableToolbar from "../common/TableToolbar";
import { formatDateTime } from "../../utils/formatDate";

const NotificationTable = ({ data = [], title = "Notifications" }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filteredData = data.filter((item) => {
    if (!searchTerm) return true;
    return [item?.notification_type, item?.sent_to].some((v) =>
      v?.toString().toLowerCase().includes(searchTerm.toLowerCase()),
    );
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const handleDownloadCSV = () => {
    const headers = "Notification Type,Sent To,Date\r\n";
    let csv = headers;
    filteredData.forEach((item) => {
      const row = [item.notification_type, item.sent_to, item.date]
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
    html += `<h2>${title}</h2><table><thead><tr><th>Notification Type</th><th>Sent To</th><th>Date</th></tr></thead><tbody>`;
    filteredData.forEach((item) => {
      html += `<tr><td>${item.notification_type ?? ""}</td><td>${item.sent_to ?? ""}</td><td>${item.date ?? ""}</td></tr>`;
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
      key: "notification_type",
      header: "Notification Type",
      truncate: true,
      truncateWidth: "220px",
      className: "font-medium text-gray-800 capitalize",
    },
    {
      key: "sent_to",
      header: "Sent To",
      truncate: true,
      truncateWidth: "200px",
      className: "text-gray-600 capitalize",
    },
    {
      key: "date",
      header: "Date",
      width: "200px",
      className: "text-gray-500",
      render: (item) =>
        formatDateTime(item?.date),
    },
  ];

  return (
    <div>
      <TableToolbar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search notifications..."
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
        emptyMessage={`No ${(title || "notifications").toLowerCase()} found`}
        minWidth="560px"
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

export default NotificationTable;
