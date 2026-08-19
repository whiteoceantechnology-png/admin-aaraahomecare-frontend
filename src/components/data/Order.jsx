// src/components/data/Order.jsx
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Download } from "lucide-react";

import OrderTable from "../table/OrderTable";
import OrderDetailDrawer from "../details/OrderDetailDrawer";
import InvoiceModal from "../common/InvoiceModal";
import PackingSlipModal from "../common/PackingSlipModal";
import TrackOrderForm from "../form/TrackOrderForm";
import CancelOrder from "./CancelOrder";
import RefundOrder from "./RefundOrder";
import ContactCustomerForm from "./ContactCustomerForm";
import Modal from "../common/Modal";
import api from "../../utils/api";
import {
  getAllOrders,
  getOrderDetail,
  getOrderEvents,
  updateOrder,
  cancelOrder,
  recordCodPayment,
  updatePaymentStatus,
  requestRefund,
  contactCustomer,
  clearSelectedOrder,
} from "../../redux/slices/orderSlice";

const PAID_FAMILY = ["paid", "completed", "success"];
// A generous page size so the existing tabs/search/filters (which read the
// full in-memory list) keep working exactly as before, now via the real
// paginated GET /admin/orders?page=&limit=... endpoint instead of an
// unbounded no-params fetch. See orderSlice.js's getAllOrders comment.
const ORDER_LIST_LIMIT = 1000;

