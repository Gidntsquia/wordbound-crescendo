// TS port of js/core/rng.js (READ_SLOWLY_PLAN.md A2). Also attaches to
// window.Game.RNG so the still-untyped js/wordbound/* consumers keep working
// during the migration (the window shim, removed once everything reading
// window.Game.RNG has been ported to import from here directly).

export interface RngStream {
  seed: number;
  next(): number;
  randInt(min: number, max: number): number;
  randFloat(min: number, max: number): number;
  choice<T>(arr: T[] | undefined | null): T | undefined;
  weightedChoice<T>(
    items: T[] | undefined | null,
    weightFn?: (item: T) => number,
  ): T | undefined;
  shuffle<T>(arr: T[]): T[];
  chance(probability: number): boolean;
}

// mulberry32: small, fast, decent-quality seeded PRNG.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStringToSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff);
}

// Creates an independent RNG stream. Pass a number or a string (hashed).
export function create(seed: number | string): RngStream {
  const seedNum =
    typeof seed === 'number' ? seed >>> 0 : hashStringToSeed(String(seed));
  const next = mulberry32(seedNum);

  return {
    seed: seedNum,
    next,

    // inclusive on both ends
    randInt(min, max) {
      return Math.floor(next() * (max - min + 1)) + min;
    },

    randFloat(min, max) {
      return next() * (max - min) + min;
    },

    choice(arr) {
      if (!arr || arr.length === 0) return undefined;
      return arr[Math.floor(next() * arr.length)];
    },

    // items: array of anything; weightFn(item) -> number (default: item.weight || 1)
    weightedChoice<T>(
      items: T[] | undefined | null,
      weightFn?: (item: T) => number,
    ) {
      if (!items || items.length === 0) return undefined;
      const wf =
        weightFn || ((it: T) => (it as { weight?: number })?.weight || 1);
      const total = items.reduce((sum, it) => sum + wf(it), 0);
      if (total <= 0) return items[Math.floor(next() * items.length)];
      let r = next() * total;
      for (const it of items) {
        r -= wf(it);
        if (r <= 0) return it;
      }
      return items[items.length - 1];
    },

    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const tmp = a[i]!;
        a[i] = a[j]!;
        a[j] = tmp;
      }
      return a;
    },

    chance(probability) {
      return next() < probability;
    },
  };
}

// --- Pure functional RNG for immutable state (READ_SLOWLY_PLAN.md A3) ---
// A RngState is just a seed; next() returns [value, nextState] instead of
// mutating anything. Same mulberry32 stream as RngStream.create above, so a
// pure-state replay and a mutable-stream replay of the same seed produce the
// same sequence of draws.
export interface RngState {
  readonly seed: number;
}

export function fromSeed(seed: number | string): RngState {
  return {
    seed:
      typeof seed === 'number' ? seed >>> 0 : hashStringToSeed(String(seed)),
  };
}

export function next(state: RngState): [number, RngState] {
  let a = state.seed | 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, { seed: a >>> 0 }];
}

export function randInt(
  state: RngState,
  min: number,
  max: number,
): [number, RngState] {
  const [v, s] = next(state);
  return [Math.floor(v * (max - min + 1)) + min, s];
}

export function randFloat(
  state: RngState,
  min: number,
  max: number,
): [number, RngState] {
  const [v, s] = next(state);
  return [v * (max - min) + min, s];
}

export function choice<T>(
  state: RngState,
  arr: readonly T[],
): [T | undefined, RngState] {
  if (arr.length === 0) return [undefined, state];
  const [v, s] = next(state);
  return [arr[Math.floor(v * arr.length)], s];
}

export function weightedChoice<T>(
  state: RngState,
  items: readonly T[],
  weightFn?: (item: T) => number,
): [T | undefined, RngState] {
  if (items.length === 0) return [undefined, state];
  const wf = weightFn || ((it: T) => (it as { weight?: number })?.weight || 1);
  const total = items.reduce((sum, it) => sum + wf(it), 0);
  const [v, s] = next(state);
  if (total <= 0) return [items[Math.floor(v * items.length)], s];
  let r = v * total;
  for (const it of items) {
    r -= wf(it);
    if (r <= 0) return [it, s];
  }
  return [items[items.length - 1], s];
}

export function shuffle<T>(
  state: RngState,
  arr: readonly T[],
): [T[], RngState] {
  const a = arr.slice();
  let s = state;
  for (let i = a.length - 1; i > 0; i--) {
    const [v, s2] = next(s);
    s = s2;
    const j = Math.floor(v * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return [a, s];
}

export function chance(
  state: RngState,
  probability: number,
): [boolean, RngState] {
  const [v, s] = next(state);
  return [v < probability, s];
}

declare global {
  interface Window {
    Game: {
      RNG: {
        hashStringToSeed: typeof hashStringToSeed;
        randomSeed: typeof randomSeed;
        create: typeof create;
      };
    };
  }
}

window.Game = window.Game || { RNG: {} as Window['Game']['RNG'] };
window.Game.RNG.hashStringToSeed = hashStringToSeed;
window.Game.RNG.randomSeed = randomSeed;
window.Game.RNG.create = create;
