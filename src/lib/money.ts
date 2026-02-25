export function formatINR(valueRupees: number): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(valueRupees);
  } catch {
    return `₹${Math.round(valueRupees)}`;
  }
}

export function clampNonNegativeInt(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
}
