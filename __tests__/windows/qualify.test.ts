import { describe, expect, it } from 'vitest';
import type { Activity, ActivityCriteria } from '@/activities/types';
import type { Interval } from '@/weather/types';
import { qualifyInterval, isPrecipReason } from '@/windows/qualify';

/**
 * Tests for `qualifyInterval` — the single-interval predicate that
 * underpins `detectWindows`. Every `DisqualifyReason` has at least one
 * positive test and one negative test. GAP-001 (polar / daytime via
 * midpoint) and GAP-003 (precip vs non-precip reasons) are exercised
 * here at the single-interval level; multi-interval semantics live in
 * `detect.test.ts`.
 *
 * Covers:
 *   - WTH-121 temperature
 *   - WTH-122 dew point
 *   - WTH-123 wind speed
 *   - WTH-124 precip volume (via precipToleranceMm)
 *   - WTH-125 time of day (GAP-001)
 *   - WTH-130 precip type
 *   - WTH-131 UV index
 *   - WTH-132 visibility
 *   - WTH-133 wind direction
 *   - WTH-134 cloud cover
 *   - GAP-001 polar day / polar night
 *   - GAP-003 isPrecipReason helper
 */

// --- Test helpers ----------------------------------------------------------

const HOUR = 3600;

/** A base interval: 9am UTC on 2026-05-13, mid-conditions, no precip. */
function baseInterval(overrides: Partial<Interval> = {}): Interval {
  const startsAt = 1747126800; // 2026-05-13T09:00:00Z
  return {
    startsAt,
    endsAt: startsAt + 3 * HOUR,
    temperatureC: 20,
    feelsLikeC: 20,
    dewPointC: 10,
    windSpeedKmh: 8,
    windDirectionDeg: 180, // south
    precipitationMm: 0,
    precipitationType: 'none',
    cloudCoverPct: 30,
    uvIndex: 4,
    visibilityKm: 20,
    conditionCode: 'partly_cloudy',
    sunriseUtc: startsAt - 2 * HOUR, // sunrise was 7am
    sunsetUtc: startsAt + 11 * HOUR, // sunset at 8pm
    isPolarNight: false,
    ...overrides,
  };
}

/** A baseline activity that qualifies for the base interval. */
function baseActivity(criteriaOverrides: Partial<ActivityCriteria> = {}): Activity {
  return {
    id: 'test-activity',
    name: 'Test',
    enabled: true,
    color: '#000000',
    criteria: {
      tempMinC: 10,
      tempMaxC: 30,
      dewPointMaxC: 18,
      windSpeedMaxKmh: 24,
      precipTolerance: 'clear_only',
      timeOfDay: 'any',
      ...criteriaOverrides,
    },
  };
}

// --- Sanity ----------------------------------------------------------------

describe('qualifyInterval — sanity', () => {
  it('returns ok:true when the baseline interval matches the baseline activity', () => {
    expect(qualifyInterval(baseInterval(), baseActivity())).toEqual({ ok: true });
  });
});

// --- Temperature (WTH-121) -------------------------------------------------

describe('qualifyInterval — temperature (WTH-121)', () => {
  it('disqualifies below tempMinC', () => {
    const iv = baseInterval({ temperatureC: 5 });
    expect(qualifyInterval(iv, baseActivity())).toEqual({
      ok: false,
      reason: 'temperature',
    });
  });

  it('disqualifies above tempMaxC', () => {
    const iv = baseInterval({ temperatureC: 35 });
    expect(qualifyInterval(iv, baseActivity())).toEqual({
      ok: false,
      reason: 'temperature',
    });
  });

  it('qualifies at exact tempMinC (inclusive)', () => {
    const iv = baseInterval({ temperatureC: 10 });
    expect(qualifyInterval(iv, baseActivity())).toEqual({ ok: true });
  });

  it('qualifies at exact tempMaxC (inclusive)', () => {
    const iv = baseInterval({ temperatureC: 30 });
    expect(qualifyInterval(iv, baseActivity())).toEqual({ ok: true });
  });
});

// --- Dew point (WTH-122) ---------------------------------------------------

