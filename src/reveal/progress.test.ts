import {
  computeRepeat,
  repeatActive,
  parseDuration,
  resolveSteps,
  applyEasing,
  computeProgress,
  deriveSeed,
  formatRemaining,
} from './progress';
import { hashString } from './rng';

const DAY = 86_400_000;
const START = Date.parse('2026-10-01T00:00:00Z');
const REVEAL = Date.parse('2026-10-11T00:00:00Z'); // 10-day window

describe('computeProgress', () => {
  it('computes the linear fraction and days', () => {
    const r = computeProgress({
      startDate: '2026-10-01T00:00:00Z',
      revealDate: '2026-10-11T00:00:00Z',
      now: START + 2.5 * DAY,
    });
    expect(r.valid).toBe(true);
    expect(r.raw).toBeCloseTo(0.25, 10);
    expect(r.days).toBe(10);
    expect(r.revealed).toBe(false);
    expect(r.msRemaining).toBe(7.5 * DAY);
  });

  it('clamps raw to 0..1 and flags revealed', () => {
    const before = computeProgress({
      startDate: '2026-10-01T00:00:00Z',
      revealDate: '2026-10-11T00:00:00Z',
      now: START - DAY,
    });
    expect(before.raw).toBe(0);
    expect(before.revealed).toBe(false);
    const after = computeProgress({
      startDate: '2026-10-01T00:00:00Z',
      revealDate: '2026-10-11T00:00:00Z',
      now: REVEAL + DAY,
    });
    expect(after.raw).toBe(1);
    expect(after.revealed).toBe(true);
    expect(after.msRemaining).toBe(0);
    const exact = computeProgress({
      startDate: '2026-10-01T00:00:00Z',
      revealDate: '2026-10-11T00:00:00Z',
      now: REVEAL,
    });
    expect(exact.raw).toBe(1);
    expect(exact.revealed).toBe(true);
  });

  it('is invalid without a parseable revealDate', () => {
    expect(computeProgress({ now: START })).toMatchObject({
      raw: 0,
      msRemaining: 0,
      days: 1,
      valid: false,
      revealed: false,
    });
    expect(computeProgress({ revealDate: 'not a date', now: START }).valid).toBe(false);
  });

  it('defaults to a 30-day window when startDate is missing or not before revealDate', () => {
    const missing = computeProgress({ revealDate: '2026-10-11T00:00:00Z', now: REVEAL - 15 * DAY });
    expect(missing.days).toBe(30);
    expect(missing.raw).toBeCloseTo(0.5, 10);
    const inverted = computeProgress({
      startDate: '2026-12-01T00:00:00Z',
      revealDate: '2026-10-11T00:00:00Z',
      now: REVEAL - 15 * DAY,
    });
    expect(inverted.days).toBe(30);
    expect(inverted.raw).toBeCloseTo(0.5, 10);
    const same = computeProgress({
      startDate: '2026-10-11T00:00:00Z',
      revealDate: '2026-10-11T00:00:00Z',
      now: REVEAL - 3 * DAY,
    });
    expect(same.days).toBe(30);
    expect(same.raw).toBeCloseTo(0.9, 10);
  });

  it('never reports fewer than 1 day', () => {
    const r = computeProgress({ startDate: '2026-10-10T23:00:00Z', revealDate: '2026-10-11T00:00:00Z', now: REVEAL });
    expect(r.days).toBe(1);
  });
});

describe('applyEasing', () => {
  it.each([
    ['linear', [0, 0.5, 1]],
    ['easeIn', [0, 0.25, 1]],
    ['easeOut', [0, 0.75, 1]],
    ['easeInOut', [0, 0.5, 1]],
  ] as const)('%s at 0 / 0.5 / 1', (easing, expected) => {
    expect(applyEasing(0, easing, 10)).toBeCloseTo(expected[0], 10);
    expect(applyEasing(0.5, easing, 10)).toBeCloseTo(expected[1], 10);
    expect(applyEasing(1, easing, 10)).toBeCloseTo(expected[2], 10);
  });

  it('easeInOut is symmetric', () => {
    expect(applyEasing(0.25, 'easeInOut', 1)).toBeCloseTo(1 - applyEasing(0.75, 'easeInOut', 1), 10);
    expect(applyEasing(0.25, 'easeInOut', 1)).toBeCloseTo(0.125, 10);
  });

  it('steps quantises to n equal steps', () => {
    expect(applyEasing(0, 'steps', 4)).toBe(0);
    expect(applyEasing(0.1, 'steps', 4)).toBe(0);
    expect(applyEasing(0.25, 'steps', 4)).toBeCloseTo(0.25, 10);
    expect(applyEasing(0.49, 'steps', 4)).toBeCloseTo(0.25, 10);
    expect(applyEasing(0.5, 'steps', 4)).toBeCloseTo(0.5, 10);
    expect(applyEasing(0.99, 'steps', 4)).toBeCloseTo(0.75, 10);
    expect(applyEasing(1, 'steps', 4)).toBe(1);
    expect(applyEasing(0.3, 'steps', 7)).toBeCloseTo(2 / 7, 10);
  });

  it('steps treats invalid step counts as 1', () => {
    expect(applyEasing(0.9, 'steps', 0)).toBe(0);
    expect(applyEasing(1, 'steps', 0)).toBe(1);
    expect(applyEasing(0.9, 'steps', NaN)).toBe(0);
  });

  it('clamps out-of-range input', () => {
    expect(applyEasing(-1, 'easeIn', 1)).toBe(0);
    expect(applyEasing(2, 'easeOut', 1)).toBe(1);
  });
});

