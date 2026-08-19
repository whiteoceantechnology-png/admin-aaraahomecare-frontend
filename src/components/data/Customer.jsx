// src/components/data/Customer.jsx
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { CheckCircle2 } from "lucide-react";
import CustomerTable from "../table/CustomerTable";
import CustomerDetailDrawer from "../details/CustomerDetailDrawer";
import {
  getAllCustomers,
  toggleCustomerBlock,
} from "../../redux/slices/customerSlice";

const hasValue = (v) => v !== null && v !== undefined;

const Customer = ({ title = "Customers" }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { allCustomers = [], loading } = useSelector(
    (state) => state.customer || {},
  );
  const [activeCustomerId, setActiveCustomerId] = useState(null);

  // Eye icon → the customer's orders on the existing Orders page, via its
  // existing search box (OrderTable already matches on customer.name) —
  // not the Customer Details drawer. Row click still opens that drawer
  // (see onView below); only the eye icon's action changed.
  const handleViewOrders = (item) => {
    navigate(`/order?customer=${encodeURIComponent(item.name || "")}`);
  };

  useEffect(() => {
    dispatch(getAllCustomers());
  }, [dispatch]);

  const handleToggleBlock = async (id) => {
    const res = await dispatch(toggleCustomerBlock(id));
    if (toggleCustomerBlock.fulfilled.match(res)) {
      toast.success(res.payload?.message || "Customer status updated");
    } else {
      toast.error(res.payload || "Error");
    }
  };

  // Identity is the phone number — real API rows sharing a phone are grouped
  // into one entry here (client-side, over real records only) until the
  // backend enforces UNIQUE(phone) itself. Every aggregated field (orders
  // count, lifetime spend, joined date) is summed/derived from real values
  // on the duplicate rows — nothing here is invented.
  const groupedCustomers = useMemo(() => {
    const byPhone = new Map();
    for (const c of allCustomers) {
      const key = (c.phone || "").toString().trim() || `__no-phone-${c.id}`;
      const bucket = byPhone.get(key);
      if (!bucket) {
        byPhone.set(key, [c]);
      } else {
        bucket.push(c);
      }
    }

    return Array.from(byPhone.values()).map((group) => {
      const primary = group[0];
      const ordersCount = group.reduce((sum, c) => sum + (c._count?.orders ?? 0), 0);
      const spends = group.map((c) => c.totalSpent).filter(hasValue);
      const lifetimeSpend = spends.length > 0 ? spends.reduce((a, b) => a + Number(b), 0) : undefined;
      const earliestCreatedAt = group
        .map((c) => c.createdAt)
        .filter(Boolean)
        .sort()[0];

      return {
        ...primary,
        id: primary.id,
        mergedIds: group.map((c) => c.id),
        mergedCount: group.length,
        ordersCount,
        lifetimeSpend,
        createdAt: earliestCreatedAt || primary.createdAt,
        isBlocked: group.some((c) => c.isBlocked),
      };
    });
  }, [allCustomers]);

  // Dynamic banner — describes whatever duplicate group is actually largest
  // in the real data right now; falls back to an honest no-duplicates note
  // when there aren't any, instead of a hardcoded example.
  const topDuplicate = groupedCustomers.reduce(
    (top, c) => (c.mergedCount > (top?.mergedCount ?? 1) ? c : top),
    null,
  );

  return (
    <div className="space-y-4">
      {/* HEADER — title + subtitle share one line, matching the reference. */}
      <div className="flex items-baseline gap-3 min-w-0">
        <h2 className="!text-[24px] !font-bold !leading-[1.2] !m-0 text-[var(--mk-ink-900)] tracking-[-0.01em] shrink-0">
          {title}
        </h2>
        {/* <p className="text-[13px] font-medium text-[var(--mk-ink-500)] leading-[1.4] truncate">
          Identity is the phone number. Duplicates are merged, not listed.
        </p> */}
      </div>

      {/* DEDUP BANNER — real, data-driven (describes whichever duplicate
          group is actually largest right now; falls back to an honest
          no-duplicates note), never a hardcoded example. */}
      {/* <div className="flex items-center gap-2 px-[12px] py-[10px] rounded-[8px] bg-[var(--mk-ok-bg)] border border-[#B7E4CE] text-[#0F6B3F] text-[13px] leading-[1.4]">
        <CheckCircle2 size={15} className="shrink-0" />
        <div>
          <b>Dedup applied.</b>{" "}
          {topDuplicate ? (
            <>
              The old table listed {topDuplicate.mergedCount} separate "{topDuplicate.name}" rows sharing phone{" "}
              {topDuplicate.phone} — no unique constraint.{" "}
            </>
          ) : (
            <>No duplicate phone numbers found in the current data. </>
          )}
          This view groups accounts by phone and shows lifetime value; the backend needs UNIQUE(phone) plus a merge
          migration.
        </div>
      </div> */}

      {/* TABLE — one card (toolbar + table + pagination), same wrapping
          pattern as Order.jsx/OrderTable.jsx and every other list page. */}
      <div className="bg-white rounded-xl border border-[var(--mk-line)] overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-[var(--mk-ink-400)]">
            Loading customers…
          </div>
        ) : (
          <CustomerTable
            data={groupedCustomers}
            title={title}
            onToggleBlock={handleToggleBlock}
            onView={(item) => setActiveCustomerId(item.id)}
            onViewOrders={handleViewOrders}
          />
        )}
      </div>

      <CustomerDetailDrawer
        customerId={activeCustomerId}
        open={!!activeCustomerId}
        onClose={() => setActiveCustomerId(null)}
      />
    </div>
  );
};

export default Customer;
