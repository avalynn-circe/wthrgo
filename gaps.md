# wthrgo — Gap Analysis & Resolutions

Ambiguities in `requirements.md` resolved here. Once resolved, decisions are binding — the AI shall treat them as part of the spec.

**Format**: each gap has an ID, a description, a severity, the resolution, and the date decided. Open gaps block any requirement that references them.

**Severity**
- **Blocking**: cannot build the dependent requirement without resolution
- **Major**: build can proceed with a working assumption, but rework is likely if the assumption is wrong
- **Minor**: cosmetic or low-cost reversal

---

## GAP-001 — "Daytime only" definition

**Affects**: WTH-125
**Severity**: Blocking
**Question**: When an activity specifies "daytime only," what defines daytime?

**Options considered**
- Fixed clock hours (e.g., 6 AM – 8 PM)
- Sunrise to sunset for the relevant day at the relevant city
- Sunrise + offset to sunset – offset (civil twilight buffer)

**Resolution**: Sunrise to sunset for the relevant day at the relevant city. Open-Meteo returns these values in the daily forecast; the window detector shall use them per-day, not a fixed clock.

**Status**: Resolved
**Date**: 2026-05-13

---

## GAP-002 — Ad network selection and contextual targeting mechanism

**Affects**: WTH-500 through WTH-505
**Severity**: Major
**Question**: The spec describes contextual, activity-aware, condition-aware advertising as a P1 feature. Standard ad networks (AdMob, AppLovin) serve generic display ads with limited contextual signal. True activity- and condition-aware targeting requires either direct partner integrations or a custom ad server.

**Options considered**
- Ship P1 with generic AdMob; defer contextual targeting to P2
- Build a thin proxy layer in P1 that selects ad categories based on activity/conditions, then requests from AdMob with those categories
- Defer all ads to P2; premium tier free in P1

**Resolution**: Ship P1 with AdMob and the thin proxy layer. The proxy takes (active activities, current conditions, current event status) and selects an AdMob ad unit / category targeting. The "moment recognition" features (WTH-504) ship in P2 — flagged in `requirements.md` as priority 4 in P1 to reflect this.

WTH-501 through WTH-503 ship in P1 using the proxy.
WTH-504 (recurrence-aware) and WTH-505 (location-aware) flagged P1 priority 4 — implement only if proxy supports cleanly; otherwise carry to P2.

**Status**: Resolved
**Date**: 2026-05-13

---

## GAP-003 — Definition of "deteriorating conditions" for pre-rain windows

**Affects**: WTH-043, WTH-044
**Severity**: Blocking
**Question**: A pre-rain window is the last qualifying block before conditions deteriorate. What event triggers "deteriorate"?

**Options considered**
- Any precipitation > 0 mm
- Precipitation exceeding the activity's precipitation tolerance (WTH-124)
- Any single parameter exceeding the activity's bounds
- Probability-of-precipitation crossing a threshold

**Resolution**: A pre-rain window ends at the first interval where the activity becomes non-qualifying for any reason (precipitation, wind, temperature, etc.). The window is "pre-rain" only if the disqualifying parameter at the boundary is precipitation type ≠ "none" or precipitation > activity's tolerance. If the activity disqualifies for a non-precipitation reason, the window is still surfaced but labeled "pre-deterioration," not "pre-rain."

Post-rain windows mirror this: the first qualifying interval after a precipitation-driven disqualification.

**Status**: Resolved
**Date**: 2026-05-13

---

## GAP-004 — Local storage technology choice

**Affects**: WTH-600, WTH-602
**Severity**: Major
**Question**: Local storage for activities, events, preferences. AsyncStorage (key-value, simple), SQLite via `expo-sqlite` (relational, queryable), or MMKV (fast key-value)?

**Resolution**: `expo-sqlite` for activities, events, and history. AsyncStorage only for primitive preferences (units, digest time, notification toggles). Rationale: window detection over event history (WTH-504) and the activity-event relationship benefit from relational queries; sync (WTH-603) is easier from a structured schema. Schema and versioning approach defined in `architecture.md`.

**Status**: Resolved
**Date**: 2026-05-13

