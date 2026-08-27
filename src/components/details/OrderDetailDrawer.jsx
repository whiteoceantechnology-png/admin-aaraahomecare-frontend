// Right-side Order Detail drawer — same Drawer shell as Product/Category/
// Inventory. Opened from an Orders list row click; never navigates to a
// separate page. Every value (items, totals, pills, timeline) reads straight
// off the real order object from GET /admin/orders/{id} — nothing here is
// hardcoded from the reference screenshot.
import { useMemo } from "react";
import { exGstSubtotal, gstPercentFor } from "../../utils/orderTotals";
import { toast } from "react-hot-toast";
import { Pencil, Printer, PackageCheck, Ban, Undo2, Phone, History, CreditCard, MessageCircle } from "lucide-react";
import Drawer from "../common/Drawer";
import EmptyState from "../common/EmptyState";
import OrderStatusPill from "../common/OrderStatusPill";
import OrderStatusDropdown from "../common/OrderStatusDropdown";
import OrderActionDropdown from "../common/OrderActionDropdown";
import OrderActionMenu from "../common/OrderActionMenu";
import { formatDateTime } from "../../utils/formatDate";
import { getOrderNextAction } from "../../utils/orderNextAction";


// The drawer's primary action is the whole panel's main CTA, so its default
// ("outline"-tone) state is a solid brand button here — unlike the table
// row's subtler bordered style — while conflict states stay danger-red.
const FOOTER_ACTION_TONE_CLASS = {
  outline: "text-white bg-[var(--mk-primary)] hover:bg-[var(--mk-primary-hover)] border border-transparent",
  danger: "bg-[var(--mk-dgr)] text-white hover:brightness-110 border border-transparent",
};