describe('qualifyInterval — dew point (WTH-122)', () => {
  it('disqualifies above dewPointMaxC', () => {
    const iv = baseInterval({ dewPointC: 19 });
    expect(qualifyInterval(iv, baseActivity())).toEqual({
      ok: false,
      reason: 'dew_point',
    });
  });

  it('qualifies at exact dewPointMaxC (inclusive)', () => {
    const iv = baseInterval({ dewPointC: 18 });
    expect(qualifyInterval(iv, baseActivity())).toEqual({ ok: true });
  });
});

// --- Wind speed (WTH-123) --------------------------------------------------

describe('qualifyInterval — wind speed (WTH-123)', () => {
  it('disqualifies above windSpeedMaxKmh', () => {
    const iv = baseInterval({ windSpeedKmh: 25 });
    expect(qualifyInterval(iv, baseActivity())).toEqual({
      ok: false,
      reason: 'wind_speed',
    });
  });

  it('qualifies at exact windSpeedMaxKmh (inclusive)', () => {
    const iv = baseInterval({ windSpeedKmh: 24 });
    expect(qualifyInterval(iv, baseActivity())).toEqual({ ok: true });
  });
});

// --- Wind direction (WTH-133) ----------------------------------------------

describe('qualifyInterval — wind direction (WTH-133)', () => {
  it('disqualifies when direction outside the arc', () => {
    const iv = baseInterval({ windDirectionDeg: 90 }); // east
    const act = baseActivity({ windDirectionPref: { fromDeg: 180, toDeg: 270 } });
    expect(qualifyInterval(iv, act)).toEqual({
      ok: false,
      reason: 'wind_direction',
    });
  });

  it('qualifies when direction inside a normal arc (inclusive endpoints)', () => {
    const act = baseActivity({ windDirectionPref: { fromDeg: 180, toDeg: 270 } });
    expect(qualifyInterval(baseInterval({ windDirectionDeg: 180 }), act)).toEqual({ ok: true });
    expect(qualifyInterval(baseInterval({ windDirectionDeg: 270 }), act)).toEqual({ ok: true });
    expect(qualifyInterval(baseInterval({ windDirectionDeg: 225 }), act)).toEqual({ ok: true });
  });

  it('supports wrap-around arcs (north-ish, 350 to 20)', () => {
    const act = baseActivity({ windDirectionPref: { fromDeg: 350, toDeg: 20 } });
    expect(qualifyInterval(baseInterval({ windDirectionDeg: 0 }), act)).toEqual({ ok: true });
    expect(qualifyInterval(baseInterval({ windDirectionDeg: 359 }), act)).toEqual({ ok: true });
    expect(qualifyInterval(baseInterval({ windDirectionDeg: 20 }), act)).toEqual({ ok: true });
    expect(qualifyInterval(baseInterval({ windDirectionDeg: 350 }), act)).toEqual({ ok: true });
    expect(qualifyInterval(baseInterval({ windDirectionDeg: 90 }), act)).toEqual({
      ok: false,
      reason: 'wind_direction',
    });
    expect(qualifyInterval(baseInterval({ windDirectionDeg: 180 }), act)).toEqual({
      ok: false,
      reason: 'wind_direction',
    });
  });

  it('does not enforce direction when no preference is set', () => {
    const iv = baseInterval({ windDirectionDeg: 999 }); // nonsense, but no pref
    const act = baseActivity();
    expect(qualifyInterval(iv, act)).toEqual({ ok: true });
  });
});

// --- Precip type (WTH-130) -------------------------------------------------

