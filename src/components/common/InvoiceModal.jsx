// Order invoice printing. Opening the invoice from an order goes STRAIGHT to
// the browser's print / save-as-PDF dialog — there is no preview step to click
// through. The invoice itself is still rendered, from the real order object
// already loaded by the caller (GET /admin/orders/{id}), through the one
// shared OrderInvoice template, so what prints is exactly that template.
//
// It renders as a portal straight onto <body> rather than inside a modal,
// which is what makes the printed output paginate correctly: CSS page
// fragmentation (page-break-before, repeating table headers, "don't split a
// row across pages") only applies to content in normal document flow, and a
// modal's animated panel establishes a containing block that pushes the
// invoice into a mostly-blank, unpaginated printout. print.css keeps
// #invoice-print-area display:none on screen and reveals only it (hiding
// #root) when printing, so the portal is invisible until the dialog opens.
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import OrderInvoice from "./OrderInvoice";

// A frame to let layout settle — but never a dependency on one. A tab that
// is backgrounded (or otherwise not being painted) throttles
// requestAnimationFrame indefinitely, and waiting on it there would mean the
// print dialog silently never opens after the click. The timer is the floor:
// whichever arrives first wins.
const nextFrame = () =>
  new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    requestAnimationFrame(done);
    setTimeout(done, 50);
  });

const InvoiceModal = ({ open, onClose, order }) => {
  // Guards against printing the same order twice: this effect re-runs on any
  // re-render while open, and window.print() must fire exactly once per open.
  const printedForRef = useRef(null);

  useEffect(() => {
    if (!open) {
      printedForRef.current = null;
      return;
    }
    // The caller may open this before GET /admin/orders/{id} has resolved;
    // the effect simply re-runs once the order arrives.
    if (!order) return;
    if (printedForRef.current === order.id) return;
    printedForRef.current = order.id;

    let cancelled = false;
    (async () => {
      // Two settles: one for React to commit the portal, one for layout to
      // finish before the print snapshot is taken.
      await nextFrame();
      await nextFrame();
      if (cancelled) return;

      // The logo is an <img>; printing before it decodes leaves a blank box on
      // the sheet. Images inside a display:none subtree still load, so this
      // only ever waits on the network, never on visibility.
      const area = document.getElementById("invoice-print-area");
      const images = area ? Array.from(area.querySelectorAll("img")) : [];
      await Promise.all(
        images.map((img) =>
          img.complete
            ? null
            : new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
              }),
        ),
      );
      if (cancelled) return;

      // Blocks until the admin prints or cancels; either way the invoice is
      // done and the flag in the caller is cleared.
      window.print();
      onClose?.();
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order?.id]);

  if (!open || !order) return null;

  return createPortal(
    <OrderInvoice
      order={order}
      variants={order.variants}
      id="invoice-print-area"
    />,
    document.body,
  );
};

export default InvoiceModal;
