// Shared-pool stock maths.
//
// A product's stock is ONE pool measured in the product's own stock unit —
// 2925 ML of MANGO FLAVOR OIL — not 2925 of each bottle size. Every variant
// is filled from that same pool, so a variant's availability is a DIVISION of
// the pool, never a copy of it:
//
//   2925 ML  ->  25 ml: floor(2925/25)  = 117 units
//                50 ml: floor(2925/50)  =  58 units
//               100 ml: floor(2925/100) =  29 units
//               250 ml: floor(2925/250) =  11 units
//               500 ml: floor(2925/500) =   5 units
//                 1 L : floor(2925/1000)=   2 units
//
// Those six numbers are alternative uses of the same liquid, not six separate
// stocks — you can sell 117 × 25 ml OR 2 × 1 L, not both. Which is exactly why
// the inventory list must never sum stock across variants: the API repeats the
// pool figure on every variant row, so adding them multiplies one pool by the
// variant count (2925 × 6 = 17,550 — the bug this module exists to prevent).
import {
  parseVariantLabel,
  baseQty,
  unitFamily,
  UNIT_BASE,
} from "./variantSizeSystems";

// Product stock units come through as "KG"/"G"/"L"/"ML"/"UNIT"; the size
// helpers key off lowercase g/kg/ml/L/piece. Anything unrecognised returns
// null so the caller falls back rather than guessing a conversion.
const normalizeStockUnit = (unit) => {
  const u = (unit ?? "").toString().trim().toLowerCase();
  if (u === "ml") return "ml";
  if (u === "l" || u === "ltr" || u === "litre" || u === "liter") return "L";
  if (u === "g" || u === "gm" || u === "gram") return "g";
  if (u === "kg") return "kg";
  if (u === "unit" || u === "piece" || u === "pcs" || u === "pc") return "piece";
  return null;
};

// The base unit a family is measured in, used when the product carries a
// stock figure but no explicit stock unit: a pool feeding ml/L variants is
// millilitres, one feeding g/kg variants is grams.
const BASE_UNIT_FOR_FAMILY = { volume: "ml", mass: "g", count: "piece" };

// The unit family the variants themselves are in. The pool has to be in the
// same family to be divisible by them.
export const variantsFamily = (variants = []) => {
  const families = new Set(
    variants
      .map((v) => parseVariantLabel(v?.variantName))
      .filter(Boolean)
      .map((p) => unitFamily(p.unit)),
  );
  return families.size === 1 ? [...families][0] : null;
};

// The product's shared pool, converted to base units so it can be divided by
// a variant size. Field names are read defensively for the same reason
// VariantTable.jsx documents: the inventory endpoint's exact response shape
// isn't confirmed against a live backend.
//
// Returns null when there is no usable pool, which is the caller's signal to
// leave existing behaviour alone rather than invent a number.
export const productStockPool = (row, variants = []) => {
  const raw =
    row?.availableProductStock ??
    row?.productStock ??
    row?.product?.stock ??
    row?.stock;
  if (raw == null || raw === "") return null;
  const qty = Number(raw);
  if (Number.isNaN(qty)) return null;

  const declared = normalizeStockUnit(
    row?.productStockUnit ?? row?.product?.stockUnit ?? row?.stockUnit,
  );
  // With no declared unit, infer it from what the variants are measured in —
  // a pool of 2925 feeding ml variants is 2925 ml.
  const family = variantsFamily(variants);
  const unit = declared || (family ? BASE_UNIT_FOR_FAMILY[family] : null);
  if (!unit) return null;

  return makePool(baseQty(qty, unit), unit);
};

// The single constructor for a pool, so base, qty and label are always
// derived from the same number — a pool built after a sale describes its new
// size rather than carrying the old label forward.
const makePool = (base, unit) => {
  const perUnit = UNIT_BASE[unit] ?? 1;
  const qty = base / perUnit;
  // Whole numbers print plainly; a partial unit (1.5 L) keeps its decimals.
  const shown = Number.isInteger(qty) ? qty : Number(qty.toFixed(3));
  return {
    qty: shown,
    unit,
    // How the figure is shown to the admin: "2,925 ML".
    label: `${shown.toLocaleString("en-IN")} ${unit === "piece" ? "UNIT" : unit.toUpperCase()}`,
    base,
    family: unitFamily(unit),
  };
};

// A variant's size in base units — "250 ml" -> 250, "1 L" -> 1000.
export const variantSizeBase = (variantName) => {
  const parsed = parseVariantLabel(variantName);
  if (!parsed) return null;
  const base = baseQty(parsed.qty, parsed.unit);
  return base > 0 ? { base, family: unitFamily(parsed.unit) } : null;
};

// How many whole units of this variant the pool can fill.
//
//   availableVariantQty = floor(remainingProductStock / variantSize)
//
// Returns null when it cannot be computed honestly, so the caller shows the
// value it already had rather than a fabricated one.
export const availableUnitsFromPool = (pool, variantName) => {
  const size = variantSizeBase(variantName);
  if (!pool || !size) return null;
  // A volume pool cannot fill a mass variant. Mass and volume share the same
  // base-1000 scale (1 kg and 1 L are both 1000), so without this guard a
  // kg-family pool would silently divide a litre-family variant.
  if (pool.family !== size.family) return null;
  return Math.max(0, Math.floor(pool.base / size.base));
};

// What the pool becomes after selling `quantity` units of a variant — the
// same arithmetic an order must apply, expressed once so the number shown in
// the admin and the number deducted on checkout cannot drift apart.
//
//   2925 ML, order 250 ml x 1  ->  2675 ML
//
// Every variant's availability is then recomputed from the new pool by
// calling availableUnitsFromPool again; nothing is stored per variant.
export const poolAfterSale = (pool, variantName, quantity = 1) => {
  const size = variantSizeBase(variantName);
  if (!pool || !size || pool.family !== size.family) return pool;
  const consumed = size.base * Number(quantity || 0);
  return makePool(Math.max(0, pool.base - consumed), pool.unit);
};

// Whether the pool can satisfy an order line — the check a cart/checkout
// must run before accepting it.
export const canFulfilFromPool = (pool, variantName, quantity = 1) => {
  const units = availableUnitsFromPool(pool, variantName);
  return units == null ? true : units >= Number(quantity || 0);
};
