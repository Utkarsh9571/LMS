export function formatCurrency(minorUnits: number | null | undefined, currency: string = 'SGD'): string {
  if (minorUnits === null || minorUnits === undefined) return 'N/A';
  const amount = minorUnits / 100;
  try {
    return new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}