// Reusable multi-variant editor for the Add Product flow (see
// ProductDetailDrawer.jsx's isCreate branch). Deliberately API-agnostic —
// it only manages a local, in-memory `variants` array via `onChange`; the
// parent decides when/how to persist them (here: after the product itself
// is created, since POST /admin/variants requires a real productId that
// doesn't exist until then).
//
// The table + "Add the standard ladder" editor are the same
// VariantRow/VariantLadderEditor Edit Product uses, so both flows share one
// variant vocabulary and match the reference variant-editor HTML exactly.
import { useEffect, useState } from "react";
import { Boxes } from "lucide-react";
import VariantRow from "./VariantRow";
import VariantLadderEditor from "./VariantLadderEditor";

const ProductVariantEditor = ({
  categoryName,
  productName,
  taxPercent,
  variantsByUnit,
  onChange,
  unitFamily,
}) => {
  const [activeUnitFamily, setActiveUnitFamily] = useState(unitFamily || "kg");
  const variants = variantsByUnit[activeUnitFamily] || [];

  useEffect(() => {
    if (unitFamily && unitFamily !== activeUnitFamily) {
      setActiveUnitFamily(unitFamily);
    }
  }, [unitFamily, activeUnitFamily]);

  const removeVariant = (index) =>
    onChange(
      activeUnitFamily,
      variants.filter((_, i) => i !== index),
    );

  const handleAddBatch = (additions) => {
    onChange(activeUnitFamily, [...variants, ...additions]);
    return true;
  };

  return (
    <div className="mb-5">
      <h4 className="text-[13.5px] font-semibold text-[var(--mk-ink-900)] mb-2">
        Variants{" "}
        <span className="text-[11.5px] font-normal text-[var(--mk-ink-400)]">
          price lives here · the product shows From ₹min
        </span>
      </h4>

      {variants.length === 0 ? (
        <div className="border border-dashed border-[var(--mk-line)] rounded-lg py-6 flex flex-col items-center gap-1.5 text-center mb-3">
          <Boxes size={20} className="text-[var(--mk-ink-400)]" />
          <p className="text-[12.5px] text-[var(--mk-ink-500)]">
            No variants yet — this product cannot go Active until at least one
            priced variant exists.
          </p>
        </div>
      ) : (
        <div className="border border-[var(--mk-line)] rounded-lg overflow-hidden overflow-x-auto mb-3">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="bg-[#FAFBFD] text-[10px] uppercase tracking-wide text-[var(--mk-ink-400)]">
                <th className="text-left font-semibold px-2.5 py-2">Size</th>
                <th className="text-left font-semibold px-2.5 py-2">SKU</th>
                <th className="text-right font-semibold px-2.5 py-2">
                  List ₹ (ex-GST)
                </th>
                <th className="text-right font-semibold px-2.5 py-2">
                  Incl. GST
                </th>
                <th className="text-right font-semibold px-2.5 py-2">Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--mk-line)]">
              {variants.map((v, i) => (
                <VariantRow
                  key={`${v.label}-${i}`}
                  variant={v}
                  taxPercent={taxPercent}
                  onRemove={() => removeVariant(i)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <VariantLadderEditor
        key={activeUnitFamily}
        categoryName={categoryName}
        productName={productName}
        taxPercent={taxPercent}
        unitFamily={activeUnitFamily}
        onUnitFamilyChange={setActiveUnitFamily}
        existingLabels={variants.map((v) => v.label)}
        existingVariants={variants}
        onAddBatch={handleAddBatch}
      />
    </div>
  );
};

export default ProductVariantEditor;
