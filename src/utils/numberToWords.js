// Converts a real order total into words for the printed invoice — Indian
// numbering system (lakh/crore), matching the ₹ formatting already used
// elsewhere (toLocaleString("en-IN")). Rounds to the nearest whole rupee,
// same convention most Indian invoices use for the words line.
const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const twoDigits = (n) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : ""));

const threeDigits = (n) => {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  return (hundred ? `${ONES[hundred]} Hundred${rest ? " " : ""}` : "") + (rest ? twoDigits(rest) : "");
};

export const numberToWordsINR = (amount) => {
  const rupees = Math.round(Math.abs(Number(amount) || 0));
  if (rupees === 0) return "Zero Rupees Only";

  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const hundred = rupees % 1000;

  const parts = [];
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));

  return `${parts.join(" ")} Rupees Only`;
};

// The invoice's words lines, which include paise and use a different tail
// from numberToWordsINR above:
//
//   1.10 -> "One and Ten Paise Only"      (reference: "Indian Rupee One and Ten Paise Only")
//   0.00 -> "Zero Only"                   (reference: "Indian Rupee Zero Only")
//   220  -> "Two Hundred Twenty Only"
//
// numberToWordsINR is left exactly as it was — it rounds to whole rupees and
// ends "Rupees Only", which is the right convention for its own callers but
// prints "One Rupees Only" for ₹1.10. The caller prefixes "Indian Rupee".
export const amountInWordsINR = (amount) => {
  const value = Math.abs(Number(amount) || 0);
  // Work in paise so 1.10 can't arrive as 1.0999999999999999.
  const totalPaise = Math.round(value * 100);
  const rupees = Math.floor(totalPaise / 100);
  const paise = totalPaise % 100;

  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const hundred = rupees % 1000;

  const parts = [];
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));

  const rupeeWords = parts.length ? parts.join(" ") : "Zero";
  return paise
    ? `${rupeeWords} and ${twoDigits(paise)} Paise Only`
    : `${rupeeWords} Only`;
};
