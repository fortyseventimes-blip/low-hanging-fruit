// Abramowitz & Stegun 7.1.26 erf approximation (max error ~1.5e-7) — good
// enough for a UI percentile label, no stats library needed for this.
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

// design-brief-ui-elements.md §4 (CohortMarker): "выше 72% когорты" —
// modeling the cohort as normal(mean, stddev) turns a rating into that
// percentile. stddev <= 0 (degenerate benchmark) falls back to a hard
// above/below split instead of dividing by zero.
export function percentileFromRating(rating: number, mean: number, stddev: number): number {
  if (stddev <= 0) return rating >= mean ? 100 : 0;
  const z = (rating - mean) / stddev;
  return Math.round(normalCdf(z) * 100);
}

// Maps a value on [min, max] to a 0-100 position for the horizontal bar,
// clamped so a mean±stddev band that overshoots the scale doesn't overflow
// the bar itself.
export function positionPct(value: number, min: number, max: number): number {
  if (max === min) return 50;
  const pct = ((value - min) / (max - min)) * 100;
  return Math.min(100, Math.max(0, pct));
}
