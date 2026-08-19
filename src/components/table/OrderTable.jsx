// src/components/table/OrderTable.jsx
// mk design system, matching the reference screenshot. Next Action replaces
// the old Eye/Track/Cancel icon column — every state (pill, action label,
// conflict indicator) is derived from real order fields (status,
// paymentStatus, totalAmount) via getOrderNextAction, never invented.
import { useState, useEffect, useMemo } from "react";
import { Eye, Pencil, Printer, PackageCheck, Ban, Undo2, Phone, History, CreditCard } from "lucide-react";
import CommonTable from "../common/CommonTable";
import Pagination from "../common/Pagination";
import OrderStatusPill from "../common/OrderStatusPill";
import OrderStatusDropdown from "../common/OrderStatusDropdown";
import OrderActionDropdown from "../common/OrderActionDropdown";
import OrderActionMenu from "../common/OrderActionMenu";
import OrderDateFilter from "../common/OrderDateFilter";
import { formatDate } from "../../utils/formatDate";
import { getOrderNextAction, isConflictAction } from "../../utils/orderNextAction";
import { isPlacedStatus } from "../../utils/orderStatusStages";
import {
  FILTER_SEARCH_WRAP_CLASS,
  FILTER_SEARCH_ICON_WRAP_CLASS,
  FILTER_SEARCH_INPUT_CLASS,
  FILTER_SELECT_CLASS as selectClass,
} from "../common/filterToolbarStyles";

const hasValue = (v) => v !== null && v !== undefined;

const PAID_FAMILY = ["paid", "completed", "success"];

