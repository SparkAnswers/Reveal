import { Easing, RepeatSettings, RevealOptions } from '../types';
import { hashString, mulberry32 } from './rng';

const DAY_MS = 86_400_000;
const DEFAULT_WINDOW_MS = 30 * DAY_MS;

export interface ProgressInfo {
  /** Linear elapsed fraction, clamped 0..1. */
  raw: number;
  /** Milliseconds until the reveal (0 once revealed). */
  msRemaining: number;
  /** Whole days in the window (min 1). */
  days: number;
  /** False when revealDate is missing or unparseable. */
  valid: boolean;
  /** True once now >= revealDate. */
  revealed: boolean;
  /** True once now >= expireDate (when one is set). */
  expired: boolean;
  /** Milliseconds until expiry (0 when expired or no expireDate). */
  msUntilExpire: number;
  /** Length of the start..reveal window in ms. */
  windowMs: number;
  /** Repeat schedules only: 'hidden' between cycles (render nothing), 'waiting' before startDate. */
  phase?: 'waiting' | 'revealing' | 'shown' | 'hidden';
  /** Repeat schedules only: ms until the current shown phase ends (0 otherwise). */
  msUntilHide?: number;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function parseDate(s?: string): number | undefined {
  if (!s) {
    return undefined;
  }
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : undefined;
}

/**
 * Compute progress between startDate and revealDate at `now` (epoch ms).
 * If startDate is missing, unparseable or not before revealDate, the window defaults to 30 days.
 */
export function computeProgress(args: {
  startDate?: string;
  revealDate?: string;
  expireDate?: string;
  now: number;
}): ProgressInfo {
  const reveal = parseDate(args.revealDate);
  const expire = parseDate(args.expireDate);
  const expired = expire !== undefined && args.now >= expire;
  const msUntilExpire = expire === undefined ? 0 : Math.max(0, expire - args.now);
  if (reveal === undefined) {
    return {
      raw: 0,
      msRemaining: 0,
      days: 1,
      valid: false,
      revealed: false,
      expired,
      msUntilExpire,
      windowMs: DEFAULT_WINDOW_MS,
    };
  }
  let start = parseDate(args.startDate);
  if (start === undefined || start >= reveal) {
    start = reveal - DEFAULT_WINDOW_MS;
  }
  const raw = clamp01((args.now - start) / (reveal - start));
  const days = Math.max(1, Math.floor((reveal - start) / DAY_MS));
  return {
    raw,
    msRemaining: Math.max(0, reveal - args.now),
    days,
    valid: true,
    revealed: args.now >= reveal,
    expired,
    msUntilExpire,
    windowMs: reveal - start,
  };
}

const DURATION_UNITS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: DAY_MS,
  w: 7 * DAY_MS,
};

/** Parse a duration like "90s", "10m", "1.5h", "2d", "1w" into ms. Undefined when unparseable or <= 0. */
export function parseDuration(s?: string): number | undefined {
  if (!s) {
    return undefined;
  }
  const m = /^\s*(\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w)?\s*$/i.exec(s);
  if (!m) {
    return undefined;
  }
  const ms = parseFloat(m[1]) * DURATION_UNITS[(m[2] ?? 'd').toLowerCase()];
  return Number.isFinite(ms) && ms > 0 ? ms : undefined;
}

/**
 * Number of steps for the 'steps' easing: an explicit `stepEvery` duration wins, then an explicit
 * `steps` count, then one step per whole day in the window (min 1).
 */
export function resolveSteps(
  settings: { steps?: number; stepEvery?: string } | undefined,
  progress: Pick<ProgressInfo, 'windowMs' | 'days'>
): number {
  const every = parseDuration(settings?.stepEvery);
  if (every !== undefined) {
    return Math.max(1, Math.round(progress.windowMs / every));
  }
  if (typeof settings?.steps === 'number' && settings.steps >= 1) {
    return Math.floor(settings.steps);
  }
  return Math.max(1, progress.days);
}

/** Map linear progress to eased progress. `steps` is the step count for the 'steps' easing. */
export function applyEasing(raw: number, easing: Easing, steps: number): number {
  const p = clamp01(raw);
  switch (easing) {
    case 'easeIn':
      return p * p;
    case 'easeOut':
      return 1 - (1 - p) * (1 - p);
    case 'easeInOut':
      return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    case 'steps': {
      const n = Math.max(1, Math.floor(steps) || 1);
      return clamp01(Math.floor(p * n + 1e-9) / n);
    }
    case 'linear':
    default:
      return p;
  }
}