const fmtMoney = (n) =>
  `₹${Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PAID_FAMILY = ["paid", "completed", "success"];

const Row = ({ label, value, bold }) => (
  <div className="flex items-center justify-between py-1">
    <span className={`text-[12.5px] ${bold ? "font-semibold text-[var(--mk-ink-900)]" : "text-[var(--mk-ink-500)]"}`}>
      {label}
    </span>
    <span className={`text-[12.5px] tabular-nums ${bold ? "text-[16px] font-bold text-[var(--mk-ink-900)]" : "font-medium text-[var(--mk-ink-900)]"}`}>
      {value}
    </span>
  </div>
);

// Normalizes raw event objects — used both for the dedicated
// GET /admin/orders/{id}/events response and (as a fallback) for events
// embedded directly on the order object, since field names for the latter
// were never confirmed and are kept defensive.
const normalizeEvents = (raw) => {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  return raw
    .map((e) => ({
      label: e.label || e.title || e.type || e.eventType || "Event",
      detail: e.detail || e.description || e.message || e.meta || null,
      time: e.createdAt || e.timestamp || e.occurredAt || e.time || null,
    }))
    .filter((e) => e.time)
    .sort((a, b) => new Date(a.time) - new Date(b.time));
};

// Honest fallback — same two facts OrderDetailsPage.jsx already derives from
// confirmed real fields, nothing invented beyond that. Used only if neither
// the dedicated events endpoint nor any embedded event field returned data.
const fallbackEvents = (order) => {
  const events = [];
  if (order?.createdAt) {
    events.push({ label: "Order placed", detail: null, time: order.createdAt });
  }
  if (order?.updatedAt && order.updatedAt !== order.createdAt) {
    events.push({ label: `Status updated to ${(order.status || "").replace(/_/g, " ")}`, detail: null, time: order.updatedAt });
  }
  return events;
};

const OrderDetailDrawer = ({
  order,
  loading,
  events: fetchedEvents,
  eventsLoading,
  open,
  onClose,
  onProgressStatus,
  onTrack,
  onCancel,
  onRecordCod,
  recordingCodId = null,
  onMarkPaid,
  onRefund,
  onContact,
  onPrintInvoice,
  onPrintPackingSlip,
}) => {
  const items = order?.items || [];
  // Line prices are stored GST-INCLUSIVE, so this sum already contains the
  // tax. The summary below shows it split into goods + GST rather than adding
  // the GST on top of it again — see utils/orderTotals.js.
  const subtotal = items.reduce((sum, it) => sum + Number(it.subtotal ?? it.price * (it.quantity || 1) ?? 0), 0);
  const subtotalExGst = exGstSubtotal(subtotal, order?.taxAmount);
  const gstPercent = gstPercentFor(subtotal, order?.taxAmount);
  const address = order?.addressSnapshot;
  const payments = Array.isArray(order?.payments) ? order.payments : [];
  const paymentType = payments[0]?.method || order?.paymentMethod;
  const isPaid = PAID_FAMILY.includes((order?.paymentStatus || "").toLowerCase());
  // Paid amount comes from the real payment records when there are any
  // (POST /admin/orders/{id}/payments creates one per COD collection); an
  // order marked paid via the generic "Mark Payment as Paid" shortcut never
  // creates a payment record, so that path falls back to the full total —
  // still real (paymentStatus is a real, already-loaded field), never a
  // guess for an order that's actually unpaid or partially paid.
  const paidFromRecords = payments.reduce((sum, p) => sum + Number(p?.amount || 0), 0);
  const paidAmount = paidFromRecords > 0 ? paidFromRecords : isPaid ? Number(order?.totalAmount || 0) : 0;
  const outstandingAmount = Math.max(0, Number(order?.totalAmount || 0) - paidAmount);

  const events = useMemo(
    () => normalizeEvents(fetchedEvents) || normalizeEvents(order?.events || order?.orderEvents || order?.order_events || order?.timeline) || fallbackEvents(order),
    [fetchedEvents, order],
  );

  const action = order ? getOrderNextAction(order) : null;
  const isCancelled = (order?.status || "").toLowerCase() === "cancelled";

  // Contact info is already part of the fully-loaded order (GET
  // /admin/orders/{id}), so this is a real, working action — not a stub —
  // it just copies what's already on screen rather than calling any API.
  const handleContactCustomer = () => {
    const phone = order?.customer?.phone;
    const email = order?.customer?.email;
    if (!phone && !email) {
      toast("No contact details on file for this customer");
      return;
    }
    navigator.clipboard.writeText([phone, email].filter(Boolean).join(", "));
    toast.success(`Copied contact — ${[phone, email].filter(Boolean).join(" · ")}`);
  };

  const handleViewActivity = () => {
    document.getElementById("order-activity-timeline")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const menuItems = order && [
    { key: "edit", label: "Edit Order", icon: Pencil, onClick: () => onTrack?.(order) },
    { key: "invoice", label: "Print Invoice", icon: Printer, onClick: () => onPrintInvoice?.() },
    { key: "packing", label: "Print Packing Slip", icon: PackageCheck, onClick: () => onPrintPackingSlip?.() },
    {
      key: "markPaid",
      label: "Mark Payment as Paid",
      icon: CreditCard,
      disabled: isPaid,
      onClick: () => onMarkPaid?.(order),
    },
    {
      key: "cancel",
      label: "Cancel Order",
      icon: Ban,
      tone: "danger",
      disabled: isCancelled,
      onClick: () => onCancel?.(order),
    },
    { key: "refund", label: "Refund", icon: Undo2, onClick: () => onRefund?.(order) },
    // Clipboard-copy quick action (existing, unchanged) — separate from
    // "Message Customer" below, which actually sends via
    // POST /admin/orders/{id}/contact.
    { key: "contact", label: "Contact Customer", icon: Phone, onClick: handleContactCustomer },
    { key: "message", label: "Message Customer", icon: MessageCircle, onClick: () => onContact?.(order) },
    { key: "activity", label: "View Activity", icon: History, onClick: handleViewActivity },
  ];

  const handleSelectAction = (selected) => {
    if (selected.type === "progress") onProgressStatus?.(order, selected.targetStatus);
    else if (selected.type === "cod_payment") onRecordCod?.(order);
    else if (selected.type === "mark_paid") onMarkPaid?.(order);
    else onTrack?.(order);
  };

  const footer = order && (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        {!isCancelled && action && (
          <OrderActionDropdown
            action={action}
            onSelect={handleSelectAction}
            size="lg"
            toneClass={FOOTER_ACTION_TONE_CLASS}
            loading={!!order && recordingCodId === order.id}
          />
        )}
        {!isCancelled && (
          <button
            type="button"
            onClick={() => onCancel?.(order)}
            className="inline-flex items-center h-[36px] px-[12px] rounded-[6px] text-[13px] font-semibold text-[var(--mk-dgr)] hover:bg-[var(--mk-dgr-bg)] transition-colors cursor-pointer"
          >
            Cancel order
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onClose}
        style={{ borderRadius: "6px" }}
        className="inline-flex items-center h-[36px] px-[16px] text-[13px] font-semibold text-[var(--mk-ink-700)] border border-[var(--mk-line)] bg-white hover:bg-gray-50 transition-colors cursor-pointer"
      >
        Close
      </button>
    </div>
  );

  // The header's "⋮" menu (Print Invoice/Packing Slip, Mark Paid, Refund,
  // Contact/Message Customer, View Activity) is intentionally not rendered
  // here anymore — the reference design has only the close X. Every one of
  // those actions is still reachable from the same row's "⋮" menu on the
  // Orders table (OrderTable.jsx's buildRowMenuItems carries the identical
  // set), so nothing is actually lost — this removes a redundant second
  // entry point, not a capability.
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={order?.orderNumber || "Order"}
      width="max-w-[800px]"
      compact
      headerHeightPx={66}
      titleSizePx={20}
      bodyPaddingXPx={18}
      footerHeightPx={64}
      footer={footer}
    >
      {loading ? (
        <div className="py-16 text-center text-sm text-[var(--mk-ink-400)]">Loading order…</div>
      ) : !order ? (
        <EmptyState title="No order selected" />
      ) : (
        <div className="space-y-3.5">
          {/* STATUS PILLS + relocated "⋮" menu — the reference header has
              only the close X, so the menu (Invoice/Packing Slip/Refund/
              Message Customer/etc. — several of which have no other trigger
              in the app, see the comment above) moved down here instead of
              being deleted. */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <OrderStatusPill status={order.paymentStatus} />
              <OrderStatusDropdown order={order} onChange={(newStatus) => onProgressStatus?.(order, newStatus)} />
              {paymentType && <OrderStatusPill status={paymentType} />}
            </div>
            <OrderActionMenu items={menuItems} />
          </div>

          {/* CUSTOMER CARD */}
          <div className="rounded-[8px] border border-[var(--mk-line)] px-3.5 py-[10px]">
            <p className="text-[13px] font-bold text-[var(--mk-ink-900)]">
              {order.customer?.name || address?.name || "—"}
            </p>
            {address ? (
              <p className="text-[12px] text-[var(--mk-ink-500)] mt-0.5">
                {[
                  ...[address.addressLine1, address.addressLine2, address.city].filter(Boolean),
                  [address.state, address.postalCode].filter(Boolean).join(" "),
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            ) : (
              <p className="text-[12px] text-[var(--mk-ink-400)] mt-0.5">No address on file</p>
            )}
          </div>

          {/* ITEMS */}
          <div className="rounded-[8px] border border-[var(--mk-line)] overflow-hidden">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="bg-[#FAFBFD] text-[9.5px] uppercase tracking-wide text-[var(--mk-ink-400)]">
                  <th className="text-left font-semibold px-3.5 py-2">Item</th>
                  <th className="text-right font-semibold px-3.5 py-2">Qty</th>
                  <th className="text-right font-semibold px-3.5 py-2">Price (ex)</th>
                  <th className="text-right font-semibold px-3.5 py-2">Line total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--mk-line)]">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3.5 py-6 text-center text-[var(--mk-ink-400)]">
                      No items on this order
                    </td>
                  </tr>
                ) : (
                  items.map((it) => (
                    <tr key={it.id}>
                      <td className="px-3.5 py-2 text-[12.5px] text-[var(--mk-ink-900)] font-medium">
                        {it.productName}
                        {it.sizeLabel ? ` · ${it.sizeLabel}` : ""}
                      </td>
                      <td className="px-3.5 py-2 text-right tabular-nums text-[var(--mk-ink-700)]">
                        {it.quantity}
                      </td>
                      <td className="px-3.5 py-2 text-right tabular-nums text-[var(--mk-ink-700)]">
                        {fmtMoney(it.price)}
                      </td>
                      <td className="px-3.5 py-2 text-right tabular-nums font-semibold text-[var(--mk-ink-900)]">
                        {fmtMoney(it.subtotal)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* SUMMARY + GST NOTE — kept in one wrapper (not individually
              spaced by the parent's space-y) so the helper text can sit
              close to the card without a negative-margin hack. */}
          <div>
            <div className="rounded-[8px] border border-[var(--mk-line)] px-3.5 py-[10px]">
              <Row label="Subtotal (ex-GST)" value={fmtMoney(subtotalExGst)} />
              <Row label={gstPercent != null ? `GST @ ${gstPercent}%` : "GST"} value={fmtMoney(order.taxAmount)} />
              <Row label="Shipping" value={fmtMoney(order.shippingAmount)} />
              <div className="mt-2 pt-2 border-t border-[var(--mk-line)]">
                <Row label="Total" value={fmtMoney(order.totalAmount)} bold />
              </div>
              <div className="mt-2 pt-2 border-t border-dashed border-[var(--mk-line)]">
                <div className="flex items-center justify-between py-1">
                  <span className="text-[12.5px] text-[var(--mk-ink-500)]">Paid</span>
                  <span className="text-[12.5px] font-semibold tabular-nums text-[var(--mk-ok)]">
                    {fmtMoney(paidAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-[12.5px] text-[var(--mk-ink-500)]">Outstanding</span>
                  <span
                    className={`text-[12.5px] font-semibold tabular-nums ${
                      outstandingAmount > 0 ? "text-[var(--mk-warn)]" : "text-[var(--mk-ink-400)]"
                    }`}
                  >
                    {fmtMoney(outstandingAmount)}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-[11.5px] text-[var(--mk-ink-400)] mt-1.5">
              Prices are stored GST-inclusive · the GST above is the portion
              already contained in them, not an extra charge.
            </p>
          </div>

          {/* PAYMENT HISTORY — every real payment record for this order
              (POST /admin/orders/{id}/payments creates one per COD
              collection); empty for an order that's still fully COD-due. */}
          <div>
            <h4 className="!text-[14px] !font-semibold !leading-[1.2] !m-0 text-[var(--mk-ink-900)] mb-2">
              Payment history
            </h4>
            {payments.length === 0 ? (
              <p className="text-[12.5px] text-[var(--mk-ink-400)]">No payments recorded yet.</p>
            ) : (
              <div className="rounded-[8px] border border-[var(--mk-line)] overflow-hidden">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="bg-[#FAFBFD] text-[9.5px] uppercase tracking-wide text-[var(--mk-ink-400)]">
                      <th className="text-left font-semibold px-3.5 py-2">Method</th>
                      <th className="text-left font-semibold px-3.5 py-2">Reference</th>
                      <th className="text-left font-semibold px-3.5 py-2">Date</th>
                      <th className="text-right font-semibold px-3.5 py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--mk-line)]">
                    {payments.map((p, i) => (
                      <tr key={p?.id ?? i}>
                        <td className="px-3.5 py-2">
                          <OrderStatusPill status={p?.method} />
                        </td>
                        <td className="px-3.5 py-2 text-[var(--mk-ink-500)]">{p?.reference || "—"}</td>
                        <td className="px-3.5 py-2 text-[var(--mk-ink-500)]">
                          {formatDateTime(p?.receivedAt || p?.createdAt)}
                        </td>
                        <td className="px-3.5 py-2 text-right tabular-nums font-semibold text-[var(--mk-ink-900)]">
                          {fmtMoney(p?.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* TIMELINE */}
          <div id="order-activity-timeline">
            <h4 className="!text-[18px] !font-semibold !leading-[1.2] !m-0 text-[var(--mk-ink-900)] mb-1">
              Timeline{" "}
              <span className="text-[11.5px] font-normal text-[var(--mk-ink-400)]">from append-only order_events</span>
            </h4>
            {/* Stock reservation and payment-gateway initiation happen in the
                order-creation service, not this admin app, and today's API
                doesn't expose them as events — so they're never fabricated
                here; this note is the honest substitute for a fake step. */}
            <p className="text-[11.5px] text-[var(--mk-ink-400)] mb-2">
              Stock reservation and payment-gateway events happen in the order-creation service, not this admin app, so they never appear here.
            </p>
            {eventsLoading ? (
              <p className="text-[12.5px] text-[var(--mk-ink-400)]">Loading timeline…</p>
            ) : events.length === 0 ? (
              <p className="text-[12.5px] text-[var(--mk-ink-400)]">No events recorded yet.</p>
            ) : (
              <ol className="relative">
                {events.map((ev, i) => {
                  const isLast = i === events.length - 1;
                  return (
                    <li key={i} className="relative pl-6 pb-3 last:pb-0">
                      {i !== events.length - 1 && (
                        <span className="absolute left-[5px] top-3 bottom-0 w-px bg-[var(--mk-line)]" />
                      )}
                      <span
                        className={`absolute left-0 top-1 w-[11px] h-[11px] rounded-full border-2 bg-white ${
                          isLast ? "border-[var(--mk-warn)]" : "border-[var(--mk-ink-400)]"
                        }`}
                      />
                      <p className="text-[13px] font-semibold text-[var(--mk-ink-900)]">
                        {ev.label}
                        {ev.detail && <span className="font-normal text-[var(--mk-ink-500)]"> · {ev.detail}</span>}{" "}
                        <span className="font-normal text-[11.5px] text-[var(--mk-ink-400)]">
                          {formatDateTime(ev.time)}
                        </span>
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
};

export default OrderDetailDrawer;
