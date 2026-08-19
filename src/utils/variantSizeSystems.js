// Frontend-only size-ladder heuristic for the Add Product variant editor.
//
// Checked first: the category API (categoryApi.js/categorySlice.js) only
// carries {id, name, categoryImage, isActive, createdAt, updatedAt} — there
// is no backend "size system" field on a category to read instead. So this
// is a client-side convenience, not backend-confirmed data — it exists to
// suggest a sensible standard ladder per category rather than the old
// hardcoded 25g–1kg chips for every product. If the backend ever adds a real
// per-category size-system field, swap the lookup in getSizeSystemForCategory
// for that instead of this keyword match.
//
// Every ladder step is [quantity, unit]; "piece"/"pack" are counted, not
// weighed/measured, so they're excluded from the weight/volume monotonic
// family checks elsewhere.

export const UNIT_BASE = { g: 1, kg: 1000, ml: 1, L: 1000, piece: 1, pack: 1 };

export const SIZE_SYSTEMS = {
  MASS_STD: {
    key: "MASS_STD",
    label: "Mass · 25 g – 1 kg",
    units: ["g", "kg"],
    steps: [
      [25, "g"], [50, "g"], [100, "g"], [250, "g"], [500, "g"], [1, "kg"],
    ],
  },
  MASS_PIGMENT: {
    key: "MASS_PIGMENT",
    label: "Mass · 10 g – 500 g",
    units: ["g", "kg"],
    steps: [
      [10, "g"], [25, "g"], [50, "g"], [100, "g"], [250, "g"], [500, "g"],
    ],
  },
  BULK_KG: {
    key: "BULK_KG",
    label: "Bulk · 1 / 5 / 10 kg",
    units: ["kg"],
    steps: [[1, "kg"], [5, "kg"], [10, "kg"]],
  },
  VOLUME: {
    key: "VOLUME",
    label: "Volume · 25 ml – 1 L",
    units: ["ml", "L"],
    steps: [
      [25, "ml"], [50, "ml"], [100, "ml"], [250, "ml"], [500, "ml"], [1, "L"],
    ],
  },
  PACK: {
    key: "PACK",
    label: "Pack counts · 1 / 5 / 10 / 20",
    units: ["piece", "pack"],
    steps: [[1, "piece"], [5, "pack"], [10, "pack"], [20, "pack"]],
  },
};

// Order matters — more specific matches first. Falls back to MASS_STD (the
// most common case in this catalogue) when nothing matches, never to an
// empty ladder.
const CATEGORY_KEYWORD_RULES = [
  { test: /bulk|wholesale/i, system: "BULK_KG" },
  { test: /pigment|colour|color|dye/i, system: "MASS_PIGMENT" },
  { test: /hydrosol|essential oil|carrier oil|\boil\b|gel|liquid|shampoo|serum|syrup|essence|extract|\bml\b|litre|liter|soap base/i, system: "VOLUME" },
  { test: /bottle|container|jar|cap\b|pump|packaging|\bpack\b|piece|unit/i, system: "PACK" },
];

export function getSizeSystemForCategory(categoryName) {
  const name = (categoryName || "").toString();
  const rule = CATEGORY_KEYWORD_RULES.find((r) => r.test.test(name));
  return SIZE_SYSTEMS[rule?.system] || SIZE_SYSTEMS.MASS_STD;
}

// "Volume · 25 ml – 1 L" -> "Volume ladder · 25 ml – 1 L" — the badge
// wording used wherever a size system is shown as product-header context
// rather than as the ladder editor's own section title.
export function ladderBadgeLabel(sizeSystem) {
  const [name, range] = sizeSystem.label.split(" · ");
  return range ? `${name} ladder · ${range}` : `${name} ladder`;
}

// Reads a real, already-persisted variant's name back into {qty, unit} —
// the inverse of formatSizeLabel. Only recognizes the exact formats this
// app itself generates ("25 g", "1 kg", "Single piece", "Pack of 5", and
// the no-space "25g" variant some legacy/imported rows may have) — a
// variant named something else entirely (free text) returns null, since
// there's no size to infer from it.
export function parseVariantLabel(label) {
  const s = (label || "").toString().trim();
  if (!s) return null;
  if (/^single piece$/i.test(s)) return { qty: 1, unit: "piece" };
  const packMatch = s.match(/^pack of (\d+(?:\.\d+)?)$/i);
  if (packMatch) return { qty: Number(packMatch[1]), unit: "pack" };
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(kg|g|ml|l)$/i);
  if (!m) return null;
  const unit = m[2].toLowerCase() === "l" ? "L" : m[2].toLowerCase();
  return { qty: Number(m[1]), unit };
}

