// Derives the Orders list/drawer "Next Action" purely from real, already-used
// order fields (status, paymentStatus, totalAmount) — never a fabricated
// field. "Fix pricing" surfaces a genuine mismatch (zero/invalid amount)
// that has no one-click fix, so clicking it opens the order for manual
// review instead of auto-mutating. The delivered-but-still-pending case
// below is different: it has a real one-click fix (the same "Mark Payment
// as Paid" PATCH the ⋮ menu already uses), so it's a direct action, not a
// manual-review "conflict" anymore.
export function getOrderNextAction(order) {
  const status = (order?.status || "").toLowerCase();
  const paymentStatus = (order?.paymentStatus || "").toLowerCase();
  // Same fallback OrderTable/OrderDetailDrawer/OrderInvoice already use to
  // read payment method off a real order.
  const paymentMethod = (order?.payments?.[0]?.method || order?.paymentMethod || "").toLowerCase();
  const isCod = paymentMethod === "cod";
  const amount = Number(order?.totalAmount ?? 0);

  if (status === "cancelled") return null;

  // Fulfillment says delivered but payment never completed — ONLY for
  // prepaid/online orders (a COD order legitimately stays "pending" until
  // the cash is collected at delivery — that's the normal COD lifecycle,
  // not this case — it falls through to the ordinary "Complete" state
  // below). One click fixes it via the existing payment-status API, so it's
  // a direct action like every other next-action here, not a red "conflict".
  if (status === "delivered" && paymentStatus === "pending" && !isCod) {
    return { type: "mark_paid", label: "Mark payment as paid", tone: "outline" };
  }

  // Zero/invalid order amount still active — a real data problem.
  if (!(amount > 0) && status !== "delivered") {
    return { type: "manual", label: "Fix pricing", tone: "danger" };
  }

  // Delivered is the end of the fulfillment lifecycle — either the COD cash
  // is still outstanding (collect it now, backed by the real
  // POST /admin/orders/{id}/payments endpoint) or there's nothing left to
  // advance. COD collection is deliberately NOT offered before this point —
  // a COD order sitting at packed/shipped must finish fulfillment first, per
  // the documented Delivered + COD Due → Record COD payment flow.
  if (status === "delivered") {
    if (paymentStatus === "cod_due") {
      return { type: "cod_payment", label: "Record COD payment", tone: "outline" };
    }
    return { type: "complete", label: "Complete", tone: "neutral" };
  }

  // Order Placed → Packed → Shipped → Delivered — exactly one valid next
  // action per state, derived purely from the real `status` field, never a
  // hardcoded per-order guess. "Mark delivered" still goes through the same
  // generic PUT /admin/orders/{id} every other transition here already
  // uses — no dedicated Delivered API exists or is invented by this.
  const PROGRESSION = {
    pending: "packed",
    pending_payment: "packed",
    confirmed: "packed",
    processing: "packed",
    packed: "shipped",
    shipped: "delivered",
  };
  const targetStatus = PROGRESSION[status];
  if (!targetStatus) return null;

  const LABELS = { packed: "Pack order", shipped: "Ship order", delivered: "Mark delivered" };
  return { type: "progress", label: LABELS[targetStatus], targetStatus, tone: "outline" };
}

export const isConflictAction = (action) => action?.tone === "danger";
