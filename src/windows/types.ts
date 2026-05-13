/**
 * Window detection result types. Defined in their own module so the
 * `Window` shape exists in exactly one place and tests, UI, and storage
 * all import the same symbol.
 *
 * Requirements covered: WTH-040..WTH-045 (detection); WTH-135..WTH-138
 * (the criteria that produce windows).
 *
 * SHAPE — A Window is a contiguous block of qualifying intervals for one
 * activity. Pre-rain / pre-deterioration / post-rain are NOT distinct
 * kinds of window; they are *facts about* a window, expressed as boolean
 * flags. A single forecast block produces exactly one `Window` per
 * activity that qualifies for it. The flags describe what comes
 * immediately before and after.
 *
 * Rationale: the underlying reality is "this block has properties," not
 * "this block is two different things." Flags keep test fixtures small,
 * make the multi-activity merge in the store trivial, and let the UI
 * style any combination of facts without re-deriving them.
 */

/**
 * A contiguous block of qualifying intervals for one activity.
 *
 * `startsAt` matches the first interval's `startsAt`; `endsAt` matches the
 * last interval's `endsAt`. A 3-interval window starting at 09:00 UTC has
 * `endsAt` of 18:00 UTC and `intervalCount` of 3.
 *
 * The three boundary flags are governed by GAP-003 (binding):
 *
 *   - "Immediately following / preceding interval" means the next /
 *     previous element in `forecast.intervals`, regardless of day-boundary
 *     crossings. A window at 9pm–midnight followed by a rainy midnight–3am
 *     interval has `precedesRain: true`.
 *
 *   - "Precipitation disqualification" means EITHER
 *       (a) `precipitationType !== 'none'` AND the activity's
 *           `precipTypePref` disallows that type, OR
 *       (b) `precipitationMm` exceeds the mm derived from the activity's
 *           `precipTolerance` (see `precip-tolerance.ts`).
 *     An activity that permits the observed precipitation type via
 *     `precipTypePref` is NOT precipitation-disqualified by that type,
 *     even if `precipitationType !== 'none'`.
 *
 *   - A window at the end of the forecast array has no following interval;
 *     `precedesRain` and `precedesDeterioration` are both `false`. The UI
 *     may separately hint at forecast truncation; that is not the
 *     detector's concern.
 *
 *   - A window at the start of the forecast array has no preceding
 *     interval; `followsRain` is `false`.
 *
 * Each flag is gated by its corresponding activity criterion:
 *
 *   - `precedesRain`, `precedesDeterioration` — only ever `true` when
 *     `criteria.detectPreRain === true`. Otherwise both are `false`,
 *     regardless of what the next interval looks like.
 *   - `followsRain` — only ever `true` when `criteria.detectPostRain === true`.
 *
 * The two pre-flags are mutually exclusive: a window may precede rain OR
 * precede non-precipitation deterioration, but not both — `precedesRain`
 * takes priority when the following interval disqualifies for multiple
 * reasons including precipitation.
 */
export interface Window {
  /** Source activity. Callers iterate per activity and merge. */
  activityId: string;
  /** Inclusive start, unix seconds, UTC. */
  startsAt: number;
  /** Exclusive end, unix seconds, UTC. */
  endsAt: number;
  /** Number of forecast intervals in the block. Always ≥ 1. */
  intervalCount: number;

  /**
   * WTH-043, GAP-003. The next interval is precipitation-disqualified.
   * Only ever `true` when `criteria.detectPreRain === true`.
   * Mutually exclusive with `precedesDeterioration`.
   */
  precedesRain: boolean;

  /**
   * GAP-003. The next interval disqualifies for a non-precipitation reason
   * (wind, temperature, dew point, visibility, etc.).
   * Only ever `true` when `criteria.detectPreRain === true`.
   * Mutually exclusive with `precedesRain`.
   */
  precedesDeterioration: boolean;

  /**
   * WTH-044, GAP-003. The preceding interval was precipitation-disqualified.
   * Only ever `true` when `criteria.detectPostRain === true`.
   */
  followsRain: boolean;
}
