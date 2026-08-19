// Side drawer showing a customer's profile + order history, opened from a
// row click on the Customers list.
//
// This is a deliberate departure from the "detail drawer" card family
// (Inventory/Product) that boxed every single field — a customer profile
// reads better as one unified card with a name + a plain label/value grid
// (no per-field borders or icons) than as a bordered mini-table, so this
// file no longer mirrors those drawers' per-cell chrome. Section headings
// and the stat-card language still come from that same shared scale
// (18px headings) so the drawer family stays visually related. Only the
// presentation changed in this pass; all data, API calls, state and
// navigation targets are unchanged from before.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  ShoppingBag,
  Wallet,
  Package,
  Eye,
  UserRound,
  ArrowUpRight,
} from "lucide-react";

import { getCustomerDetail, clearSelectedCustomer } from "../../redux/slices/customerSlice";
import Drawer from "../common/Drawer";
import Skeleton from "../common/Skeleton";
import EmptyState from "../common/EmptyState";
import MkPill from "../common/MkPill";
import OrderStatusPill from "../common/OrderStatusPill";
import CommonTable from "../common/CommonTable";
import Pagination from "../common/Pagination";
import IconButton from "../common/IconButton";
import { formatDate } from "../../utils/formatDate";

const sectionHeadingClass = "text-[18px] font-semibold text-[var(--mk-ink-900)]";

// Plain label-over-value pair — no icon, no border, just spacing. Used for
// Email/Phone/Joined/Address inside the one unified profile card.
const Field = ({ label, value }) => (
  <div className="min-w-0">
    <p className="text-[12px] text-[var(--mk-ink-400)] mb-1">{label}</p>
    <p className="text-[14px] font-medium text-[var(--mk-ink-900)] truncate">{value ?? "—"}</p>
  </div>
);

// Display-only formatting (same category as formatDate below) — the real
// totalSpent value/calculation from the API is untouched; this just
// renders it as a proper 2-decimal currency string instead of a raw float
// that was previously overflowing into a truncated "…".
const formatMoney = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STAT_TILES = (totalOrders, totalSpent, totalProducts) => [
  { icon: ShoppingBag, label: "Total Orders", value: totalOrders },
  { icon: Wallet, label: "Amount Spent", value: formatMoney(totalSpent) },
  { icon: Package, label: "Products Purchased", value: totalProducts ?? "—" },
];

