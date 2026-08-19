// Same shell/visual language as CancelOrder.jsx — collects the two fields
// POST /admin/orders/{id}/refund actually requires (amount, reason). `items`
// is sent as [] (a whole-order refund, no per-line-item breakdown UI exists
// yet) — matches the simplest valid request shown in the provided API spec.
import { useState } from "react";

const RefundOrder = ({ order, onSubmit, loading }) => {
  const [amount, setAmount] = useState(order?.totalAmount ?? "");
  const [reason, setReason] = useState("");

  if (!order) {
    return <p className="text-sm text-gray-500 text-center py-8">Select an order to refund.</p>;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ amount: Number(amount), reason, items: [] });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-[13px] text-gray-500">
        Refunding order <span className="font-medium text-gray-800">{order.orderNumber}</span>
      </p>

      <div className="flex flex-col">
        <label className="text-[13px] font-medium text-gray-700 mb-1">Refund amount (₹)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-[13px] text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--mk-primary-ring)] focus:border-[var(--mk-primary)]"
        />
      </div>

      <div className="flex flex-col">
        <label className="text-[13px] font-medium text-gray-700 mb-1">Reason for refund</label>
        <textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Type your reason..."
          required
          className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-[13px] text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--mk-primary-ring)] focus:border-[var(--mk-primary)]"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={loading || !amount || !reason}
          className="px-4 py-2.5 rounded-lg text-[14px] font-semibold text-white bg-[var(--mk-primary)] hover:bg-[var(--mk-primary-hover)] shadow-sm active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Processing..." : "Confirm Refund"}
        </button>
      </div>
    </form>
  );
};

export default RefundOrder;
