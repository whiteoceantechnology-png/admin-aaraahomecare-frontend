// "Add the standard ladder" editor — every standard size for the product is
// always shown as its own editable row, no click-to-edit step. A step that
// already exists as a real, persisted variant is pre-filled straight from
// that variant's stored price/offer (SKU shown, not editable); everything
// else is a blank row for adding a brand-new size. Saving sends changed
// existing rows through onUpdateBatch (updates that variant's id — never a
// duplicate) and touched new rows through onAddBatch, in one action.
// A GST inclusive/ex-GST toggle converts typed catalogue prices to the
// ex-GST value that's actually stored, and a collapsible custom-size
// section covers anything outside the standard ladder.
import { useEffect, useRef, useState } from "react";
import { Plus, Minus } from "lucide-react";
import {
  SIZE_SYSTEMS,
  getSizeSystemForCategory,
  inferSizeSystemFromVariants,
  findExistingVariantForStep,
  formatSizeLabel,
  generateVariantSku,
  ladderBadgeLabel,
  toExGst,
  toInclGst,
  validatePrice,
  validateOfferPrice,
} from "../../utils/variantSizeSystems";

const stepKey = (qty, unit) => `${qty}-${unit}`;
const normalize = (s) => (s || "").toString().trim().toLowerCase();
const numEq = (a, b) => Number(a || 0) === Number(b || 0);

const fldClass = (hasError) =>
  `h-9 w-full px-2.5 rounded-lg border text-[13px] font-medium text-[var(--mk-ink-900)] placeholder:text-[var(--mk-ink-400)] bg-white outline-none transition-colors ${
    hasError
      ? "border-[var(--mk-dgr)] focus:ring-2 focus:ring-[var(--mk-dgr)]/15"
      : "border-[var(--mk-line)] focus:ring-2 focus:ring-[var(--mk-primary-ring)] focus:border-[var(--mk-primary)]"
  }`;

// Pill-style toggle switch, matching the reference screenshot's switch +
// caption exactly.
const GstToggle = ({ checked, onChange, taxPercent }) => (
  <label className="ml-auto flex items-center gap-2 text-[12px] font-medium text-[var(--mk-ink-700)] cursor-pointer select-none">
    <span
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      className={`relative w-[34px] h-[19px] rounded-full shrink-0 transition-colors cursor-pointer ${
        checked ? "bg-[var(--mk-primary)]" : "bg-[#C9CFDA]"
      }`}
    >
      <span
        className={`absolute top-[2px] w-[15px] h-[15px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.25)] transition-all ${
          checked ? "left-[17px]" : "left-[2px]"
        }`}
      />
    </span>
    {checked
      ? `Typing catalogue prices (GST-inclusive ${taxPercent || 0}%) — stored ex-GST`
      : `Typing ex-GST prices — storefront adds ${taxPercent || 0}%`}
  </label>
);