const CustomerDetailDrawer = ({ customerId, open, onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { selectedCustomer: customer, detailLoading } = useSelector(
    (state) => state.customer || {},
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    if (open && customerId) {
      dispatch(getCustomerDetail(customerId));
    }
  }, [dispatch, open, customerId]);

  const handleClose = () => {
    onClose();
    dispatch(clearSelectedCustomer());
    setCurrentPage(1);
  };

  const orders = customer?.orders || [];
  const totalOrders = orders.length;
  const totalSpent = customer?.totalSpent ?? 0;
  const totalProducts = orders.some((o) => Array.isArray(o.items))
    ? orders.reduce(
        (sum, o) => sum + (o.items?.reduce((s, it) => s + (it.quantity || 0), 0) || 0),
        0,
      )
    : null;

  const indexOfLast = currentPage * itemsPerPage;
  const currentOrders = orders.slice(indexOfLast - itemsPerPage, indexOfLast);

  const orderColumns = [
    {
      key: "orderNumber",
      header: "Order",
      truncate: true,
      truncateWidth: "140px",
      className: "!text-[13.5px] font-medium text-[var(--mk-ink-900)]",
    },
    {
      key: "createdAt",
      header: "Date",
      width: "100px",
      className: "!text-[13.5px] text-[var(--mk-ink-500)]",
      render: (item) => formatDate(item.createdAt),
    },
    {
      key: "status",
      header: "Status",
      width: "130px",
      render: (item) => <OrderStatusPill status={item?.status} />,
    },
    {
      key: "totalAmount",
      header: "Amount",
      width: "100px",
      align: "right",
      className: "!text-[14px] font-semibold text-[var(--mk-ink-900)] tabular-nums",
      render: (item) => formatMoney(item.totalAmount),
    },
  ];

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      title={customer?.name || "Customer"}
      width="max-w-[900px]"
      compact
      titleSizePx={18}
    >
      {detailLoading ? (
        <div className="space-y-5">
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-3 gap-2.5">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
          <Skeleton className="h-56 w-full" />
        </div>
      ) : !customer ? (
        <EmptyState
          icon={UserRound}
          title="Customer not found"
          description="This customer may have been removed, or the link is invalid."
        />
      ) : (
        <div className="space-y-5">
          {/* CUSTOMER INFORMATION — one unified profile card: heading +
              status, the name as its own prominent line, then a plain
              label/value grid with no per-field borders or icons. A single
              hairline under the name is the only divider in the card. */}
          <div className="rounded-xl border border-[var(--mk-line)] bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className={sectionHeadingClass}>Customer information</h4>
              <MkPill
                label={customer.isBlocked ? "Blocked" : "Active"}
                tone={customer.isBlocked ? "dgr" : "ok"}
                size="sm"
              />
            </div>

            <p className="text-[16px] font-semibold text-[var(--mk-ink-900)] pb-4 mb-4 border-b border-[var(--mk-line)]">
              {customer.name}
            </p>

            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <Field label="Email" value={customer.email} />
              <Field label="Phone" value={customer.phone} />
              <Field label="Joined" value={formatDate(customer.createdAt)} />
              {customer.addresses?.length > 0 && (
                <Field
                  label="Address"
                  value={[
                    customer.addresses[0].addressLine1,
                    customer.addresses[0].addressLine2,
                    customer.addresses[0].city,
                    customer.addresses[0].state,
                    customer.addresses[0].postalCode,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                />
              )}
            </div>
          </div>

          {/* STATISTICS — one unified strip with a subtle vertical divider
              between columns, instead of three separate boxed cards; small
              refined icon chips so the numbers stay the focal point. */}
          <div className="rounded-xl border border-[var(--mk-line)] bg-white grid grid-cols-3 divide-x divide-[var(--mk-line)]">
            {STAT_TILES(totalOrders, totalSpent, totalProducts).map((s) => (
              <div key={s.label} className="px-4 py-3.5 flex items-center gap-2.5 min-w-0">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--mk-primary-50)] text-[var(--mk-primary)] shrink-0">
                  <s.icon size={14} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--mk-ink-400)] truncate">
                    {s.label}
                  </p>
                  <p className="text-[18px] font-bold text-[var(--mk-ink-900)] mt-0.5 truncate">{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ORDER HISTORY — heading, table and pagination together inside
              one bordered card. */}
          <div className="rounded-xl border border-[var(--mk-line)] bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--mk-line)]">
              <h4 className={sectionHeadingClass}>Order History</h4>
            </div>
            {orders.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="No orders yet"
                description="Orders placed by this customer will show up here."
              />
            ) : (
              <>
                <CommonTable
                  columns={orderColumns}
                  data={currentOrders}
                  minWidth="460px"
                  zebra={false}
                  headerBgClass="bg-[#FAFBFD]"
                  headerTextClass="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--mk-ink-400)]"
                  headerHeightClass="h-10"
                  rowPaddingY="py-3"
                  renderRowActions={(item) => (
                    <IconButton
                      icon={Eye}
                      label="View order"
                      tone="purpleOutline"
                      onClick={() => navigate(`/orders/${item.id}`)}
                    />
                  )}
                />
                <Pagination
                  currentPage={currentPage}
                  totalItems={orders.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(value) => {
                    setItemsPerPage(value);
                    setCurrentPage(1);
                  }}
                  itemsPerPageOptions={[5, 10, 25]}
                />
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate(`/customers/${customer.id}`)}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--mk-primary)] hover:underline cursor-pointer"
          >
            View full profile
            <ArrowUpRight size={14} />
          </button>
        </div>
      )}
    </Drawer>
  );
};

export default CustomerDetailDrawer;
