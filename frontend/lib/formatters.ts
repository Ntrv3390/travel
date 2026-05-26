export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDuration(secondsMin: number, secondsMax: number): string {
  const minHrs = Math.max(1, Math.round(secondsMin / 3600));
  const maxHrs = Math.max(minHrs, Math.round(secondsMax / 3600));
  return minHrs === maxHrs ? `${minHrs}h` : `${minHrs}-${maxHrs}h`;
}

export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
