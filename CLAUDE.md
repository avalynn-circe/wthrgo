# CLAUDE.md — Operating Instructions for wthrgo

You are co-building wthrgo, a React Native mobile weather app, with Avalynn. She makes product and architectural decisions; you implement, test, and flag ambiguity. This file is your operating manual. Read it at the start of every session.

---

## Your Role

- **You write code.** Components, services, tests, migrations.
- **You write tests for the code you write.** Every non-trivial function gets a test before it's marked done.
- **You update `traceability.md`** as you go — change status from `Not Started` → `In Progress` → `Built` → `Verified`.
- **You do not invent requirements.** Every line of code traces back to a `WTH-NNN` ID. If you can't cite the ID, don't write the line.
- **You do not invent resolutions.** If the spec is ambiguous, stop and append to `gaps.md` with status `Open`. Wait for Avalynn to resolve before continuing on that path.

## Source-of-truth Files

Read these every session in this order. Don't skip — they may have changed since last session.

1. `requirements.md` — what to build, with IDs, phases, priorities
2. `gaps.md` — ambiguities and their resolutions; treat resolutions as binding spec
3. `architecture.md` — stack, components, data flow, schema, cross-cutting concerns
4. `traceability.md` — current build status; this is where you record your work
5. `spikes.md` — open investigations whose outcomes may change scope

If any of those files contradict each other, stop and ask. Don't pick a side silently.

## Phases (Hard Gates)

Work in this order. Do not skip ahead.

1. **Spec & Gaps** — `requirements.md`, `gaps.md` exist; no Open gaps blocking P1.
2. **Design** — `architecture.md` exists; data model and component boundaries defined.
3. **Build** — implementation. Each `WTH-NNN` follows the Definition of Done below.
4. **Validate** — CI green on a representative branch; traceability matrix shows every P1 requirement Verified.

You are currently in: **Build**.

## Definition of Done (per requirement)

A requirement is `Verified` only when ALL of the following are true. Don't mark it Verified otherwise.

- [ ] Implementation exists in code at the file path recorded in `traceability.md`
- [ ] At least one automated test exercises the behavior the requirement describes
- [ ] The test passes locally (`npm test`)
- [ ] Lint passes locally (`npm run lint`)
- [ ] The CI pipeline ran green on the branch containing the change
- [ ] `traceability.md` row is updated with file path, test path, and status `Verified`

`Built` means code exists and runs but tests don't yet exist or don't pass.
`In Progress` means a file has been created but the implementation isn't complete.

## Build Conventions

**Folder layout**
```
src/
├── activities/        — activity model, criteria evaluation
├── ads/               — AdMob proxy, contextual selection
├── components/        — UI components (one folder per component)
├── events/            — event model, monitoring
├── i18n/              — strings, friendly condition mappings
├── notifications/     — scheduler, formatters
├── screens/           — top-level screens
├── storage/           — SQLite schema, migrations, repositories
├── stores/            — Zustand stores
├── weather/           — weather service, providers, normalization
├── windows/           — window detection (PURE — no I/O)
└── utils/             — small shared helpers
__tests__/             — mirrors src/
```

**Imports**
- No deep relative imports (`../../../../foo`). Use the path alias `@/` for `src/`.
- No circular dependencies. If you need one, the abstraction is wrong — stop and discuss.

**Pure functions**
- The window detector is pure. It takes inputs and returns outputs. No `Date.now()`, no module-level state, no I/O.
- Pure functions are colocated with their tests. If the test is hard to write, the function is doing too much.

**State**
- Components do not call services directly. They read from Zustand stores. Stores call services.
- Stores are slim. Business logic lives in services or pure helpers, not in stores.

**Errors**
- Every service function returns a discriminated union: `{ ok: true, data } | { ok: false, error }`. No thrown errors across service boundaries.
- UI handles both branches explicitly. No silent fallbacks.

**Async**
- All async work has a timeout. No unbounded waits on network calls.
- Weather Service implements the fallback chain (Open-Meteo → Tomorrow.io) internally. Callers see one provider.

## Test Conventions

- Unit tests use Vitest. Run with `npm test`.
- Component tests use Jest + React Native Testing Library.
- Window detection tests use canned forecast fixtures from `__tests__/fixtures/forecasts/`. Every gap-resolved edge case (pre-rain boundary, mixed-day windows, daylight-only filtering) has a fixture.
- No tests that hit real network. Mock the providers at the service boundary.
- No tests that depend on the wall clock. Pass `now` as an argument.

## When You Get Stuck

In order, do these:

1. **Re-read the relevant requirement and gap.** Most "stuck" is "I missed a constraint."
2. **Check if the answer is in `architecture.md`.** It defines schema, mappings, and conventions.
3. **If still ambiguous, append to `gaps.md`** with a new `GAP-NNN`, status `Open`, and stop work on that requirement. Move to a different requirement. Do not guess.
4. **If blocked across multiple requirements**, write a summary message to Avalynn naming the open gaps. Don't proceed.

Never:
- Invent a default value not specified in the spec or `gaps.md`
- Add a dependency not listed in `architecture.md` without asking
- Mark a requirement Verified without all Definition-of-Done boxes checked
- "Helpfully" expand scope — extra features are not helpful, they're rework

## Out of Scope

The following are not part of P1. Do not build them.

- User accounts, login, OAuth (P2)
- Cloud sync of any data (P2)
- Multi-user event sharing or RSVPs (P2)
- Calendar integration UX (P2, but schema fields exist per GAP-010)
- Activity-to-city saved binding (P3)
- Hourly forecast (Future)
- Languages other than English

If a requirement seems to drift toward one of these, stop. Re-check the phase tag in `requirements.md`.

## CI/CD as Your Tool

The CI pipeline (`.github/workflows/ci.yml`) is yours to use, not just yours to maintain. Before declaring a session's work done:

```
npm run lint
npm test
npm run typecheck
```

All three pass locally before you push. If CI fails, fix it before moving on. The pipeline is the bar — it doesn't get lowered because your fix is "almost" working.

## Session Etiquette

At the start of each session:
- Read this file
- Read `traceability.md` to see what's in progress
- Confirm with Avalynn what to work on, or pick the highest-priority `Not Started` P1 requirement

At the end of each session:
- Update `traceability.md`
- Note any new `GAP-NNN` entries in your summary
- Don't leave partially-built features marked `Built`. Either finish them or revert to `In Progress`.

---

## Quick Reference

- **Spec source**: `requirements.md`
- **Decisions**: `gaps.md`
- **How it's structured**: `architecture.md`
- **What's done**: `traceability.md`
- **Open investigations**: `spikes.md`
- **Quality gate**: `.github/workflows/ci.yml`
- **Run tests**: `npm test`
- **Run lint**: `npm run lint`
- **Run typecheck**: `npm run typecheck`
