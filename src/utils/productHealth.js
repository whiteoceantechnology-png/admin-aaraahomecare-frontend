// Shared data-health check for a product row — used by both the Product
// list (health filter chips) and the Product detail drawer (health banner).
// All checks are derived from real fields already on the product object.
export const productHealth = (item) => {
  const flags = [];
  if (!item?.variants || item.variants.length === 0) flags.push({ key: "novariant", label: "No variants" });
  if (!(Number(item?.discountPrice) > 0)) flags.push({ key: "noprice", label: "No price set" });
  if (!item?.productImage) flags.push({ key: "noimage", label: "Missing image" });
  return flags;
};