describe('deriveSeed', () => {
  it('prefers an explicit seed (including 0)', () => {
    expect(deriveSeed({ modeSettings: { seed: 123 }, revealDate: '2026-10-11' })).toBe(123);
    expect(deriveSeed({ modeSettings: { seed: 0 }, revealDate: '2026-10-11' })).toBe(0);
  });

  it('derives a stable seed from the reveal date otherwise', () => {
    const a = deriveSeed({ modeSettings: {}, revealDate: '2026-10-11T00:00:00Z' });
    const b = deriveSeed({ modeSettings: {}, revealDate: '2026-10-11T00:00:00Z' });
    expect(a).toBe(b);
    expect(a).toBe(hashString('2026-10-11T00:00:00Z'));
    expect(a).not.toBe(deriveSeed({ modeSettings: {}, revealDate: '2026-10-12T00:00:00Z' }));
  });

  it('falls back to a constant when no reveal date is set', () => {
    expect(deriveSeed({ modeSettings: {} })).toBe(hashString('reveal'));
  });
});

describe('formatRemaining', () => {
  it.each([
    [12 * DAY + 4 * 3600_000 + 59 * 60_000, '12d 4h'],
    [3 * 3600_000 + 12 * 60_000 + 30_000, '3h 12m'],
    [4 * 60_000 + 10_000, '4m 10s'],
    [45_000, '45s'],
    [999, '0s'],
    [0, 'Revealed'],
    [-5000, 'Revealed'],
    [NaN, 'Revealed'],
  ])('%d ms -> %s', (ms, expected) => {
    expect(formatRemaining(ms)).toBe(expected);
  });
});

describe('expireDate', () => {
  it('reports expiry and time until it', () => {
    const r = computeProgress({
      revealDate: '2026-10-11T00:00:00Z',
      expireDate: '2026-10-12T00:00:00Z',
      now: REVEAL + DAY / 2,
    });
    expect(r.revealed).toBe(true);
    expect(r.expired).toBe(false);
    expect(r.msUntilExpire).toBe(DAY / 2);
    expect(
      computeProgress({ revealDate: '2026-10-11T00:00:00Z', expireDate: '2026-10-12T00:00:00Z', now: REVEAL + DAY })
        .expired
    ).toBe(true);
  });
  it('ignores a missing or invalid expireDate', () => {
    expect(computeProgress({ revealDate: '2026-10-11T00:00:00Z', now: REVEAL + DAY }).expired).toBe(false);
    expect(computeProgress({ revealDate: '2026-10-11T00:00:00Z', expireDate: 'nope', now: REVEAL + DAY }).expired).toBe(
      false
    );
  });
});

describe('parseDuration', () => {
  it('parses units and rejects junk', () => {
    expect(parseDuration('30s')).toBe(30_000);
    expect(parseDuration('10m')).toBe(600_000);
    expect(parseDuration('1.5h')).toBe(5_400_000);
    expect(parseDuration('2d')).toBe(2 * DAY);
    expect(parseDuration('1w')).toBe(7 * DAY);
    expect(parseDuration(' 3 ')).toBe(3 * DAY);
    expect(parseDuration('0m')).toBeUndefined();
    expect(parseDuration('soon')).toBeUndefined();
    expect(parseDuration('')).toBeUndefined();
    expect(parseDuration(undefined)).toBeUndefined();
  });
});

describe('resolveSteps', () => {
  const window = { windowMs: 2 * DAY, days: 2 };
  it('prefers stepEvery, then steps, then whole days', () => {
    expect(resolveSteps({ stepEvery: '1h' }, window)).toBe(48);
    expect(resolveSteps({ stepEvery: '1h', steps: 5 }, window)).toBe(48);
    expect(resolveSteps({ steps: 5 }, window)).toBe(5);
    expect(resolveSteps({}, window)).toBe(2);
    expect(resolveSteps(undefined, { windowMs: 60_000, days: 1 })).toBe(1);
  });
  it('never returns less than one step', () => {
    expect(resolveSteps({ stepEvery: '10d' }, window)).toBe(1);
    expect(resolveSteps({ steps: 0 }, window)).toBe(2);
  });
});

