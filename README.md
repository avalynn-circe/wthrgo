# wthrgo

*Know when to go.*

A mobile weather app that eliminates the calculation between weather data and personal activity planning. You define what conditions you need; wthrgo finds the windows, highlights them, monitors them, and tells you when something changes.

> **Status**: Phase 1 in development. Designed for iOS and Android via React Native + Expo.

---

## What makes wthrgo different

Most weather apps show you the forecast and leave the interpretation to you. "Is 62°F with 15 mph wind and a dew point of 58 good for cycling? Are the next nine hours going to stay that way?" wthrgo answers those questions directly.

The core idea is a **window** — a continuous block of forecast intervals where every condition meets the parameters you've defined for an activity. A nine-hour sailing window. A two-hour cycling window before the rain. A clear stargazing window after midnight.

You set the parameters once per activity. wthrgo evaluates every forecast interval against them automatically.

## Project Structure & Documentation

This repository follows a documentation-first approach. The goal is that every line of code traces back to a requirement, every architectural decision is recorded, and every ambiguity in the original spec was resolved deliberately rather than guessed at during build.

If you're reviewing this project — as an employer, collaborator, or future maintainer — these documents are how the work is organized.

### `requirements.md` — The numbered feature list

The functional specification, converted into 90 individually-numbered, individually-testable requirements (`WTH-001` through `WTH-905`). Each one is tagged with a phase (P1 ship / P2 sync / P3 city features) and a priority. This is the source of truth for what gets built. Code that doesn't trace to a requirement ID doesn't ship.

*Why it exists:* prevents scope drift. New ideas that aren't on the list get evaluated and either added with an ID or declined. No silent feature creep.

### `gaps.md` — The ambiguity log

Every spec has gaps. This document lists ten ambiguities found during the requirements review — things the spec didn't define clearly enough to build (what "deteriorating conditions" means for pre-rain windows, what makes an event "canceled" vs "at-risk," how iOS background notification reliability constrains certain features) — and the resolution for each, with the rationale.

*Why it exists:* resolves ambiguity deliberately, upfront, instead of mid-build under time pressure. Each resolution is binding for downstream work.

### `architecture.md` — The technical sketch

One-page summary of the stack, component boundaries, data flow, storage schema, and cross-cutting concerns. Includes the threat model, the precipitation-tolerance mapping, the keyword-to-icon assignment rules, and a forward-looking section on what Phase 2 will need from the Phase 1 design.

*Why it exists:* keeps technical decisions consistent across sessions and across contributors. The AI implementing a new feature doesn't get to invent a new state-management library or a new storage approach.

### `traceability.md` — The live status table

One row per requirement, tracking implementation file paths, test paths, and status (`Not Started` → `In Progress` → `Built` → `Verified`). A requirement only reaches `Verified` when implementation, tests, lint, and CI all pass — described in the project's Definition of Done.

*Why it exists:* makes "done" observable. You can look at this file and know what's actually shippable versus what's in progress, without taking anyone's word for it.

### `spikes.md` — Time-boxed investigations

Open questions whose answers may change scope or design — for wthrgo currently: iOS background notification reliability, the actual granularity of AdMob contextual targeting, and data point completeness across both weather providers. Each spike has a time box, success criteria, and the decision it informs.

*Why it exists:* separates "I'm not sure" from "I need to build" so investigation doesn't sprawl into production work, and so high-risk assumptions get tested before they ossify into the architecture.

### `CLAUDE.md` — AI agent operating instructions

This is the operating manual for the AI assistant co-building wthrgo. It defines the AI's role, the build conventions, the Definition of Done, what to do when stuck, and what's explicitly out of scope.

*Why it exists:* wthrgo is being co-built with an AI coding assistant under human direction. The AI does the typing; product, architectural, and ambiguity-resolution decisions stay with the human. This file makes that division of labor explicit and prevents the AI from drifting into invention.

### `.github/workflows/ci.yml` — Automated quality gates

GitHub Actions workflow that runs lint, typecheck, tests, and an Expo build verification on every push. The CI pipeline isn't just a deliverable — it's a tool used during development. Code that doesn't pass the pipeline doesn't merge.

---

## Technical Stack

- **App**: React Native + Expo (SDK 51+), TypeScript strict mode
- **State**: Zustand
- **Storage**: SQLite via Drizzle ORM (structured data); MMKV (preferences)
- **Weather**: Open-Meteo (primary), Tomorrow.io (fallback)
- **Notifications**: `expo-notifications` for local scheduled notifications
- **Ads**: Google AdMob with a contextual-targeting proxy layer
- **Testing**: Vitest, Jest + React Native Testing Library
- **Lint/format**: ESLint + Prettier
- **CI**: GitHub Actions
- **Build**: EAS Build

Full details and the rationale for each choice are in `architecture.md`.

---

## Phases

**Phase 1 — Ship.** Activities, forecast view, window detection, events, morning digest, notifications, local storage, contextual ads. No account required. Local-only data.

**Phase 2 — Sync & Social.** User accounts via Supabase, cloud sync, event sharing, multi-user invitations, calendar integration, community activity templates, server-triggered notifications via OneSignal.

**Phase 3 — City Association.** Activity-to-city binding, location intelligence, regional recommendations.

The Phase 1 architecture is designed so Phase 2 is a port, not a rewrite — Drizzle's schema definitions move to Postgres on Supabase without restructuring the data model.

---

## A Note on Methodology

The documentation structure here is deliberately heavier than what most consumer mobile apps would warrant. It exists because the author is a Business Analyst as well as a developer, and the project doubles as an applied demonstration of BA practice — traceable requirements, deliberate gap resolution, observable acceptance criteria, automated quality enforcement.

Two artifacts are worth singling out for review:

- **`requirements.md`** — the conversion of a prose functional specification into 90 individually-testable, numbered requirements with phase and priority tags. This is the work product a competent BA produces before development begins.
- **`gaps.md`** — the surfacing and resolution of ten genuine ambiguities found in the original spec. Each entry shows the question, the options considered, and the chosen resolution with rationale. This is the work product a competent BA produces during the elicitation-to-implementation handoff.

Both documents would be reasonable portfolio artifacts in their own right. They are not generated boilerplate — every entry traces to a real decision about a real product.

---

## License

All rights reserved.

---

*wthrgo — Know when to go.*
