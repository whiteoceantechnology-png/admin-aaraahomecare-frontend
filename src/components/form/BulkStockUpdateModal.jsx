// Bulk stock update — POST /admin/inventory/bulk-update with
// {updates:[{variantId, stockQuantity}]}. Opened from the Stock Management
// table's row checkboxes; each selected row gets its own editable stock
// input, pre-filled with its current on-hand quantity so leaving it
// untouched is a no-op, not an accidental reset to empty/zero.
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { Layers } from "lucide-react";
import Modal from "../common/Modal";
import { bulkUpdateStock } from "../../redux/slices/inventorySlice";

const BulkStockUpdateModal = ({ open, onClose, rows = [], onDone }) => {
  const dispatch = useDispatch();
  const { bulkSaving } = useSelector((state) => state.inventory || {});
  const [quantities, setQuantities] = useState({});

  useEffect(() => {
    if (!open) return;
    const seed = {};
    rows.forEach((r) => {
      seed[r.id] = r.stockQuantity ?? 0;
    });
    setQuantities(seed);
  }, [open, rows]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const updates = rows.map((r) => ({
      variantId: r.id,
      stockQuantity: Number(quantities[r.id]) >= 0 ? Number(quantities[r.id]) : 0,
    }));
    const res = await dispatch(bulkUpdateStock(updates));
    if (bulkUpdateStock.fulfilled.match(res)) {
      onDone?.();
    } else {
      toast.error(res.payload || "Failed to bulk-update stock");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Bulk update stock (${rows.length})`} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {rows.length === 0 ? (
          <p className="text-[13px] text-gray-500 py-6 text-center">No rows selected.</p>
        ) : (
          <div className="max-h-[50vh] overflow-y-auto -mx-1 px-1 space-y-2">
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[var(--mk-line)]"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--mk-ink-900)] truncate">
                    {r.productName || r?.product?.name || "—"}
                  </p>
                  <p className="text-[11.5px] text-[var(--mk-ink-500)] truncate">
                    {r.variantName} {r.sku ? `· ${r.sku}` : ""}
                  </p>
                </div>
                <input
                  type="number"
                  min="0"
                  value={quantities[r.id] ?? ""}
                  onChange={(e) => setQuantities((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  className="w-24 h-9 px-2.5 rounded-lg border border-[var(--mk-line)] text-[13px] font-medium text-[var(--mk-ink-900)] outline-none focus:ring-2 focus:ring-[var(--mk-primary-ring)] focus:border-[var(--mk-primary)]"
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 h-11 rounded-xl text-[14px] font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 active:scale-[0.98] transition-all duration-200 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={rows.length === 0 || bulkSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 h-11 rounded-xl text-[14px] font-semibold text-white bg-[var(--mk-primary)] hover:bg-[var(--mk-primary-hover)] active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Layers size={15} />
            {bulkSaving ? "Updating..." : `Update ${rows.length} variant${rows.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default BulkStockUpdateModal;
