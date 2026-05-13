# wthrgo — Requirements

Source of truth for what gets built. Every requirement has an ID, a phase, a priority, and is testable as written.

**Conventions**
- **ID**: `WTH-NNN`. IDs are permanent — never reuse, never renumber. Deprecated requirements get a strikethrough and a note, not deletion.
- **Phase**: P1 (ship), P2 (sync/social), P3 (city association). Matches §8 of the functional spec.
- **Priority**: 1 Critical, 2 High, 3 Medium, 4 Low. Within a phase, lower-numbered priorities ship first.
- **Status**: tracked in `traceability.md`, not here.

---

## 1. Weather Data — Forecast Display

| ID | Requirement | Phase | Priority |
|---|---|---|---|
| WTH-001 | The app shall display weather forecast at 3-hour intervals as the primary data layer. | P1 | 1 |
| WTH-002 | The app shall offer a daily summary view as an alternate display mode. | P1 | 2 |
| WTH-003 | Forecast intervals shall be grouped under day headers with clear visual separators. | P1 | 1 |
| WTH-004 | Day groups shall be collapsible and expandable, with state preserved across app sessions. | P1 | 2 |
| WTH-005 | Each day header shall display: date, day of week, daily high/low temperature, and a summary condition icon. | P1 | 2 |
| WTH-006 | An hourly view shall be deferred to a future phase. | Future | 4 |

## 2. Weather Data — Data Points Per Interval

| ID | Requirement | Phase | Priority |
|---|---|---|---|
| WTH-010 | Each interval shall display temperature in °F or °C based on user preference. | P1 | 1 |
| WTH-011 | Each interval shall display feels-like temperature. | P1 | 2 |
| WTH-012 | Each interval shall display dew point (not relative humidity). | P1 | 1 |
| WTH-013 | Each interval shall display wind speed and direction. | P1 | 1 |
| WTH-014 | Each interval shall display precipitation in mm per 3-hour period. | P1 | 1 |
| WTH-015 | Each interval shall display precipitation type: rain, snow, sleet, or freezing rain. | P1 | 1 |
| WTH-016 | Each interval shall display cloud cover as a percentage. | P1 | 2 |
| WTH-017 | Each interval shall display UV index. | P1 | 2 |
| WTH-018 | Each interval shall display visibility. | P1 | 3 |
| WTH-019 | Each interval shall display a friendly condition description (mapped from API codes; raw API text shall never be shown). | P1 | 1 |
| WTH-020 | Each day shall display sunrise and sunset times. | P1 | 2 |

## 3. Weather Data — City Search

| ID | Requirement | Phase | Priority |
|---|---|---|---|
| WTH-030 | The app shall provide free-text city search supporting any city available in the geocoding API. | P1 | 1 |
| WTH-031 | City search shall offer real-time autocomplete as the user types. | P1 | 2 |
| WTH-032 | Recently selected cities shall be saved locally for quick re-selection. | P1 | 2 |
| WTH-033 | The app shall offer the option to use device current location. | P1 | 1 |
| WTH-034 | Activities may be optionally associated with a city. | P3 | 3 |

## 4. Weather Data — Window Detection

| ID | Requirement | Phase | Priority |
|---|---|---|---|
| WTH-040 | An activity may specify a required consecutive duration (e.g., 9 hours meeting all parameters). | P1 | 1 |
| WTH-041 | The app shall identify and highlight qualifying windows as continuous visual blocks across intervals and across day boundaries. | P1 | 1 |
| WTH-042 | If no qualifying window exists for a day, the day shall be visually marked as having no windows. | P1 | 2 |
| WTH-043 | Pre-rain window: when an activity is active, the app shall identify the last qualifying block of intervals before conditions deteriorate. "Deteriorating" is defined in `gaps.md` (GAP-003). | P1 | 2 |
| WTH-044 | Post-rain window: when an activity is active, the app shall identify the first qualifying block of intervals after conditions clear. | P1 | 2 |
| WTH-045 | Pre- and post-rain windows shall be surfaced automatically whenever an activity is enabled. | P1 | 2 |

## 5. Activities — Management

| ID | Requirement | Phase | Priority |
|---|---|---|---|
| WTH-100 | Users may create an unlimited number of activities. | P1 | 1 |
| WTH-101 | Each activity shall have an independent enabled/disabled toggle. | P1 | 1 |
| WTH-102 | Enabled activities shall be evaluated against the forecast and displayed; disabled activities shall be saved but excluded from forecast evaluation. | P1 | 1 |
| WTH-103 | Activities may be cloned, edited, and deleted. | P1 | 2 |
| WTH-104 | Selecting an activity for filtering shall gray out (not hide) non-qualifying intervals; qualifying intervals remain at full opacity. | P1 | 2 |
| WTH-105 | Multiple activities may be enabled simultaneously; each qualifying interval shall display all matching activity icons. | P1 | 1 |

