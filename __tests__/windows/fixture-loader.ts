import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Activity } from '@/activities/types';
import type { Forecast } from '@/weather/types';
import type { Window } from '@/windows/types';

/**
 * Fixture shape — see `__tests__/fixtures/README.md` for the coverage
 * matrix and conventions. Every fixture is self-describing: its `gaps`
 * and `requirements` arrays let regression searches like
 * `grep -l GAP-003 __tests__/fixtures/forecasts/` find every fixture
 * exercising a given decision.
 */
export interface Fixture {
  description: string;
  gaps: string[];           // e.g. ["GAP-001", "GAP-003"]
  requirements: string[];   // e.g. ["WTH-040", "WTH-041"]
  input: {
    forecast: Forecast;
    activity: Activity;
    /** ISO 8601 datetime string, parsed to Date by the loader. */
    now: string;
  };
  expected: {
    windows: Window[];
  };
}

const FIXTURE_DIR = join(__dirname, 'fixtures', 'forecasts');

export function loadFixture(name: string): Fixture {
  const filename = name.endsWith('.json') ? name : `${name}.json`;
  const path = join(FIXTURE_DIR, filename);
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw) as Fixture;
}

export function allFixtureNames(): string[] {
  return readdirSync(FIXTURE_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort();
}

export function parseNow(fixture: Fixture): Date {
  return new Date(fixture.input.now);
}
