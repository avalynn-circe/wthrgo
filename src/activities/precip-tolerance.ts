import type { PrecipTolerance } from './types';

/**
 * Friendly precipitation tolerance → max mm per 3-hour interval.
 *
 * Per `architecture.md` "Precipitation tolerance to mm/3hr mapping" and
 * WTH-124. This is the single source of truth — the activity UI presents
 * the friendly values, the detector compares against the numeric value
 * returned here, and tests assert against these exact thresholds.
 *
 * `'any'` returns `Number.POSITIVE_INFINITY` so the comparison
 * `interval.precipitationMm <= toleranceMm` is always true. This lets the
 * detector do one comparison style for all five values with no special
 * case for "no limit."
 */
const TOLERANCE_MM: Record<PrecipTolerance, number> = {
  clear_only: 0.0,
  light_drizzle: 0.5,
  light_rain: 2.0,
  moderate_rain: 5.0,
  any: Number.POSITIVE_INFINITY,
};

/**
 * Returns the maximum acceptable precipitation in mm per 3-hour interval
 * for the given tolerance. Pure, total — every `PrecipTolerance` value
 * has a mapping.
 */
export function precipToleranceMm(tolerance: PrecipTolerance): number {
  return TOLERANCE_MM[tolerance];
}
