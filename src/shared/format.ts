// Money and date formatting for an English-speaking audience.

export function formatMoney(cents: number, currency: string): string {
  const value = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Monthly equivalent of a yearly price, rounded down to the cent (never overstates savings). */
export function perMonth(yearlyCents: number): number {
  return Math.floor(yearlyCents / 12);
}

export function formatDate(d: Date | string, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }): string {
  return new Intl.DateTimeFormat('en-US', opts).format(typeof d === 'string' ? new Date(d) : d);
}

export function formatLongDate(d: Date | string): string {
  return formatDate(d, { month: 'long', day: 'numeric', year: 'numeric' });
}
