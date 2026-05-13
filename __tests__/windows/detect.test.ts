import { describe, expect, it } from 'vitest';
import { detectWindows } from '@/windows/detect';
import { allFixtureNames, loadFixture, parseNow } from './fixture-loader';

describe('detectWindows — fixture suite', () => {
  for (const name of allFixtureNames()) {
    const fixture = loadFixture(name);
    it(`${name}: ${fixture.description}`, () => {
      const result = detectWindows(
        fixture.input.forecast,
        fixture.input.activity,
        parseNow(fixture),
      );
      expect(result).toEqual(fixture.expected.windows);
    });
  }
});