describe('computeRepeat', () => {
  const MIN = 60_000;
  const T0 = Date.UTC(2026, 9, 5, 12, 0, 0); // an even minute on the wall clock
  const base = { every: '2m', showFor: '1m', enabled: true } as const;

  it('is inactive without a usable period', () => {
    expect(repeatActive({ enabled: true })).toBe(false);
    expect(repeatActive({ enabled: false, every: '2m' })).toBe(false);
    expect(repeatActive({ enabled: true, every: '2m' })).toBe(true);
    expect(computeRepeat({ repeat: { enabled: true }, now: T0, seed: 1 }).valid).toBe(false);
  });

  it('clock-aligned even/odd minutes: offset 0 shows on even minutes, offset 1m on odd', () => {
    const even = (now: number) => computeRepeat({ repeat: { ...base }, now, seed: 1 });
    const odd = (now: number) => computeRepeat({ repeat: { ...base, offset: '1m' }, now, seed: 1 });
    expect(even(T0 + 10_000).phase).toBe('shown');
    expect(odd(T0 + 10_000).phase).toBe('hidden');
    expect(even(T0 + MIN + 10_000).phase).toBe('hidden');
    expect(odd(T0 + MIN + 10_000).phase).toBe('shown');
    expect(even(T0 + 10_000).msUntilHide).toBe(50_000);
    expect(even(T0 + MIN + 10_000).msRemaining).toBe(50_000);
  });

  it('reveals over revealOver then stays shown for showFor', () => {
    const r = (now: number) =>
      computeRepeat({ repeat: { ...base, every: '10m', revealOver: '2m', showFor: '3m' }, now, seed: 1 });
    expect(r(T0 + MIN)).toMatchObject({ phase: 'revealing', raw: 0.5, msRemaining: MIN, windowMs: 2 * MIN });
    expect(r(T0 + 3 * MIN)).toMatchObject({ phase: 'shown', raw: 1, msUntilHide: 2 * MIN });
    expect(r(T0 + 6 * MIN)).toMatchObject({ phase: 'hidden', raw: 0, msRemaining: 6 * MIN });
  });

  it('showFor defaults to the rest of the cycle and is capped by it', () => {
    const r = computeRepeat({ repeat: { enabled: true, every: '2m', revealOver: '30s' }, now: T0 + 90_000, seed: 1 });
    expect(r.phase).toBe('shown');
    const capped = computeRepeat({ repeat: { enabled: true, every: '2m', showFor: '1h' }, now: T0 + 119_000, seed: 1 });
    expect(capped.phase).toBe('shown');
  });

  it('waits before startDate and aligns to it when asked', () => {
    const start = new Date(T0 + 30_000).toISOString();
    expect(computeRepeat({ repeat: { ...base }, startDate: start, now: T0, seed: 1 })).toMatchObject({
      phase: 'waiting',
      msRemaining: 30_000,
    });
    const aligned = computeRepeat({ repeat: { ...base, align: 'start' }, startDate: start, now: T0 + 40_000, seed: 1 });
    expect(aligned).toMatchObject({ phase: 'shown', msUntilHide: 50_000 });
  });

  it('chance skips cycles deterministically and finds the next showing cycle', () => {
    const at = (now: number, seed: number) => computeRepeat({ repeat: { ...base, chance: 50 }, now, seed });
    const pattern = Array.from({ length: 20 }, (_, k) => at(T0 + k * 2 * MIN + 1000, 7).phase);
    expect(pattern).toEqual(Array.from({ length: 20 }, (_, k) => at(T0 + k * 2 * MIN + 1000, 7).phase));
    expect(pattern).toContain('shown');
    expect(pattern).toContain('hidden');
    const hiddenIdx = pattern.indexOf('hidden');
    const r = at(T0 + hiddenIdx * 2 * MIN + 1000, 7);
    expect(r.msRemaining).toBeGreaterThan(0);
    expect(Number.isFinite(r.msRemaining)).toBe(true);
    expect(at(T0, 7).phase === 'shown' || at(T0, 7).phase === 'hidden').toBe(true);
    expect(computeRepeat({ repeat: { ...base, chance: 0 }, now: T0, seed: 1 })).toMatchObject({
      phase: 'hidden',
      msRemaining: Infinity,
    });
  });

  it('honours expireDate', () => {
    const r = computeRepeat({ repeat: { ...base }, expireDate: new Date(T0 - 1).toISOString(), now: T0, seed: 1 });
    expect(r.expired).toBe(true);
  });
});