/** Seed used by every seeded order: an explicit modeSettings.seed, else a hash of the reveal date. */
export function deriveSeed(options: Pick<RevealOptions, 'modeSettings' | 'revealDate'>): number {
  const explicit = options.modeSettings?.seed;
  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return explicit >>> 0;
  }
  return hashString(options.revealDate ?? 'reveal');
}

/** Human-readable remaining time: "12d 4h" | "3h 12m" | "4m 10s" | "45s" | "Revealed". */
export function formatRemaining(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) {
    return 'Revealed';
  }
  return formatDuration(ms);
}

/** "12d 4h" | "3h 12m" | "4m 10s" | "45s" (never negative). */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) {
    return '0s';
  }
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d >= 1) {
    return `${d}d ${h}h`;
  }
  if (h >= 1) {
    return `${h}h ${m}m`;
  }
  if (m >= 1) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}

const MAX_CYCLE_SCAN = 10_000;

/** True when a repeat schedule is switched on with a usable period. */
export function repeatActive(repeat?: RepeatSettings): boolean {
  return !!repeat?.enabled && parseDuration(repeat.every) !== undefined;
}

/** Whether cycle `index` shows, given the chance setting (seeded so every viewer agrees). */
function cycleShows(index: number, chance: number | undefined, seed: number): boolean {
  if (chance === undefined || chance >= 100) {
    return true;
  }
  if (chance <= 0) {
    return false;
  }
  const r = mulberry32((seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0)() * 100;
  return r < chance;
}

/**
 * Progress for a repeating schedule at `now`. The cycle starts at anchor + k*every, where the anchor
 * is the epoch (clock-aligned, plus offset) or startDate (plus offset). Inside a cycle the image
 * reveals over `revealOver`, stays shown for `showFor`, then hides until the next cycle.
 */
export function computeRepeat(args: {
  repeat: RepeatSettings;
  startDate?: string;
  expireDate?: string;
  now: number;
  seed: number;
}): ProgressInfo {
  const { repeat, now, seed } = args;
  const every = parseDuration(repeat.every);
  const expire = parseDate(args.expireDate);
  const expired = expire !== undefined && now >= expire;
  const msUntilExpire = expire === undefined ? 0 : Math.max(0, expire - now);
  const base = { expired, msUntilExpire, msUntilHide: 0 };
  if (every === undefined) {
    return { raw: 0, msRemaining: 0, days: 1, valid: false, revealed: false, windowMs: 0, ...base };
  }
  const revealOver = parseDuration(repeat.revealOver) ?? 0;
  const windowMs = Math.min(revealOver, every);
  const showFor = Math.min(parseDuration(repeat.showFor) ?? every - windowMs, every - windowMs);
  const offset = parseDuration(repeat.offset) ?? 0;
  const start = parseDate(args.startDate);
  const days = Math.max(1, Math.floor(windowMs / DAY_MS));

  if (start !== undefined && now < start) {
    return {
      raw: 0,
      msRemaining: start - now,
      days,
      valid: true,
      revealed: false,
      windowMs,
      phase: 'waiting',
      ...base,
    };
  }
  const anchor = (repeat.align === 'start' && start !== undefined ? start : 0) + offset;
  const index = Math.floor((now - anchor) / every);
  const t = now - (anchor + index * every);

  // Time until the end of the next cycle's reveal phase (skipping cycles the chance setting hides).
  const nextReveal = (fromIndex: number): number => {
    for (let k = fromIndex; k < fromIndex + MAX_CYCLE_SCAN; k++) {
      if (cycleShows(k, repeat.chance, seed)) {
        return anchor + k * every + windowMs - now;
      }
    }
    return Infinity;
  };

  if (!cycleShows(index, repeat.chance, seed)) {
    return {
      raw: 0,
      msRemaining: nextReveal(index + 1),
      days,
      valid: true,
      revealed: false,
      windowMs,
      phase: 'hidden',
      ...base,
    };
  }
  if (t < windowMs) {
    return {
      raw: clamp01(t / windowMs),
      msRemaining: windowMs - t,
      days,
      valid: true,
      revealed: false,
      windowMs,
      phase: 'revealing',
      ...base,
    };
  }
  if (t < windowMs + showFor) {
    return {
      raw: 1,
      msRemaining: 0,
      days,
      valid: true,
      revealed: true,
      windowMs,
      phase: 'shown',
      ...base,
      msUntilHide: windowMs + showFor - t,
    };
  }
  return {
    raw: 0,
    msRemaining: nextReveal(index + 1),
    days,
    valid: true,
    revealed: false,
    windowMs,
    phase: 'hidden',
    ...base,
  };
}
