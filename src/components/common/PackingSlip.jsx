// Packing slip template — structure, ordering and typography follow the
// approved reference slip: a large FROM block top-left with the order number
// and date top-right, SHIP TO / BILL TO side by side, a ruled ITEMS /
// QUANTITY list, and a centred thank-you + seller footer.
//
// Sized as a real A4 sheet (see .packing-slip in index.css), so the on-screen
// preview is literally the page that prints rather than a shrunken version of
// it — the reference is a printed sheet, and matching it means matching its
// scale, not just its running order.
//
// Rendered client-side from the real order object the caller already has
// (GET /admin/orders/{id}) for the same reason OrderInvoice.jsx is: the
// backend's GET /admin/orders/{id}/packing-slip?format=html returns opaque
// server-rendered HTML this app has no styling control over, so it could
// never be made to match the reference layout. One template renders both the
// on-screen preview and the printed page, which is what guarantees they are
// identical.
//
// Deliberately carries no pricing, tax, payment or totals of any kind — a
// packing slip is a shipment document, and money belongs on the invoice.
import { useEffect, useMemo, useState } from "react";
import moment from "moment";
import { SELLER } from "../../config/seller";
import { fetchProductById } from "../../redux/slices/productApi";

// Seller details come from the shared config so the packing slip and the
// tax invoice can never disagree about Aaraa's own address.

const fmtDate = (v) => (v ? moment(v).format("MMMM D, YYYY") : "");

