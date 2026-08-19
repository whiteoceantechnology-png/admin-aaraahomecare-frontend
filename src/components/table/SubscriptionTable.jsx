import { useState, useEffect } from "react";
import { Download, Printer, SquarePen } from "lucide-react";
import {
  getAllSubscriptionsList,
  updateSubscriptionStatus,
} from "../../redux/slices/subscriptionSlice";
import { useDispatch } from "react-redux";
import Select from "react-select";
import Pagination from "../common/Pagination";
import { formatDate } from "../../utils/formatDate";
import IconButton from "../common/IconButton";
import CommonTable from "../common/CommonTable";
import TableToolbar from "../common/TableToolbar";

const statusSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: "30px",
    height: "30px",
    minWidth: "90px",
    boxShadow: "none",
    backgroundColor: "white",
    cursor: "pointer",
    border: state.isFocused ? "1px solid #493a78" : "1px solid #D1D5DB",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    "&:hover": { borderColor: "#9CA3AF" },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "0 2px 0 8px",
    margin: 0,
    display: "flex",
    alignItems: "center",
    height: "28px",
    flex: "1 1 auto",
  }),
  singleValue: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
    textTransform: "capitalize",
    fontSize: "12.5px",
    fontWeight: "500",
    color: "#374151",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  }),
  indicatorsContainer: (base) => ({
    ...base,
    padding: 0,
    margin: 0,
    height: "28px",
    width: "16px",
    flexShrink: 0,
  }),
  dropdownIndicator: (base) => ({
    ...base,
    padding: "0 4px",
    margin: 0,
    width: "16px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#9CA3AF",
    "&:hover": { color: "#6B7280" },
    svg: { width: "12px", height: "12px" },
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? "#493a78" : "white",
    color: state.isFocused ? "white" : "#374151",
    cursor: "pointer",
    textTransform: "capitalize",
    fontSize: "13px",
    padding: "8px 12px",
    "&:active": { backgroundColor: "#493a78" },
  }),
  menu: (base) => ({
    ...base,
    marginTop: "2px",
    zIndex: 9999,
    borderRadius: "8px",
    boxShadow:
      "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    border: "1px solid #E5E7EB",
    minWidth: "120px",
  }),
  menuList: (base) => ({ ...base, padding: "4px" }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

const SubscriptionTable = ({ data = [], title = "Subscriptions", onEdit }) => {
  const dispatch = useDispatch();

  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  const getCurrentValue = (currentStatus) =>
    statusOptions.find((opt) => opt.value === currentStatus);

  const [activeTab, setActiveTab] = useState("banner");
  const filteredByType = data.filter(
    (item) => item?.type?.toLowerCase() === activeTab.toLowerCase(),
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("type");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filteredData = filteredByType.filter((item) => {
    if (!searchTerm) return true;
    return [item?.type, item?.days, item?.price].some((v) =>
      v?.toString().toLowerCase().includes(searchTerm.toLowerCase()),
    );
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (a[sortField] < b[sortField]) return sortDirection === "asc" ? -1 : 1;
    if (a[sortField] > b[sortField]) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedData.slice(indexOfFirstItem, indexOfLastItem);

  const handleStatusChange = (id, newStatus) => {
    dispatch(updateSubscriptionStatus({ id, status: newStatus })).then(() => {
      dispatch(getAllSubscriptionsList());
    });
  };

  const handleDownloadCSV = () => {
    const headers = "Type,Days,Price,Created,Status\r\n";
    let csv = headers;
    sortedData.forEach((item) => {
      const row = [item.type, item.days, item.price, item.created_at, item.status]
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
    html += `<h2>${title}</h2><table><thead><tr><th>Type</th><th>Days</th><th>Price</th><th>Status</th></tr></thead><tbody>`;
    sortedData.forEach((item) => {
      html += `<tr><td>${item.type ?? ""}</td><td>${item.days ?? ""}</td><td>${item.price ?? ""}</td><td>${item.status ?? ""}</td></tr>`;
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

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  const tabs = [
    { label: "Banner", value: "banner" },
    { label: "Chairs", value: "chairs" },
    { label: "Others", value: "others" },
  ];

  const columns = [
    {
      key: "type",
      header: "Type",
      sortable: true,
      width: "120px",
      className: "font-medium text-gray-800 capitalize",
    },
    {
      key: "days",
      header: "Days",
      width: "80px",
      className: "text-gray-600 tabular-nums",
    },
    {
      key: "price",
      header: "Price",
      width: "100px",
      className: "text-gray-600 tabular-nums",
      render: (item) => `₹${item?.price}`,
    },
    {
      key: "created_at",
      header: "Created",
      width: "130px",
      className: "text-gray-500",
      render: (item) =>
        formatDate(item?.created_at),
    },
    {
      key: "status",
      header: "Status",
      width: "140px",
      render: (item) => (
        <Select
          options={statusOptions}
          value={getCurrentValue(item?.status)}
          onChange={(opt) => handleStatusChange(item?.id, opt.value)}
          isSearchable={false}
          classNamePrefix="minimal-border-select"
          menuPortalTarget={document.body}
          components={{ IndicatorSeparator: () => null }}
          styles={statusSelectStyles}
        />
      ),
    },
  ];

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-100 px-4 pt-4">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 text-[13px] font-medium rounded-t-lg transition-all duration-200 cursor-pointer ${
              activeTab === tab.value
                ? "bg-[var(--brand-purple)]/10 text-[var(--brand-purple)]"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <TableToolbar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={`Search ${activeTab}...`}
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
        emptyMessage={`No ${activeTab} found`}
        minWidth="680px"
        renderRowActions={(item) => (
          <IconButton
            icon={SquarePen}
            label="Edit"
            tone="purple"
            onClick={() => onEdit(item)}
          />
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
    </div>
  );
};

export default SubscriptionTable;
