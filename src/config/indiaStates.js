// India's states and union territories, with the codes the courier API needs.
//
// This project has no states endpoint, so the list lives here as a frontend
// constant. It is deliberately isolated in config: `getStateOptions()` is the
// ONLY thing the UI imports, so replacing this with a real API later is a
// change to this file alone — no component touches the arrays directly.
//
// The `code` is carried here precisely so the admin never has to type one:
// picking "Tamil Nadu" in the dropdown submits { name: "Tamil Nadu",
// code: "TN" } without the code ever appearing in the UI.

export const INDIA_STATES = [
  { name: "Andhra Pradesh", code: "AP" },
  { name: "Arunachal Pradesh", code: "AR" },
  { name: "Assam", code: "AS" },
  { name: "Bihar", code: "BR" },
  { name: "Chhattisgarh", code: "CG" },
  { name: "Goa", code: "GA" },
  { name: "Gujarat", code: "GJ" },
  { name: "Haryana", code: "HR" },
  { name: "Himachal Pradesh", code: "HP" },
  { name: "Jharkhand", code: "JH" },
  { name: "Karnataka", code: "KA" },
  { name: "Kerala", code: "KL" },
  { name: "Madhya Pradesh", code: "MP" },
  { name: "Maharashtra", code: "MH" },
  { name: "Manipur", code: "MN" },
  { name: "Meghalaya", code: "ML" },
  { name: "Mizoram", code: "MZ" },
  { name: "Nagaland", code: "NL" },
  { name: "Odisha", code: "OD" },
  { name: "Punjab", code: "PB" },
  { name: "Rajasthan", code: "RJ" },
  { name: "Sikkim", code: "SK" },
  { name: "Tamil Nadu", code: "TN" },
  { name: "Telangana", code: "TS" },
  { name: "Tripura", code: "TR" },
  { name: "Uttar Pradesh", code: "UP" },
  { name: "Uttarakhand", code: "UK" },
  { name: "West Bengal", code: "WB" },
];

export const INDIA_UNION_TERRITORIES = [
  { name: "Andaman and Nicobar Islands", code: "AN" },
  { name: "Chandigarh", code: "CH" },
  { name: "Dadra and Nagar Haveli and Daman and Diu", code: "DH" },
  { name: "Delhi", code: "DL" },
  { name: "Jammu and Kashmir", code: "JK" },
  { name: "Ladakh", code: "LA" },
  { name: "Lakshadweep", code: "LD" },
  { name: "Puducherry", code: "PY" },
];

const ALL = [...INDIA_STATES, ...INDIA_UNION_TERRITORIES].sort((a, b) =>
  a.name.localeCompare(b.name),
);

// The seam. Swap this for an API-backed source and every consumer follows;
// keep the return shape ([{ name, code }]) and nothing else changes.
export const getStateOptions = () => ALL;

// A stored courier may name a state slightly differently from this list
// ("Pondicherry" for Puducherry). Matching is case-insensitive on the name so
// the code is still resolved; an unknown name keeps whatever code the record
// already carried rather than being dropped.
export const findStateCode = (name) =>
  ALL.find((s) => s.name.toLowerCase() === String(name ?? "").toLowerCase())
    ?.code ?? null;

export default ALL;
