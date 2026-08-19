import { useState, useRef, useEffect, useMemo } from "react";
import {
  Search,
  Download,
  Printer,
  EyeOff,
  ChevronDown,
  Edit,
  Trash2,
  Filter,
  ArrowUp,
  ArrowDown,
  X,
  Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  updatePartnerStatus,
  getAllPartnersList,
  deletePartner,
  updateMultiplePartner,
} from "../../redux/slices/partnersSlice";
import { useDispatch } from "react-redux";
import Select from "react-select";
import Pagination from "../common/Pagination";
import IconButton from "../common/IconButton";
import DeleteConfirmationModal from "../details/DeleteConfirmationModal";
import { formatDate } from "../../utils/formatDate";

const baseUrl = import.meta.env.VITE_API_BASE_URL;

const PartnerTable = ({ data, title }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "terminated", label: "Terminated" },
  ];

  // Filter out inactive from dropdown options for row updates, but keep it for display and global filter
  const getDropdownOptions = () => {
    return statusOptions.filter((option) => option.value !== "inactive");
  };

  // Get the current value - this will show inactive if it exists in data
  const getCurrentValue = (currentStatus) => {
    return statusOptions.find((opt) => opt.value === currentStatus);
  };

  const getValue = (item, key) => {
    const details = item?.ownerDetails;

    switch (key) {
      case "ownerName":
        return details?.name;
      case "phone":
        return details?.phone;
      case "email":
        return details?.email;
      case "cityLocation":
        return details?.cityLocation;
      case "registrationDate":
        return details?.registrationDate;
      case "totalAppointments":
        return details?.totalAppointments;
      case "totalRevenue":
        return details?.totalRevenue;
      case "categoryName":
        return item?.categoryName;
      case "location":
        // âœ… Handle location object with city
        return item?.location?.city || item?.location || "";
      default:
        return item?.[key];
    }
  };

  // Original state
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    categoryName: true,
    ownerName: true,
    phone: true,
    email: true,
    location: true,
    createdAt: true,
    TotalAppointment: true,
    totalRevenue: true,
    status: true,
  });
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");

  // New state for filters, pagination
  const [filters, setFilters] = useState({
    status: "",
    city: "",
    categoryName: "",
    startDate: "",
    endDate: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [selectedRows, setSelectedRows] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const tableRef = useRef(null);

  const uniqueLocations = useMemo(() => {
    const locations = data
      .map((item) => item.location?.city) // âœ… extract city
      .filter(Boolean); // remove undefined/null

    return [...new Set(locations)]
      .sort()
      .map((city) => ({ value: city, label: city }));
  }, [data]);

  const uniqueCategories = useMemo(() => {
    const categories = data
      .map((item) => getValue(item, "categoryName"))
      .filter(Boolean);
    return [...new Set(categories)]
      .sort()
      .map((cat) => ({ value: cat, label: cat }));
  }, [data]);

  // Filter data based on search term AND filters
  // const filteredData = data.filter((item) => {
  //   const matchesSearch = Object.keys(visibleColumns).some((key) => {
  //     if (!visibleColumns[key]) return false;

  //     const value = getValue(item, key);
  //     const normalizedValue = value?.toString().trim().toLowerCase();
  //     const normalizedSearch = searchTerm.trim().toLowerCase();

  //     // âœ… Log each key and value clearly

  //     return normalizedValue?.includes(normalizedSearch);
  //   });

  //   const matchesStatusFilter =
  //     !filters.status || item.status === filters.status;

  //   const matchesEmailFilter = !filters.email || item.email === filters.email;

  //   const matchesLocationFilter =
  //     !filters.city || getValue(item, "location") === filters.city;

  //   const matchesCategoryFilter =
  //     !filters.categoryName ||
  //     getValue(item, "categoryName") === filters.categoryName;

  //   const matchesDateFilter =
  //     (!filters.startDate && !filters.endDate) ||
  //     (getValue(item, "registrationDate") >= filters.startDate &&
  //       getValue(item, "registrationDate") <= filters.endDate);

  //   return (
  //     matchesSearch &&
  //     matchesStatusFilter &&
  //     matchesLocationFilter &&
  //     matchesCategoryFilter &&
  //     matchesDateFilter &&
  //     matchesEmailFilter
  //   );
  // });
  const filteredData = data.filter((item) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    // âœ… Search across all visible columns (even nested ones)
    const matchesSearch =
      !normalizedSearch ||
      Object.keys(visibleColumns).some((key) => {
        if (!visibleColumns[key]) return false;

        let value = getValue(item, key);

        // âœ… Fallback for direct properties like item.email or item.phone
        if (value === undefined && key in item) {
          value = item[key];
        }

        // âœ… If it's an object, search inside its values
        if (typeof value === "object" && value !== null) {
          return Object.values(value).some((nestedVal) =>
            nestedVal?.toString().toLowerCase().includes(normalizedSearch)
          );
        }

        // âœ… Standard match
        return value?.toString().toLowerCase().includes(normalizedSearch);
      });

    // âœ… Apply filters normally
    const matchesStatusFilter =
      !filters.status || item.status === filters.status;

    const matchesLocationFilter =
      !filters.city ||
      getValue(item, "location")?.city === filters.city ||
      getValue(item, "location") === filters.city;
    const matchesCategoryFilter =
      !filters.categoryName ||
      getValue(item, "categoryName") === filters.categoryName;
    const matchesDateFilter =
      (!filters.startDate && !filters.endDate) ||
      (getValue(item, "registrationDate") >= filters.startDate &&
        getValue(item, "registrationDate") <= filters.endDate);

    // âœ… Return combined result
    return (
      matchesSearch &&
      matchesStatusFilter &&
      matchesLocationFilter &&
      matchesCategoryFilter &&
      matchesDateFilter
    );
  });

  console.log(filteredData, "filteredData");

  // Sort data based on sort field and direction
  const compare = (aVal, bVal, dir) => {
    if (typeof aVal === "number" && typeof bVal === "number") {
      return dir === "asc" ? aVal - bVal : bVal - aVal;
    } else {
      aVal = aVal?.toString() ?? "";
      bVal = bVal?.toString() ?? "";
      if (aVal < bVal) return dir === "asc" ? -1 : 1;
      if (aVal > bVal) return dir === "asc" ? 1 : -1;
      return 0;
    }
  };

  const sortedData = [...filteredData].sort((a, b) => {
    const aVal = getValue(a, sortField);
    const bVal = getValue(b, sortField);
    return compare(aVal, bVal, sortDirection);
  });

  // Get current page data for pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedData.slice(indexOfFirstItem, indexOfLastItem);

  // Calculate total pages
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  // Generate array of page numbers
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  // Toggle column visibility
  const toggleColumn = (column) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [column]: !prev[column],
    }));
  };

  // Handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Handle selection - per page
  const handleSelectAll = () => {
    const currentIds = currentItems.map((item) => item.id);
    setSelectedRows((prev) => {
      const allCurrentSelected = currentIds.every((id) => prev.includes(id));
      if (allCurrentSelected) {
        return prev.filter((id) => !currentIds.includes(id));
      } else {
        return [...new Set([...prev, ...currentIds])];
      }
    });
  };

  const toggleRow = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const isAllSelected =
    currentItems.length > 0 &&
    currentItems.every((item) => selectedRows.includes(item.id));

  // Bulk actions
  const handleBulkActivate = async () => {
    if (selectedRows.length === 0) return;
    await dispatch(
      updateMultiplePartner({ ids: selectedRows, status: "active" })
    );
    dispatch(getAllPartnersList());
    setSelectedRows([]);
  };

  const handleBulkDeactivate = async () => {
    if (selectedRows.length === 0) return;
    await dispatch(
      updateMultiplePartner({ ids: selectedRows, status: "inactive" })
    );
    dispatch(getAllPartnersList());
    setSelectedRows([]);
  };

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;
    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedRows.length} selected partners?`
      )
    )
      return;
    const promises = selectedRows.map((id) => dispatch(deletePartner(id)));
    await Promise.all(promises);
    dispatch(getAllPartnersList());
    setSelectedRows([]);
  };

  // Handle export selected
  const handleExportSelected = () => {
    if (selectedRows.length === 0) return;

    const selectedData = data.filter((item) => selectedRows.includes(item.id));

    // Get visible columns to include in CSV
    const headers = Object.keys(visibleColumns)
      .filter((key) => visibleColumns[key])
      .map((key) => key.charAt(0).toUpperCase() + key.slice(1));

    // Create CSV content
    let csvContent = headers.join(",") + "\r\n";

    selectedData.forEach((item) => {
      const row = Object.keys(visibleColumns)
        .filter((key) => visibleColumns[key])
        .map((key) => {
          // Escape commas and quotes in values
          let value = getValue(item, key)?.toString() ?? "";
          if (key === "totalRevenue") {
            value = `$${value}`;
          }
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(",");

      csvContent += row + "\r\n";
    });

    // Create blob and download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    // Set up download attributes
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${title.toLowerCase()}_selected_${selectedRows.length}.csv`
    );
    link.style.visibility = "hidden";

    // Add to document, trigger click, and clean up
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle CSV download (real implementation)
  const handleDownloadCSV = () => {
    // Get visible columns to include in CSV
    const headers = Object.keys(visibleColumns)
      .filter((key) => visibleColumns[key])
      .map((key) => key.charAt(0).toUpperCase() + key.slice(1));

    // Create CSV content
    let csvContent = headers.join(",") + "\r\n";

    sortedData.forEach((item) => {
      const row = Object.keys(visibleColumns)
        .filter((key) => visibleColumns[key])
        .map((key) => {
          // Escape commas and quotes in values
          let value = getValue(item, key)?.toString() ?? "";
          if (key === "totalRevenue") {
            value = `$${value}`;
          }
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(",");

      csvContent += row + "\r\n";
    });

    // Create blob and download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    // Set up download attributes
    link.setAttribute("href", url);
    link.setAttribute("download", `${title.toLowerCase()}_data.csv`);
    link.style.visibility = "hidden";

    // Add to document, trigger click, and clean up
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle print (real implementation)
  const handlePrint = () => {
    // Store original body content
    const originalContent = document.body.innerHTML;

    // Create a print-friendly version of the table
    let printContent = "<html><head><title>Print</title>";
    printContent += "<style>";
    printContent += "table { border-collapse: collapse; width: 100%; }";
    printContent +=
      "th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }";
    printContent += "th { background-color: #f2f2f2; }";
    printContent += "</style></head><body>";
    printContent += `<h2>${title}</h2>`;
    printContent += "<table>";

    // Add table headers
    printContent += "<thead><tr>";
    Object.keys(visibleColumns).forEach((column) => {
      if (visibleColumns[column]) {
        printContent += `<th>${
          column.charAt(0).toUpperCase() + column.slice(1)
        }</th>`;
      }
    });
    printContent += "<th>Actions</th>";
    printContent += "</tr></thead><tbody>";

    // Add table rows
    sortedData.forEach((item) => {
      printContent += "<tr>";
      Object.keys(visibleColumns).forEach((column) => {
        if (visibleColumns[column]) {
          const val = getValue(item, column);
          const displayVal =
            column === "totalRevenue" ? `$${val || 0}` : val || "";
          printContent += `<td>${displayVal}</td>`;
        }
      });
      printContent += `<td>View</td>`;
      printContent += "</tr>";
    });

    printContent += "</tbody></table></body></html>";

    // Create an iframe for printing
    const printFrame = document.createElement("iframe");
    printFrame.style.position = "absolute";
    printFrame.style.top = "-999px";
    document.body.appendChild(printFrame);

    // Write content to iframe and print it
    printFrame.contentDocument.write(printContent);
    printFrame.contentDocument.close();

    setTimeout(() => {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
      document.body.removeChild(printFrame);
    }, 500);
  };

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Get sort icon for column
  const getSortIcon = (field) => {
    if (sortField !== field) return null;

    return sortDirection === "asc" ? (
      <ArrowUp size={14} className="ml-1" />
    ) : (
      <ArrowDown size={14} className="ml-1" />
    );
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showColumnToggle &&
        !event.target.closest(".column-toggle-container")
      ) {
        setShowColumnToggle(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showColumnToggle]);

  // Reset to first page and clear selections when filters change
  useEffect(() => {
    // setCurrentPage();
    setSelectedRows([]);
  }, [filters, searchTerm]);

  const handleStatusChange = (id, newStatus) => {
    dispatch(updatePartnerStatus({ id: id, status: newStatus })).then(() => {
      dispatch(getAllPartnersList());
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    dispatch(deletePartner(deleteTarget.id)).then(() => {
      dispatch(getAllPartnersList());
    });
    setDeleteTarget(null);
  };

  // Calculate colSpan for no data row
  const visibleColumnCount =
    Object.keys(visibleColumns).filter((key) => visibleColumns[key]).length + 2; // +1 for checkbox +1 for actions

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border-b border-gray-200">
        <div className="relative w-full md:w-64 mb-4 md:mb-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-purple)]/30 focus:border-[var(--brand-purple)] text-gray-900 font-medium"
          />
        </div>

        {/* Status Filter */}
        <div className="relative w-full md:w-48 mb-4 md:mb-0">
          <Select
            options={statusOptions}
            value={
              filters.status
                ? statusOptions.find((opt) => opt.value === filters.status)
                : null
            }
            onChange={(selectedOption) =>
              setFilters((prev) => ({
                ...prev,
                status: selectedOption ? selectedOption.value : "",
              }))
            }
            placeholder="All Statuses"
            isSearchable={false}
            isClearable={true}
            className="text-sm"
            classNamePrefix="minimal-border-select"
            menuPortalTarget={document.body}
            components={{
              IndicatorSeparator: () => null,
            }}
            styles={{
              control: (base, state) => ({
                ...base,
                minHeight: "32px",
                height: "32px",
                minWidth: "120px",
                boxShadow: "none",
                backgroundColor: "white",
                cursor: "pointer",
                border: state.isFocused
                  ? "1px solid #3B82F6"
                  : "1px solid #D1D5DB",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                "&:hover": {
                  borderColor: "#9CA3AF",
                },
              }),
              valueContainer: (base) => ({
                ...base,
                padding: "0 2px 0 8px",
                margin: 0,
                display: "flex",
                alignItems: "center",
                height: "30px",
                flex: "1 1 auto",
              }),
              singleValue: (base) => ({
                ...base,
                margin: 0,
                padding: 0,
                textTransform: "capitalize",
                fontSize: "13px",
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
                height: "30px",
                width: "16px",
                flexShrink: 0,
              }),
              dropdownIndicator: (base) => ({
                ...base,
                padding: "0 4px",
                margin: 0,
                width: "16px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#9CA3AF",
                "&:hover": {
                  color: "#6B7280",
                },
                svg: {
                  width: "12px",
                  height: "12px",
                },
              }),
              clearIndicator: (base) => ({
                ...base,
                padding: "0 4px",
                margin: 0,
                width: "16px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#9CA3AF",
                "&:hover": {
                  color: "#6B7280",
                },
                svg: {
                  width: "12px",
                  height: "12px",
                },
              }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isFocused ? "#000000" : "white",
                color: state.isFocused ? "white" : "#374151",
                cursor: "pointer",
                textTransform: "capitalize",
                fontSize: "13px",
                padding: "8px 12px",
                "&:active": {
                  backgroundColor: "#000000",
                },
              }),
              menu: (base) => ({
                ...base,
                marginTop: "2px",
                zIndex: 9999,
                borderRadius: "6px",
                boxShadow:
                  "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                border: "1px solid #E5E7EB",
                minWidth: "120px",
              }),
              menuList: (base) => ({
                ...base,
                padding: "4px",
              }),
              menuPortal: (base) => ({
                ...base,
                zIndex: 9999,
              }),
            }}
          />
        </div>

        {/* Category Filter */}
        <div className="relative w-full md:w-48 mb-4 md:mb-0">
          <Select
            options={uniqueCategories}
            value={
              filters.categoryName
                ? uniqueCategories.find(
                    (opt) => opt.value === filters.categoryName
                  )
                : null
            }
            onChange={(selectedOption) =>
              setFilters((prev) => ({
                ...prev,
                categoryName: selectedOption ? selectedOption.value : "",
              }))
            }
            placeholder="All Categories"
            isSearchable={false}
            isClearable={true}
            className="text-sm"
            classNamePrefix="minimal-border-select"
            menuPortalTarget={document.body}
            components={{
              IndicatorSeparator: () => null,
            }}
            styles={{
              control: (base, state) => ({
                ...base,
                minHeight: "32px",
                height: "32px",
                minWidth: "120px",
                boxShadow: "none",
                backgroundColor: "white",
                cursor: "pointer",
                border: state.isFocused
                  ? "1px solid #3B82F6"
                  : "1px solid #D1D5DB",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                "&:hover": {
                  borderColor: "#9CA3AF",
                },
              }),
              valueContainer: (base) => ({
                ...base,
                padding: "0 2px 0 8px",
                margin: 0,
                display: "flex",
                alignItems: "center",
                height: "30px",
                flex: "1 1 auto",
              }),
              singleValue: (base) => ({
                ...base,
                margin: 0,
                padding: 0,
                fontSize: "13px",
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
                height: "30px",
                width: "16px",
                flexShrink: 0,
              }),
              dropdownIndicator: (base) => ({
                ...base,
                padding: "0 4px",
                margin: 0,
                width: "16px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#9CA3AF",
                "&:hover": {
                  color: "#6B7280",
                },
                svg: {
                  width: "12px",
                  height: "12px",
                },
              }),
              clearIndicator: (base) => ({
                ...base,
                padding: "0 4px",
                margin: 0,
                width: "16px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#9CA3AF",
                "&:hover": {
                  color: "#6B7280",
                },
                svg: {
                  width: "12px",
                  height: "12px",
                },
              }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isFocused ? "#000000" : "white",
                color: state.isFocused ? "white" : "#374151",
                cursor: "pointer",
                fontSize: "13px",
                padding: "8px 12px",
                "&:active": {
                  backgroundColor: "#000000",
                },
              }),
              menu: (base) => ({
                ...base,
                marginTop: "2px",
                zIndex: 9999,
                borderRadius: "6px",
                boxShadow:
                  "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                border: "1px solid #E5E7EB",
                minWidth: "120px",
              }),
              menuList: (base) => ({
                ...base,
                padding: "4px",
              }),
              menuPortal: (base) => ({
                ...base,
                zIndex: 9999,
              }),
            }}
          />
        </div>

        {/* Location Filter */}
        <div className="relative w-full md:w-48 mb-4 md:mb-0">
          <Select
            options={uniqueLocations}
            value={
              filters.city
                ? uniqueLocations.find((opt) => opt.value === filters.city)
                : null
            }
            onChange={(selectedOption) =>
              setFilters((prev) => ({
                ...prev,
                city: selectedOption ? selectedOption.value : "",
              }))
            }
            placeholder="All Locations"
            isSearchable={false}
            isClearable={true}
            className="text-sm"
            classNamePrefix="minimal-border-select"
            menuPortalTarget={document.body}
            components={{
              IndicatorSeparator: () => null,
            }}
            styles={{
              control: (base, state) => ({
                ...base,
                minHeight: "32px",
                height: "32px",
                minWidth: "120px",
                boxShadow: "none",
                backgroundColor: "white",
                cursor: "pointer",
                border: state.isFocused
                  ? "1px solid #3B82F6"
                  : "1px solid #D1D5DB",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                "&:hover": {
                  borderColor: "#9CA3AF",
                },
              }),
              valueContainer: (base) => ({
                ...base,
                padding: "0 2px 0 8px",
                margin: 0,
                display: "flex",
                alignItems: "center",
                height: "30px",
                flex: "1 1 auto",
              }),
              singleValue: (base) => ({
                ...base,
                margin: 0,
                padding: 0,
                fontSize: "13px",
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
                height: "30px",
                width: "16px",
                flexShrink: 0,
              }),
              dropdownIndicator: (base) => ({
                ...base,
                padding: "0 4px",
                margin: 0,
                width: "16px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#9CA3AF",
                "&:hover": {
                  color: "#6B7280",
                },
                svg: {
                  width: "12px",
                  height: "12px",
                },
              }),
              clearIndicator: (base) => ({
                ...base,
                padding: "0 4px",
                margin: 0,
                width: "16px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#9CA3AF",
                "&:hover": {
                  color: "#6B7280",
                },
                svg: {
                  width: "12px",
                  height: "12px",
                },
              }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isFocused ? "#000000" : "white",
                color: state.isFocused ? "white" : "#374151",
                cursor: "pointer",
                fontSize: "13px",
                padding: "8px 12px",
                "&:active": {
                  backgroundColor: "#000000",
                },
              }),
              menu: (base) => ({
                ...base,
                marginTop: "2px",
                zIndex: 9999,
                borderRadius: "6px",
                boxShadow:
                  "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                border: "1px solid #E5E7EB",
                minWidth: "120px",
              }),
              menuList: (base) => ({
                ...base,
                padding: "4px",
              }),
              menuPortal: (base) => ({
                ...base,
                zIndex: 9999,
              }),
            }}
          />
        </div>

        {/* Registration Date Range Filter */}
        {/* <div className="w-full md:w-80 mb-4 md:mb-0 flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
          <div className="relative flex-1">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, startDate: e.target.value }))
              }
              className="w-full py-2 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-purple)]/30 focus:border-[var(--brand-purple)] text-gray-900 text-sm font-medium"
            />
          </div>
          <div className="relative flex-1">
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, endDate: e.target.value }))
              }
              className="w-full py-2 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-purple)]/30 focus:border-[var(--brand-purple)] text-gray-900 text-sm font-medium"
            />
          </div>
        </div> */}

        <div className="flex items-center gap-2">
          <IconButton icon={Download} label="Export" tone="green" onClick={handleDownloadCSV} />
          <IconButton icon={Printer} label="Print" tone="neutral" onClick={handlePrint} />

          <div className="relative column-toggle-container">
            <button
              style={{ cursor: "pointer" }}
              onClick={() => setShowColumnToggle(!showColumnToggle)}
              className="flex items-center px-3.5 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
            >
              <EyeOff size={16} className="mr-1.5" />
              <span>Columns</span>
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
                      <label key={column} className="flex items-center text-sm">
                        <input
                          style={{ cursor: "pointer" }}
                          type="checkbox"
                          checked={visibleColumns[column]}
                          onChange={() => toggleColumn(column)}
                          className="mr-2"
                        />
                        {column.charAt(0).toUpperCase() +
                          column.slice(1).replace(/([A-Z])/g, " $1")}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedRows.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-[var(--brand-purple)]/[0.04] border-b border-[var(--brand-purple)]/10">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700">
              {selectedRows.length} selected
            </span>
            <button
              onClick={handleExportSelected}
              className="px-3.5 py-1.5 bg-[var(--brand-purple)] text-white text-sm font-medium rounded-lg hover:brightness-110 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              Export
            </button>
            <button
              onClick={handleBulkActivate}
              className="px-3.5 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              Activate
            </button>
            <button
              onClick={handleBulkDeactivate}
              className="px-3.5 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              Deactivate
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3.5 py-1.5 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              Delete
            </button>
          </div>
          <button
            onClick={() => setSelectedRows([])}
            className="flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={16} className="mr-1" />
            Clear selection
          </button>
        </div>
      )}

      <div className="overflow-auto" style={{ maxHeight: "640px" }}>
        <table className="w-full text-[13px]" ref={tableRef}>
          <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="h-11 px-3 py-0 w-8">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  className="rounded"
                />
              </th>
              {visibleColumns.name && (
                <th
                  onClick={() => handleSort("name")}
                  className="h-10 px-3 py-0 text-left text-[13px] font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700"
                >
                  Name{getSortIcon("name")}
                </th>
              )}
              {visibleColumns.ownerName && (
                <th
                  onClick={() => handleSort("ownerName")}
                  className="h-10 px-3 py-0 text-left text-[13px] font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700"
                >
                  Owner Name{getSortIcon("ownerName")}
                </th>
              )}
              {visibleColumns.phone && (
                <th
                  onClick={() => handleSort("phone")}
                  className="h-10 px-3 py-0 text-left text-[13px] font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700"
                >
                  Phone{getSortIcon("phone")}
                </th>
              )}
              {visibleColumns.email && (
                <th
                  onClick={() => handleSort("email")}
                  className="h-10 px-3 py-0 text-left text-[13px] font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700"
                >
                  Email{getSortIcon("email")}
                </th>
              )}
              {visibleColumns.categoryName && (
                <th
                  onClick={() => handleSort("categoryName")}
                  className="h-10 px-3 py-0 text-left text-[13px] font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700"
                >
                  Category{getSortIcon("categoryName")}
                </th>
              )}
              {visibleColumns.location && (
                <th
                  onClick={() => handleSort("location")}
                  className="h-10 px-3 py-0 text-left text-[13px] font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700"
                >
                  City/Location{getSortIcon("location")}
                </th>
              )}
              {visibleColumns.createdAt && (
                <th
                  onClick={() => handleSort("createdAt")}
                  className="h-10 px-3 py-0 text-left text-[13px] font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700"
                >
                  Registration Date{getSortIcon("createdAt")}
                </th>
              )}
              {visibleColumns.TotalAppointment && (
                <th
                  onClick={() => handleSort("TotalAppointment")}
                  className="h-10 px-3 py-0 text-right text-[13px] font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700"
                >
                  Total Appointments{getSortIcon("TotalAppointment")}
                </th>
              )}
              {visibleColumns.totalRevenue && (
                <th
                  onClick={() => handleSort("totalRevenue")}
                  className="h-10 px-3 py-0 text-right text-[13px] font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700"
                >
                  Total Revenue{getSortIcon("totalRevenue")}
                </th>
              )}

              {visibleColumns.status && (
                <th
                  onClick={() => handleSort("status")}
                  className="h-10 px-3 py-0 text-left text-[13px] font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700"
                >
                  Status{getSortIcon("status")}
                </th>
              )}
              <th className="h-10 px-3 py-0 text-center text-[13px] font-semibold text-gray-500 uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {currentItems.length > 0 ? (
              currentItems.map((item, index) => (
                <tr
                  key={item.id}
                  className={`transition-colors hover:bg-[var(--brand-purple)]/[0.04] ${
                    index % 2 === 1 ? "bg-gray-50/60" : "bg-white"
                  }`}
                >
                  <td className="px-3 py-2.5 w-8 align-middle">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(item.id)}
                      onChange={() => toggleRow(item.id)}
                      className="rounded"
                    />
                  </td>
                  {visibleColumns.name && (
                    <td className="px-3 py-2.5 whitespace-nowrap  capitalize">
                      {item?.name}
                    </td>
                  )}
                  {visibleColumns.ownerName && (
                    <td className="px-3 py-2.5 whitespace-nowrap capitalize">
                      {item?.ownerDetails?.name}
                    </td>
                  )}
                  {visibleColumns.phone && (
                    <td className="px-3 py-2.5 whitespace-nowrap ">
                      {item?.ownerDetails?.phone}
                    </td>
                  )}
                  {visibleColumns.email && (
                    <td className="px-3 py-2.5 whitespace-nowrap ">
                      {item?.email}
                    </td>
                  )}
                  {visibleColumns.categoryName && (
                    <td className="px-3 py-2.5 whitespace-nowrap capitalize">
                      {item?.categoryName}
                    </td>
                  )}
                  {visibleColumns.location && (
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {item?.location?.city}
                    </td>
                  )}
                  {visibleColumns.createdAt && (
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {formatDate(item?.createdAt)}
                    </td>
                  )}

                  {visibleColumns.TotalAppointment && (
                    <td className="px-3 py-2.5 whitespace-nowrap text-right">
                      {item?.TotalAppointment}
                    </td>
                  )}
                  {visibleColumns.totalRevenue && (
                    <td className="px-3 py-2.5 whitespace-nowrap text-right">
                      {item?.totalRevenue != null
                        ? `â‚¹${new Intl.NumberFormat("en-IN").format(
                            item.totalRevenue
                          )}`
                        : "-"}
                    </td>
                  )}

                  {visibleColumns.status && (
                    <td className="px-2 py-2 whitespace-nowrap">
                      <div className="relative inline-block">
                        <Select
                          options={getDropdownOptions()} // Filtered options without inactive
                          value={getCurrentValue(item?.status)} // Current value (can include inactive)
                          onChange={(selectedOption) =>
                            handleStatusChange(item?.id, selectedOption.value)
                          }
                          isSearchable={false}
                          className="text-sm"
                          classNamePrefix="minimal-border-select"
                          menuPortalTarget={document.body}
                          components={{
                            IndicatorSeparator: () => null,
                          }}
                          styles={{
                            control: (base, state) => ({
                              ...base,
                              minHeight: "32px",
                              height: "32px",
                              minWidth: "90px",
                              boxShadow: "none",
                              backgroundColor: "white",
                              cursor: "pointer",
                              border: state.isFocused
                                ? "1px solid #3B82F6"
                                : "1px solid #D1D5DB",
                              borderRadius: "6px",
                              display: "flex",
                              alignItems: "center",
                              "&:hover": {
                                borderColor: "#9CA3AF",
                              },
                            }),
                            valueContainer: (base) => ({
                              ...base,
                              padding: "0 2px 0 8px", // Minimal right padding, normal left padding
                              margin: 0,
                              display: "flex",
                              alignItems: "center",
                              height: "30px",
                              flex: "1 1 auto",
                            }),
                            singleValue: (base) => ({
                              ...base,
                              margin: 0,
                              padding: 0,
                              textTransform: "capitalize",
                              fontSize: "13px",
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
                              height: "30px",
                              width: "16px", // Minimal width for arrow
                              flexShrink: 0,
                            }),
                            dropdownIndicator: (base) => ({
                              ...base,
                              padding: "0 4px",
                              margin: 0,
                              width: "16px",
                              height: "30px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#9CA3AF",
                              "&:hover": {
                                color: "#6B7280",
                              },
                              svg: {
                                width: "12px",
                                height: "12px",
                              },
                            }),
                            option: (base, state) => ({
                              ...base,
                              backgroundColor: state.isFocused
                                ? "#000000"
                                : "white",
                              color: state.isFocused ? "white" : "#374151",
                              cursor: "pointer",
                              textTransform: "capitalize",
                              fontSize: "13px",
                              padding: "8px 12px",
                              "&:active": {
                                backgroundColor: "#000000",
                              },
                            }),
                            menu: (base) => ({
                              ...base,
                              marginTop: "2px",
                              zIndex: 9999,
                              borderRadius: "6px",
                              boxShadow:
                                "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                              border: "1px solid #E5E7EB",
                              minWidth: "120px",
                            }),
                            menuList: (base) => ({
                              ...base,
                              padding: "4px",
                            }),
                            menuPortal: (base) => ({
                              ...base,
                              zIndex: 9999,
                            }),
                          }}
                        />
                      </div>
                    </td>
                  )}
                  <td className="px-2 py-3.5">
                    <div className="flex items-center justify-center gap-1">
                      <IconButton
                        icon={Eye}
                        label="View"
                        tone="blue"
                        onClick={() => navigate(`/partnerdetails/${item?.id}`)}
                      />
                      <IconButton
                        icon={Trash2}
                        label="Delete"
                        tone="red"
                        onClick={() => setDeleteTarget(item)}
                      />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={visibleColumnCount}
                  className="px-3 py-2.5 text-center text-sm text-gray-500"
                >
                  No {title.toLowerCase()} found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
        title="Delete Partner"
        itemName={deleteTarget?.name}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />

    </div>
  );
};

export default PartnerTable;
