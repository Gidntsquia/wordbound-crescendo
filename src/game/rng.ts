// Seeded randomness as plain data: the RNG state is a number kept in the run
// state, so every game transition stays a pure function of (state, action).
// Algorithm: mulberry32, copied from the old game's src/engine/rng.ts.

/** Returns a float in [0, 1) and the next RNG state. */
export function nextFloat(state: number): [number, number] {
  const next = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(next ^ (next >>> 15), 1 | next);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

/** Fisher–Yates shuffle; returns a new array and the next RNG state. */
export function shuffle<T>(items: readonly T[], state: number): [T[], number] {
  const out = [...items];
  let rng = state;
  for (let i = out.length - 1; i > 0; i--) {
    const [f, next] = nextFloat(rng);
    rng = next;
    const j = Math.floor(f * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return [out, rng];
}

/** Picks `count` distinct items at random. */
export function sample<T>(
  items: readonly T[],
  count: number,
  state: number,
): [T[], number] {
  const [shuffled, next] = shuffle(items, state);
  return [shuffled.slice(0, count), next];
}
