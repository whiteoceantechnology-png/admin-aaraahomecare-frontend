// One row in the variants table — read-only display + Remove, matching the
// reference variant-editor HTML's table exactly (Size | SKU | List ₹
// (ex-GST) | Incl. GST | Stock | Remove — no inline-editable inputs). When
// `onClick` is given the row opens the small edit form (Edit Product); Add
// Product's staged preview table omits it and edits by remove-and-re-add
// via the ladder instead.
import { Trash2 } from "lucide-react";

const fmtMoney = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const VariantRow = ({ variant, taxPercent, onRemove, onClick }) => {
  const { label, sku, price, offerPrice } = variant;
  const sellPrice =
    offerPrice !== "" && offerPrice != null
      ? Number(offerPrice)
      : Number(price || 0);
  const inclGst = sellPrice * (1 + Number(taxPercent || 0) / 100);
  const hasOffer = offerPrice !== "" && offerPrice != null;

  return (
    <tr
      onClick={onClick}
      className={
        onClick
          ? "cursor-pointer hover:bg-[var(--mk-primary-50)]/40 transition-colors"
          : undefined
      }
    >
      <td className="px-2.5 py-1.5 text-[12.5px] font-medium text-[var(--mk-ink-900)] whitespace-nowrap">
        {label}
      </td>
      <td className="px-2.5 py-1.5 text-[var(--mk-ink-400)] whitespace-nowrap">
        {sku}
      </td>
      <td className="px-2.5 py-1.5 text-left tabular-nums text-[12.5px] text-[var(--mk-ink-700)] whitespace-nowrap">
        {fmtMoney(sellPrice)}
        {hasOffer && (
          <span className="text-[var(--mk-ink-400)] line-through ml-1.5">
            {fmtMoney(price)}
          </span>
        )}
      </td>
      {/* <td className="px-2.5 py-1.5 text-right tabular-nums text-[12.5px] text-[var(--mk-ink-700)] whitespace-nowrap">
        {fmtMoney(inclGst)}
      </td> */}
      {onRemove && (
        <td className="px-2 py-1.5 text-right">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            aria-label={`Remove ${label}`}
            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[var(--mk-ink-400)] hover:bg-[var(--mk-dgr-bg)] hover:text-[var(--mk-dgr)] transition-colors cursor-pointer"
          >
            <Trash2 size={14} />
          </button>
        </td>
      )}
    </tr>
  );
};

export default VariantRow;