describe('qualifyInterval — precip type (WTH-130)', () => {
  it('defaults to `any` when pref is undefined (any type within tolerance OK)', () => {
    const iv = baseInterval({ precipitationType: 'rain', precipitationMm: 0 });
    const act = baseActivity({ precipTolerance: 'any' });
    expect(qualifyInterval(iv, act)).toEqual({ ok: true });
  });

  it('rain_only permits none and rain, rejects snow/sleet/freezing_rain', () => {
    const act = baseActivity({
      precipTypePref: 'rain_only',
      precipTolerance: 'any',
    });
    expect(
      qualifyInterval(baseInterval({ precipitationType: 'none' }), act),
    ).toEqual({ ok: true });
    expect(
      qualifyInterval(baseInterval({ precipitationType: 'rain' }), act),
    ).toEqual({ ok: true });
    expect(
      qualifyInterval(baseInterval({ precipitationType: 'snow' }), act),
    ).toEqual({ ok: false, reason: 'precip_type' });
    expect(
      qualifyInterval(baseInterval({ precipitationType: 'sleet' }), act),
    ).toEqual({ ok: false, reason: 'precip_type' });
    expect(
      qualifyInterval(baseInterval({ precipitationType: 'freezing_rain' }), act),
    ).toEqual({ ok: false, reason: 'precip_type' });
  });

  it('snow_only permits none and snow, rejects rain/sleet/freezing_rain', () => {
    const act = baseActivity({
      precipTypePref: 'snow_only',
      precipTolerance: 'any',
    });
    expect(
      qualifyInterval(baseInterval({ precipitationType: 'snow' }), act),
    ).toEqual({ ok: true });
    expect(
      qualifyInterval(baseInterval({ precipitationType: 'rain' }), act),
    ).toEqual({ ok: false, reason: 'precip_type' });
  });

  it('none rejects any non-none precipitation type', () => {
    const act = baseActivity({ precipTypePref: 'none', precipTolerance: 'any' });
    expect(
      qualifyInterval(baseInterval({ precipitationType: 'rain' }), act),
    ).toEqual({ ok: false, reason: 'precip_type' });
    expect(
      qualifyInterval(baseInterval({ precipitationType: 'none' }), act),
    ).toEqual({ ok: true });
  });
});

// --- Precip volume (WTH-124) -----------------------------------------------

describe('qualifyInterval — precip volume (WTH-124)', () => {
  it('clear_only rejects any precipitation', () => {
    const act = baseActivity({ precipTolerance: 'clear_only' });
    expect(
      qualifyInterval(
        baseInterval({ precipitationMm: 0.01, precipitationType: 'rain' }),
        act,
      ),
    ).toEqual({ ok: false, reason: 'precip_volume' });
  });

  it('light_drizzle permits up to 0.5mm', () => {
    const act = baseActivity({ precipTolerance: 'light_drizzle' });
    expect(
      qualifyInterval(
        baseInterval({ precipitationMm: 0.5, precipitationType: 'rain' }),
        act,
      ),
    ).toEqual({ ok: true });
    expect(
      qualifyInterval(
        baseInterval({ precipitationMm: 0.6, precipitationType: 'rain' }),
        act,
      ),
    ).toEqual({ ok: false, reason: 'precip_volume' });
  });

  it('any permits unbounded precipitation', () => {
    const act = baseActivity({ precipTolerance: 'any' });
    expect(
      qualifyInterval(
        baseInterval({ precipitationMm: 999, precipitationType: 'rain' }),
        act,
      ),
    ).toEqual({ ok: true });
  });
});

// --- UV index (WTH-131) ----------------------------------------------------

describe('qualifyInterval — UV index (WTH-131)', () => {
  it('disqualifies below uvIndexMin', () => {
    const act = baseActivity({ uvIndexMin: 5 });
    expect(qualifyInterval(baseInterval({ uvIndex: 3 }), act)).toEqual({
      ok: false,
      reason: 'uv_index',
    });
  });

  it('disqualifies above uvIndexMax', () => {
    const act = baseActivity({ uvIndexMax: 5 });
    expect(qualifyInterval(baseInterval({ uvIndex: 8 }), act)).toEqual({
      ok: false,
      reason: 'uv_index',
    });
  });

  it('does not enforce when neither bound is set', () => {
    const iv = baseInterval({ uvIndex: 11 });
    expect(qualifyInterval(iv, baseActivity())).toEqual({ ok: true });
  });
});

// --- Visibility (WTH-132) --------------------------------------------------

describe('qualifyInterval — visibility (WTH-132)', () => {
  it('disqualifies below visibilityMinKm', () => {
    const act = baseActivity({ visibilityMinKm: 10 });
    expect(qualifyInterval(baseInterval({ visibilityKm: 5 }), act)).toEqual({
      ok: false,
      reason: 'visibility',
    });
  });

  it('qualifies at exact visibilityMinKm (inclusive)', () => {
    const act = baseActivity({ visibilityMinKm: 10 });
    expect(qualifyInterval(baseInterval({ visibilityKm: 10 }), act)).toEqual({ ok: true });
  });
});

// --- Cloud cover (WTH-134) -------------------------------------------------

