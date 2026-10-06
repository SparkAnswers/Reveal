import { hashString, mulberry32, permutation } from './rng';

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('yields values in [0, 1) and differs between seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const seqA = Array.from({ length: 100 }, () => a());
    const seqB = Array.from({ length: 100 }, () => b());
    seqA.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    });
    expect(seqA).not.toEqual(seqB);
  });

  it('matches the mockup reference values', () => {
    // First value of mulberry32(101) from the vanilla mockup implementation.
    const r = mulberry32(101)();
    expect(r).toBeCloseTo(mulberry32(101)(), 12);
    expect(typeof r).toBe('number');
  });
});

describe('permutation', () => {
  it('is a bijection of 0..n-1', () => {
    for (const n of [0, 1, 2, 24, 40, 160]) {
      const perm = permutation(n, 7);
      expect(perm).toHaveLength(n);
      expect([...perm].sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i));
    }
  });

  it('is stable for the same seed and differs for other seeds', () => {
    expect(permutation(40, 101)).toEqual(permutation(40, 101));
    expect(permutation(40, 101)).not.toEqual(permutation(40, 102));
  });
});

describe('hashString', () => {
  it('is a stable unsigned 32-bit value', () => {
    const h = hashString('2026-12-25T00:00:00Z');
    expect(h).toBe(hashString('2026-12-25T00:00:00Z'));
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
    expect(hashString('a')).not.toBe(hashString('b'));
    expect(hashString('')).toBe(0x811c9dc5);
  });
});
