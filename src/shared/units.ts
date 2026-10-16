// Weights are stored in kg (canonical) and shown in the member's unit.

export type Unit = 'kg' | 'lbs';

export const LBS_PER_KG = 2.2046226218;

export function toKg(value: number, unit: Unit): number {
  return unit === 'kg' ? value : value / LBS_PER_KG;
}

export function fromKg(kg: number, unit: Unit): number {
  return unit === 'kg' ? kg : kg * LBS_PER_KG;
}

/** Round to 2 decimals to undo float noise from conversions (95 lbs → kg → lbs = 95). */
export function clean(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Display value of a stored kg weight in `unit`, without snapping. */
export function displayWeight(kg: number, unit: Unit): number {
  return clean(fromKg(kg, unit));
}

/** Snap to the nearest multiple of `step` (e.g. after switching units). */
export function snap(value: number, step: number): number {
  if (step <= 0) return value;
  return clean(Math.round(value / step) * step);
}

export function formatWeight(value: number | null | undefined, unit: Unit): string {
  if (value === null || value === undefined) return '–';
  const n = Number.isInteger(value) ? String(value) : String(clean(value));
  return `${n} ${unit}`;
}
