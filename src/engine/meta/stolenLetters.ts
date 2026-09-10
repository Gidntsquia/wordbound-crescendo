// TS port of src/sandbox/stolenLetters.js (READ_SLOWLY_PLAN.md A2/A5 step 3):
// the stolen-letters meta (DIVERGENCE_PLAN.md). Pure functions over a
// `won: readonly string[]` list of letters the player has recovered; the
// app layer owns reading/writing that list through app/persistence.ts's
// `wbc.letters` key (READ_SLOWLY_PLAN.md A2 remainder -- no window/
// localStorage access lives in src/engine). Vowels are never stolen; a lost
// run keeps letters already won.
import type { RngStream } from '../rng';

const VOWELS = 'AEIOU';
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// High-value, rare letters first (the ones a player will miss most), then
// the next tier, then the mid-value consonants -- about six locked at the
// start, leaving roughly twenty available (DIVERGENCE_PLAN.md).
export const STOLEN_ORDER = [
  'J',
  'Q',
  'X',
  'Z',
  'K',
  'W',
  'V',
  'Y',
  'F',
  'H',
  'B',
  'G',
  'M',
  'P',
];
const STARTING_LOCKED = 6; // how many of STOLEN_ORDER are missing on a fresh install

export function missingLetters(won: readonly string[]): string[] {
  const wonSet: Record<string, boolean> = {};
  won.forEach((l) => {
    wonSet[l] = true;
  });
  const locked = STOLEN_ORDER.slice(0, STARTING_LOCKED);
  return locked.filter((l) => !wonSet[l]);
}

export function isAvailable(letter: string, won: readonly string[]): boolean {
  if (VOWELS.indexOf(letter) >= 0) return true;
  return missingLetters(won).indexOf(letter) < 0;
}

export function availableLetters(won: readonly string[]): string[] {
  const missing = missingLetters(won);
  return ALPHABET.split('').filter((l) => missing.indexOf(l) < 0);
}

// Pure: returns a new won list with `letter` added, or the same list
// (by value, a fresh copy) if it was already won. The app layer persists
// the result through app/persistence.ts.
export function addWonLetter(won: readonly string[], letter: string): string[] {
  if (won.indexOf(letter) >= 0) return won.slice();
  return [...won, letter];
}

// Letters still locked beyond STARTING_LOCKED (never offered, never stolen
// further) are not touched here -- STARTING_LOCKED is the whole pool a run
// can ever win back, by design (see DIVERGENCE_PLAN.md).
export function rollLetterChoice(
  rng: RngStream,
  won: readonly string[],
  count?: number,
): string[] | null {
  const missing = missingLetters(won);
  if (!missing.length) return null;
  const shuffled = rng.shuffle(missing);
  return shuffled.slice(0, Math.min(count || 3, shuffled.length));
}

export function filterLetters(
  letters: string[],
  won: readonly string[],
): string[] {
  const avail: Record<string, boolean> = {};
  availableLetters(won).forEach((l) => {
    avail[l] = true;
  });
  return letters.filter((l) => avail[l]);
}
