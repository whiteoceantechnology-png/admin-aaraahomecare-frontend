// Twin of InvoiceModal.jsx for GET /admin/orders/{id}/packing-slip
// ?format=html — same shell, same print mechanism, isolated via its own
// #packing-slip-print-area rule in print.css so it doesn't collide with the
// invoice modal's print area.
import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import Modal from "./Modal";
import { fetchPackingSlipHtml } from "../../redux/slices/orderApi";

const PackingSlipModal = ({ open, onClose, order }) => {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !order?.id) {
      setHtml("");
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPackingSlipHtml(order.id)
      .then((res) => {
        if (!cancelled) setHtml(typeof res.data === "string" ? res.data : "");
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || "Failed to load packing slip");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, order?.id]);

  return (
    <Modal open={open} onClose={onClose} title="Packing slip preview" maxWidth="max-w-3xl">
      <div className="no-print flex justify-end mb-2">
        <button
          type="button"
          onClick={() => window.print()}
          disabled={loading || !html}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold text-white bg-[var(--mk-primary)] hover:bg-[var(--mk-primary-hover)] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Printer size={14} />
          Print / Save as PDF
        </button>
      </div>
      <div className="border border-[var(--mk-line)] rounded-lg overflow-hidden">
        {loading ? (
          <p className="text-sm text-[var(--mk-ink-400)] text-center py-12">Loading packing slip…</p>
        ) : error ? (
          <p className="text-sm text-[var(--mk-dgr)] text-center py-12">{error}</p>
        ) : (
          <div id="packing-slip-print-area" dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>
    </Modal>
  );
};

export default PackingSlipModal;
