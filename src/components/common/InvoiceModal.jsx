// Print-preview modal — renders OrderInvoice.jsx directly from the real,
// already-loaded order object (GET /admin/orders/{id}, same data the rest
// of the Order Detail drawer/page uses) instead of the backend's
// GET /admin/orders/{id}/invoice?format=html endpoint. That endpoint returns
// opaque server-rendered HTML this app has no styling control over, which
// made it impossible to match the approved reference invoice layout
// pixel-for-pixel; rendering the same real order data client-side, through
// one shared template, is what lets the on-screen preview and the printed/
// saved-as-PDF output be guaranteed identical.
//
// Two copies of OrderInvoice render while the modal is open: the one below,
// inside the modal's own scrollable preview area (what the admin sees), and
// a second one portaled straight onto <body> (see print.css's
// #invoice-print-area rules) used only when actually printing. That
// duplication is deliberate: CSS page fragmentation (page-break-before,
// repeating table headers, "don't split a row across pages") only works on
// content in normal document flow, and the modal's own animated panel
// happens to establish a CSS containing block partway down the screen —
// either one on its own pushes the invoice into a mostly-blank, unpaginated
// printout. A plain body-level portal sidesteps both problems at once.
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import Modal from "./Modal";
import OrderInvoice from "./OrderInvoice";

const InvoiceModal = ({ open, onClose, order }) => {
  return (
    <>
      <Modal open={open} onClose={onClose} title="Invoice preview" maxWidth="max-w-4xl">
        <div className="no-print flex justify-end mb-3">
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!order}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold text-white bg-[var(--mk-primary)] hover:bg-[var(--mk-primary-hover)] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Printer size={14} />
            Print / Save as PDF
          </button>
        </div>
        <div className="bg-[#F3F4F6] rounded-lg overflow-auto max-h-[75vh] py-6">
          {order ? <OrderInvoice order={order} /> : <p className="text-sm text-[var(--mk-ink-400)] text-center py-12">Loading invoice…</p>}
        </div>
      </Modal>

      {open &&
        order &&
        createPortal(<OrderInvoice order={order} id="invoice-print-area" />, document.body)}
    </>
  );
};

export default InvoiceModal;
