// src/components/table/CategoryTable.jsx
import { useState, useRef, useEffect } from "react";
import {
  Search,
  Download,
  Printer,
  EyeOff,
  ChevronDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

const CategoryTable = ({ data, title, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    image: true,
    name: true,
    taxPercentage: true,
    createdAt: true,
    updatedAt: true,
    status: true,
  });
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const tableRef = useRef(null);

  // search
  const filteredData = data.filter((item) => {
    if (!searchTerm) return true;
    return ["name", "status"].some((key) =>
      item[key]?.toString().toLowerCase().includes(searchTerm.toLowerCase()),
    );
  });

  // sort
  const sortedData = [...filteredData].sort((a, b) => {
    const av = a[sortField] ?? "";
    const bv = b[sortField] ?? "";
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

  // CSV export (extra fields included)
  const handleDownloadCSV = () => {
    const cols = Object.keys(visibleColumns).filter((c) => visibleColumns[c]);
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

  // Print (extra fields included)
  const handlePrint = () => {
    const cols = Object.keys(visibleColumns).filter((c) => visibleColumns[c]);
    let html = "<html><head><title>Print</title>";
    html +=
      "<style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f2f2f2}</style></head><body>";
    html += `<h2>${title}</h2><table><thead><tr>`;
    cols.forEach((c) => {
      html += `<th>${c.charAt(0).toUpperCase() + c.slice(1)}</th>`;
    });
    html += "</tr></thead><tbody>";
    sortedData.forEach((item) => {
      html += "<tr>";
      cols.forEach((c) => {
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
            placeholder="Search by name or status..."
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
                        {column === "taxPercentage"
                          ? "Tax"
                          : column === "createdAt"
                            ? "Created"
                            : column === "updatedAt"
                              ? "Updated"
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
              {visibleColumns.image && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Image
                </th>
              )}
              {visibleColumns.name && (
                <th
                  onClick={() => handleSort("name")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                >
                  Name {getSortIcon("name")}
                </th>
              )}
              {visibleColumns.taxPercentage && (
                <th
                  onClick={() => handleSort("taxPercentage")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                >
                  Tax {getSortIcon("taxPercentage")}
                </th>
              )}
              {visibleColumns.createdAt && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
              )}
              {visibleColumns.updatedAt && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Updated
                </th>
              )}
              {visibleColumns.status && (
                <th
                  onClick={() => handleSort("status")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                >
                  Status {getSortIcon("status")}
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
                <tr key={item?.id}>
                  {visibleColumns.id && (
                    <td className="px-6 py-4 capitalize">
                      {indexOfFirstItem + index + 1}
                    </td>
                  )}

                  {visibleColumns.image && (
                    <td className="px-6 py-4">
                      {item?.image ? (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden">
                          <img
                            src={`${import.meta.env.VITE_API_BASE_URL}/profilepic/${item?.image}`}
                            alt={`category-image-${item.id}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gray-200 flex items-center justify-center text-gray-500">
                          No Image
                        </div>
                      )}
                    </td>
                  )}

                  {visibleColumns.name && (
                    <td className="px-6 py-4 capitalize">{item?.name}</td>
                  )}

                  {visibleColumns.taxPercentage && (
                    <td className="px-6 py-4">{item?.taxPercentage ?? 0}%</td>
                  )}

                  {visibleColumns.createdAt && (
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {item?.createdAt}
                    </td>
                  )}

                  {visibleColumns.updatedAt && (
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {item?.updatedAt}
                    </td>
                  )}

                  {visibleColumns.status && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 inline-flex text-xs leading-5 font-semibold rounded capitalize ${
                          item?.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {item?.status}
                      </span>
                    </td>
                  )}

                  <td className="px-6 py-4 text-right">
                    <button
                      style={{ cursor: "pointer" }}
                      onClick={() => onEdit(item)}
                      className="text-indigo-600 hover:text-indigo-900 mr-2"
                    >
                      Edit
                    </button>
                    <button
                      style={{ cursor: "pointer" }}
                      onClick={() => onDelete(item?.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
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
                  No {(title || "items").toLowerCase()} found
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
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
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

export default CategoryTable;
