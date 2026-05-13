# wthrgo — Architecture

One page. Stack, major components, data flow, and the cross-cutting concerns the AI needs to know to make consistent choices.

---

## Stack

- **App**: React Native + Expo (SDK 51+), via EAS Build (required — see Notes on Native Modules below)
- **Language**: TypeScript, strict mode
- **State**: Zustand (lightweight, no boilerplate, works well with React Native)
- **Local storage (structured)**: SQLite via `expo-sqlite`, wrapped by **Drizzle ORM** for typed queries and migrations
- **Local storage (preferences)**: **MMKV** (`react-native-mmkv`) for primitive preferences and lightweight state
- **Weather APIs**: Open-Meteo (primary, free, no key), Tomorrow.io (secondary, fallback)
- **Geocoding**: Open-Meteo geocoding API
- **Notifications**: `expo-notifications` for local scheduled notifications
- **Background**: `expo-background-fetch` for opportunistic forecast refresh
- **Ads**: Google AdMob via `react-native-google-mobile-ads`
- **Testing**: Vitest for unit tests, Jest + React Native Testing Library for component tests, Detox optionally for E2E (deferred past P1)
- **Lint/format**: ESLint + Prettier
- **CI**: GitHub Actions

### Notes on Native Modules

MMKV, `react-native-google-mobile-ads`, and Drizzle's SQLite driver all require native modules. This means wthrgo cannot run in Expo Go — it requires a development build (`eas build --profile development`) for local testing. This is an intentional tradeoff: better storage and ads in exchange for slightly heavier dev setup. Documented here so the AI doesn't try to "fix" this by reaching for AsyncStorage.

## Component Map

```
┌────────────────────────────────────────────────────────────┐
│                       UI Layer (React)                      │
│  ForecastView · ActivityPanel · EventList · Settings        │
└──────────────────────┬─────────────────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────────────────┐
│                    State (Zustand stores)                   │
│  forecastStore · activitiesStore · eventsStore · prefsStore │
└──────────────────────┬─────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┬─────────────────┐
        ▼              ▼              ▼                 ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────────┐
│   Weather    │ │  Window  │ │ Notification │ │     Ads      │
│   Service    │ │ Detector │ │   Scheduler  │ │    Proxy     │
└──────┬───────┘ └────┬─────┘ └──────┬───────┘ └──────┬───────┘
       │              │              │                 │
       ▼              ▼              ▼                 ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────────┐
│  Open-Meteo  │ │  (pure)  │ │ expo-notif.  │ │    AdMob     │
│ Tomorrow.io  │ │          │ │              │ │              │
└──────────────┘ └──────────┘ └──────────────┘ └──────────────┘

                       ▲
                       │
┌──────────────────────┴─────────────────────────────────────┐
│   Storage: Drizzle/SQLite (structured)  +  MMKV (prefs)     │
└────────────────────────────────────────────────────────────┘
```

**Layer rules**
- UI components do not call services directly; they read from stores
- Stores call services; services know nothing about UI or stores
- The Window Detector is pure (no I/O, no clock dependency at the function boundary) — it takes forecast + activity, returns windows. This makes it trivially testable.
- The Weather Service handles fallback (Open-Meteo → Tomorrow.io) and presents a single normalized `Forecast` type upward
- All structured persistence goes through Drizzle repositories; no raw SQL outside of `src/storage/migrations/`

## Data Flow

**Forecast load**
1. UI requests forecast for (city, days)
2. forecastStore checks the SQLite forecast cache (via Drizzle repository); if fresh (< 15 min), returns it
3. Otherwise: Weather Service fetches from Open-Meteo, normalizes, writes to cache, returns
4. On Open-Meteo failure: Weather Service fetches from Tomorrow.io, normalizes to same shape, writes to cache
5. Window Detector runs over forecast × enabled activities, results cached per `(forecast_hash, activity_id)`

**Activity evaluation** (pure function)
```ts
detectWindows(forecast: Forecast, activity: Activity, now: Date): Window[]
```
No I/O. No external time source. Tests pass canned forecast JSON and expected windows. This is the unit test seam.

**Preferences read/write**
- Primitive prefs (units, digest time, notification toggles, quiet hours) → MMKV, accessed through a typed wrapper in `src/storage/prefs.ts`
- Anything with structure (activities, events, history) → Drizzle repositories

## Storage Schema (P1)

Defined as Drizzle schema in `src/storage/schema.ts`. Migrations generated via `drizzle-kit generate` and live in `src/storage/migrations/`. Drizzle's schema is Postgres-compatible by design, so the P2 move to Supabase is a port, not a rewrite.