const VariantLadderEditor = ({
  categoryName,
  productName,
  taxPercent,
  existingLabels = [],
  existingVariants,
  onAddBatch,
  onUpdateBatch,
}) => {
  const hasRealVariants =
    Array.isArray(existingVariants) && existingVariants.length > 0;
  // What the product's own data (real variants, else category) suggests —
  // used only to pick the KG/ML/UNIT toggle's default. All three options
  // are always offered for every product/category — see the toggle below.
  const inferredSystem = hasRealVariants
    ? inferSizeSystemFromVariants(existingVariants, categoryName)
    : getSizeSystemForCategory(categoryName);

  // KG → the kg-only bulk ladder (1/5/10 kg), always. ML → whatever
  // non-bulk-kg, non-pack system the product's real data (or, with no
  // variants yet, its category) actually indicates — VOLUME for an ml/L
  // product, but MASS_STD/MASS_PIGMENT for a gram-sized one (e.g. 25 g –
  // 500 g soap bases). Previously "ML" was hardcoded to VOLUME regardless
  // of what the real variants were, so a gram-based product's existing
  // 25 g/50 g/… rows never matched any ladder step and the ladder rendered
  // a blank, unrelated 1/5/10 kg row set instead of pre-filling them. UNIT
  // → the piece/pack ladder, always.
  const mlSystem =
    inferredSystem.key === "BULK_KG" || inferredSystem.key === "PACK"
      ? SIZE_SYSTEMS.VOLUME
      : inferredSystem;

  // Default is set once real data (existing variants, or else a chosen
  // category) is available — see the ref-guarded effect below for why it
  // can't just be this useState's initializer (this component mounts
  // before the product's real data has loaded).
  const [unitFamily, setUnitFamily] = useState("kg");
  const unitFamilyDefaultSetRef = useRef(false);

  const sizeSystem =
    unitFamily === "kg"
      ? SIZE_SYSTEMS.BULK_KG
      : unitFamily === "unit"
        ? SIZE_SYSTEMS.PACK
        : mlSystem;

  const effectiveExistingLabels = existingVariants
    ? existingVariants.map((v) => v.variantName)
    : existingLabels;
  const existing = effectiveExistingLabels.map(normalize);

  // A signature of the real variants' current values — re-seeding on this
  // (not just on mount) is what makes a just-saved edit's fresh server
  // value show up instead of the pre-save one, without wiping the admin's
  // in-progress edits to a DIFFERENT row on every keystroke.
  const variantsSignature = (existingVariants || [])
    .map(
      (v) => `${v.id}:${v.variantName}:${v.price}:${v.discountPrice}:${v.sku}`,
    )
    .join("|");

  // Pre-filled existing rows hold the STORED ex-GST value directly — typing
  // in inclusive mode would misinterpret and double-convert them, so when
  // this ladder is doubling as an edit interface it defaults to ex-GST
  // entry instead of the reference's inclusive-by-default. Create Product
  // (no existingVariants) keeps the original inclusive default.
  const [gstInclusive, setGstInclusive] = useState(true);
  const gstDefaultSetRef = useRef(false);
  const [ladderInputs, setLadderInputs] = useState({});
  const [submittingLadder, setSubmittingLadder] = useState(false);

  const [customOpen, setCustomOpen] = useState(false);
  const [cQty, setCQty] = useState("");
  const [cUnit, setCUnit] = useState(sizeSystem.units[0] || "g");
  const [cPrice, setCPrice] = useState("");
  const [cOffer, setCOffer] = useState("");
  const [submittingCustom, setSubmittingCustom] = useState(false);

  useEffect(() => {
    const seed = {};
    sizeSystem.steps.forEach(([qty, unit]) => {
      const match = findExistingVariantForStep(existingVariants, qty, unit);
      if (!match) {
        seed[stepKey(qty, unit)] = { price: "", offerPrice: "" };
        return;
      }
      const hasOffer =
        match.discountPrice != null &&
        Number(match.discountPrice) !== Number(match.price);
      const original = {
        price: match.price ?? "",
        offerPrice: hasOffer ? match.discountPrice : "",
      };
      seed[stepKey(qty, unit)] = {
        ...original,
        variantId: match.id,
        sku: match.sku,
        variantObj: match,
        original,
      };
    });
    setLadderInputs(seed);
    setCUnit(sizeSystem.units[0] || "g");
    if (!gstDefaultSetRef.current && hasRealVariants) {
      setGstInclusive(false);
      gstDefaultSetRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizeSystem.key, variantsSignature, hasRealVariants]);

  // Sets the KG/ML/UNIT toggle's default exactly once, from whatever the
  // product's real data (existing variants, else a chosen category)
  // actually suggests — deliberately waits for that (rather than running
  // on the very first, data-less render) so a kg-family product doesn't
  // get permanently stuck defaulted to "ml" (or vice versa) before its
  // real category/variants have loaded. All three tabs are always shown;
  // this only decides which one starts selected. Never reads the current
  // unitFamily/previous UI state — always recomputed from inferredSystem.
  useEffect(() => {
    if (unitFamilyDefaultSetRef.current) return;
    if (!hasRealVariants && !categoryName) return;
    unitFamilyDefaultSetRef.current = true;
    // Bug fix: this used to default anything that wasn't literally
    // BULK_KG or PACK to "ml" — which caught gram-based systems (MASS_STD/
    // MASS_PIGMENT, e.g. 100 g/250 g/500 g/1 kg variants) too, since they
    // have their own distinct system key. A weight-family product (any
    // system whose steps are measured in g/kg, bulk or gram-scale alike)
    // must default to KG; only a genuine volume system (ml/L) should
    // default to ML. Derived from the system's own `units` data — not a
    // hardcoded per-product/category rule.
    const isWeightFamily =
      inferredSystem.units.includes("g") || inferredSystem.units.includes("kg");
    setUnitFamily(
      isWeightFamily ? "kg" : inferredSystem.key === "PACK" ? "unit" : "ml",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inferredSystem.key, hasRealVariants, categoryName]);

  const updateLadderInput = (qty, unit, patch) => {
    setLadderInputs((prev) => ({
      ...prev,
      [stepKey(qty, unit)]: {
        price: "",
        offerPrice: "",
        ...prev[stepKey(qty, unit)],
        ...patch,
      },
    }));
  };

  const priceHint = (price) => {
    if (!(Number(price) > 0)) return null;
    return gstInclusive
      ? `stores ₹${toExGst(price, taxPercent, true).toFixed(2)} ex-GST`
      : `storefront shows ₹${toInclGst(price, taxPercent).toFixed(2)} incl.`;
  };

  const rows = sizeSystem.steps.map(([qty, unit]) => {
    const key = stepKey(qty, unit);
    const input = ladderInputs[key] || { price: "", offerPrice: "" };
    const isExisting = !!input.variantId;
    // Existing rows are always "touched" — they already carry a real,
    // stored price the moment they're seeded.
    const touched = isExisting || input.price !== "" || input.offerPrice !== "";
    if (!touched)
      return {
        qty,
        unit,
        key,
        input,
        isExisting,
        touched: false,
        valid: false,
      };

    const priceError = validatePrice(input.price);
    const offerError = validateOfferPrice(input.offerPrice, input.price);
    const valid = !priceError && !offerError;
    const dirty =
      isExisting &&
      (!numEq(input.price, input.original.price) ||
        !numEq(input.offerPrice, input.original.offerPrice));

    return {
      qty,
      unit,
      key,
      input,
      isExisting,
      touched: true,
      valid,
      priceError,
      offerError,
      dirty,
    };
  });

  const readyToAdd = rows.filter((r) => r.touched && r.valid && !r.isExisting);
  const readyToUpdate = rows.filter(
    (r) => r.touched && r.valid && r.isExisting && r.dirty,
  );

  const handleSaveLadder = async () => {
    if (
      (readyToAdd.length === 0 && readyToUpdate.length === 0) ||
      submittingLadder
    )
      return;
    setSubmittingLadder(true);

    let ok = true;
    if (readyToAdd.length > 0) {
      const additions = readyToAdd.map(({ qty, unit, input }) => ({
        qty,
        unit,
        label: formatSizeLabel(qty, unit),
        price: toExGst(input.price, taxPercent, gstInclusive),
        offerPrice:
          input.offerPrice === ""
            ? ""
            : toExGst(input.offerPrice, taxPercent, gstInclusive),
        sku: generateVariantSku(productName, qty, unit),
      }));
      const addOk = await onAddBatch(additions);
      ok = ok && addOk !== false;
    }
    if (readyToUpdate.length > 0 && onUpdateBatch) {
      const updates = readyToUpdate.map(({ qty, unit, input }) => ({
        id: input.variantId,
        label: formatSizeLabel(qty, unit),
        price: toExGst(input.price, taxPercent, gstInclusive),
        offerPrice:
          input.offerPrice === ""
            ? ""
            : toExGst(input.offerPrice, taxPercent, gstInclusive),
        sku: input.sku,
      }));
      const updateOk = await onUpdateBatch(updates);
      ok = ok && updateOk !== false;
    }

    setSubmittingLadder(false);
    if (ok) {
      setLadderInputs((prev) => {
        const next = { ...prev };
        readyToAdd.forEach((r) => delete next[r.key]);
        readyToUpdate.forEach((r) => {
          next[r.key] = {
            ...next[r.key],
            original: {
              price: next[r.key].price,
              offerPrice: next[r.key].offerPrice,
            },
          };
        });
        return next;
      });
    }
  };

  /* ---------- custom size ---------- */
  const cLabel =
    cUnit === "piece"
      ? "Single piece"
      : cUnit === "pack"
        ? `Pack of ${cQty || 0}`
        : `${cQty} ${cUnit}`;
  const cQtyError =
    cQty !== "" && !(Number(cQty) > 0) ? "Quantity must be above 0." : null;
  const cPriceError = cQty !== "" ? validatePrice(cPrice) : null;
  const cOfferError = validateOfferPrice(cOffer, cPrice);
  const cDuplicate =
    cQty !== "" && Number(cQty) > 0 && existing.includes(normalize(cLabel));
  const canAddCustom =
    Number(cQty) > 0 &&
    !cQtyError &&
    !cPriceError &&
    !cOfferError &&
    !cDuplicate;

  const handleAddCustom = async () => {
    if (!canAddCustom || submittingCustom) return;
    setSubmittingCustom(true);
    const ok = await onAddBatch([
      {
        qty: Number(cQty),
        unit: cUnit,
        label: cLabel,
        price: toExGst(cPrice, taxPercent, gstInclusive),
        offerPrice:
          cOffer === "" ? "" : toExGst(cOffer, taxPercent, gstInclusive),
        sku: generateVariantSku(productName, Number(cQty), cUnit),
      },
    ]);
    setSubmittingCustom(false);
    if (ok !== false) {
      setCQty("");
      setCPrice("");
      setCOffer("");
      setCustomOpen(false);
    }
  };

  const priceLabel = `LIST PRICE ₹ (${gstInclusive ? "INCL." : "EX-GST"})`;
  const saveDisabled = readyToAdd.length === 0 && readyToUpdate.length === 0;
  const saveLabel = submittingLadder
    ? "Saving..."
    : readyToAdd.length > 0 && readyToUpdate.length > 0
      ? `Save changes (${readyToAdd.length} new · ${readyToUpdate.length} updated)`
      : readyToUpdate.length > 0
        ? `Save ${readyToUpdate.length} change${readyToUpdate.length === 1 ? "" : "s"}`
        : `Add ${readyToAdd.length} variant${readyToAdd.length === 1 ? "" : "s"}`;

  return (
    <div className="border border-dashed border-[#C9CFDA] rounded-[10px] p-3.5 mt-[12px] bg-[#FBFCFE]">
      <div className="flex items-center gap-2.5 flex-wrap mb-2.5">
        <h5 className="!text-[12.5px] !font-semibold !leading-[1.2] !m-0 text-[var(--mk-ink-900)]">
          Add the standard ladder{" "}
          <span className="font-normal text-[var(--mk-ink-400)]">
            — {ladderBadgeLabel(sizeSystem)}
          </span>
        </h5>
        <GstToggle
          checked={gstInclusive}
          onChange={setGstInclusive}
          taxPercent={taxPercent}
        />
      </div>

      {/* KG/ML/UNIT selector — switches which standard ladder is shown.
          Always rendered for every product/category, no conditional
          hiding: KG is the bulk 1/5/10 kg ladder, ML is the product's real
          volume/mass system, UNIT is the piece/pack ladder. */}
      <div className="flex items-center gap-1.5 mb-3">
        {[
          { key: "kg", label: "KG" },
          { key: "ml", label: "ML" },
          { key: "unit", label: "UNIT" },
        ].map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setUnitFamily(opt.key)}
            className={`h-7 px-3 rounded-full text-[12px] font-semibold cursor-pointer transition-colors ${
              unitFamily === opt.key
                ? "bg-[var(--mk-primary)] text-white"
                : "bg-white border border-[var(--mk-line)] text-[var(--mk-ink-500)] hover:border-[#C9CFDA]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <div className="hidden sm:grid grid-cols-[88px_1fr_1fr_1fr] gap-2.5 px-0.5">
          {["SIZE", priceLabel, "OFFER ₹ (OPTIONAL)", "SKU (AUTO)"].map((h) => (
            <span
              key={h}
              className="text-[10px] font-semibold uppercase tracking-wide text-[var(--mk-ink-400)]"
            >
              {h}
            </span>
          ))}
        </div>

        {rows.map(
          ({ qty, unit, key, input, isExisting, priceError, offerError }) => {
            const label = formatSizeLabel(qty, unit);
            const hint = priceHint(input.price);
            const sku = isExisting
              ? input.sku
              : generateVariantSku(productName, qty, unit);

            return (
              <div
                key={key}
                className="grid grid-cols-2 sm:grid-cols-[88px_1fr_1fr_1fr] gap-2.5 items-start py-1"
              >
                {/* Size — always read-only, existing or new */}
                <span className="pt-2 text-[12.5px] font-semibold text-[var(--mk-ink-900)]">
                  {label}
                </span>

                {/* List price — always editable, pre-filled from the stored
                  variant when one exists */}
                <div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={input.price}
                    onChange={(e) =>
                      updateLadderInput(qty, unit, { price: e.target.value })
                    }
                    placeholder="0.00"
                    className={fldClass(!!priceError)}
                  />
                  {priceError ? (
                    <p className="text-[10.5px] font-medium text-[var(--mk-dgr)] mt-0.5">
                      {priceError}
                    </p>
                  ) : (
                    hint && (
                      <p className="text-[10.5px] text-[var(--mk-ink-400)] mt-0.5">
                        {hint}
                      </p>
                    )
                  )}
                </div>

                {/* Offer — always editable, pre-filled if the variant has one */}
                <div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={input.offerPrice}
                    onChange={(e) =>
                      updateLadderInput(qty, unit, {
                        offerPrice: e.target.value,
                      })
                    }
                    placeholder="lower than list"
                    className={fldClass(!!offerError)}
                  />
                  {offerError && (
                    <p className="text-[10.5px] font-medium text-[var(--mk-dgr)] mt-0.5">
                      {offerError}
                    </p>
                  )}
                </div>

                {/* SKU — always read-only: the variant's stored SKU, or
                  auto-generated for a not-yet-created size */}
                <span className="pt-2 text-[11.5px] text-[var(--mk-ink-400)] break-all">
                  {sku}
                </span>
              </div>
            );
          },
        )}
      </div>

      <div className="flex items-center gap-3 mt-3 flex-wrap">
        <button
          type="button"
          onClick={handleSaveLadder}
          disabled={saveDisabled || submittingLadder}
          className="inline-flex items-center h-9 gap-1.5 px-3.5 rounded-lg text-[12.5px] font-semibold text-white bg-[var(--mk-primary)] hover:bg-[var(--mk-primary-hover)] transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
        >
          <Plus size={14} />
          {saveLabel}
        </button>
        <span className="text-[12px] text-[var(--mk-ink-500)]">
          Empty rows are skipped — a size without a price is not a variant.
        </span>
      </div>

      {/* CUSTOM SIZE */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setCustomOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--mk-primary)] cursor-pointer"
        >
          {customOpen ? <Minus size={13} /> : <Plus size={13} />}
          Custom size
        </button>

        {customOpen && (
          <div className="mt-2.5 p-3 rounded-lg border border-dashed border-[#C9CFDA] bg-white">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-[var(--mk-ink-500)]">
                  {sizeSystem.units.includes("pack")
                    ? "Count / pack of"
                    : "Quantity"}
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={cQty}
                  onChange={(e) => setCQty(e.target.value)}
                  placeholder="e.g. 200"
                  className={fldClass(!!cQtyError)}
                />
                {cQtyError && (
                  <span className="text-[11px] font-medium text-[var(--mk-dgr)]">
                    {cQtyError}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-[var(--mk-ink-500)]">
                  Unit
                </label>
                <select
                  value={cUnit}
                  onChange={(e) => setCUnit(e.target.value)}
                  className={fldClass(false)}
                >
                  {sizeSystem.units.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-[var(--mk-ink-500)]">
                  {priceLabel}
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={cPrice}
                  onChange={(e) => setCPrice(e.target.value)}
                  placeholder="0.00"
                  className={fldClass(!!cPriceError)}
                />
                {cPriceError ? (
                  <span className="text-[11px] font-medium text-[var(--mk-dgr)]">
                    {cPriceError}
                  </span>
                ) : (
                  priceHint(cPrice) && (
                    <span className="text-[11px] text-[var(--mk-ink-400)]">
                      {priceHint(cPrice)}
                    </span>
                  )
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-[var(--mk-ink-500)]">
                  Offer price ₹ (optional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={cOffer}
                  onChange={(e) => setCOffer(e.target.value)}
                  placeholder="lower than list"
                  className={fldClass(!!cOfferError)}
                />
                {cOfferError && (
                  <span className="text-[11px] font-medium text-[var(--mk-dgr)]">
                    {cOfferError}
                  </span>
                )}
              </div>
            </div>
            {cDuplicate && (
              <p className="text-[11.5px] font-medium text-[var(--mk-dgr)] mt-2">
                {cLabel} has already been added.
              </p>
            )}
            <button
              type="button"
              onClick={handleAddCustom}
              disabled={!canAddCustom || submittingCustom}
              className="inline-flex items-center h-9 gap-1.5 px-3.5 mt-3 rounded-lg text-[12.5px] font-semibold text-white bg-[var(--mk-primary)] hover:bg-[var(--mk-primary-hover)] transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <Plus size={14} />
              {submittingCustom ? "Adding..." : "Add variant"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VariantLadderEditor;
