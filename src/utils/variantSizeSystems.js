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
    steps: [[25, "g"], [50, "g"], [100, "g"], [250, "g"], [500, "g"], [1, "kg"], [5, "kg"], [10, "kg"]],
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
// the inverse of formatSizeLabel. Recognizes the short forms this app
// itself generates ("25 g", "1 kg", "Single piece", "Pack of 5", the
// no-space "25g" some legacy/imported rows may have) plus the long-form
// spellings ("gram(s)", "kilogram(s)/kgs", "milliliter(s)", "liter(s)/
// litre(s)") a variant imported from elsewhere may use, since the unit
// family (mass vs volume) must be detected from whatever spelling the real
// data actually contains, not just this app's own output format. A
// variant named something else entirely (free text) returns null, since
// there's no size to infer from it.
export function parseVariantLabel(label) {
  const s = (label || "").toString().trim();
  if (!s) return null;
  if (/^single piece$/i.test(s)) return { qty: 1, unit: "piece" };
  const packMatch = s.match(/^pack of (\d+(?:\.\d+)?)$/i);
  if (packMatch) return { qty: Number(packMatch[1]), unit: "pack" };
  const m = s.match(
    /^(\d+(?:\.\d+)?)\s*(kilograms|kilogram|kgs|kg|grams|gram|g|milliliters|milliliter|millilitres|millilitre|ml|litres|litre|liters|liter|l)$/i,
  );
  if (!m) return null;
  const rawUnit = m[2].toLowerCase();
  const unit = /^(kilograms|kilogram|kgs|kg)$/.test(rawUnit)
    ? "kg"
    : /^(grams|gram|g)$/.test(rawUnit)
      ? "g"
      : /^(milliliters|milliliter|millilitres|millilitre|ml)$/.test(rawUnit)
        ? "ml"
        : "L"; // litres|litre|liters|liter|l
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

// The ladder only ever offers sizes the product does NOT already have: a
// step whose size already exists as a variant is dropped from the ladder
// entirely, so a size can never be added twice. Matching is by base quantity
// within the same unit family (via findExistingVariantForStep), not by label
// text, so an existing "500 ml" also removes a "0.5 L" step and an existing
// "1 kg" never masks a "1 L" one.
export function availableLadderSteps(steps, existingVariants) {
  return (steps || []).filter(
    ([qty, unit]) => !findExistingVariantForStep(existingVariants, qty, unit),
  );
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

// Words carrying no identifying information, dropped from the SKU. The
// approved example omits "with" —
//   "100 ML Transparent Hair Oil Bottle with Comb Applicator"
//   -> 100-ML-TRANSPARENT-HAIR-OIL-BOTTLE-COMB-APPLICATOR
// — so this list is what implements that, not a cosmetic preference. Keep it
// small: anything removed here is information the admin cannot see in the
// SKU, and two product names differing ONLY by a stop word would collide
// (uniqueVariantSku below still keeps them distinct).
const SKU_STOP_WORDS = new Set([
  "a", "an", "and", "by", "for", "in", "of", "on", "or", "the", "to", "with",
]);

// A SKU prefix that is long enough to stay readable but cannot grow without
// bound from a very long product name. Trimmed at a hyphen so the prefix
// never ends mid-word.
const SKU_PREFIX_MAX = 60;

// The product-name half of a SKU: uppercased, special characters removed,
// spaces turned into hyphens, stop words dropped.
//
//   "100 ML Transparent Hair Oil Bottle with Comb Applicator"
//     -> "100-ML-TRANSPARENT-HAIR-OIL-BOTTLE-COMB-APPLICATOR"
//   "Butterfly Pea (Blue) Powder - 100% Natural"
//     -> "BUTTERFLY-PEA-BLUE-POWDER-100-NATURAL"
export const productSkuPrefix = (productName) => {
  const words = (productName ?? "")
    .toString()
    .toUpperCase()
    // Everything that is not a letter, digit, space or hyphen becomes a
    // separator rather than being deleted, so "Pea(Blue)" does not weld into
    // "PEABLUE".
    .replace(/[^A-Z0-9\s-]+/g, " ")
    .split(/[\s-]+/)
    .filter(Boolean)
    .filter((word) => !SKU_STOP_WORDS.has(word.toLowerCase()));

  if (words.length === 0) return "SKU";

  const slug = words.join("-");
  if (slug.length <= SKU_PREFIX_MAX) return slug;
  // Cut at the last hyphen inside the budget so the prefix ends on a whole
  // word; if the first word alone is longer than the budget, hard-cut it.
  const cut = slug.slice(0, SKU_PREFIX_MAX);
  const lastHyphen = cut.lastIndexOf("-");
  return lastHyphen > 0 ? cut.slice(0, lastHyphen) : cut;
};

// The BASE SKU for one variant: the product-name prefix above plus the
// variant's own size.
//
//   generateVariantSku("100 ML Transparent Hair Oil Bottle with Comb Applicator", 1, "piece")
//     -> "100-ML-TRANSPARENT-HAIR-OIL-BOTTLE-COMB-APPLICATOR-SINGLEPIECE"
//   generateVariantSku("Butterfly Pea Powder", 250, "g")
//     -> "BUTTERFLY-PEA-POWDER-250G"
//
// This replaced a three-letter prefix taken from the product name ("MLT"),
// which carried nothing product-specific: every product whose name began
// with the same three letters and had the same size produced a byte-
// identical SKU, which is why POST /admin/variants kept returning
//
//   409 — SKU "MLT-SINGLEPIECE" already exists on variant #5094 (product #2864)
//
// for a brand-new variant on a DIFFERENT product. The full name makes a
// collision unlikely; uniqueVariantSku below makes it impossible, and is
// what callers must use before sending a SKU to the API.
export const generateVariantSku = (productName, qty, unit) => {
  const prefix = productSkuPrefix(productName);
  const sizePart = formatSizeLabel(qty, unit).replace(/\s/g, "").toUpperCase();
  return `${prefix}-${sizePart}`;
};

// The first SKU not already taken, starting from `base`:
//
//   ...-SINGLEPIECE            (free)        -> ...-SINGLEPIECE
//   ...-SINGLEPIECE            (taken)       -> ...-SINGLEPIECE-002
//   ...-SINGLEPIECE, -002      (both taken)  -> ...-SINGLEPIECE-003
//
// `takenSkus` must be every SKU the API already holds ACROSS ALL PRODUCTS —
// a per-product list cannot see the cross-product clash that caused the 409.
// Comparison is case-insensitive so a stored "mlt-singlepiece" still counts
// as taken rather than being proposed again in a different case.
export const uniqueVariantSku = (base, takenSkus = []) => {
  const taken = new Set(takenSkus.map(normalizeSku).filter(Boolean));
  const root = normalizeSku(base) || "SKU";
  if (!taken.has(root)) return root;
  // Starts at 002 because the un-suffixed SKU is itself "001".
  let n = 2;
  while (taken.has(`${root}-${String(n).padStart(3, "0")}`)) n += 1;
  return `${root}-${String(n).padStart(3, "0")}`;
};

// The one comparison rule for SKUs: trimmed and uppercased. Used by both the
// generator above and the live "already taken" check in the editor, so the
// two can never disagree about whether a SKU is free.
export const normalizeSku = (value) =>
  (value ?? "").toString().trim().toUpperCase();

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
