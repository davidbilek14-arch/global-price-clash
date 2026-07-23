import { COMPARISON_POOL } from './comparisons';
import type { Comparison } from './types';

// Deterministic daily selection: same 5 comparisons for everyone on a given day.
// Uses a simple seeded PRNG so the result is stable per day without a backend.

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getDayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDailyComparisons(date = new Date(), count = 5): Comparison[] {
  // The pool is exactly the 5 daily rounds in fixed order — return them as-is
  // so Round 1 through Round 5 always match the intended sequence.
  if (COMPARISON_POOL.length <= count) {
    return [...COMPARISON_POOL];
  }

  const dayKey = getDayKey(date);
  const seed = hashString(`world-price-clash-${dayKey}`);
  const rng = mulberry32(seed);

  const pool = [...COMPARISON_POOL];
  const selected: Comparison[] = [];

  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
    selected.push(pool.splice(idx, 1)[0]);
  }

  return selected;
}