---

## GAP-005 — What makes an event "canceled" vs "at risk"

**Affects**: WTH-206, WTH-503
**Severity**: Major
**Question**: The spec distinguishes "at risk" from "canceled" but never defines the threshold between them.

**Resolution**: Three-state model:
- **On track**: every interval within the event's time range qualifies for the bound activity
- **At risk**: one or more intervals fail to qualify, but more than 50% of intervals still qualify
- **Canceled**: more than 50% of intervals fail to qualify, OR the bound activity's `consecutive hours required` (WTH-135) can no longer be met within the event's time range

Status is recomputed every time the forecast updates for the event's city. State transitions trigger notifications (WTH-204, WTH-205).

**Status**: Resolved
**Date**: 2026-05-13

---

## GAP-006 — Activity history retention

**Affects**: WTH-504
**Severity**: Minor
**Question**: Recurrence-aware ads require historical activity records. How long is history retained?

**Resolution**: Indefinite while the user is on-device (P1). On account creation in P2, history syncs to cloud and is retained per the privacy policy. No history retained server-side in P1 (per WTH-904).

**Status**: Resolved
**Date**: 2026-05-13

---

## GAP-007 — Window-closing notification timing on iOS

**Affects**: WTH-405
**Severity**: Major
**Question**: iOS does not guarantee timely background execution. A "notify me 30 minutes before window closes" feature requires either:
- Scheduled local notifications computed at forecast refresh
- Background fetch (unreliable, throttled)
- Push notifications from a server (requires backend, contradicts P1 no-account scope)

**Resolution**: Scheduled local notifications. At every forecast refresh (foreground app launch and via `expo-background-fetch` opportunistically), compute the closing times of all active windows for the next 24 hours and schedule local notifications at `close_time - lead_time`. If the forecast changes, reschedule.

This is a known limitation worth surfacing in a spike (see `spikes.md` SPIKE-001) — we may discover the reliability is unacceptable and need to deprioritize this requirement.

**Status**: Resolved (with spike validation)
**Date**: 2026-05-13

---

## GAP-008 — Friendly condition description mapping

**Affects**: WTH-019
**Severity**: Minor
**Question**: Open-Meteo returns WMO weather codes (0–99); Tomorrow.io returns its own integer codes. Both must map to a unified friendly vocabulary.

**Resolution**: A single internal `ConditionCode` enum (`clear`, `partly_cloudy`, `cloudy`, `fog`, `drizzle`, `light_rain`, `moderate_rain`, `heavy_rain`, `light_snow`, `moderate_snow`, `heavy_snow`, `sleet`, `freezing_rain`, `thunderstorm`). Per-provider mapping tables live in `src/weather/condition-mapping.ts`. Friendly user-facing strings live in `src/i18n/conditions.ts` (English only for P1).

**Status**: Resolved
**Date**: 2026-05-13

---

## GAP-009 — Default values for activity creation

**Affects**: WTH-120 through WTH-138
**Severity**: Minor
**Question**: When a user creates an activity from scratch, what defaults do fields get?

**Resolution**: Sensible defaults per field:
- Temperature range: 50°F – 80°F (10°C – 27°C)
- Dew point max: 65°F (18°C)
- Wind speed max: 15 mph (24 km/h)
- Precipitation tolerance: "clear skies only"
- Time of day: any
- All advanced criteria: unset / no constraint

Presets (WTH-140) override these per-preset.

**Status**: Resolved
**Date**: 2026-05-13

---

## GAP-010 — Calendar integration scope

**Affects**: WTH-208
**Severity**: Minor (P2 deliverable, but architectural implications now)
**Question**: Read-only (wthrgo reads events from device calendar to suggest activities) or two-way (wthrgo events appear in device calendar)?

**Resolution**: Two-way. Decided now because event data model needs to carry external calendar IDs from P1 to avoid a P2 schema migration. Schema in `architecture.md` includes a nullable `external_calendar_id` on events.

**Status**: Resolved
**Date**: 2026-05-13

---

## Open Gaps

None. All gaps blocking P1 are resolved. Reopen any gap by changing its Status to Open and resetting the Date.
