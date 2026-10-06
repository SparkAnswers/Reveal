/**
 * Seeded randomness for the reveal engine. Every random order a mode uses must come
 * from these helpers so that each viewer (and each dashboard refresh) sees the same thing.
 */

/** mulberry32 PRNG: returns a function yielding floats in [0, 1). Same algorithm as the mockup. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded Fisher–Yates permutation of 0..n-1. */
export function permutation(n: number, seed: number): number[] {
  const rnd = mulberry32(seed);
  const a = Array.from({ length: Math.max(0, Math.floor(n)) }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 32-bit FNV-1a string hash (unsigned), used to derive seeds from the reveal date. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