// Determines which standard ladder to show for Edit Product from the
// product's ACTUAL existing variants (not the category guess) — e.g. an
// all-ml product always gets the Volume ladder even if its category name
// doesn't hint at that. Category is only the fallback for a
// brand-new-product (no variants yet) and the tiebreaker among the several
// mass ladders (MASS_STD/MASS_100/MASS_PIGMENT) that all share the g/kg
// family, since unit alone can't tell those apart.
export function inferSizeSystemFromVariants(existingVariants, categoryName) {
  const parsed = (existingVariants || []).map((v) => parseVariantLabel(v.variantName)).filter(Boolean);
  if (parsed.length === 0) return getSizeSystemForCategory(categoryName);

  const units = new Set(parsed.map((p) => p.unit));
  if (units.has("ml") || units.has("L")) return SIZE_SYSTEMS.VOLUME;
  if (units.has("piece") || units.has("pack")) return SIZE_SYSTEMS.PACK;
  if (units.has("g")) {
    const catSystem = getSizeSystemForCategory(categoryName);
    return catSystem.units.includes("g") ? catSystem : SIZE_SYSTEMS.MASS_STD;
  }
  if (units.has("kg")) return SIZE_SYSTEMS.BULK_KG;
  return getSizeSystemForCategory(categoryName);
}

// Finds the real existing variant (if any) whose parsed size matches this
// ladder step — same base-quantity/unit-family equality variantSizeExists
// already uses, just returning the object instead of a boolean.
export function findExistingVariantForStep(existingVariants, qty, unit) {
  return (existingVariants || []).find((v) => {
    const p = parseVariantLabel(v.variantName);
    return p && baseQty(p.qty, p.unit) === baseQty(qty, unit) && unitFamily(p.unit) === unitFamily(unit);
  });
}

export const isCountedUnit = (unit) => unit === "piece" || unit === "pack";

// Mass (g/kg) and volume (ml/L) share the same base-1000 scale (1 kg = 1 L
// in raw baseQty terms), so equal baseQty alone isn't enough to tell "1 kg"
// and "1 L" apart — a kg-family product's variant must never match an
// ml-family ladder step (or vice versa). isCountedUnit alone only separated
// piece/pack from everything else; this adds the mass/volume split.
export const unitFamily = (unit) => {
  if (unit === "piece" || unit === "pack") return "count";
  if (unit === "ml" || unit === "L") return "volume";
  return "mass";
};

export const baseQty = (qty, unit) => Number(qty) * (UNIT_BASE[unit] ?? 1);

export const formatSizeLabel = (qty, unit) => {
  if (unit === "piece") return "Single piece";
  if (unit === "pack") return `Pack of ${qty}`;
  return `${qty} ${unit}`;
};

// Same shape the existing chip-based flow already used in
// ProductDetailDrawer.jsx's handleAddVariantInline — kept identical rather
// than inventing a second SKU format.
export const generateVariantSku = (productName, qty, unit) => {
  const prefix = (productName || "SKU").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "SKU";
  const sizePart = formatSizeLabel(qty, unit).replace(/\s/g, "").toUpperCase();
  return `${prefix}-${sizePart}`;
};

// True if `qty`/`unit` already exists among `variants` (same base quantity
// within the same unit family) — used to grey out an already-added ladder
// step and to block duplicate custom sizes.
export const variantSizeExists = (variants, qty, unit) =>
  variants.some((v) => baseQty(v.qty, v.unit) === baseQty(qty, unit) && unitFamily(v.unit) === unitFamily(unit));

export const round2 = (n) => Math.round(Number(n) * 100) / 100;

// GST conversion — mirrors the reference variant-editor HTML's toEx(v)
// helper exactly: when the admin types a GST-inclusive catalogue price,
// convert it to the ex-GST value that's actually stored; typing ex-GST
// directly stores it as-is (just rounded to 2dp).
export const toExGst = (amount, taxPercent, inclusive) => {
  const n = Number(amount);
  if (!inclusive) return round2(n);
  return round2(n / (1 + Number(taxPercent || 0) / 100));
};

export const toInclGst = (exAmount, taxPercent) =>
  round2(Number(exAmount) * (1 + Number(taxPercent || 0) / 100));

export const validatePrice = (price) => {
  if (price === "" || price == null) return "Price is required.";
  if (!(Number(price) > 0)) return "Price must be greater than ₹0.";
  return null;
};

export const validateOfferPrice = (offerPrice, price) => {
  if (offerPrice === "" || offerPrice == null) return null;
  const o = Number(offerPrice);
  if (!(o > 0) || !(o < Number(price))) return "Offer price must be lower than list price.";
  return null;
};
