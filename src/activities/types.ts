/**
 * Activity model. An activity is a user-defined condition profile evaluated
 * against every forecast interval to find qualifying windows.
 *
 * UNITS — All criteria numbers are metric, matching `weather/types.ts`.
 * The detector compares interval values to criteria values directly with
 * no conversion. GAP-009's default values are listed there in both
 * imperial and metric for documentation purposes, but those imperial
 * values are DISPLAY defaults only — the storage layer holds metric, the
 * preset library defines metric, and the UI flips representations via the
 * user's `units` preference. Fahrenheit, mph, and inches never reach this
 * file.
 *
 * Requirements covered: WTH-100..WTH-143.
 */

/**
 * Time-of-day preference. `daytime` means the interval's midpoint falls
 * between sunrise and sunset of the local-calendar day the midpoint is
 * in. Polar day / polar night handling per GAP-001 — see `qualify.ts`.
 *
 * Requirement: WTH-125.
 */
export type TimeOfDayPref = 'any' | 'daytime' | 'nighttime';

/**
 * Precipitation type preference for advanced criteria.
 *   - `any`: no constraint on precipitation type
 *   - `rain_only`: snow / sleet / freezing-rain disqualify; rain OK
 *   - `snow_only`: rain / sleet / freezing-rain disqualify; snow OK
 *   - `none`: any precipitation type other than `none` disqualifies
 *
 * Interaction with `precipTolerance` (WTH-124): tolerance is the volume
 * cap; this is the type filter. Both apply. Per GAP-003, an activity that
 * permits a precipitation type via `precipTypePref` is NOT pre-rain
 * disqualified when that type appears within tolerance.
 *
 * Requirement: WTH-130.
 */
export type PrecipTypePref = 'any' | 'rain_only' | 'snow_only' | 'none';

/**
 * Precipitation volume tolerance, chosen from a friendly dropdown.
 * The mm/3hr mapping lives in `precip-tolerance.ts`.
 *
 * Requirement: WTH-124.
 */
export type PrecipTolerance =
  | 'clear_only'
  | 'light_drizzle'
  | 'light_rain'
  | 'moderate_rain'
  | 'any';

/**
 * Acceptable wind direction range, expressed as an arc from `fromDeg` to
 * `toDeg` measured clockwise. Both endpoints inclusive. `fromDeg` may be
 * greater than `toDeg` to express an arc crossing 0° (e.g., 350 → 20
 * means "north-ish, ±20°").
 *
 * Requirement: WTH-133.
 */
export interface WindDirectionPref {
  fromDeg: number; // 0–359
  toDeg: number;   // 0–359
}

/**
 * The condition profile for one activity. Basic criteria are required;
 * advanced criteria are optional and act as additional constraints when
 * present. A missing advanced criterion does not constrain anything.
 *
 * Requirements covered:
 *   Basic   — WTH-120..WTH-125
 *   Advanced — WTH-130..WTH-138
 *   Defaults — GAP-009 (applied at construction time, not enforced here)
 */
export interface ActivityCriteria {
  /** WTH-121. Inclusive lower bound, °C. */
  tempMinC: number;
  /** WTH-121. Inclusive upper bound, °C. */
  tempMaxC: number;
  /** WTH-122. Maximum acceptable dew point, °C. */
  dewPointMaxC: number;
  /** WTH-123. Maximum acceptable wind speed, km/h. */
  windSpeedMaxKmh: number;
  /** WTH-124. */
  precipTolerance: PrecipTolerance;
  /** WTH-125, GAP-001. */
  timeOfDay: TimeOfDayPref;

  // ---- Advanced (optional) ----

  /** WTH-130. Defaults to `any` when undefined. */
  precipTypePref?: PrecipTypePref;
  /** WTH-131. Inclusive lower bound on UV index. */
  uvIndexMin?: number;
  /** WTH-131. Inclusive upper bound on UV index. */
  uvIndexMax?: number;
  /** WTH-132. Inclusive minimum, km. */
  visibilityMinKm?: number;
  /** WTH-133. */
  windDirectionPref?: WindDirectionPref;
  /** WTH-134. Inclusive maximum, percent. */
  cloudCoverMaxPct?: number;

  /**
   * WTH-135 / WTH-040. Number of consecutive qualifying hours required
   * for a window to be reported. Maps to interval count via
   * `Math.max(1, Math.ceil(hours / 3))`. Examples:
   *   1 → 1 interval (3 hours, the minimum reportable)
   *   3 → 1 interval
   *   4 → 2 intervals (6 hours)
   *   9 → 3 intervals (9 hours exactly)
   *  10 → 4 intervals (12 hours; user wants at least 10, gets 12)
   *
   * When undefined, defaults to 1 interval (any single qualifying interval
   * is a window).
   */
  consecutiveHoursRequired?: number;

  /** WTH-136. Number of consecutive qualifying days required. */
  consecutiveDaysRequired?: number;

  /** WTH-137. Default `false`. Pre-rain windows are not surfaced unless on. */
  detectPreRain?: boolean;
  /** WTH-138. Default `false`. Post-rain windows are not surfaced unless on. */
  detectPostRain?: boolean;
}

/**
 * A user-defined or preset activity. Persisted via `src/storage/schema.ts`;
 * `criteria` is serialized to JSON in the `criteria_json` column.
 *
 * Requirements: WTH-100, WTH-101, WTH-110..WTH-114, WTH-120, WTH-143.
 */
export interface Activity {
  /** WTH-100. */
  id: string;
  /** WTH-120. Free text. */
  name: string;
  /** WTH-101. Disabled activities are excluded from evaluation (WTH-102). */
  enabled: boolean;
  /**
   * WTH-110, WTH-113. Emoji from the keyword auto-assignment table OR an
   * icon-library reference set by the user. Undefined means "no icon, use
   * the colored checkmark fallback" (WTH-111).
   */
  icon?: string;
  /** WTH-112. Hex string drawn from the 16-color palette. */
  color: string;
  /** WTH-143. Freeform notes. */
  notes?: string;
  criteria: ActivityCriteria;
}
