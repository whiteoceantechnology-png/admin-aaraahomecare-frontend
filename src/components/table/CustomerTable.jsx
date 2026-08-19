// src/components/table/CustomerTable.jsx
// Matches the mk design system used by Product/Category/Order/Brand — one
// card (owned by the parent Customer.jsx) with a toolbar row (search only;
// no Export/Print/filter controls) directly above the table, exactly like
// every other list page's toolbar/table structure. Previously this used its
// own separate search-card + table-card layout, which is what caused the
// Orders/Customers alignment mismatch.
import { useState, useEffect } from "react";
import { Eye, X } from "lucide-react";
import CommonTable from "../common/CommonTable";
import Pagination from "../common/Pagination";
import IconButton from "../common/IconButton";
import MkPill from "../common/MkPill";
import { formatDate } from "../../utils/formatDate";
import {
  FILTER_SEARCH_WRAP_CLASS,
  FILTER_SEARCH_ICON_WRAP_CLASS,
  FILTER_SEARCH_INPUT_CLASS,
} from "../common/filterToolbarStyles";

const hasValue = (v) => v !== null && v !== undefined;

const fmtMoney = (n) =>
  `₹${Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Cosmetic grouping of a raw phone string for display only (e.g. "90000 00009")
// — never mutates the underlying value used for search/matching.
const formatPhone = (phone) => {
  const digits = (phone || "").toString().replace(/\D/g, "");
  if (digits.length !== 10) return phone || "—";
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
};

const CustomerTable = ({ data = [], title = "Customers", onToggleBlock, onView, onViewOrders }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filteredData = data.filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return ["name", "phone", "email"].some((key) =>
      item[key]?.toString().toLowerCase().includes(term),
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const columns = [
    {
      key: "name",
      header: "Customer",
      sortable: true,
      width: "240px",
      className: "text-[var(--mk-ink-900)]",
      render: (item) => (
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-[13.5px]  text-[var(--mk-ink-900)] truncate max-w-[130px] shrink-0" title={item.name}>
            {item.name || "—"}
          </p>
          {item.mergedCount > 1 && (
            <MkPill label={`${item.mergedCount} accounts merged`} tone="info" size="sm" />
          )}
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      width: "110px",
      className: "text-[13px] text-[var(--mk-ink-700)] tabular-nums",
      render: (item) => formatPhone(item.phone),
    },
    {
      key: "email",
      header: "Primary Email",
      width: "220px",
      truncate: true,
      truncateWidth: "200px",
      className: "text-[12px] text-[var(--mk-ink-700)]",
      render: (item) => item.email || "—",
    },
    {
      key: "orders",
      header: "Orders",
      width: "80px",
      align: "right",
      className: "text-[13px] text-[var(--mk-ink-700)] tabular-nums",
      render: (item) => item.ordersCount ?? 0,
    },
    {
      key: "lifetimeSpend",
      header: "Lifetime Spend",
      width: "110px",
      align: "right",
      className: "text-[13px] text-[var(--mk-ink-900)] font-semibold tabular-nums",
      render: (item) => (hasValue(item.lifetimeSpend) ? fmtMoney(item.lifetimeSpend) : "—"),
    },
    {
      key: "createdAt",
      header: "Joined",
      width: "110px",
      className: "text-[13px] text-[var(--mk-ink-500)]",
      render: (item) => formatDate(item?.createdAt),
    },
    {
      key: "isBlocked",
      header: "Status",
      width: "100px",
      render: (item) => (
        <MkPill label={item.isBlocked ? "Blocked" : "Active"} tone={item.isBlocked ? "dgr" : "ok"} size="sm" />
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-1 p-[16px] overflow-x-auto border-b border-[var(--mk-line)]">
        <div className={FILTER_SEARCH_WRAP_CLASS}>
          <div className={FILTER_SEARCH_ICON_WRAP_CLASS}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--mk-ink-400)]">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by name, phone or email"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={FILTER_SEARCH_INPUT_CLASS}
          />
        </div>
      </div>

      <CommonTable
        columns={columns}
        data={currentItems}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        emptyMessage={`No ${title.toLowerCase()} found`}
        minWidth="1000px"
        actionsWidth="90px"
        headerBgClass="bg-[#FAFBFD]"
        headerTextClass="text-[10.5px] font-semibold text-[var(--mk-ink-400)] tracking-[0.08em]"
        headerHeightClass="h-[38px]"
        rowPaddingY="py-[10px]"
        onRowClick={onView}
        renderRowActions={(item) => (
          <>
            <IconButton
              icon={Eye}
              label="View orders"
              tone="flat"
              size={18}
              onClick={(e) => {
                e.stopPropagation();
                onViewOrders && onViewOrders(item);
              }}
            />
            <IconButton
              icon={X}
              label={item.isBlocked ? "Unblock customer" : "Block customer"}
              tone="flatDanger"
              size={18}
              onClick={() => onToggleBlock && onToggleBlock(item.id)}
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
    </div>
  );
};

export default CustomerTable;
