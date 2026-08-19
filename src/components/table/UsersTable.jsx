import { useState, useEffect } from "react";
import { Download, Printer, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { updateUserStatus, getAllUsersList } from "../../redux/slices/allUsersSlice";
import { useDispatch } from "react-redux";
import Select from "react-select";
import Pagination from "../common/Pagination";
import IconButton from "../common/IconButton";
import CommonTable from "../common/CommonTable";
import TableToolbar from "../common/TableToolbar";
import ImageCell from "../common/ImageCell";

const statusSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: "30px",
    height: "30px",
    minWidth: "100px",
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

const UsersTable = ({ data = [], title = "Users" }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "terminated", label: "Terminated" },
  ];

  const getDropdownOptions = () =>
    statusOptions.filter((option) => option.value !== "inactive");

  const getCurrentValue = (currentStatus) =>
    statusOptions.find((opt) => opt.value === currentStatus);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filteredData = data.filter((item) => {
    if (!searchTerm) return true;
    return [item?.firstname, item?.lastname, item?.email, item?.phone].some(
      (v) => v?.toString().toLowerCase().includes(searchTerm.toLowerCase()),
    );
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const handleStatusChange = (id, newStatus) => {
    dispatch(updateUserStatus({ id, status: newStatus })).then(() => {
      dispatch(getAllUsersList());
    });
  };

  const handleDownloadCSV = () => {
    const headers = "First Name,Last Name,Phone,Email,Status\r\n";
    let csv = headers;
    filteredData.forEach((item) => {
      const row = [item.firstname, item.lastname, item.phone, item.email, item.status]
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
    html += `<h2>${title}</h2><table><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Status</th></tr></thead><tbody>`;
    filteredData.forEach((item) => {
      html += `<tr><td>${`${item?.firstname || ""} ${item?.lastname || ""}`.trim()}</td><td>${item.phone ?? ""}</td><td>${item.email ?? ""}</td><td>${item.status ?? ""}</td></tr>`;
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
      key: "profilepic",
      header: "Image",
      width: "72px",
      render: (item) =>
        item?.profilepic ? (
          <ImageCell
            src={`${import.meta.env.VITE_API_BASE_URL}/profilepic/${item.profilepic}`}
            alt={`user-${item.id}`}
          />
        ) : (
          <ImageCell src={null} />
        ),
    },
    {
      key: "firstname",
      header: "Name",
      truncate: true,
      truncateWidth: "180px",
      className: "font-medium text-gray-800 capitalize",
      tooltip: (item) => `${item?.firstname || ""} ${item?.lastname || ""}`.trim(),
      render: (item) => `${item?.firstname || ""} ${item?.lastname || ""}`.trim(),
    },
    {
      key: "phone",
      header: "Phone",
      width: "130px",
      className: "text-gray-600 tabular-nums",
    },
    {
      key: "email",
      header: "Email",
      truncate: true,
      truncateWidth: "200px",
      className: "text-gray-600",
    },
    {
      key: "status",
      header: "Status",
      width: "150px",
      render: (item) => (
        <Select
          options={getDropdownOptions()}
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
      <TableToolbar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search users..."
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
        emptyMessage={`No ${(title || "users").toLowerCase()} found`}
        minWidth="760px"
        renderRowActions={(item) => (
          <IconButton
            icon={Eye}
            label="View"
            tone="blue"
            onClick={() => navigate(`/userdetails/${item.id}`)}
          />
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
    </div>
  );
};

export default UsersTable;
