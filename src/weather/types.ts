/**
 * Canonical weather data types consumed by the window detector and the rest
 * of the app. The Weather Service normalizes provider responses (Open-Meteo,
 * Tomorrow.io) into these shapes; nothing downstream knows which provider
 * data came from.
 *
 * UNITS — All numbers are metric. The detector compares interval numbers
 * against activity criteria numbers and both sides MUST agree on units.
 * Imperial conversion is a UI concern, performed via the user's `units`
 * preference. The storage layer never sees Fahrenheit / mph / inches.
 *
 * Requirements covered: WTH-001, WTH-010..WTH-020, WTH-019 (GAP-008).
 */

/**
 * Unified condition vocabulary. Per GAP-008, this enum is the single
 * internal representation; per-provider mapping tables live in
 * `src/weather/condition-mapping.ts`. The user-facing strings live in
 * `src/i18n/conditions.ts` and are English-only for P1.
 */
export type ConditionCode =
  | 'clear'
  | 'partly_cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'light_rain'
  | 'moderate_rain'
  | 'heavy_rain'
  | 'light_snow'
  | 'moderate_snow'
  | 'heavy_snow'
  | 'sleet'
  | 'freezing_rain'
  | 'thunderstorm';

/**
 * Precipitation type at the interval level. `'none'` means no precipitation
 * during the interval. This is orthogonal to `ConditionCode` (which is the
 * dominant weather description) — a `partly_cloudy` interval may still have
 * `precipitationType: 'none'`.
 *
 * Requirements: WTH-015, WTH-130.
 */
export type PrecipType = 'none' | 'rain' | 'snow' | 'sleet' | 'freezing_rain';

/**
 * One 3-hour forecast bucket. WTH-001 fixes the resolution. Intervals in a
 * `Forecast` are chronological with no gaps; `endsAt` of interval N equals
 * `startsAt` of interval N+1.
 *
 * Each interval carries the sunrise/sunset of the local-calendar day its
 * midpoint falls in (per the city's timezone). This is denormalized into
 * the interval by the Weather Service so the detector can do pure UTC
 * arithmetic without timezone awareness. See `sunriseUtc` / `sunsetUtc`
 * below for the polar-day / polar-night encoding.
 */
export interface Interval {
  /** Inclusive start, unix seconds, UTC. */
  startsAt: number;
  /** Exclusive end, unix seconds, UTC. Always `startsAt + 3 * 3600`. */
  endsAt: number;

  /** WTH-010. Stored in °C; UI converts via prefs. */
  temperatureC: number;
  /** WTH-011. */
  feelsLikeC: number;
  /** WTH-012. Note: dew point, NOT relative humidity. */
  dewPointC: number;
  /** WTH-013. km/h. */
  windSpeedKmh: number;
  /** WTH-013. Degrees from north, 0–359 (0 = wind from the north). */
  windDirectionDeg: number;
  /** WTH-014. Millimeters of precipitation falling across this 3h bucket. */
  precipitationMm: number;
  /** WTH-015. */
  precipitationType: PrecipType;
  /** WTH-016. 0–100. */
  cloudCoverPct: number;
  /** WTH-017. Standard 0–11+ scale. */
  uvIndex: number;
  /** WTH-018. Kilometers. */
  visibilityKm: number;
  /** WTH-019, GAP-008. The friendly label comes from `src/i18n/conditions.ts`. */
  conditionCode: ConditionCode;

  /**
   * Sunrise (UTC seconds) for the local-calendar day this interval's
   * midpoint falls in. `null` indicates polar day or polar night for that
   * day — i.e., no sunrise/sunset event occurred. Use `isPolarNight` to
   * disambiguate the two cases.
   *
   * The normalization layer determines polarity once per local-calendar
   * day and writes the corresponding (sunriseUtc, sunsetUtc, isPolarNight)
   * triple into every interval that day. See GAP-001 resolution; see
   * fixtures `polar-day.json` and `polar-night.json`.
   */
  sunriseUtc: number | null;
  /** See `sunriseUtc`. */
  sunsetUtc: number | null;
  /**
   * Disambiguates the `sunriseUtc: null, sunsetUtc: null` encoding.
   *
   *   - Normal day:  sunriseUtc != null, sunsetUtc != null, isPolarNight=false
   *   - Polar day:   sunriseUtc == null, sunsetUtc == null, isPolarNight=false
   *   - Polar night: sunriseUtc == null, sunsetUtc == null, isPolarNight=true
   *
   * For daytime-only activities (WTH-125, GAP-001): polar day → qualifies;
   * polar night → does not qualify. Inverse for nighttime-only.
   */
  isPolarNight: boolean;
}

/**
 * Per-day summary, used for UI day headers (WTH-005) and as a source of
 * truth for polar-day / polar-night disambiguation that intervals can't
 * express on their own.
 */
export interface DaySummary {
  /** `YYYY-MM-DD` in the city's local timezone. */
  date: string;
  /** WTH-020. `null` for polar day or polar night — see `isPolarNight`. */
  sunriseUtc: number | null;
  /** WTH-020. `null` for polar day or polar night — see `isPolarNight`. */
  sunsetUtc: number | null;
  /**
   * `true` if this local-calendar day has no daylight (polar night).
   * `false` if it has no darkness (polar day) OR has a normal sunrise and
   * sunset. Consumers disambiguate polar day vs. normal day by checking
   * whether `sunriseUtc` and `sunsetUtc` are both non-null.
   *
   * Encoding summary:
   *   - Normal day:  sunriseUtc != null, sunsetUtc != null, isPolarNight=false
   *   - Polar day:   sunriseUtc == null, sunsetUtc == null, isPolarNight=false
   *   - Polar night: sunriseUtc == null, sunsetUtc == null, isPolarNight=true
   */
  isPolarNight: boolean;
  highC: number;
  lowC: number;
  conditionCode: ConditionCode;
}

/**
 * A complete forecast for one city. Produced by the Weather Service.
 * Consumed by `detectWindows` (pure) and by the UI layer.
 */
export interface Forecast {
  /** Matches `cities.id` in the storage layer. */
  cityId: string;
  /** IANA timezone, e.g. `America/Chicago`. Set by the Weather Service. */
  timezone: string;
  /** Unix seconds when this forecast was fetched. */
  fetchedAt: number;
  /**
   * Chronological, 3-hour-spaced, no gaps. The Weather Service guarantees
   * this; downstream code may rely on it without re-checking.
   */
  intervals: Interval[];
  /** One entry per local-calendar day covered by `intervals`. */
  days: DaySummary[];
}