```ts
// src/storage/schema.ts (illustrative — final form in code)
import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';

export const activities = sqliteTable('activities', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon'),                              // emoji or icon library reference
  color: text('color').notNull(),                  // hex from 16-color palette
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  criteriaJson: text('criteria_json').notNull(),   // full criteria object as JSON
  notes: text('notes'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  schemaVersion: integer('schema_version').notNull().default(1),
});

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  activityId: text('activity_id').notNull().references(() => activities.id),
  cityId: text('city_id').notNull().references(() => cities.id),
  startsAt: integer('starts_at').notNull(),        // unix seconds
  durationMinutes: integer('duration_minutes').notNull(),
  notes: text('notes'),
  externalCalendarId: text('external_calendar_id'),// for P2 calendar (GAP-010)
  lastStatus: text('last_status'),                 // 'on_track' | 'at_risk' | 'canceled'
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  schemaVersion: integer('schema_version').notNull().default(1),
});

export const cities = sqliteTable('cities', {
  id: text('id').primaryKey(),                     // canonical geocoder ID
  name: text('name').notNull(),
  admin1: text('admin1'),                          // state/province
  country: text('country').notNull(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  timezone: text('timezone').notNull(),
  lastUsedAt: integer('last_used_at'),
});

export const activityHistory = sqliteTable('activity_history', {
  id: text('id').primaryKey(),
  activityId: text('activity_id').notNull().references(() => activities.id),
  occurredAt: integer('occurred_at').notNull(),
  cityId: text('city_id').references(() => cities.id),
  source: text('source').notNull(),                // 'event' | 'window_open' | 'manual'
});

export const forecastCache = sqliteTable('forecast_cache', {
  cityId: text('city_id').notNull(),
  provider: text('provider').notNull(),            // 'open-meteo' | 'tomorrow.io'
  fetchedAt: integer('fetched_at').notNull(),
  payloadJson: text('payload_json').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.cityId, table.provider] }),
}));
```

**Schema versioning**: every table carries `schema_version`. Drizzle migrations run on app boot via `drizzle-orm/expo-sqlite/migrator`. P2 cloud sync (WTH-603) reads `schema_version` to handle cross-device version skew.

**Preferences (MMKV) shape**:
```ts
// src/storage/prefs.ts
type Prefs = {
  units: 'imperial' | 'metric';
  digestEnabled: boolean;
  digestTime: string;                  // 'HH:MM' 24h
  digestSendWhenEmpty: boolean;        // WTH-401
  notifications: {
    atRisk: boolean;
    backOnTrack: boolean;
    windowOpen: boolean;
    windowClosing: boolean;
    windowClosingLeadMinutes: number;  // default 30, WTH-405
  };
  quietHours: { start: string; end: string } | null; // WTH-407
};
```
A single MMKV instance keyed by a versioned namespace (`prefs:v1`) so future shape changes are explicit.

## Cross-cutting Concerns

**API keys** (WTH-902): Open-Meteo requires none. Tomorrow.io's key is delivered via Expo's `extra` config, set from EAS Secrets at build time. Never committed. Never logged.

**Network failure**: Weather Service tries Open-Meteo, then Tomorrow.io, then surfaces a `WeatherUnavailableError` to the store. UI shows a clear retry state with cached forecast (with staleness indicator) if available.

**Time and timezones**: All forecast data normalized to UTC internally. UI renders in the city's local timezone (from the cities table). Never use `Date.now()` inside pure functions — pass a `now` argument so tests are deterministic.

**Activity keyword-to-emoji mapping** (WTH-110): A static table in `src/activities/keyword-icons.ts`. Includes at minimum the preset list from WTH-140. Case-insensitive substring match on activity name; first match wins; falls back to colored checkmark.

**Precipitation tolerance to mm/3hr mapping** (WTH-124):
| User selection | Max mm per 3-hour interval |
|---|---|
| Clear skies only | 0.0 |
| Light drizzle OK | 0.5 |
| Light rain OK | 2.0 |
| Moderate rain OK | 5.0 |
| Any conditions | ∞ |

**Threat model** (WTH-902, WTH-904, WTH-905):
- API keys in EAS Secrets, never in client bundle, never in repo
- Location used only for forecast fetch; never logged, never transmitted to non-weather endpoints
- All city names sanitized (alphanumeric, spaces, hyphens, apostrophes, accents) before geocoder calls
- No PII stored server-side in P1 (there is no server in P1)
- AdMob receives only: active activity categories, weather conditions, coarse location (city-level)

## What is Explicitly Out of Scope for P1

- User accounts, cloud sync, social features (P2)
- Calendar integration (P2; schema accommodates it)
- Activity-to-city binding as a saved relationship (P3)
- Hourly forecast view (Future)
- Internationalization beyond English
- Offline forecast longer than the cache TTL (15 min for fresh, 24 hr as a staleness fallback)

## P2 Considerations (Informational — Not Build Targets)

These are not P1 work, but P1 design choices should not foreclose them.

- **Backend**: Supabase. Drizzle's Postgres adapter consumes the same schema definitions, so P2 is a port of the data layer, not a rewrite of the data model.
- **Server-triggered notifications**: OneSignal. P1 notification handlers should be structured so the trigger source (local scheduled vs. remote push) is the only thing that changes — the formatting, routing, and quiet-hours logic stays put. This means: keep notification *content generation* separate from notification *scheduling* in P1.
- **Auth**: Supabase Auth (email + OAuth). Local-only P1 data needs a clean "claim this device's data into an account" migration path. Every P1 record carries a `schema_version`, and the P2 migration will add a `device_id` column so claiming is unambiguous.
- **Real-time event sharing**: Supabase Realtime over the existing `events` table.

The P1 AI does not build any of this. It only takes care not to paint itself into a corner that would require ripping out core abstractions to add it.
