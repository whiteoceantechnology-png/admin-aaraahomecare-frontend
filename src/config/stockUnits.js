// The ONE list of units the admin can choose from, shared by the product's
// Stock Unit field and the variant editor's Unit dropdown.
//
// These two used to disagree. Stock Unit offered KG/G/L/ML/UNIT, while the
// variant Unit dropdown took its options from the matched size system's
// `units` array — and SIZE_SYSTEMS.BULK_KG (the system every weight-family
// product resolves to) declares `units: ["kg"]` even though its own ladder
// steps run 25 g … 10 kg. The result: the ladder showed gram sizes but the
// custom-size Unit dropdown could only ever say "kg", so a 200 g custom
// variant was impossible to enter. Deriving both from this file is what
// keeps them from drifting apart again.

export const STOCK_UNIT_OPTIONS = ["KG", "G", "L", "ML", "UNIT"];

// Spellings the API may use for the same unit, mapped onto the option values
// above. The dropdown's <option value> strings are uppercase; the API returns
// "ml". A <select> whose value matches no <option> renders BLANK and submits
// "" — which is why the field looked empty AND why saving sent
// `stockUnit: null` and wiped the product's unit.
export const STOCK_UNIT_ALIASES = {
  G: "G", GM: "G", GRAM: "G", GRAMS: "G",
  KG: "KG", KGS: "KG", KILOGRAM: "KG", KILOGRAMS: "KG",
  ML: "ML", MILLILITER: "ML", MILLILITERS: "ML",
  MILLILITRE: "ML", MILLILITRES: "ML",
  L: "L", LTR: "L", LITER: "L", LITERS: "L", LITRE: "L", LITRES: "L",
  UNIT: "UNIT", UNITS: "UNIT", PIECE: "UNIT", PIECES: "UNIT",
  PC: "UNIT", PCS: "UNIT",
};

// Whatever the API sent -> the matching option value. A value that maps to no
// known option is returned UNCHANGED rather than forced or blanked, so an
// unexpected unit still displays and round-trips exactly as stored (the
// dropdown grows an option for it — see stockUnitOptions in
// ProductDetailDrawer).
export const canonicalStockUnit = (value) => {
  const raw = (value ?? "").toString().trim();
  if (!raw) return "";
  const mapped = STOCK_UNIT_ALIASES[raw.toUpperCase()];
  return mapped ?? raw;
};

// Case-insensitive via canonicalStockUnit: comparing the raw API value
// against "ML" directly made a lowercase "ml" fall through to the kg family,
// which silently defaulted the variant ladder to the wrong KG/ML/UNIT tab.
export const unitFamilyForStockUnit = (unit) => {
  const u = canonicalStockUnit(unit);
  return u === "UNIT" ? "unit" : u === "ML" || u === "L" ? "ml" : "kg";
};

// A Stock Unit option -> the lowercase token the variant editor and
// variantSizeSystems.js use for that same unit ("G" and "g" are one unit
// spelled for two different UIs, not two units).
//
// UNIT maps to "piece"; "pack" has no Stock Unit counterpart, which is why
// variantUnitOptionsForFamily below also accepts the size system's own units
// rather than replacing them outright.
const VARIANT_UNIT_FOR_STOCK_UNIT = {
  G: "g",
  KG: "kg",
  ML: "ml",
  L: "L",
  UNIT: "piece",
};

// Smallest unit of each family first, so a dropdown reads "g, kg" and
// "ml, L" rather than in STOCK_UNIT_OPTIONS' own order.
const VARIANT_UNIT_ORDER = { g: 1, kg: 2, ml: 1, L: 2, piece: 1, pack: 2 };

/**
 * The units the variant Unit dropdown should offer for a given family
 * ("kg" | "ml" | "unit"), derived from STOCK_UNIT_OPTIONS above.
 *
 *   kg   -> ["g", "kg"]
 *   ml   -> ["ml", "L"]
 *   unit -> ["piece"]  (+ "pack" via extraUnits)
 *
 * `extraUnits` (the matched size system's own `units`) is merged in so a
 * unit that has no Stock Unit equivalent — "pack" — is not dropped.
 */
export const variantUnitOptionsForFamily = (family, extraUnits = []) => {
  const canonical = STOCK_UNIT_OPTIONS.filter(
    (u) => unitFamilyForStockUnit(u) === family,
  )
    .map((u) => VARIANT_UNIT_FOR_STOCK_UNIT[u])
    .filter(Boolean);

  const merged = [
    ...canonical,
    ...extraUnits.filter((u) => u && !canonical.includes(u)),
  ];

  return merged.sort(
    (a, b) => (VARIANT_UNIT_ORDER[a] ?? 99) - (VARIANT_UNIT_ORDER[b] ?? 99),
  );
};
