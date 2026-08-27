// Packing slip printing. Triggering the packing slip from an order goes
// STRAIGHT to the browser's print / save-as-PDF dialog — there is no preview
// step to click through. The slip itself is still rendered, from the real
// order object already loaded by the caller (GET /admin/orders/{id}), through
// the one shared PackingSlip template, so what prints is exactly that
// template with the same Ship To / Bill To, items, quantities, product
// images, company block and footer it has always had.
//
// It renders as a portal straight onto <body> rather than inside a modal.
// That is not cosmetic: .animate-modal-panel keeps a transform applied for
// good (its animation uses `both`), and a transformed element becomes the
// containing block for absolutely positioned descendants — printing from
// inside the modal put the slip halfway down the sheet under a tall blank
// band. index.css keeps #packing-slip-print-area display:none on screen and
// reveals only it (hiding #root) when printing, so the portal is invisible
// until the dialog opens.
//
// The wait before printing matters more here than it does for the invoice:
// the slip fetches each product's image from the product API AFTER mount, so
// at first paint there are no <img> elements at all. PackingSlip signals
// `onReady` once those lookups have been committed to the DOM; only then are
// the images awaited and the dialog opened. Printing earlier would produce a
// slip with missing pictures.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PackingSlip from "./PackingSlip";

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

const PackingSlipModal = ({ open, onClose, order }) => {
  // Guards against printing the same order twice: this effect re-runs on any
  // re-render while open, and window.print() must fire exactly once per open.
  const printedForRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) {
      printedForRef.current = null;
      setReady(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !order || !ready) return;
    if (printedForRef.current === order.id) return;
    printedForRef.current = order.id;

    let cancelled = false;
    (async () => {
      // Let layout settle after the images were committed.
      await nextFrame();
      if (cancelled) return;

      // Product images are still only *requested* at this point; printing
      // before they decode leaves empty boxes on the sheet. Images inside a
      // display:none subtree still load, so this waits on the network only.
      const area = document.getElementById("packing-slip-print-area");
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

      // Blocks until the admin prints or cancels; either way the slip is done.
      window.print();
      onClose?.();
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order?.id, ready]);

  if (!open || !order) return null;

  return createPortal(
    <PackingSlip
      order={order}
      variants={order.variants}
      id="packing-slip-print-area"
      onReady={() => setReady(true)}
    />,
    document.body,
  );
};

export default PackingSlipModal;
