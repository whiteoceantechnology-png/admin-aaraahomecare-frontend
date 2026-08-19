// src/components/form/TrackOrderForm.jsx
import { useState } from "react";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-purple)]/25 focus:border-[var(--brand-purple)]";

const STATUS_OPTIONS = [
  "pending_payment",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
];

const TrackOrderForm = ({ order, onSubmit, loading }) => {
  const [status, setStatus] = useState((order?.status || "").toLowerCase());
  const [trackingId, setTrackingId] = useState(order?.trackingId || "");
  const [notes, setNotes] = useState(order?.notes || "");

  if (!order) {
    return <p className="text-sm text-gray-500 text-center py-8">Select an order to track.</p>;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ status, trackingId, notes });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-500">
        Order <span className="font-medium text-gray-800">{order.orderNumber}</span>
      </p>

      <div className="flex flex-col">
        <label className="text-[14px] font-medium text-gray-700 mb-1">Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-[14px] font-medium text-gray-700 mb-1">Tracking ID</label>
        <input
          type="text"
          value={trackingId}
          onChange={(e) => setTrackingId(e.target.value)}
          placeholder="e.g. TRK-987654321"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col">
        <label className="text-[14px] font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes for this shipment..."
          className={inputClass}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2.5 h-12 rounded-xl text-[14px] font-semibold text-white bg-gradient-to-r from-[var(--brand-purple)] to-[var(--brand-purple-dark)] shadow-sm hover:brightness-110 active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Saving..." : "Update Tracking"}
        </button>
      </div>
    </form>
  );
};

export default TrackOrderForm;