describe('qualifyInterval — cloud cover (WTH-134)', () => {
  it('disqualifies above cloudCoverMaxPct', () => {
    const act = baseActivity({ cloudCoverMaxPct: 50 });
    expect(qualifyInterval(baseInterval({ cloudCoverPct: 80 }), act)).toEqual({
      ok: false,
      reason: 'cloud_cover',
    });
  });

  it('qualifies at exact cloudCoverMaxPct (inclusive)', () => {
    const act = baseActivity({ cloudCoverMaxPct: 50 });
    expect(qualifyInterval(baseInterval({ cloudCoverPct: 50 }), act)).toEqual({ ok: true });
  });
});

// --- Time of day (WTH-125, GAP-001) ----------------------------------------

describe('qualifyInterval — time of day (WTH-125, GAP-001)', () => {
  // Build a day where sunrise is at 12:00 UTC and sunset is at 24:00 UTC.
  // Intervals at 09:00 (midpoint 10:30 — before sunrise) and 21:00 (midpoint 22:30 — after sunrise, before sunset).
  const dayStart = 1747094400; // 2026-05-13T00:00:00Z
  const sunriseUtc = dayStart + 12 * HOUR; // 12:00 UTC
  const sunsetUtc = dayStart + 24 * HOUR; // 24:00 UTC (i.e., next midnight)

  function morningIv(overrides: Partial<Interval> = {}): Interval {
    // 09:00–12:00 UTC, midpoint 10:30 — before sunrise
    return baseInterval({
      startsAt: dayStart + 9 * HOUR,
      endsAt: dayStart + 12 * HOUR,
      sunriseUtc,
      sunsetUtc,
      isPolarNight: false,
      ...overrides,
    });
  }

  function afternoonIv(overrides: Partial<Interval> = {}): Interval {
    // 21:00–24:00 UTC, midpoint 22:30 — after sunrise, before sunset
    return baseInterval({
      startsAt: dayStart + 21 * HOUR,
      endsAt: dayStart + 24 * HOUR,
      sunriseUtc,
      sunsetUtc,
      isPolarNight: false,
      ...overrides,
    });
  }

  it('daytime-only disqualifies an interval whose midpoint is before sunrise', () => {
    const act = baseActivity({ timeOfDay: 'daytime' });
    expect(qualifyInterval(morningIv(), act)).toEqual({
      ok: false,
      reason: 'time_of_day',
    });
  });

  it('daytime-only qualifies an interval whose midpoint is after sunrise', () => {
    const act = baseActivity({ timeOfDay: 'daytime' });
    expect(qualifyInterval(afternoonIv(), act)).toEqual({ ok: true });
  });

  it('nighttime-only is the inverse of daytime-only', () => {
    const act = baseActivity({ timeOfDay: 'nighttime' });
    expect(qualifyInterval(morningIv(), act)).toEqual({ ok: true });
    expect(qualifyInterval(afternoonIv(), act)).toEqual({
      ok: false,
      reason: 'time_of_day',
    });
  });

  it("`any` time-of-day doesn't enforce", () => {
    const act = baseActivity({ timeOfDay: 'any' });
    expect(qualifyInterval(morningIv(), act)).toEqual({ ok: true });
    expect(qualifyInterval(afternoonIv(), act)).toEqual({ ok: true });
  });

  it('boundary: midpoint exactly at sunrise counts as daytime', () => {
    // Interval midpoint == sunrise. midpoint = (startsAt + endsAt)/2.
    // If sunrise is 12:00 and we want midpoint = 12:00, interval runs 10:30–13:30.
    const iv = baseInterval({
      startsAt: sunriseUtc - 1.5 * HOUR,
      endsAt: sunriseUtc + 1.5 * HOUR,
      sunriseUtc,
      sunsetUtc,
      isPolarNight: false,
    });
    const day = baseActivity({ timeOfDay: 'daytime' });
    expect(qualifyInterval(iv, day)).toEqual({ ok: true });
  });

  it('boundary: midpoint exactly at sunset counts as nighttime', () => {
    const iv = baseInterval({
      startsAt: sunsetUtc - 1.5 * HOUR,
      endsAt: sunsetUtc + 1.5 * HOUR,
      sunriseUtc,
      sunsetUtc,
      isPolarNight: false,
    });
    const day = baseActivity({ timeOfDay: 'daytime' });
    expect(qualifyInterval(iv, day)).toEqual({
      ok: false,
      reason: 'time_of_day',
    });
  });
});