const Order = ({ title = "Orders" }) => {
  const dispatch = useDispatch();
  // ?customer=<name> — set by the Customers page's "View orders" eye icon,
  // read once to seed the existing search box (OrderTable's own search
  // logic, unchanged); not used for anything else.
  const [searchParams] = useSearchParams();
  const customerParam = searchParams.get("customer") || "";
  const {
    allOrders = [],
    loading,
    selectedOrder,
    detailLoading,
    selectedOrderEvents = [],
    eventsLoading,
  } = useSelector((state) => state.order || {});

  const [activeModal, setActiveModal] = useState(null); // "track" | "cancel" | "refund" | "contact" | null
  const [submitting, setSubmitting] = useState(false);
  const [viewingOrderId, setViewingOrderId] = useState(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [packingSlipOpen, setPackingSlipOpen] = useState(false);
  // id of the order whose COD payment is currently being recorded — drives
  // the disabled/spinner state on that one row/drawer so a second click
  // can't fire a duplicate POST /admin/orders/{id}/payments while the first
  // is still in flight.
  const [recordingCodId, setRecordingCodId] = useState(null);

  useEffect(() => {
    dispatch(getAllOrders({ page: 1, limit: ORDER_LIST_LIMIT }));
  }, [dispatch]);

  // "8 orders · ₹262.75 collected of ₹927.90 GMV" — derived entirely from
  // real order totals/paymentStatus, never a hardcoded figure. GMV excludes
  // cancelled orders (a cancelled order never became real merchandise
  // volume); "collected" is the subset of that already paid.
  const summary = useMemo(() => {
    const live = allOrders.filter((o) => (o?.status || "").toLowerCase() !== "cancelled");
    const gmv = live.reduce((sum, o) => sum + Number(o?.totalAmount || 0), 0);
    const collected = live
      .filter((o) => PAID_FAMILY.includes((o?.paymentStatus || "").toLowerCase()))
      .reduce((sum, o) => sum + Number(o?.totalAmount || 0), 0);
    return { count: allOrders.length, collected, gmv };
  }, [allOrders]);

  const fmtMoney = (n) =>
    `₹${Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const openOrder = (order) => {
    setViewingOrderId(order.id);
    dispatch(getOrderDetail(order.id));
    dispatch(getOrderEvents(order.id));
  };

  const closeDrawer = () => {
    setViewingOrderId(null);
    dispatch(clearSelectedOrder());
  };

  // One-click fulfillment progression (Mark packed / shipped / delivered) —
  // same updateOrder thunk TrackOrderForm already uses, just fired directly.
  const handleProgressStatus = async (order, targetStatus) => {
    const res = await dispatch(updateOrder({ id: order.id, data: { status: targetStatus } }));
    if (updateOrder.fulfilled.match(res)) {
      toast.success("Order updated");
    } else {
      toast.error(res.payload || "Error");
    }
  };

  // Single-click, no form — amount/reference are already known from the
  // order itself (same "one guided step" pattern as Mark delivered), backed
  // by the real POST /admin/orders/{id}/payments endpoint. Guarded on both
  // ends against a duplicate recording: `recordingCodId` blocks a second
  // click while the first request is still in flight, and re-checking the
  // order's own current state (not a stale closure) blocks it from firing
  // at all once the order is no longer actually COD-due-and-delivered —
  // belt-and-braces alongside getOrderNextAction already not offering this
  // action outside that state.
  const handleRecordCod = async (order) => {
    if (recordingCodId) return;
    const isStillCodDue = (order?.paymentStatus || "").toLowerCase() === "cod_due";
    const isDelivered = (order?.status || "").toLowerCase() === "delivered";
    if (!isStillCodDue || !isDelivered) return;

    setRecordingCodId(order.id);
    const res = await dispatch(
      recordCodPayment({
        id: order.id,
        data: {
          amount: order.totalAmount,
          method: "cod",
          reference: order.orderNumber,
          notes: "COD payment received",
        },
      }),
    );
    setRecordingCodId(null);
    if (recordCodPayment.fulfilled.match(res)) {
      toast.success("COD payment recorded");
    } else {
      toast.error(res.payload || "Failed to record COD payment");
    }
  };

  // Single-click "mark paid" via the generic PATCH /payment-status endpoint —
  // distinct from Record COD payment, which creates an actual payment record.
  const handleMarkPaid = async (order) => {
    const res = await dispatch(
      updatePaymentStatus({
        id: order.id,
        data: { paymentStatus: "paid", notes: "Marked paid by admin" },
      }),
    );
    if (updatePaymentStatus.fulfilled.match(res)) {
      toast.success("Payment status updated");
    } else {
      toast.error(res.payload || "Failed to update payment status");
    }
  };

  const openModal = (order, modal) => {
    dispatch(getOrderDetail(order.id));
    setActiveModal(modal);
  };

  const handleTrackClick = (order) => openModal(order, "track");
  const handleCancelClick = (order) => openModal(order, "cancel");
  const handleRefundClick = (order) => openModal(order, "refund");
  const handleContactClick = (order) => openModal(order, "contact");

  const handlePrintPackingSlip = () => setPackingSlipOpen(true);

  const closeModal = () => {
    setActiveModal(null);
    if (!viewingOrderId) dispatch(clearSelectedOrder());
  };

  const handleTrackSubmit = async (data) => {
    if (!selectedOrder) return;
    setSubmitting(true);
    const res = await dispatch(updateOrder({ id: selectedOrder.id, data }));
    setSubmitting(false);

    if (updateOrder.fulfilled.match(res)) {
      toast.success("Order updated");
      closeModal();
    } else {
      toast.error(res.payload || "Error");
    }
  };

  const handleCancelSubmit = async (data) => {
    if (!selectedOrder) return;
    setSubmitting(true);
    const res = await dispatch(cancelOrder({ id: selectedOrder.id, data }));
    setSubmitting(false);

    if (cancelOrder.fulfilled.match(res)) {
      toast.success("Order cancelled");
      closeModal();
    } else {
      toast.error(res.payload || "Error");
    }
  };

  const handleRefundSubmit = async (data) => {
    if (!selectedOrder) return;
    setSubmitting(true);
    const res = await dispatch(requestRefund({ id: selectedOrder.id, data }));
    setSubmitting(false);

    if (requestRefund.fulfilled.match(res)) {
      toast.success("Refund requested");
      closeModal();
    } else {
      toast.error(res.payload || "Error");
    }
  };

  const handleContactSubmit = async (data) => {
    if (!selectedOrder) return;
    setSubmitting(true);
    const res = await dispatch(contactCustomer({ id: selectedOrder.id, data }));
    setSubmitting(false);

    if (contactCustomer.fulfilled.match(res)) {
      toast.success("Message sent to customer");
      closeModal();
    } else {
      toast.error(res.payload || "Error");
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get("/admin/orders/export", { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "orders_export.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to export orders");
    }
  };

  const modalTitle =
    activeModal === "track"
      ? "Track Order"
      : activeModal === "cancel"
        ? "Cancel Order"
        : activeModal === "refund"
          ? "Refund Order"
          : activeModal === "contact"
            ? "Contact Customer"
            : "";

  return (
    <div className="space-y-[18px]">
      {/* HEADER — title + subtitle share one line, matching the shared
          Products/Categories/Inventory/Customers pattern. */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[12px]">
        <div className="flex items-baseline gap-3 min-w-0">
          <h2 className="!text-[24px] !font-bold !leading-[1.2] !m-0 text-[var(--mk-ink-900)] tracking-[-0.01em] shrink-0">
            {title}
          </h2>
          <p className="text-[13px] font-medium text-[var(--mk-ink-500)] leading-[1.4] truncate">
            {summary.count} order{summary.count === 1 ? "" : "s"} · {fmtMoney(summary.collected)} collected of{" "}
            {fmtMoney(summary.gmv)} GMV
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center h-[30px] gap-1.5 px-3 rounded-[6px] text-[12.5px] font-medium text-[var(--mk-ink-700)] border border-[var(--mk-line)] bg-white hover:border-[#C9CFDA] hover:text-[var(--mk-ink-900)] transition-colors cursor-pointer shrink-0"
        >
          <Download size={15} />
          Export
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-[10px] border border-[var(--mk-line)] overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">
            Loading orders…
          </div>
        ) : (
          <OrderTable
            data={allOrders}
            title={title}
            onView={openOrder}
            onProgressStatus={handleProgressStatus}
            onTrack={handleTrackClick}
            onCancel={handleCancelClick}
            onRecordCod={handleRecordCod}
            onMarkPaid={handleMarkPaid}
            recordingCodId={recordingCodId}
            initialSearch={customerParam}
          />
        )}
      </div>

      {/* ORDER DETAIL DRAWER */}
      <OrderDetailDrawer
        order={viewingOrderId ? selectedOrder : null}
        loading={detailLoading}
        events={selectedOrderEvents}
        eventsLoading={eventsLoading}
        open={!!viewingOrderId}
        onClose={closeDrawer}
        onProgressStatus={handleProgressStatus}
        onTrack={handleTrackClick}
        onCancel={handleCancelClick}
        onRecordCod={handleRecordCod}
        recordingCodId={recordingCodId}
        onMarkPaid={handleMarkPaid}
        onRefund={handleRefundClick}
        onContact={handleContactClick}
        onPrintInvoice={() => setInvoiceOpen(true)}
        onPrintPackingSlip={handlePrintPackingSlip}
      />

      {/* INVOICE PREVIEW — real HTML from GET /admin/orders/{id}/invoice.
          Reuses whichever order is already loaded into selectedOrder (the
          drawer fetches it before this can be opened). */}
      <InvoiceModal open={invoiceOpen} onClose={() => setInvoiceOpen(false)} order={selectedOrder} />

      {/* PACKING SLIP PREVIEW — real HTML from
          GET /admin/orders/{id}/packing-slip. */}
      <PackingSlipModal open={packingSlipOpen} onClose={() => setPackingSlipOpen(false)} order={selectedOrder} />

      {/* TRACK / CANCEL / REFUND / CONTACT MODAL (shared by the list and the drawer) */}
      <Modal open={!!activeModal} onClose={closeModal} title={modalTitle} maxWidth="max-w-2xl">
        {detailLoading ? (
          <p className="text-sm text-gray-500 text-center py-8">Loading…</p>
        ) : (
          <>
            {activeModal === "track" && (
              <TrackOrderForm order={selectedOrder} onSubmit={handleTrackSubmit} loading={submitting} />
            )}
            {activeModal === "cancel" && (
              <CancelOrder order={selectedOrder} onSubmit={handleCancelSubmit} loading={submitting} />
            )}
            {activeModal === "refund" && (
              <RefundOrder order={selectedOrder} onSubmit={handleRefundSubmit} loading={submitting} />
            )}
            {activeModal === "contact" && (
              <ContactCustomerForm order={selectedOrder} onSubmit={handleContactSubmit} loading={submitting} />
            )}
          </>
        )}
      </Modal>
    </div>
  );
};

export default Order;
