# wthrgo — Traceability Matrix

Living document. Updated by the AI co-builder as work progresses. One row per requirement from `requirements.md`.

**Status values**
- `Not Started` — no code exists
- `In Progress` — files created, implementation incomplete
- `Built` — implementation done, tests do not yet pass or do not yet exist
- `Verified` — implementation done, tests pass, lint passes, CI green on the branch

A requirement is only `Verified` when all Definition-of-Done items in `CLAUDE.md` are satisfied.

---

## P1 Requirements

| ID | Summary | Implementation | Tests | Status | Notes |
|---|---|---|---|---|---|
| WTH-001 | 3-hour forecast as primary layer | | | Not Started | |
| WTH-002 | Daily summary view (alternate) | | | Not Started | |
| WTH-003 | Day grouping with separators | | | Not Started | |
| WTH-004 | Collapsible day groups, persisted | | | Not Started | |
| WTH-005 | Day header content | | | Not Started | |
| WTH-010 | Temperature °F/°C | | | Not Started | |
| WTH-011 | Feels-like temperature | | | Not Started | |
| WTH-012 | Dew point (not humidity) | | | Not Started | |
| WTH-013 | Wind speed and direction | | | Not Started | |
| WTH-014 | Precipitation mm/3hr | | | Not Started | |
| WTH-015 | Precipitation type | | | Not Started | |
| WTH-016 | Cloud cover % | | | Not Started | |
| WTH-017 | UV index | | | Not Started | |
| WTH-018 | Visibility | | | Not Started | |
| WTH-019 | Friendly condition description | | | Not Started | See GAP-008 |
| WTH-020 | Sunrise/sunset per day | | | Not Started | |
| WTH-030 | Free-text city search | | | Not Started | |
| WTH-031 | Autocomplete | | | Not Started | |
| WTH-032 | Recent cities saved | | | Not Started | |
| WTH-033 | Use current location | | | Not Started | |
| WTH-040 | Required consecutive duration | | | Not Started | |
| WTH-041 | Highlight qualifying windows | | | Not Started | |
| WTH-042 | Mark days with no windows | | | Not Started | |
| WTH-043 | Pre-rain window detection | | | Not Started | See GAP-003 |
| WTH-044 | Post-rain window detection | | | Not Started | See GAP-003 |
| WTH-045 | Auto-surface pre/post-rain | | | Not Started | |
| WTH-100 | Unlimited activities | | | Not Started | |
| WTH-101 | Enabled/disabled toggle | | | Not Started | |
| WTH-102 | Disabled activities excluded from eval | | | Not Started | |
| WTH-103 | Clone/edit/delete activity | | | Not Started | |
| WTH-104 | Filter grays non-qualifying intervals | | | Not Started | |
| WTH-105 | Multi-activity icons per interval | | | Not Started | |
| WTH-110 | Keyword-to-emoji auto-assignment | | | Not Started | Mapping in architecture.md |
| WTH-111 | Colored checkmark fallback | | | Not Started | |
| WTH-112 | 16-color palette | | | Not Started | |
| WTH-113 | Icon library override | | | Not Started | |
| WTH-114 | Sidebar legend | | | Not Started | |
| WTH-120 | Activity name (free text) | | | Not Started | |
| WTH-121 | Temperature range | | | Not Started | |
| WTH-122 | Dew point threshold | | | Not Started | |
| WTH-123 | Max wind speed | | | Not Started | |
| WTH-124 | Precipitation tolerance dropdown | | | Not Started | Mapping in architecture.md |
| WTH-125 | Time of day preference | | | Not Started | See GAP-001 |
| WTH-130 | Precipitation type preference | | | Not Started | |
| WTH-131 | UV index range | | | Not Started | |
| WTH-132 | Min visibility | | | Not Started | |
| WTH-133 | Wind direction preference | | | Not Started | |
| WTH-134 | Max cloud cover | | | Not Started | |
| WTH-135 | Consecutive hours required | | | Not Started | |
| WTH-136 | Consecutive days required | | | Not Started | |
| WTH-137 | Pre-rain window toggle | | | Not Started | |
| WTH-138 | Post-rain window toggle | | | Not Started | |
| WTH-140 | Preset library | | | Not Started | |
| WTH-141 | Presets editable after selection | | | Not Started | |
| WTH-142 | New from preset or scratch | | | Not Started | |
| WTH-143 | Notes field | | | Not Started | |
| WTH-200 | Event binds activity to date/time/city | | | Not Started | |
| WTH-201 | Event notes | | | Not Started | |
| WTH-202 | Events in forecast view + list | | | Not Started | |
| WTH-203 | Event forecast monitoring | | | Not Started | |
| WTH-204 | At-risk notification | | | Not Started | See GAP-005 |
| WTH-205 | Back-on-track notification | | | Not Started | |
| WTH-206 | Event status display | | | Not Started | See GAP-005 |
| WTH-207 | Event edit/clone/delete | | | Not Started | |
| WTH-300 | Top-bar inputs (city, activity) | | | Not Started | |
| WTH-301 | Activity selector empty/populated states | | | Not Started | |
| WTH-302 | Forecast view below inputs | | | Not Started | |
| WTH-303 | Activity sidebar/panel | | | Not Started | |
| WTH-304 | Upcoming events view | | | Not Started | |
| WTH-400 | Morning digest | | | Not Started | |
| WTH-401 | Digest always/when-windows-exist | | | Not Started | |
| WTH-402 | At-risk notification | | | Not Started | |
| WTH-403 | Back-on-track notification | | | Not Started | |
| WTH-404 | Window-open notification | | | Not Started | |
| WTH-405 | Window-closing notification | | | Not Started | See GAP-007 / SPIKE-001 |
| WTH-406 | Per-notification-type toggle | | | Not Started | |
| WTH-407 | Quiet hours | | | Not Started | |
| WTH-500 | Free + premium ad model | | | Not Started | See GAP-002 |
| WTH-501 | Activity-aware ads | | | Not Started | |
| WTH-502 | Condition-aware ads | | | Not Started | |
| WTH-503 | Cancellation-aware ads | | | Not Started | See GAP-005 |
| WTH-504 | Recurrence-aware ads | | | Not Started | Priority 4 in P1 |
| WTH-505 | Location-aware ads | | | Not Started | Priority 4 in P1 |
| WTH-506 | Ad placement (between day groups only) | | | Not Started | |
| WTH-507 | Ad at bottom of digest | | | Not Started | |
| WTH-508 | Ads never interrupt notifications | | | Not Started | |
| WTH-600 | Local storage for all P1 data | | | Not Started | See GAP-004 |
| WTH-601 | No account required | | | Not Started | |
| WTH-602 | Schema supports future sync | | | Not Started | |
| WTH-900 | Cold-cache first paint ≤ 2s on 4G | | | Not Started | Cross-cutting |
| WTH-901 | Warm-cache first paint ≤ 500ms | | | Not Started | Cross-cutting |
| WTH-902 | No API keys in client bundle | | | Not Started | Cross-cutting |
| WTH-903 | Open-Meteo → Tomorrow.io fallback | | | Not Started | |
| WTH-904 | No location retained server-side | | | Not Started | Cross-cutting |
| WTH-905 | City name sanitization | | | Not Started | Cross-cutting |

## P2 Requirements (Not Yet Active)

| ID | Summary | Status |
|---|---|---|
| WTH-208 | Calendar integration | Not Started |
| WTH-209 | Multi-user events / RSVP | Not Started |
| WTH-603 | User accounts + cloud sync | Not Started |
| WTH-604 | Cross-device availability | Not Started |
| WTH-605 | Social / community templates | Not Started |

## P3 Requirements (Not Yet Active)

| ID | Summary | Status |
|---|---|---|
| WTH-034 | Activity-city association | Not Started |

## Future (Deferred Indefinitely)

| ID | Summary | Status |
|---|---|---|
| WTH-006 | Hourly forecast view | Not Started |

---

## Summary

- **Total P1 requirements**: 84
- **Verified**: 0
- **Built**: 0
- **In Progress**: 0
- **Not Started**: 84

Update the summary block whenever you change a status.
