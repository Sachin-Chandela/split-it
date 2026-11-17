// Money helpers. The backend stores integer cents (paise); the UI shows rupees.

export function formatMoney(cents) {
  const value = Math.abs(cents) / 100;
  return "₹" + value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// "250.50" -> 25050. Returns null if the input isn't a valid positive amount.
export function toCents(input) {
  const n = Number(input);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
