# wthrgo — Spikes

Time-boxed investigations whose outcomes may change scope or design. Each spike has a question, a time box, success criteria, and a status. Resolved spikes carry their findings here permanently — they are the audit trail for "why did we decide X."

---

## SPIKE-001 — iOS background notification reliability

**Question**: Can `expo-notifications` scheduled local notifications fire reliably at `window_close - lead_time` for windows up to 24 hours in the future, given iOS background execution limits?

**Why**: WTH-405 (window-closing notification with user-defined lead time) depends on this. GAP-007 resolved the design (scheduled local notifications, reschedule on every forecast refresh), but the resolution assumes reliable delivery. If iOS throttles or skips notifications more than ~10% of the time, the feature is unshippable as specified.

**Time box**: 1 day

**Success criteria**:
- Confirm whether scheduled local notifications fire within ±2 minutes of their scheduled time across:
  - App backgrounded
  - App force-killed by user
  - Device in Low Power Mode
  - Device with battery < 20%
- Confirm whether `expo-background-fetch` actually wakes for forecast refresh more than once per 24 hours in practice

**Decision this informs**: Whether WTH-405 ships in P1, ships with a caveat (e.g., "lead time may be delayed if device is in Low Power Mode"), or moves to P2 with a backend push.

**Status**: Open

**Findings**: _to be filled in_

---

## SPIKE-002 — AdMob contextual targeting realistic capability

**Question**: How granular can AdMob's contextual targeting actually be? Can we meaningfully target ads based on (active activities, current weather conditions, event status) using AdMob's available signals?

**Why**: GAP-002 resolved to ship a "thin proxy layer" in P1 that selects ad units based on context, then requests from AdMob. The proxy is only useful if AdMob can act on the signals we pass it. If the practical targeting is no better than generic display, the proxy is theater and we should either build a real ad backend (out of scope for P1) or ship generic ads in P1.

**Time box**: 0.5 days

**Success criteria**:
- Document what targeting parameters AdMob accepts at request time
- Identify which of our context signals (activity category, weather condition, event status, season) can be expressed in AdMob's parameters
- Concrete test: produce two ad requests for the same user — one "golf, sunny, on-track event" and one "indoor activities, rainy, canceled event" — and verify they return materially different ad inventory

**Decision this informs**: Whether WTH-501 / WTH-502 ship with meaningful contextual targeting in P1 or as generic display ads.

**Status**: Open

**Findings**: _to be filled in_

---

## SPIKE-003 — Open-Meteo data point completeness

**Question**: Does Open-Meteo actually return every data point in WTH-010 through WTH-020 at 3-hour resolution? Specifically: dew point, feels-like, UV index, visibility, precipitation type breakdown (rain vs snow vs sleet vs freezing rain).

**Why**: The functional spec assumes all data points are uniformly available. If Open-Meteo returns some only at hourly or daily resolution, the 3-hour interval view becomes lossy or requires aggregation logic. Tomorrow.io is the fallback, so the same question applies there.

**Time box**: 2 hours

**Success criteria**:
- Concrete API responses captured for both providers for a sample city
- Map each WTH-010 through WTH-020 data point to the field name and resolution returned
- Identify any data points that require derivation (e.g., compute feels-like from temperature + wind + humidity if not returned directly)
- Identify any data points missing entirely from one or both providers

**Decision this informs**: Final shape of the normalized `Forecast` type in `src/weather/types.ts`, and whether any WTH-NNN data point needs to be deprioritized.

**Status**: Open

**Findings**: _to be filled in_

---

## Workflow

When a spike is started:
- Move Status to `In Progress`, note start date
- Branch named `spike/SPIKE-NNN-short-name`
- Spike code is exploratory — does not need to meet Definition of Done
- Findings written here as bullet points with concrete evidence (response payloads, screenshots, measurements)
- Branch may be discarded after findings are recorded

When a spike completes:
- Status moves to `Resolved` with date
- Findings section filled with the answer and the decision it produced
- Any new `GAP-NNN` entries created in `gaps.md` for follow-on decisions
- Any affected `WTH-NNN` requirements updated in `requirements.md` or noted in `traceability.md`

Do not let spikes turn into production work. If a spike's branch contains code worth keeping, port the cleaned-up version through the normal Build flow (with tests, lint, traceability).