// Same /admin/images endpoint the rest of the app serves stored paths from.
// A value that is already absolute (or a data URI) is used untouched, so a
// fully-qualified URL coming back from the API is not double-prefixed.
const imageSrc = (path) => {
  const p = (path ?? "").toString().trim();
  if (!p) return null;
  if (/^(https?:)?\/\//i.test(p) || p.startsWith("data:")) return p;
  return `${import.meta.env.VITE_API_BASE_URL}/admin/images/${p}`;
};

// Image fields in this app are sometimes an array of paths (product.
// productImage, variant.imagePath) and sometimes a bare string.
const firstImagePath = (value) => {
  if (Array.isArray(value)) return value.find(Boolean) ?? null;
  if (typeof value === "string" && value.trim()) return value;
  return null;
};

// The picture comes from the PRODUCT the ordered variant belongs to:
//   item.variantId -> item.variant.productId -> GET /admin/products/{id}
// Nothing on the order line or the variant is consulted for it.
const productIdFor = (it) => it?.variant?.productId ?? null;

// Cached at module scope, not in component state, for two reasons. This
// component mounts TWICE for the same order — once for the modal preview and
// once for the <body> print portal — so a per-component cache would still
// fetch every product twice. And a Map keyed by id collapses repeat products
// within one order (and across reopens of the slip) into a single request.
const productCache = new Map();
const productRequests = new Map();

// Deliberately calls the existing fetchProductById SERVICE rather than the
// getProductById redux thunk: that thunk writes into the store's single
// `singleProduct` slot, so fetching several products through it would clobber
// that slot and fight with whatever the product drawer has open.
const loadProduct = (productId) => {
  const key = String(productId);
  if (productCache.has(key)) return Promise.resolve(productCache.get(key));
  if (productRequests.has(key)) return productRequests.get(key);

  const request = fetchProductById(productId)
    .then((res) => {
      const product = res?.data?.data ?? null;
      productCache.set(key, product);
      return product;
    })
    .catch(() => {
      // A failed lookup caches null so one broken product id cannot re-request
      // on every render; that row simply shows the placeholder box.
      productCache.set(key, null);
      return null;
    })
    .finally(() => productRequests.delete(key));

  productRequests.set(key, request);
  return request;
};

// variantId is the source of truth for WHICH variant was ordered; the name
// printed under the product is that variant record's own variantName and
// nothing else. sizeLabel and packSize (label/size/unit) are deliberately NOT
// consulted — they describe the packaging, not the variant the customer
// chose, and the two disagree. A variant that cannot be resolved prints no
// second line rather than a wrong one.
const variantNameFor = (it, variants) => {
  if (it?.variant?.variantName) return it.variant.variantName;
  if (it?.variantId != null && Array.isArray(variants)) {
    const match = variants.find((v) => String(v.id) === String(it.variantId));
    if (match?.variantName) return match.variantName;
  }
  return "";
};

// Order numbers are printed as "Order #1234"; strip a leading "#" so an
// orderNumber that already carries one doesn't come out as "Order ##1234".
const fmtOrderNumber = (value) =>
  (value ?? "").toString().trim().replace(/^#/, "");

// Every block on this slip is built by filtering out blanks, so a missing
// address line, state or phone simply closes up instead of leaving a gap.
const addressBlock = (address) => {
  if (!address) return [];
  return [
    [address.addressLine1, address.addressLine2].filter(Boolean).join(", "),
    [address.city, address.postalCode].filter(Boolean).join(" - "),
    [address.state, address.country].filter(Boolean).join(", "),
  ].filter(Boolean);
};

const Party = ({ label, name, lines, phone }) => (
  <div className="min-w-0">
    <p className="text-[11.5px] font-semibold uppercase tracking-[0.09em] text-gray-500">
      {label}
    </p>
    <div className="mt-2.5 text-[13px] leading-[1.75] text-gray-900">
      {name && <p>{name}</p>}
      {lines.map((line, i) => (
        <p key={i}>{line}</p>
      ))}
      {phone && <p>{phone}</p>}
    </div>
  </div>
);

const PackingSlip = ({ order, id, variants, onReady }) => {
  const items = order?.items || [];

  // One entry per DISTINCT product in the order, so two variants of the same
  // product cost one request, not two.
  const productIds = useMemo(
    () => [
      ...new Set(items.map(productIdFor).filter((v) => v != null).map(String)),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items.map(productIdFor).join(",")],
  );

  const [productsById, setProductsById] = useState({});
  const [productsLoaded, setProductsLoaded] = useState(false);

  useEffect(() => {
    if (productIds.length === 0) {
      setProductsLoaded(true);
      return;
    }
    let cancelled = false;
    setProductsLoaded(false);
    Promise.all(
      productIds.map((pid) => loadProduct(pid).then((p) => [pid, p])),
    ).then((entries) => {
      if (cancelled) return;
      setProductsById(Object.fromEntries(entries));
      setProductsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIds.join(",")]);

  // Announces that the slip is fully built. Deliberately an effect rather
  // than a call inside the .then above: an effect runs AFTER React has
  // committed, so by the time this fires the <img> elements actually exist in
  // the DOM and a caller that prints immediately cannot beat them to it.
  useEffect(() => {
    if (productsLoaded) onReady?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productsLoaded]);

  if (!order) return null;

  const address = order.addressSnapshot;
  // This order model carries a single address, used honestly for both panels
  // rather than inventing a second one — the same choice OrderInvoice.jsx
  // documents for its own Bill To / Ship To.
  const partyName = order.customer?.name || address?.name || "";
  const lines = addressBlock(address);
  const phone = order.customer?.phone || address?.phone || "";

  const orderNumber = fmtOrderNumber(order.orderNumber);
  const orderDate = fmtDate(order.createdAt);

  // Footer address is the same seller block as the header, run together on
  // one centred line with the phone appended, as the reference prints it.
  const footerAddress = [
    SELLER.addressLines.join(", "),
    SELLER.phone ? `PHONE - ${SELLER.phone}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div id={id} className="packing-slip bg-white text-gray-900">
      <div className="px-12 py-10">
        {/* FROM + ORDER META — the FROM block is deliberately the largest
            type on the sheet, as it is on the reference. */}
        <div className="flex items-start justify-between gap-10">
          <div className="min-w-0 text-[19px] leading-[1.55] text-gray-900">
            <p>FROM,</p>
            <p>{SELLER.name},</p>
            {SELLER.addressLines.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
            {SELLER.phone && <p>PHONE - {SELLER.phone}</p>}
          </div>
          <div className="shrink-0 max-w-[38%] text-right text-[12.5px] leading-[1.7] text-gray-900">
            {orderNumber && <p className="break-all">Order #{orderNumber}</p>}
            {orderDate && <p>{orderDate}</p>}
          </div>
        </div>

        {/* SHIP TO / BILL TO — two equal columns */}
        <div className="mt-11 grid grid-cols-2 gap-10">
          <Party label="Ship To" name={partyName} lines={lines} phone={phone} />
          <Party label="Bill To" name={partyName} lines={lines} phone={phone} />
        </div>

        {/* ITEMS */}
        <div className="mt-12 border-t border-gray-800 pt-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.09em] text-gray-600">
              Items
            </span>
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.09em] text-gray-600">
              Quantity
            </span>
          </div>
        </div>

        <div className="mt-5 border-b border-gray-800 pb-6">
          {items.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-gray-400">
              No items on this order
            </p>
          ) : (
            items.map((it, i) => {
              // "n of n" matches the reference's quantity format. Both halves
              // are the ordered quantity because this order model tracks one
              // quantity per line — the whole line ships together — so it
              // reads as "all n of the n ordered", never as an invented
              // partial-fulfilment count.
              const qty = Number(it.quantity || 0);
              const productId = productIdFor(it);
              // The product API's own image field, run through the same
              // /admin/images URL shape every other screen in this app uses.
              const src = imageSrc(
                firstImagePath(
                  productsById[String(productId)]?.productImage,
                ),
              );
              const variantName = variantNameFor(it, variants);
              return (
                <div
                  key={it.id ?? i}
                  className="packing-slip-row flex items-start justify-between gap-8 py-3.5"
                >
                  {/* Image and the name/variant block are centred against each
                      other; the row itself stays top-aligned so the quantity
                      on the right lines up with the product name. */}
                  <div className="flex min-w-0 items-center gap-4 pl-10">
                    {src ? (
                      <img
                        src={src}
                        // Empty alt on purpose: the product name is right
                        // beside it, and alt text rendering in place of a
                        // failed image would push the row out of shape.
                        alt=""
                        className="w-10 h-10 shrink-0 object-contain"
                      />
                    ) : (
                      // Same 40px footprint, so a product with no picture
                      // keeps every other row's alignment intact.
                      <span
                        aria-hidden="true"
                        className="w-10 h-10 shrink-0 rounded border border-dashed border-gray-300"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-[14px] leading-[1.5] text-gray-900">
                        {it.productName}
                      </p>
                      {variantName && (
                        <p className="text-[13px] leading-[1.5] text-gray-700">
                          {variantName}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="shrink-0 text-[13px] leading-[1.5] text-gray-900 tabular-nums">
                    {qty} of {qty}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* THANK YOU + SELLER FOOTER */}
        <div className="mt-8 text-center">
          <p className="text-[14px] text-gray-900">
            Thank you for shopping with us!
          </p>
          <div className="mx-auto mt-6 max-w-[560px] text-[13px] leading-[1.7] text-gray-900">
            <p>{SELLER.name}</p>
            {footerAddress && <p>{footerAddress}</p>}
            {SELLER.email && <p>{SELLER.email}</p>}
            {SELLER.website && <p>{SELLER.website}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackingSlip;
