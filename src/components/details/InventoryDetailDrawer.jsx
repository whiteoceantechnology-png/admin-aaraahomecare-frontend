// Right-side Stock Details drawer — same Drawer shell as Product/Category/
// Order detail drawers. Opened from a Stock Management table row click.
// Everything here is backed by the real, dedicated inventory endpoints:
// GET /admin/inventory/{id} for detail, GET /admin/inventory/{id}/history
// for the movement log, and PUT/POST .../stock, .../adjust, .../reserve,
// .../release for the write actions. No product-derived fallback data —
// if the backend doesn't send a field, this shows "—", never a guess.
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import {
  AlertTriangle,
  Boxes,
  ArrowUpRight,
  History,
  PackagePlus,
  PackageCheck,
  SlidersHorizontal,
  Lock,
  Unlock,
} from "lucide-react";

import {
  getInventoryDetail,
  getInventoryHistory,
  updateStock,
  adjustStock,
  reserveStock,
  releaseStock,
} from "../../redux/slices/inventorySlice";
import Drawer from "../common/Drawer";
import Modal from "../common/Modal";
import EmptyState from "../common/EmptyState";
import MkPill from "../common/MkPill";
import { formatDateTime } from "../../utils/formatDate";

const hasValue = (v) => v !== null && v !== undefined;

const fldClass =
  "h-10 w-full px-[12px] rounded-lg border border-[var(--mk-line)] text-[14px] font-medium text-[var(--mk-ink-900)] placeholder:text-[var(--mk-ink-400)] bg-white outline-none transition-colors focus:ring-2 focus:ring-[var(--mk-primary-ring)] focus:border-[var(--mk-primary)]";

// Text sizes throughout this file stay on the already-established Product
// Detail scale (12/13/14/18/20px) — nothing new introduced here, only the
// layout/spacing/card structure changed in this pass.
const sectionHeadingClass = "text-[18px] font-semibold text-[var(--mk-ink-900)]";

// Compact SKU/Price/Status column for the product summary card — 12px
// label over a 14px value.
const InfoCell = ({ label, value }) => (
  <div className="min-w-0">
    <p className="text-[12px] text-[var(--mk-ink-500)]">{label}</p>
    <div className="text-[14px] font-medium text-[var(--mk-ink-900)] mt-0.5 truncate">{value ?? "—"}</div>
  </div>
);

const STAT_TONE = {
  ok: { bg: "bg-[var(--mk-primary-50)]", fg: "text-[var(--mk-primary)]" },
  warn: { bg: "bg-[var(--mk-warn-bg)]", fg: "text-[var(--mk-warn)]" },
};

const StatCard = ({ icon: Icon, label, value, tone = "ok" }) => (
  <div className="rounded-xl border border-[var(--mk-line)] px-3.5 py-3">
    <div className="flex items-center justify-between gap-2">
      <p className="text-[12px] uppercase tracking-wide text-[var(--mk-ink-400)] font-semibold truncate">
        {label}
      </p>
      <span className={`flex items-center justify-center w-6 h-6 rounded-md shrink-0 ${STAT_TONE[tone].bg} ${STAT_TONE[tone].fg}`}>
        <Icon size={13} />
      </span>
    </div>
    <p
      className={`text-[20px] font-bold mt-1 ${tone === "warn" ? "text-[var(--mk-warn)]" : "text-[var(--mk-ink-900)]"}`}
    >
      {hasValue(value) ? value : "—"}
    </p>
  </div>
);

