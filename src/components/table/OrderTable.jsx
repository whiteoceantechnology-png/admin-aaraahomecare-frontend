// src/components/order/OrderTable.jsx
import { useState, useRef, useEffect } from "react";
import {
  Search,
  Download,
  Printer,
  EyeOff,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Eye,
  MapPin,
  XCircle,
} from "lucide-react";

const OrderTable = ({
  data = [],
  title = "Orders",
  onView,
  onTrack,
  onCancel,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    orderId: true,
    orderType: true,
    totalAmount: true,
    paymentStatus: true,
    orderStatus: true,
    date: true,
  });
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const [sortField, setSortField] = useState("orderId");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const tableRef = useRef(null);

  // search
  const filteredData = data.filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return ["orderId", "paymentStatus", "orderStatus"].some((key) =>
      item[key]?.toString().toLowerCase().includes(term)
    );
  });

  // sort
  const sortedData = [...filteredData].sort((a, b) => {
    const av =
      sortField === "date"
        ? a.txnTimeStamp ?? a.createdAt ?? ""
        : a[sortField] ?? "";
    const bv =
      sortField === "date"
        ? b.txnTimeStamp ?? b.createdAt ?? ""
        : b[sortField] ?? "";
    if (av < bv) return sortDirection === "asc" ? -1 : 1;
    if (av > bv) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedData.length / itemsPerPage) || 1;

  const toggleColumn = (column) => {
    setVisibleColumns((prev) => ({ ...prev, [column]: !prev[column] }));
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ArrowUp size={14} className="ml-1" />
    ) : (
      <ArrowDown size={14} className="ml-1" />
    );
  };

  // CSV export
  const handleDownloadCSV = () => {
    const cols = Object.keys(visibleColumns).filter((c) => visibleColumns[c]);
    const headers = cols
      .map((c) => {
        if (c === "id") return "SNo";
        if (c === "orderId") return "Order ID";
        if (c === "orderType") return "Order Type";
        if (c === "totalAmount") return "Total Amount";
        if (c === "paymentStatus") return "Payment Status";
        if (c === "orderStatus") return "Order Status";
        if (c === "date") return "Date";
        return c;
      })
      .join(",");
    let csv = headers + "\r\n";

    sortedData.forEach((item, idx) => {
      const row = cols
        .map((key) => {
          if (key === "id") return `"${idx + 1}"`;
          if (key === "date") {
            return `"${(
              item.txnTimeStamp ?? item.createdAt ?? ""
            )
              .toString()
              .replace(/"/g, '""')}"`;
          }
          return `"${(item[key] ?? "").toString().replace(/"/g, '""')}"`;
        })
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

  // Print
  const handlePrint = () => {
    const cols = Object.keys(visibleColumns).filter((c) => visibleColumns[c]);
    let html = "<html><head><title>Print</title>";
    html +=
      "<style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f2f2f2}</style></head><body>";
    html += `<h2>${title}</h2><table><thead><tr>`;
    cols.forEach((c) => {
      let label = c;
      if (c === "id") label = "SNo";
      if (c === "orderId") label = "Order ID";
      if (c === "orderType") label = "Order Type";
      if (c === "totalAmount") label = "Total Amount";
      if (c === "paymentStatus") label = "Payment Status";
      if (c === "orderStatus") label = "Order Status";
      if (c === "date") label = "Date";
      html += `<th>${label}</th>`;
    });
    html += "</tr></thead><tbody>";

    sortedData.forEach((item, idx) => {
      html += "<tr>";
      cols.forEach((c) => {
        let value = "";
        if (c === "id") value = idx + 1;
        else if (c === "date") value = item.txnTimeStamp ?? item.createdAt ?? "";
        else value = item[c] ?? "";
        html += `<td>${value}</td>`;
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    const handler = (e) => {
      if (
        showColumnToggle &&
        !e.target.closest(".column-toggle-container") &&
        !e.target.closest(".column-toggle-button")
      ) {
        setShowColumnToggle(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showColumnToggle]);

  return (
    <div>
      {/* Top bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border-b border-gray-200">
        <div className="relative w-full md:w-64 mb-4 md:mb-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by order id / status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>

        <div className="flex space-x-2">
          <button
            style={{ cursor: "pointer" }}
            onClick={handleDownloadCSV}
            className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            <Download size={16} className="mr-1" />
            <span className="text-sm">Export</span>
          </button>

          <button
            style={{ cursor: "pointer" }}
            onClick={handlePrint}
            className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            <Printer size={16} className="mr-1" />
            <span className="text-sm">Print</span>
          </button>

          <div className="relative column-toggle-container">
            <button
              style={{ cursor: "pointer" }}
              onClick={() => setShowColumnToggle((p) => !p)}
              className="column-toggle-button flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              <EyeOff size={16} className="mr-1" />
              <span className="text-sm">Columns</span>
              <ChevronDown size={16} className="ml-1" />
            </button>

            {showColumnToggle && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <div className="p-2">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Toggle Columns
                  </h4>
                  <div className="space-y-1">
                    {Object.keys(visibleColumns).map((column) => (
                      <label
                        key={column}
                        className="flex items-center text-sm capitalize"
                      >
                        <input
                          style={{ cursor: "pointer" }}
                          type="checkbox"
                          checked={visibleColumns[column]}
                          onChange={() => toggleColumn(column)}
                          className="mr-2"
                        />
                        {column === "id"
                          ? "SNo"
                          : column === "orderId"
                          ? "Order ID"
                          : column === "orderType"
                          ? "Order Type"
                          : column === "totalAmount"
                          ? "Total Amount"
                          : column === "paymentStatus"
                          ? "Payment Status"
                          : column === "orderStatus"
                          ? "Order Status"
                          : column === "date"
                          ? "Date"
                          : column}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full" ref={tableRef}>
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {visibleColumns.id && (
                <th
                  onClick={() => handleSort("id")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                >
                  SNo {getSortIcon("id")}
                </th>
              )}
              {visibleColumns.orderId && (
                <th
                  onClick={() => handleSort("orderId")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                >
                  Order ID {getSortIcon("orderId")}
                </th>
              )}
              {visibleColumns.orderType && (
                <th
                  onClick={() => handleSort("orderType")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                >
                  Order Type {getSortIcon("orderType")}
                </th>
              )}
              {visibleColumns.totalAmount && (
                <th
                  onClick={() => handleSort("totalAmount")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                >
                  Total Amount {getSortIcon("totalAmount")}
                </th>
              )}
              {visibleColumns.paymentStatus && (
                <th
                  onClick={() => handleSort("paymentStatus")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                >
                  Payment Status {getSortIcon("paymentStatus")}
                </th>
              )}
              {visibleColumns.orderStatus && (
                <th
                  onClick={() => handleSort("orderStatus")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                >
                  Order Status {getSortIcon("orderStatus")}
                </th>
              )}
              {visibleColumns.date && (
                <th
                  onClick={() => handleSort("date")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                >
                  Date {getSortIcon("date")}
                </th>
              )}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {currentItems.length > 0 ? (
              currentItems.map((item, index) => (
                <tr key={item.id}>
                  {visibleColumns.id && (
                    <td className="px-6 py-4 capitalize">
                      {indexOfFirstItem + index + 1}
                    </td>
                  )}

                  {visibleColumns.orderId && (
                    <td className="px-6 py-4">{item.orderId}</td>
                  )}

                  {visibleColumns.orderType && (
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 inline-flex text-xs leading-5 font-semibold rounded capitalize text-white ${
                          item.orderType === "normal"
                            ? "bg-gray-600"
                            : "bg-green-600"
                        }`}
                      >
                        {item.orderType}
                      </span>
                    </td>
                  )}

                  {visibleColumns.totalAmount && (
                    <td className="px-6 py-4">₹{item.totalAmount}</td>
                  )}

                  {visibleColumns.paymentStatus && (
                    <td className="px-6 py-4 capitalize">
                      {item.paymentStatus}
                    </td>
                  )}

                  {visibleColumns.orderStatus && (
                    <td className="px-6 py-4 capitalize">
                      {item.orderStatus}
                    </td>
                  )}

                  {visibleColumns.date && (
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {item.txnTimeStamp ?? item.createdAt}
                    </td>
                  )}

                  <td className="px-6 py-4 text-right space-x-2">
                    {/* View */}
                    <button
                      type="button"
                      style={{ cursor: "pointer" }}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
                      title="View Order Details"
                      onClick={() => onView && onView(item)}
                    >
                      <Eye size={16} />
                    </button>

                    {/* Track */}
                    <button
                      type="button"
                      style={{ cursor: "pointer" }}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"
                      title="Track Order"
                      onClick={() => onTrack && onTrack(item)}
                    >
                      <MapPin size={16} />
                    </button>

                    {/* Cancel */}
                    <button
                      type="button"
                      style={{ cursor: "pointer" }}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
                      title="Cancel Order"
                      onClick={() => onCancel && onCancel(item)}
                    >
                      <XCircle size={16} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="8"
                  className="px-6 py-4 text-center text-sm text-gray-500"
                >
                  No {title.toLowerCase()} found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
        <p className="text-sm text-gray-700">
          Showing{" "}
          <span className="font-medium">
            {currentItems.length > 0 ? indexOfFirstItem + 1 : 0}
          </span>{" "}
          to{" "}
          <span className="font-medium">
            {Math.min(indexOfLastItem, sortedData.length)}
          </span>{" "}
          of <span className="font-medium">{sortedData.length}</span> results
        </p>
        <div className="flex">
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.max(prev - 1, 1))
            }
            disabled={currentPage === 1}
            className={`px-3 py-1 text-sm rounded-l-md ${
              currentPage === 1
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Prev
          </button>
          <span className="px-4 py-1 text-sm text-gray-700">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
            className={`px-3 py-1 text-sm rounded-r-md ${
              currentPage === totalPages
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderTable;
