import type { Activity } from '@/activities/types';
import type { Forecast } from '@/weather/types';
import {
  type DisqualifyReason,
  isPrecipReason,
  qualifyInterval,
} from './qualify';
import type { Window } from './types';

/**
 * Detects qualifying windows for one activity over one forecast.
 *
 * PURE. No I/O. No `Date.now()`. The `now` argument is the only time
 * source; tests pass it explicitly. Given the same inputs, this function
 * returns the same output every time.
 *
 * Behavior summary (full rationale in JSDoc on the types and on GAP-003):
 *
 *   - The detector evaluates EVERY interval in `forecast.intervals`,
 *     including past intervals. This is "full-array" semantics: a past
 *     rainy interval still counts as the boundary that sets
 *     `followsRain: true` on the qualifying block after it (WTH-044, the
 *     "first qualifying block after conditions clear" — even when the
 *     clearing happened earlier today). Past windows are filtered from
 *     the OUTPUT at the end of the function.
 *
 *   - A window is "past" iff its `endsAt <= nowUnix`. A window that
 *     contains `now` (i.e., one of its intervals straddles `now`) is
 *     kept. Boundary cases: `nowUnix === window.startsAt` → kept;
 *     `nowUnix === window.endsAt` → filtered.
 *
 *   - A window is a maximal contiguous run of intervals that all return
 *     `{ ok: true }` from `qualifyInterval`. The minimum run length is
 *     `max(1, ceil(consecutiveHoursRequired / 3))` intervals, or 1 if
 *     the criterion is unset.
 *
 *   - Per the flag-based Window shape, each qualifying run is emitted
 *     EXACTLY ONCE per activity, with three boolean flags describing
 *     what comes immediately before and after:
 *
 *       precedesRain          — next interval is precip-disqualified
 *                               AND `criteria.detectPreRain === true`
 *       precedesDeterioration — next interval disqualifies for a
 *                               non-precip reason AND
 *                               `criteria.detectPreRain === true`
 *                               (mutually exclusive with precedesRain)
 *       followsRain           — previous interval was precip-disqualified
 *                               AND `criteria.detectPostRain === true`
 *
 *     A run at the end of the array (no following interval) has both
 *     pre-flags `false`. A run at the start (no preceding interval) has
 *     `followsRain: false`. See GAP-003 for the precipitation
 *     disqualification rules, encoded in `qualify.ts` via the
 *     `isPrecipReason` helper.
 *
 *   - The check order in `qualifyInterval` puts `time_of_day` first
 *     (GAP-001 + GAP-003 interaction). A nighttime interval that is also
 *     rainy reports as `time_of_day`-failed, so it does NOT set
 *     `precedesRain` on the preceding qualifying block — the activity
 *     wasn't going to run at night anyway.
 *
 * Multi-activity evaluation is the caller's job: iterate enabled
 * activities, call `detectWindows` for each, merge the resulting arrays.
 *
 * NOT IMPLEMENTED HERE: `consecutiveDaysRequired` (WTH-136). The
 * "consecutive days" semantics need a day-level qualifying view that the
 * caller composes from per-day windows; doing it here would conflate two
 * different aggregations. WTH-136 is detector-Built only when paired with
 * caller-side day aggregation. See traceability.md.
 *
 * Requirements: WTH-040, WTH-041, WTH-042 (caller responsibility),
 * WTH-043, WTH-044, WTH-045, WTH-135, WTH-137, WTH-138.
 */
export function detectWindows(
  forecast: Forecast,
  activity: Activity,
  now: Date,
): Window[] {
  // Disabled activities are excluded from evaluation by the caller
  // (WTH-102), but defending here keeps the function honest and lets
  // tests assert the empty result directly.
  if (!activity.enabled) return [];
  if (forecast.intervals.length === 0) return [];

  const nowUnix = Math.floor(now.getTime() / 1000);
  const intervals = forecast.intervals;

  // Evaluate every interval ONCE against the activity. Full-array
  // semantics: past intervals are evaluated so they can set followsRain
  // on a still-future qualifying run.
  const evaluations: Array<
    { ok: true } | { ok: false; reason: DisqualifyReason }
  > = intervals.map((iv) => qualifyInterval(iv, activity));

  // Minimum interval count for a window: ceil(hours / 3) with a floor of
  // 1. Examples (also documented on ActivityCriteria):
  //    1 → 1, 3 → 1, 4 → 2, 9 → 3, 10 → 4.
  const requestedHours = activity.criteria.consecutiveHoursRequired ?? 1;
  const minIntervals = Math.max(1, Math.ceil(requestedHours / 3));

  const detectPreRain = activity.criteria.detectPreRain === true;
  const detectPostRain = activity.criteria.detectPostRain === true;

  const windows: Window[] = [];

  // Find maximal qualifying runs by sweeping the evaluations array.
  // `runStart` is the index of the first qualifying interval in the
  // current run, or null if we're not in a run.
  let runStart: number | null = null;
  for (let i = 0; i <= intervals.length; i++) {
    // We iterate one past the end so the final run is closed off the
    // same way as runs in the middle. At i === intervals.length there is
    // no interval; isQualifying is implicitly false.
    const currentEval = i < intervals.length ? evaluations[i] : undefined;
    const isQualifying = currentEval !== undefined && currentEval.ok === true;

    if (isQualifying && runStart === null) {
      // Open a new run.
      runStart = i;
    } else if (!isQualifying && runStart !== null) {
      // Close the current run. runEnd is the last index that was qualifying.
      const runEnd = i - 1;
      const count = runEnd - runStart + 1;

      if (count >= minIntervals) {
        // `runStart` and `runEnd` are both in-bounds because we only
        // opened a run at an in-bounds qualifying index.
        const startInterval = intervals[runStart]!;
        const endInterval = intervals[runEnd]!;

        // Pre-flags: only meaningful if the run is followed by ANY
        // interval (currentEval is defined) AND detectPreRain is on.
        let precedesRain = false;
        let precedesDeterioration = false;
        if (detectPreRain && currentEval !== undefined) {
          // The next interval terminated the run, so it's disqualified
          // by construction. (`ok === true` would have extended the run.)
          if (currentEval.ok === false) {
            if (isPrecipReason(currentEval.reason)) {
              precedesRain = true;
            } else {
              precedesDeterioration = true;
            }
          }
        }

        // Follows-rain: only meaningful if there's a preceding interval
        // AND detectPostRain is on.
        let followsRain = false;
        if (detectPostRain && runStart > 0) {
          const prevEval = evaluations[runStart - 1];
          if (prevEval !== undefined && prevEval.ok === false && isPrecipReason(prevEval.reason)) {
            followsRain = true;
          }
        }

        windows.push({
          activityId: activity.id,
          startsAt: startInterval.startsAt,
          endsAt: endInterval.endsAt,
          intervalCount: count,
          precedesRain,
          precedesDeterioration,
          followsRain,
        });
      }

      runStart = null;
    }
  }

  // Filter past windows from the output. A window is past iff its
  // exclusive end is at or before `now`. Boundary: a window ending
  // exactly at `now` is past; a window whose first interval starts
  // exactly at `now` is current.
  return windows.filter((w) => w.endsAt > nowUnix);
}