const ActionButton = ({ icon: Icon, label, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-semibold text-[var(--mk-ink-700)] border border-[var(--mk-line)] bg-white hover:border-[#C9CFDA] hover:text-[var(--mk-ink-900)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <Icon size={13} />
    {label}
  </button>
);

// variantId = the inventory record's id (same id used across
// /admin/inventory/{id} detail, stock, adjust, reserve, release, history).
const InventoryDetailDrawer = ({
  variantId,
  open,
  onClose,
  onViewProduct,
  onMutated,
}) => {
  const dispatch = useDispatch();
  const {
    selected: item,
    selectedLoading,
    selectedError,
    history,
    saving,
  } = useSelector((state) => state.inventory || {});

  const [activeAction, setActiveAction] = useState(null); // "update" | "adjust" | "reserve" | "release" | null
  const [stockValue, setStockValue] = useState("");
  const [adjustChange, setAdjustChange] = useState("");
  const [adjustReason, setAdjustReason] = useState("damaged");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [refQty, setRefQty] = useState("");
  const [refType, setRefType] = useState("order");
  const [refId, setRefId] = useState("");
  const [historyPage, setHistoryPage] = useState(1);

  useEffect(() => {
    if (open && variantId) {
      dispatch(getInventoryDetail(variantId));
      setHistoryPage(1);
      dispatch(
        getInventoryHistory({ id: variantId, params: { page: 1, limit: 20 } }),
      );
    }
  }, [open, variantId, dispatch]);

  useEffect(() => {
    if (item) setStockValue(item.stockQuantity ?? 0);
  }, [item]);

  const refreshAfterMutation = () => {
    dispatch(getInventoryDetail(variantId));
    dispatch(
      getInventoryHistory({
        id: variantId,
        params: { page: historyPage, limit: 20 },
      }),
    );
    onMutated?.();
  };

  const onHand = hasValue(item?.stockQuantity)
    ? Number(item.stockQuantity)
    : null;
  const reserved = hasValue(item?.reservedQuantity)
    ? Number(item.reservedQuantity)
    : null;
  const avail = hasValue(item?.availableQuantity)
    ? Number(item.availableQuantity)
    : onHand != null && reserved != null
      ? onHand - reserved
      : null;
  const isLow = avail != null && avail <= 10;

  const sellPrice = hasValue(item?.discountPrice)
    ? item.discountPrice
    : item?.price;
  const priceStrike =
    hasValue(item?.discountPrice) &&
    Number(item?.price) > Number(item?.discountPrice);
  const productId = item?.productId ?? item?.product?.id;

  const closeAction = () => setActiveAction(null);

  const handleUpdateStock = async (e) => {
    e.preventDefault();
    const res = await dispatch(
      updateStock({ id: variantId, stockQuantity: Number(stockValue) || 0 }),
    );
    if (updateStock.fulfilled.match(res)) {
      toast.success("Stock updated");
      closeAction();
      refreshAfterMutation();
    } else {
      toast.error(res.payload || "Failed to update stock");
    }
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    if (!adjustChange || Number(adjustChange) === 0) {
      toast.error("Enter a non-zero quantity change");
      return;
    }
    const res = await dispatch(
      adjustStock({
        id: variantId,
        data: {
          quantityChange: Number(adjustChange),
          reason: adjustReason,
          notes: adjustNotes,
        },
      }),
    );
    if (adjustStock.fulfilled.match(res)) {
      toast.success("Stock adjusted");
      setAdjustChange("");
      setAdjustNotes("");
      closeAction();
      refreshAfterMutation();
    } else {
      toast.error(res.payload || "Failed to adjust stock");
    }
  };

  const submitReserveOrRelease = (thunk, successMessage) => async (e) => {
    e.preventDefault();
    if (!(Number(refQty) > 0)) {
      toast.error("Enter a quantity greater than 0");
      return;
    }
    const res = await dispatch(
      thunk({
        id: variantId,
        data: {
          quantity: Number(refQty),
          referenceType: refType,
          referenceId: refId ? Number(refId) : undefined,
        },
      }),
    );
    if (thunk.fulfilled.match(res)) {
      toast.success(successMessage);
      setRefQty("");
      setRefId("");
      closeAction();
      refreshAfterMutation();
    } else {
      toast.error(res.payload || "Failed to save");
    }
  };

  const handleReserve = submitReserveOrRelease(reserveStock, "Stock reserved");
  const handleRelease = submitReserveOrRelease(releaseStock, "Stock released");

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        item
          ? `${item.productName || item?.product?.name || "Product"} · ${item.variantName}`
          : "Inventory"
      }
      subtitle="Stock details"
      width="max-w-[800px]"
      compact
      headerHeightPx={64}
      titleSizePx={20}
      bodyPaddingXPx={18}
    >
      {selectedLoading && !item ? (
        <div className="py-16 text-center text-sm text-[var(--mk-ink-400)]">
          Loading stock details…
        </div>
      ) : selectedError ? (
        <div className="py-16 text-center">
          <p className="text-sm text-[var(--mk-dgr)] mb-2">{selectedError}</p>
          <button
            type="button"
            onClick={() => dispatch(getInventoryDetail(variantId))}
            className="text-[13px] font-semibold text-[var(--mk-primary)] hover:underline cursor-pointer"
          >
            Try again
          </button>
        </div>
      ) : !item ? (
        <EmptyState title="No variant selected" />
      ) : (
        <div>
          {/* PRODUCT SUMMARY — icon + name/variant, a hairline divider, then
              SKU/Price/Status as compact columns instead of a stacked list,
              so the card reads at a glance instead of scrolling down it. */}
          <div className="rounded-xl border border-[var(--mk-line)] bg-white p-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 shrink-0 rounded-lg bg-[var(--mk-bg)] border border-[var(--mk-line)] flex items-center justify-center text-[var(--mk-ink-400)]">
                <Boxes size={20} />
              </div>
              <div className="min-w-0">
                {/* !text-[18px]/!font-semibold: a bare <h3> otherwise loses
                    to Bootstrap's unlayered h3 default (confirmed rendering
                    at 20px instead of the intended size regardless of the
                    Tailwind class here) — same collision documented
                    elsewhere in this app, fixed the same way. */}
                <h3 className="!text-[18px] !font-semibold !leading-[1.3] !m-0 text-[var(--mk-ink-900)] truncate">
                  {item.productName || item?.product?.name || "—"}
                </h3>
                <p className="text-[13px] text-[var(--mk-ink-500)] mt-0.5">
                  {item.variantName}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-3.5 pt-3.5 border-t border-[var(--mk-line)]">
              <InfoCell label="SKU" value={item.sku} />
              <InfoCell
                label="Price"
                value={
                  <>
                    {hasValue(sellPrice) ? `₹${sellPrice}` : "—"}
                    {priceStrike && (
                      <span className="text-[12px] font-normal text-[var(--mk-ink-400)] line-through ml-1.5">
                        ₹{item.price}
                      </span>
                    )}
                  </>
                }
              />
              <InfoCell
                label="Status"
                value={
                  <MkPill
                    label={item.status === true || item.status === "active" ? "Active" : "Inactive"}
                    tone={item.status === true || item.status === "active" ? "ok" : "mut"}
                    size="sm"
                  />
                }
              />
            </div>

            {productId != null && (
              <button
                type="button"
                onClick={() => onViewProduct?.(productId)}
                className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--mk-primary)] hover:underline cursor-pointer"
              >
                View product
                <ArrowUpRight size={14} />
              </button>
            )}
          </div>

          {/* STOCK DETAILS + ACTIONS */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h4 className={sectionHeadingClass}>Stock details</h4>
              <div className="flex items-center gap-1.5 flex-wrap">
                <ActionButton
                  icon={PackagePlus}
                  label="Update stock"
                  onClick={() => setActiveAction("update")}
                />
                <ActionButton
                  icon={SlidersHorizontal}
                  label="Adjust"
                  onClick={() => setActiveAction("adjust")}
                />
                <ActionButton
                  icon={Lock}
                  label="Reserve"
                  onClick={() => setActiveAction("reserve")}
                />
                <ActionButton
                  icon={Unlock}
                  label="Release"
                  onClick={() => setActiveAction("release")}
                />
              </div>
            </div>
            <div className={`grid grid-cols-3 gap-2.5 ${isLow ? "mb-2.5" : ""}`}>
              <StatCard icon={Boxes} label="On hand" value={onHand} />
              <StatCard icon={Lock} label="Reserved" value={reserved} />
              <StatCard
                icon={PackageCheck}
                label="Available"
                value={avail}
                tone={isLow ? "warn" : "ok"}
              />
            </div>
            {isLow && (
              <div className="flex items-center gap-2 rounded-lg bg-[var(--mk-warn-bg)] px-3 py-2 text-[13px] text-[var(--mk-warn)]">
                <AlertTriangle size={14} className="shrink-0" />
                <span>
                  <b className="font-semibold">Low stock</b>
                  <span className="mx-1">·</span>
                  Available quantity is at or below 10 units.
                </span>
              </div>
            )}
          </div>

          {/* STOCK HISTORY */}
          <div>
            <h4 className={`${sectionHeadingClass} mb-3`}>
              Stock history{" "}
              {history?.loading && (
                <span className="text-[var(--mk-ink-400)] font-normal text-[12px]">
                  · loading…
                </span>
              )}
            </h4>
            {history?.error ? (
              <p className="text-[14px] font-medium text-[var(--mk-dgr)]">
                {history.error}
              </p>
            ) : !history?.loading && (history?.items || []).length === 0 ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-[var(--mk-line)] px-3.5 py-[10px] text-[14px] font-medium text-[var(--mk-ink-500)]">
                <History
                  size={14}
                  className="mt-0.5 shrink-0 text-[var(--mk-ink-400)]"
                />
                <span>No stock movements recorded yet for this variant.</span>
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--mk-line)] overflow-hidden divide-y divide-[var(--mk-line)]">
                {(history?.items || []).map((ev, i) => (
                  <div
                    key={ev.id ?? i}
                    className="px-3.5 py-2.5 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[var(--mk-ink-900)] capitalize">
                        {(ev.type || ev.reason || ev.action || "movement")
                          .toString()
                          .replace(/_/g, " ")}
                        {ev.notes && (
                          <span className="font-normal text-[var(--mk-ink-500)]">
                            {" "}
                            · {ev.notes}
                          </span>
                        )}
                      </p>
                      <p className="text-[12px] text-[var(--mk-ink-400)] mt-0.5">
                        {formatDateTime(
                          ev.createdAt || ev.timestamp || ev.date,
                        )}
                      </p>
                    </div>
                    {hasValue(ev.quantityChange ?? ev.quantity) && (
                      <span
                        className={`shrink-0 text-[14px] font-bold tabular-nums ${
                          Number(ev.quantityChange ?? ev.quantity) < 0
                            ? "text-[var(--mk-dgr)]"
                            : "text-[var(--mk-ok)]"
                        }`}
                      >
                        {Number(ev.quantityChange ?? ev.quantity) > 0
                          ? "+"
                          : ""}
                        {ev.quantityChange ?? ev.quantity}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {(history?.meta?.totalPages ?? 1) > 1 && (
              <div className="flex items-center justify-between mt-2 text-[12px] text-[var(--mk-ink-500)]">
                <button
                  type="button"
                  disabled={historyPage <= 1}
                  onClick={() => {
                    const p = historyPage - 1;
                    setHistoryPage(p);
                    dispatch(
                      getInventoryHistory({
                        id: variantId,
                        params: { page: p, limit: 20 },
                      }),
                    );
                  }}
                  className="font-semibold text-[var(--mk-primary)] disabled:text-[var(--mk-ink-400)] disabled:cursor-not-allowed cursor-pointer"
                >
                  Prev
                </button>
                <span>
                  Page {historyPage} of {history.meta.totalPages}
                </span>
                <button
                  type="button"
                  disabled={historyPage >= (history?.meta?.totalPages ?? 1)}
                  onClick={() => {
                    const p = historyPage + 1;
                    setHistoryPage(p);
                    dispatch(
                      getInventoryHistory({
                        id: variantId,
                        params: { page: p, limit: 20 },
                      }),
                    );
                  }}
                  className="font-semibold text-[var(--mk-primary)] disabled:text-[var(--mk-ink-400)] disabled:cursor-not-allowed cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* UPDATE STOCK */}
      <Modal
        open={activeAction === "update"}
        onClose={closeAction}
        title="Update stock"
        maxWidth="max-w-sm"
      >
        <form onSubmit={handleUpdateStock} className="space-y-4">
          <div>
            <label className="text-[14px] font-medium text-[var(--mk-ink-700)] block mb-1.5">
              Stock quantity
            </label>
            <input
              type="number"
              min="0"
              autoFocus
              value={stockValue}
              onChange={(e) => setStockValue(e.target.value)}
              className={fldClass}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={closeAction}
              className="px-4 py-2.5 h-11 rounded-xl text-[14px] font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 h-11 rounded-xl text-[14px] font-semibold text-white bg-[var(--mk-primary)] hover:bg-[var(--mk-primary-hover)] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Update stock"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ADJUST STOCK */}
      <Modal
        open={activeAction === "adjust"}
        onClose={closeAction}
        title="Adjust stock"
        maxWidth="max-w-sm"
      >
        <form onSubmit={handleAdjust} className="space-y-4">
          <div>
            <label className="text-[14px] font-medium text-[var(--mk-ink-700)] block mb-1.5">
              Quantity change{" "}
              <span className="text-[var(--mk-ink-400)] font-normal">
                (negative to subtract)
              </span>
            </label>
            <input
              type="number"
              autoFocus
              placeholder="e.g. -5"
              value={adjustChange}
              onChange={(e) => setAdjustChange(e.target.value)}
              className={fldClass}
            />
          </div>
          <div>
            <label className="text-[14px] font-medium text-[var(--mk-ink-700)] block mb-1.5">
              Reason
            </label>
            <select
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className={fldClass}
            >
              <option value="damaged">Damaged</option>
              <option value="lost">Lost</option>
              <option value="found">Found</option>
              <option value="correction">Correction</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-[14px] font-medium text-[var(--mk-ink-700)] block mb-1.5">
              Notes
            </label>
            <textarea
              rows={2}
              value={adjustNotes}
              onChange={(e) => setAdjustNotes(e.target.value)}
              placeholder="e.g. 5 units damaged in transit"
              className="w-full px-[12px] py-2.5 rounded-lg border border-[var(--mk-line)] text-[14px] font-medium text-[var(--mk-ink-900)] placeholder:text-[var(--mk-ink-400)] outline-none focus:ring-2 focus:ring-[var(--mk-primary-ring)] focus:border-[var(--mk-primary)] resize-vertical"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={closeAction}
              className="px-4 py-2.5 h-11 rounded-xl text-[14px] font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 h-11 rounded-xl text-[14px] font-semibold text-white bg-[var(--mk-primary)] hover:bg-[var(--mk-primary-hover)] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Adjust stock"}
            </button>
          </div>
        </form>
      </Modal>

      {/* RESERVE STOCK */}
      <Modal
        open={activeAction === "reserve"}
        onClose={closeAction}
        title="Reserve stock"
        maxWidth="max-w-sm"
      >
        <form onSubmit={handleReserve} className="space-y-4">
          <div>
            <label className="text-[14px] font-medium text-[var(--mk-ink-700)] block mb-1.5">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              autoFocus
              value={refQty}
              onChange={(e) => setRefQty(e.target.value)}
              className={fldClass}
            />
          </div>
          <div>
            <label className="text-[14px] font-medium text-[var(--mk-ink-700)] block mb-1.5">
              Reference type
            </label>
            <input
              type="text"
              value={refType}
              onChange={(e) => setRefType(e.target.value)}
              placeholder="order"
              className={fldClass}
            />
          </div>
          <div>
            <label className="text-[14px] font-medium text-[var(--mk-ink-700)] block mb-1.5">
              Reference ID
            </label>
            <input
              type="number"
              value={refId}
              onChange={(e) => setRefId(e.target.value)}
              placeholder="e.g. 234"
              className={fldClass}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={closeAction}
              className="px-4 py-2.5 h-11 rounded-xl text-[14px] font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 h-11 rounded-xl text-[14px] font-semibold text-white bg-[var(--mk-primary)] hover:bg-[var(--mk-primary-hover)] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Reserve stock"}
            </button>
          </div>
        </form>
      </Modal>

      {/* RELEASE STOCK */}
      <Modal
        open={activeAction === "release"}
        onClose={closeAction}
        title="Release stock"
        maxWidth="max-w-sm"
      >
        <form onSubmit={handleRelease} className="space-y-4">
          <div>
            <label className="text-[14px] font-medium text-[var(--mk-ink-700)] block mb-1.5">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              autoFocus
              value={refQty}
              onChange={(e) => setRefQty(e.target.value)}
              className={fldClass}
            />
          </div>
          <div>
            <label className="text-[14px] font-medium text-[var(--mk-ink-700)] block mb-1.5">
              Reference type
            </label>
            <input
              type="text"
              value={refType}
              onChange={(e) => setRefType(e.target.value)}
              placeholder="order"
              className={fldClass}
            />
          </div>
          <div>
            <label className="text-[14px] font-medium text-[var(--mk-ink-700)] block mb-1.5">
              Reference ID
            </label>
            <input
              type="number"
              value={refId}
              onChange={(e) => setRefId(e.target.value)}
              placeholder="e.g. 234"
              className={fldClass}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={closeAction}
              className="px-4 py-2.5 h-11 rounded-xl text-[14px] font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 h-11 rounded-xl text-[14px] font-semibold text-white bg-[var(--mk-primary)] hover:bg-[var(--mk-primary-hover)] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Release stock"}
            </button>
          </div>
        </form>
      </Modal>
    </Drawer>
  );
};

export default InventoryDetailDrawer;