## 6. Activities — Icons and Colors

| ID | Requirement | Phase | Priority |
|---|---|---|---|
| WTH-110 | Activity names matching a known keyword list (e.g., Golf, Cycling, Sailing) shall be auto-assigned an emoji icon. The keyword-to-emoji mapping is defined in `architecture.md`. | P1 | 2 |
| WTH-111 | Activities whose names do not match a known keyword shall receive a unique colored checkmark. | P1 | 2 |
| WTH-112 | The color palette shall consist of 16 curated colors selectable by the user. | P1 | 2 |
| WTH-113 | Users may override the auto-assigned icon by choosing from an icon library. | P1 | 3 |
| WTH-114 | The activity sidebar shall display each activity's icon or colored checkmark as a legend. | P1 | 2 |

## 7. Activities — Basic Criteria

| ID | Requirement | Phase | Priority |
|---|---|---|---|
| WTH-120 | An activity shall have a free-text name. | P1 | 1 |
| WTH-121 | An activity shall have a temperature range (min and max). | P1 | 1 |
| WTH-122 | An activity shall have a dew point threshold (maximum). | P1 | 1 |
| WTH-123 | An activity shall have a maximum wind speed. | P1 | 1 |
| WTH-124 | An activity shall have a precipitation tolerance selected from a friendly dropdown: clear skies only / light drizzle OK / light rain OK / moderate rain OK / any conditions. Mapping to mm/3hr is defined in `architecture.md`. | P1 | 1 |
| WTH-125 | An activity shall have a time-of-day preference: daytime only, nighttime only, or any. "Daytime" is defined by sunrise/sunset for the relevant day (see GAP-001). | P1 | 1 |

## 8. Activities — Advanced Criteria (collapsible UI)

| ID | Requirement | Phase | Priority |
|---|---|---|---|
| WTH-130 | An activity may specify a precipitation type preference: rain only, snow only, any, or none. | P1 | 2 |
| WTH-131 | An activity may specify a UV index range. | P1 | 3 |
| WTH-132 | An activity may specify a minimum visibility. | P1 | 3 |
| WTH-133 | An activity may specify a wind direction preference. | P1 | 3 |
| WTH-134 | An activity may specify a maximum cloud cover. | P1 | 3 |
| WTH-135 | An activity may specify required consecutive qualifying hours. | P1 | 1 |
| WTH-136 | An activity may specify required consecutive qualifying days. | P1 | 2 |
| WTH-137 | An activity may toggle pre-rain window detection on/off. | P1 | 2 |
| WTH-138 | An activity may toggle post-rain window detection on/off. | P1 | 2 |

## 9. Activities — Presets

| ID | Requirement | Phase | Priority |
|---|---|---|---|
| WTH-140 | The app shall ship with a preset library containing at minimum: Golf, Cycling, Running, Sailing, Stargazing, Yard Work, Motorcycle, Hiking, Photography, Skiing, Beach, and Outdoor (generic). | P1 | 2 |
| WTH-141 | Presets shall be fully editable after selection. | P1 | 2 |
| WTH-142 | Users may create a new activity from a preset or from scratch. | P1 | 2 |
| WTH-143 | Each activity shall have a freeform notes field, editable at any time and visible in the activity detail view. | P1 | 3 |

## 10. Events

| ID | Requirement | Phase | Priority |
|---|---|---|---|
| WTH-200 | Events shall bind one activity to a specific date, time, duration, and city. | P1 | 1 |
| WTH-201 | Events shall support an optional notes field. | P1 | 3 |
| WTH-202 | Events shall appear both in the forecast view (overlaid on the relevant intervals) and in a dedicated upcoming events list sorted by date. | P1 | 2 |
| WTH-203 | Once an event is created, the app shall monitor the forecast for its city and date range against the bound activity's parameters. | P1 | 1 |
| WTH-204 | If projected conditions fall outside the activity's parameters, the user shall be notified the event is at risk. | P1 | 1 |
| WTH-205 | If a previously at-risk event returns to within parameters, the user shall be notified it is back on track. | P1 | 2 |
| WTH-206 | Each event shall show a current forecast status: on track, at risk, or canceled. "Canceled" status conditions are defined in GAP-005. | P1 | 2 |
| WTH-207 | Events may be edited, cloned, and deleted. | P1 | 2 |
| WTH-208 | Calendar integration. | P2 | 3 |
| WTH-209 | Multi-user event invitations and RSVPs. | P2 | 3 |

## 11. Interface