const titleCase = (s) =>
  (s || "")
    .toString()
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const fmtMoney = (n) =>
  `₹${Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// These are grouping/tab names only — never rendered as a Current Status
// value. "New Orders" and "Processing Orders" deliberately overlap by
// design: New = just-placed orders only; Processing = the whole active
// range "from Order Placed until Delivered" (Order Placed + Packed +
// Shipped), so a just-placed order legitimately appears in both. Completed
// = Delivered only. Cancelled orders intentionally match no tab — whether
// they belong under Completed (or need their own bucket) is a business
// decision that hasn't been confirmed, so they're deliberately left
// unbucketed rather than silently folded into Completed; they're still
// fully reachable via the Current Status filter and search.
const ORDER_TABS = [
  { key: "new", label: "New Orders", match: (status) => isPlacedStatus(status) },
  {
    key: "processing",
    label: "Processing Orders",
    match: (status) => isPlacedStatus(status) || status === "packed" || status === "shipped",
  },
  { key: "completed", label: "Completed Orders", match: (status) => status === "delivered" },
];

const OrderTable = ({
  data = [],
  title = "Orders",
  onView,
  onProgressStatus,
  onTrack,
  onCancel,
  onRecordCod,
  onMarkPaid,
  recordingCodId = null,
  initialSearch = "",
}) => {
  // Seeds the existing search box (never changes its own logic) — used when
  // arriving here from "View orders" on the Customers page with ?customer=
  // in the URL. Empty by default, so every other caller is unaffected. Tab
  // default is untouched (still "new") — deliberately not widened, since
  // that's separate, pre-existing tab behavior this task shouldn't change.
  const [activeTab, setActiveTab] = useState("new");
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateStart, setDateStart] = useState(null);
  const [dateEnd, setDateEnd] = useState(null);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const paymentOptions = [...new Set(data.map((o) => o?.paymentStatus).filter(Boolean))];
  const statusOptions = [...new Set(data.map((o) => o?.status).filter(Boolean))];

  // Tabs overlap by design (see ORDER_TABS above), so an order can count
  // toward more than one tab — this loop checks every tab per order rather
  // than assigning each order to a single bucket.
  const tabCounts = useMemo(() => {
    const counts = { new: 0, processing: 0, completed: 0 };
    data.forEach((o) => {
      const s = (o?.status || "").toLowerCase();
      ORDER_TABS.forEach((tab) => {
        if (tab.match(s)) counts[tab.key] += 1;
      });
    });
    return counts;
  }, [data]);

  const handleDateChange = (start, end) => {
    setDateStart(start);
    setDateEnd(end);
  };

  const filteredData = data.filter((item) => {
    const status = (item?.status || "").toLowerCase();
    const tabDef = ORDER_TABS.find((t) => t.key === activeTab);
    if (tabDef && !tabDef.match(status)) return false;
    if (paymentFilter !== "all" && item?.paymentStatus !== paymentFilter) return false;
    if (statusFilter !== "all" && item?.status !== statusFilter) return false;
    if (dateStart) {
      const created = item?.createdAt ? new Date(item.createdAt) : null;
      if (!created) return false;
      const dayStart = new Date(dateStart);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dateEnd || dateStart);
      dayEnd.setHours(23, 59, 59, 999);
      if (created < dayStart || created > dayEnd) return false;
    }
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return [item?.orderNumber, item?.customer?.name].some((v) =>
      v?.toString().toLowerCase().includes(term),
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
  }, [searchTerm, paymentFilter, statusFilter, activeTab, dateStart, dateEnd]);

  // Row-level "⋮" menu. Actions that need full order-detail context (invoice/
  // packing-slip content, contact info, refund amount, activity timeline)
  // open the drawer via onView instead of faking that context from a
  // collapsed row — the drawer's own menu then performs the real action.
  // Edit/Cancel/Mark Paid already have everything they need from the row, so
  // they fire directly.
  const buildRowMenuItems = (item) => {
    const cancelled = (item?.status || "").toLowerCase() === "cancelled";
    const isPaid = PAID_FAMILY.includes((item?.paymentStatus || "").toLowerCase());
    return [
      { key: "view", label: "View Order", icon: Eye, onClick: () => onView?.(item) },
      { key: "edit", label: "Edit Order", icon: Pencil, onClick: () => onTrack?.(item) },
      { key: "invoice", label: "Print Invoice", icon: Printer, onClick: () => onView?.(item) },
      { key: "packing", label: "Print Packing Slip", icon: PackageCheck, onClick: () => onView?.(item) },
      {
        key: "markPaid",
        label: "Mark Payment as Paid",
        icon: CreditCard,
        disabled: isPaid,
        onClick: () => onMarkPaid?.(item),
      },
      {
        key: "cancel",
        label: "Cancel Order",
        icon: Ban,
        tone: "danger",
        disabled: cancelled,
        onClick: () => onCancel?.(item),
      },
      { key: "refund", label: "Refund", icon: Undo2, onClick: () => onView?.(item) },
      { key: "contact", label: "Contact Customer", icon: Phone, onClick: () => onView?.(item) },
      { key: "activity", label: "View Activity", icon: History, onClick: () => onView?.(item) },
    ];
  };

  const handleNextAction = (item, action) => {
    if (action.type === "progress") {
      onProgressStatus?.(item, action.targetStatus);
    } else if (action.type === "cod_payment") {
      onRecordCod?.(item);
    } else if (action.type === "mark_paid") {
      onMarkPaid?.(item);
    } else {
      onView?.(item);
    }
  };

  const columns = [
    {
      key: "orderNumber",
      header: "Order",
      sortable: true,
      width: "230px",
      render: (item) => {
        const paymentType = item?.payments?.[0]?.method || item?.paymentMethod;
        return (
          <div className="min-w-0">
            <p className="font-semibold text-[12px] leading-4 !mb-0 text-[var(--mk-ink-900)] truncate max-w-[200px]" title={item?.orderNumber}>
              {item?.orderNumber}
            </p>
            {paymentType && (
              <p className="text-[11px] font-normal leading-[14px] text-[var(--mk-ink-400)] !mt-0.5 !mb-0 truncate max-w-[200px]">
                {titleCase(paymentType)}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: "customer",
      header: "Customer",
      width: "150px",
      truncate: true,
      truncateWidth: "140px",
      className: "text-[13px] leading-[18px] text-[var(--mk-ink-700)]",
      render: (item) => item?.customer?.name || "—",
    },
    {
      key: "itemCount",
      header: "Items",
      width: "80px",
      className: "text-[12px] text-[var(--mk-ink-500)]",
      render: (item) => {
        const n = Array.isArray(item?.items) ? item.items.length : null;
        return hasValue(n) ? `${n} item${n === 1 ? "" : "s"}` : "—";
      },
    },
    {
      key: "totalAmount",
      header: "Amount",
      width: "95px",
      className: "text-[13px] leading-[18px] text-[var(--mk-ink-900)] font-medium tabular-nums",
      render: (item) => fmtMoney(item?.totalAmount),
    },
    {
      key: "paymentStatus",
      header: "Payment",
      width: "150px",
      render: (item) => <OrderStatusPill status={item?.paymentStatus} />,
    },
    {
      key: "status",
      header: "Current Status",
      sortable: true,
      width: "160px",
      render: (item) => (
        <OrderStatusDropdown order={item} onChange={(newStatus) => onProgressStatus?.(item, newStatus)} />
      ),
    },
    {
      key: "createdAt",
      header: "Date",
      sortable: true,
      width: "140px",
      className: "text-[12px] font-normal leading-[18px] text-[var(--mk-ink-500)]",
      render: (item) => formatDate(item?.createdAt),
    },
    {
      key: "nextAction",
      header: "Next Action",
      width: "155px",
      align: "right",
      render: (item) => (
        <OrderActionDropdown
          action={getOrderNextAction(item)}
          onSelect={(action) => handleNextAction(item, action)}
          loading={recordingCodId === item.id}
        />
      ),
    },
  ];

  return (
    <div>
      {/* ORDER TABS — plain text underline tabs, not a segmented control */}
      <div className="px-[14px] pt-[14px] border-b border-[var(--mk-line)]">
        <div className="flex items-center gap-5">
          {ORDER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-1.5 pb-[10px] border-b-2 text-[13px] transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-[var(--mk-primary)] text-[var(--mk-ink-900)] font-semibold"
                  : "border-transparent text-[var(--mk-ink-500)] font-medium hover:text-[var(--mk-ink-700)]"
              }`}
            >
              {tab.label}
              <span
                className={`text-[11.5px] font-semibold leading-none ${
                  activeTab === tab.key ? "text-[var(--mk-primary)]" : "text-[var(--mk-ink-400)]"
                }`}
              >
                {tabCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2.5 mt-[14px] px-[14px] pb-[14px] overflow-x-auto border-b border-[var(--mk-line)]">
        <div className={FILTER_SEARCH_WRAP_CLASS}>
          <div className={FILTER_SEARCH_ICON_WRAP_CLASS}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--mk-ink-400)]">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by order ID or customer"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={FILTER_SEARCH_INPUT_CLASS}
          />
        </div>

        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className={`${selectClass} w-[160px] shrink-0`}
          aria-label="Filter by payment status"
        >
          <option value="all">All payment states</option>
          {paymentOptions.map((p) => (
            <option key={p} value={p}>
              {p.replace(/_/g, " ")}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`${selectClass} w-[170px] shrink-0`}
          aria-label="Filter by current status"
        >
          <option value="all">All current statuses</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>

        <OrderDateFilter startDate={dateStart} endDate={dateEnd} onChange={handleDateChange} />
      </div>

      <CommonTable
        columns={columns}
        data={currentItems}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        emptyMessage={`No ${title.toLowerCase()} found`}
        minWidth="1210px"
        actionsWidth="56px"
        headerBgClass="bg-[#FAFBFD]"
        headerTextClass="text-[10px] font-semibold text-[var(--mk-ink-400)] tracking-[0.5px] leading-[14px]"
        headerHeightClass="h-[38px]"
        rowPaddingY="py-[8px]"
        rowMinH="min-h-9"
        onRowClick={onView}
        rowClassName={(item) =>
          isConflictAction(getOrderNextAction(item)) ? "border-l-[3px] border-l-[var(--mk-dgr)]" : ""
        }
        renderRowActions={(item) => <OrderActionMenu items={buildRowMenuItems(item)} />}
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

export default OrderTable;
