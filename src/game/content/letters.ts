// Scrabble-style letter values and the starting bag.

const VALUES: Record<string, number> = {
  A: 1,
  B: 3,
  C: 3,
  D: 2,
  E: 1,
  F: 4,
  G: 2,
  H: 4,
  I: 1,
  J: 8,
  K: 5,
  L: 1,
  M: 3,
  N: 1,
  O: 1,
  P: 3,
  Q: 10,
  R: 1,
  S: 1,
  T: 1,
  U: 1,
  V: 4,
  W: 4,
  X: 8,
  Y: 4,
  Z: 10,
};

export function letterValue(letter: string): number {
  return VALUES[letter] ?? 0;
}

// Starting bag: the old game's "house case" idea (src/engine/content/tileBags.ts)
// re-counted for a 36-tile deck.
export const STARTER_BAG: Record<string, number> = {
  A: 3,
  B: 1,
  C: 1,
  D: 2,
  E: 5,
  F: 1,
  G: 1,
  H: 1,
  I: 3,
  K: 1,
  L: 2,
  M: 1,
  N: 2,
  O: 3,
  P: 1,
  R: 2,
  S: 2,
  T: 2,
  U: 1,
  Y: 1,
};
