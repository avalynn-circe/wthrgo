import type { Activity } from '@/activities/types';
import { precipToleranceMm } from '@/activities/precip-tolerance';
import type { Interval, PrecipType } from '@/weather/types';

/**
 * Reason for an interval failing to qualify. Used by the detector to
 * classify boundary types for GAP-003: a qualifying block followed by a
 * `precip_volume` or `precip_type` failure is a pre-rain boundary;
 * anything else is a pre-deterioration boundary.
 *
 * Reasons are reported as the FIRST failed check, in the order the
 * predicate runs. Order is fixed so tests can assert specific reasons.
 * Order: time_of_day, temperature, dew_point, wind_speed, wind_direction,
 * precip_type, precip_volume, uv_index, visibility, cloud_cover.
 *
 * Note that `time_of_day` is checked first — a daytime-only activity at
 * 2am is disqualified for time_of_day regardless of whether it's also
 * raining. This matters for GAP-003: a nighttime interval that happens
 * to also be rainy is classified by its time_of_day failure, not its
 * precipitation, so it does NOT make the preceding block "pre-rain."
 */
export type DisqualifyReason =
  | 'time_of_day'
  | 'temperature'
  | 'dew_point'
  | 'wind_speed'
  | 'wind_direction'
  | 'precip_type'
  | 'precip_volume'
  | 'uv_index'
  | 'visibility'
  | 'cloud_cover';

/**
 * Result of evaluating one interval against one activity.
 *
 * Per `CLAUDE.md` error convention: discriminated unions, no thrown
 * errors across module boundaries.
 */
export type QualifyResult =
  | { ok: true }
  | { ok: false; reason: DisqualifyReason };

/**
 * Returns whether `interval` lies in the activity's preferred time-of-day.
 *
 * Per GAP-001 and the daytime-via-midpoint decision: the interval's
 * midpoint is compared against the sunrise/sunset stored on the interval
 * by the normalization layer.
 *
 * Polar cases (sunrise and sunset both null):
 *   - polar day  (isPolarNight=false): every interval is daytime
 *   - polar night (isPolarNight=true): every interval is nighttime
 *
 * Boundary behavior: midpoint exactly equal to sunrise counts as daytime;
 * midpoint exactly equal to sunset counts as nighttime. The asymmetry is
 * intentional — sunrise opens the day, sunset closes it.
 */
function isDaytime(interval: Interval): boolean {
  if (interval.sunriseUtc === null || interval.sunsetUtc === null) {
    // Polar case: no sunrise/sunset event. isPolarNight resolves it.
    return !interval.isPolarNight;
  }
  const midpoint = (interval.startsAt + interval.endsAt) / 2;
  return midpoint >= interval.sunriseUtc && midpoint < interval.sunsetUtc;
}

/**
 * Returns whether `precipType` is acceptable to the activity. Default
 * (`undefined` pref) is `'any'`.
 */
function precipTypeAllowed(
  precipType: PrecipType,
  pref: Activity['criteria']['precipTypePref'],
): boolean {
  const p = pref ?? 'any';
  if (p === 'any') return true;
  if (p === 'none') return precipType === 'none';
  if (p === 'rain_only') return precipType === 'none' || precipType === 'rain';
  if (p === 'snow_only') return precipType === 'none' || precipType === 'snow';
  return false;
}

/**
 * Returns whether `windDeg` lies within the inclusive arc from `fromDeg`
 * to `toDeg`, measured clockwise. Supports wrap-around (e.g., 350 → 20
 * for "north-ish").
 */
function windDirectionInRange(
  windDeg: number,
  from: number,
  to: number,
): boolean {
  // Normalize to [0, 360)
  const w = ((windDeg % 360) + 360) % 360;
  const f = ((from % 360) + 360) % 360;
  const t = ((to % 360) + 360) % 360;
  if (f <= t) return w >= f && w <= t;
  // Wrap-around arc, e.g. f=350, t=20: includes [350, 360) ∪ [0, 20].
  return w >= f || w <= t;
}

/**
 * Evaluates a single interval against a single activity's criteria.
 *
 * Pure. No I/O. No clock. Deterministic given inputs.
 *
 * Order of checks is fixed and documented on `DisqualifyReason`.
 *
 * Requirements: WTH-121..WTH-125, WTH-130..WTH-134.
 */
export function qualifyInterval(
  interval: Interval,
  activity: Activity,
): QualifyResult {
  const c = activity.criteria;

  // 1. time_of_day (WTH-125, GAP-001)
  if (c.timeOfDay === 'daytime' && !isDaytime(interval)) {
    return { ok: false, reason: 'time_of_day' };
  }
  if (c.timeOfDay === 'nighttime' && isDaytime(interval)) {
    return { ok: false, reason: 'time_of_day' };
  }

  // 2. temperature (WTH-121)
  if (
    interval.temperatureC < c.tempMinC ||
    interval.temperatureC > c.tempMaxC
  ) {
    return { ok: false, reason: 'temperature' };
  }

  // 3. dew_point (WTH-122)
  if (interval.dewPointC > c.dewPointMaxC) {
    return { ok: false, reason: 'dew_point' };
  }

  // 4. wind_speed (WTH-123)
  if (interval.windSpeedKmh > c.windSpeedMaxKmh) {
    return { ok: false, reason: 'wind_speed' };
  }

  // 5. wind_direction (WTH-133) — only enforced if a preference is set
  if (c.windDirectionPref) {
    const inRange = windDirectionInRange(
      interval.windDirectionDeg,
      c.windDirectionPref.fromDeg,
      c.windDirectionPref.toDeg,
    );
    if (!inRange) return { ok: false, reason: 'wind_direction' };
  }

  // 6. precip_type (WTH-130) — order matters for GAP-003: type before
  // volume so that "wrong type even at low volume" reports as
  // precip_type, which is still a precipitation boundary.
  if (!precipTypeAllowed(interval.precipitationType, c.precipTypePref)) {
    return { ok: false, reason: 'precip_type' };
  }

  // 7. precip_volume (WTH-124)
  const toleranceMm = precipToleranceMm(c.precipTolerance);
  if (interval.precipitationMm > toleranceMm) {
    return { ok: false, reason: 'precip_volume' };
  }

  // 8. uv_index (WTH-131)
  if (c.uvIndexMin !== undefined && interval.uvIndex < c.uvIndexMin) {
    return { ok: false, reason: 'uv_index' };
  }
  if (c.uvIndexMax !== undefined && interval.uvIndex > c.uvIndexMax) {
    return { ok: false, reason: 'uv_index' };
  }

  // 9. visibility (WTH-132)
  if (
    c.visibilityMinKm !== undefined &&
    interval.visibilityKm < c.visibilityMinKm
  ) {
    return { ok: false, reason: 'visibility' };
  }

  // 10. cloud_cover (WTH-134)
  if (
    c.cloudCoverMaxPct !== undefined &&
    interval.cloudCoverPct > c.cloudCoverMaxPct
  ) {
    return { ok: false, reason: 'cloud_cover' };
  }

  return { ok: true };
}

/**
 * Whether a disqualify reason represents a precipitation-driven failure,
 * for GAP-003 pre-rain vs pre-deterioration classification. Exported so
 * the detector and its tests share the same definition.
 */
export function isPrecipReason(reason: DisqualifyReason): boolean {
  return reason === 'precip_type' || reason === 'precip_volume';
}
