// Deterministic tile color per category/product, matching the palette used
// in the approved mockup (aaraa-admin-redesign.html) for its colored
// letter-tiles. Same seed (e.g. category id or name) always maps to the
// same color, so a category's tile color stays stable across renders.
const PALETTE = [
  "#5B8C5A",
  "#2E8B57",
  "#6C5CE7",
  "#0FA3B1",
  "#8E4585",
  "#C05621",
  "#4B6584",
  "#B08D2F",
  "#3867D6",
  "#A0522D",
  "#7F8C8D",
  "#43389B",
];

export const mkTileColor = (seed) => {
  const str = String(seed ?? "");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
};
