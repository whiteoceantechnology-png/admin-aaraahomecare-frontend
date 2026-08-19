// src/components/data/CancelOrder.jsx
import { useState } from "react";

const CancelOrder = ({ order, onSubmit, loading }) => {
  const [reason, setReason] = useState("");

  if (!order) {
    return <p className="text-sm text-gray-500 text-center py-8">Select an order to cancel.</p>;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    // POST /admin/orders/{id}/cancel takes { reason } — a dedicated endpoint,
    // not the generic status-update PUT this used to reuse.
    onSubmit({ reason });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-[13px] text-gray-500">
        Cancelling order <span className="font-medium text-gray-800">{order.orderNumber}</span>
      </p>

      <div className="flex flex-col">
        <label className="text-[13px] font-medium text-gray-700 mb-1">
          Reason for cancellation
        </label>
        <textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Type your reason..."
          className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-[13px] text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2.5 rounded-lg text-[14px] font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Cancelling..." : "Confirm Cancel"}
        </button>
      </div>
    </form>
  );
};

export default CancelOrder;
