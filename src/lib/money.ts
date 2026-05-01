export function formatTaka(amount: number) {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `৳ ${safe.toLocaleString("bn-BD")}`;
}