| ID | Requirement | Phase | Priority |
|---|---|---|---|
| WTH-300 | The primary screen shall present two inputs at the top: a city search field and an activity selector. | P1 | 1 |
| WTH-301 | When the user has no saved activities, the activity selector shall render as a text input prompting creation; when activities exist, it shall render as a dropdown. | P1 | 2 |
| WTH-302 | The forecast view shall appear below the input bar. | P1 | 1 |
| WTH-303 | An activity sidebar/panel shall list all saved activities with toggles, name, icon/checkmark, and quick access to edit, clone, delete, and add-new. | P1 | 2 |
| WTH-304 | The upcoming events view shall be a separate tab or section showing all events sorted by date, displaying activity icon, city, date, time, duration, and current status. | P1 | 2 |

## 12. Notifications

| ID | Requirement | Phase | Priority |
|---|---|---|---|
| WTH-400 | The app shall send a morning digest at a user-configured time, personalized by location, showing qualifying windows for all enabled activities. The digest shall lead with general weather then activity-specific windows. | P1 | 2 |
| WTH-401 | The user may configure the digest to be sent always or only when qualifying windows exist. | P1 | 3 |
| WTH-402 | The app shall send an event-at-risk notification when monitored conditions degrade. | P1 | 1 |
| WTH-403 | The app shall send a back-on-track notification when a previously at-risk event clears. | P1 | 2 |
| WTH-404 | The app shall send a window-open notification when a qualifying window opens for an enabled activity. | P1 | 2 |
| WTH-405 | The app shall send a window-closing notification with a user-defined lead time (default 30 minutes). | P1 | 2 |
| WTH-406 | Every notification type shall be individually togglable in settings. | P1 | 1 |
| WTH-407 | The app shall support a quiet-hours setting that suppresses all notifications during the configured window. | P1 | 2 |

## 13. Advertising

| ID | Requirement | Phase | Priority |
|---|---|---|---|
| WTH-500 | The app shall be free, supported by contextual advertising; a premium tier removes ads. Ad-network selection and contextual targeting mechanism are defined in GAP-002. | P1 | 2 |
| WTH-501 | Ads shall be activity-aware: ad context shall reflect the user's enabled or recently used activities. | P1 | 3 |
| WTH-502 | Ads shall be condition-aware: contextual ads shall reflect current and forecasted conditions for the user's location. | P1 | 3 |
| WTH-503 | Ads shall be cancellation-aware: when an event is canceled by weather, the app may surface relevant indoor alternatives. Detection mechanism for "canceled by weather" is in GAP-005. | P1 | 3 |
| WTH-504 | Ads shall be recurrence-aware: the app shall track activity history and surface contextual ads for meaningful moments (first golf outing of the season, etc.). History retention rules in GAP-006. | P1 | 4 |
| WTH-505 | Ads shall be location-aware: regional and local-business ad targeting where supported by the network. | P1 | 4 |
| WTH-506 | Ads shall appear only between day groups in the forecast view; ads shall never appear inside an interval row. | P1 | 1 |
| WTH-507 | Ads shall appear at the bottom of the morning digest. | P1 | 3 |
| WTH-508 | Ads shall never interrupt or replace notifications. | P1 | 1 |

## 14. Data and Storage

| ID | Requirement | Phase | Priority |
|---|---|---|---|
| WTH-600 | All activities, events, preferences, and notes shall be stored on the device. | P1 | 1 |
| WTH-601 | No user account shall be required to use the app in P1. | P1 | 1 |
| WTH-602 | Local data structures shall be designed to support future cloud sync without schema rewrites. Schema versioning approach in `architecture.md`. | P1 | 2 |
| WTH-603 | User accounts and cloud sync. | P2 | 2 |
| WTH-604 | Cross-device activity and event availability. | P2 | 2 |
| WTH-605 | Social features: event sharing, community activity templates. | P2 | 3 |

## 15. Cross-cutting Quality Bars

These are not features but bars every feature must clear.

| ID | Requirement | Phase | Priority |
|---|---|---|---|
| WTH-900 | The forecast view shall render its first paint within 2 seconds on a 4G connection with cold cache. | P1 | 2 |
| WTH-901 | The forecast view shall render its first paint within 500 ms on warm cache. | P1 | 2 |
| WTH-902 | API keys for weather providers shall never appear in the client bundle. Key delivery mechanism in `architecture.md`. | P1 | 1 |
| WTH-903 | If the primary weather API (Open-Meteo) is unavailable, the app shall transparently fall back to the secondary API (Tomorrow.io) for the same request. | P1 | 2 |
| WTH-904 | The app shall not transmit user location to any server beyond what is required to obtain forecast data, and shall not retain location server-side. | P1 | 1 |
| WTH-905 | All user-typed city names shall be sanitized before being included in any API request. | P1 | 2 |