// --- Polar day / polar night (GAP-001) -------------------------------------

describe('qualifyInterval — polar day / polar night (GAP-001)', () => {
  function polarIv(isPolarNight: boolean): Interval {
    return baseInterval({
      sunriseUtc: null,
      sunsetUtc: null,
      isPolarNight,
    });
  }

  it('polar day + daytime-only → qualifies (it never gets dark)', () => {
    const act = baseActivity({ timeOfDay: 'daytime' });
    expect(qualifyInterval(polarIv(false), act)).toEqual({ ok: true });
  });

  it('polar day + nighttime-only → does not qualify', () => {
    const act = baseActivity({ timeOfDay: 'nighttime' });
    expect(qualifyInterval(polarIv(false), act)).toEqual({
      ok: false,
      reason: 'time_of_day',
    });
  });

  it('polar night + nighttime-only → qualifies', () => {
    const act = baseActivity({ timeOfDay: 'nighttime' });
    expect(qualifyInterval(polarIv(true), act)).toEqual({ ok: true });
  });

  it('polar night + daytime-only → does not qualify', () => {
    const act = baseActivity({ timeOfDay: 'daytime' });
    expect(qualifyInterval(polarIv(true), act)).toEqual({
      ok: false,
      reason: 'time_of_day',
    });
  });

  it('polar cases + `any` time-of-day → qualifies regardless', () => {
    const act = baseActivity({ timeOfDay: 'any' });
    expect(qualifyInterval(polarIv(false), act)).toEqual({ ok: true });
    expect(qualifyInterval(polarIv(true), act)).toEqual({ ok: true });
  });
});

// --- Check ordering (GAP-003 critical) -------------------------------------

describe('qualifyInterval — check ordering (GAP-003)', () => {
  it('time_of_day is reported before precipitation when both fail', () => {
    // Nighttime interval that is also rainy. The activity is daytime-only
    // and rejects rain. Per GAP-003 interpretation, we want time_of_day
    // reported so the preceding qualifying block is NOT flagged pre-rain
    // (the activity wouldn't run at night anyway).
    const nightRain = baseInterval({
      sunriseUtc: 1747094400 + 12 * HOUR, // sunrise noon
      sunsetUtc: 1747094400 + 24 * HOUR,  // sunset midnight
      startsAt: 1747094400 + 3 * HOUR,    // 03:00 UTC
      endsAt: 1747094400 + 6 * HOUR,      // midpoint 04:30 — before sunrise
      precipitationType: 'rain',
      precipitationMm: 10,
    });
    const act = baseActivity({
      timeOfDay: 'daytime',
      precipTolerance: 'clear_only',
    });
    expect(qualifyInterval(nightRain, act)).toEqual({
      ok: false,
      reason: 'time_of_day',
    });
  });

  it('precip_type reported before precip_volume when both fail', () => {
    // Snow in low volume against a rain_only activity with clear_only tolerance.
    // Volume IS over tolerance (clear_only = 0mm), AND type is wrong. We want
    // precip_type to report first because that's the cleaner classification
    // and it still counts as a precipitation boundary for GAP-003.
    const snowIv = baseInterval({
      precipitationType: 'snow',
      precipitationMm: 1.0,
    });
    const act = baseActivity({
      precipTypePref: 'rain_only',
      precipTolerance: 'clear_only',
    });
    expect(qualifyInterval(snowIv, act)).toEqual({
      ok: false,
      reason: 'precip_type',
    });
  });
});

// --- isPrecipReason helper -------------------------------------------------

describe('isPrecipReason', () => {
  it('returns true for precip_type and precip_volume', () => {
    expect(isPrecipReason('precip_type')).toBe(true);
    expect(isPrecipReason('precip_volume')).toBe(true);
  });

  it('returns false for every non-precip reason', () => {
    const nonPrecip = [
      'time_of_day',
      'temperature',
      'dew_point',
      'wind_speed',
      'wind_direction',
      'uv_index',
      'visibility',
      'cloud_cover',
    ] as const;
    for (const r of nonPrecip) {
      expect(isPrecipReason(r)).toBe(false);
    }
  });
});
