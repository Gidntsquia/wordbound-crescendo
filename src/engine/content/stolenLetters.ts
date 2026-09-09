// TS port of src/sandbox/stolenLetters.js (READ_SLOWLY_PLAN.md A2/A5 step 3):
// the stolen-letters meta (DIVERGENCE_PLAN.md). Persisted in localStorage as
// wbc.letters (a JSON array of won letters). Vowels are never stolen; a lost
// run keeps letters already won. Still attaches to window.Wordbound.Sandbox
// for the untyped sandbox modules (tileBags.js/round.js/RoundSandbox) that
// read it off the global.
import '../sandboxGlobal';
import type { RngStream } from '../rng';

const VOWELS = 'AEIOU';
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const STORE_KEY = 'wbc.letters';

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

export function wonLetters(): string[] {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    const arr: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(arr)
      ? arr.filter((l): l is string => typeof l === 'string')
      : [];
  } catch {
    return [];
  }
}

export function missingLetters(): string[] {
  const won: Record<string, boolean> = {};
  wonLetters().forEach((l) => {
    won[l] = true;
  });
  const locked = STOLEN_ORDER.slice(0, STARTING_LOCKED);
  return locked.filter((l) => !won[l]);
}

export function isAvailable(letter: string): boolean {
  if (VOWELS.indexOf(letter) >= 0) return true;
  return missingLetters().indexOf(letter) < 0;
}

export function availableLetters(): string[] {
  const missing = missingLetters();
  return ALPHABET.split('').filter((l) => missing.indexOf(l) < 0);
}

export function winLetter(letter: string): boolean {
  const won = wonLetters();
  if (won.indexOf(letter) >= 0) return false;
  won.push(letter);
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(won));
  } catch {
    /* private mode etc */
  }
  return true;
}

// Letters still locked beyond STARTING_LOCKED (never offered, never stolen
// further) are not touched here -- STARTING_LOCKED is the whole pool a run
// can ever win back, by design (see DIVERGENCE_PLAN.md).
export function rollLetterChoice(
  rng: RngStream,
  count?: number,
): string[] | null {
  const missing = missingLetters();
  if (!missing.length) return null;
  const shuffled = rng.shuffle(missing);
  return shuffled.slice(0, Math.min(count || 3, shuffled.length));
}

export function filterLetters(letters: string[]): string[] {
  const avail: Record<string, boolean> = {};
  availableLetters().forEach((l) => {
    avail[l] = true;
  });
  return letters.filter((l) => avail[l]);
}

const Sandbox = window.Wordbound.Sandbox;
Sandbox.STOLEN_ORDER = STOLEN_ORDER;
Sandbox.wonLetters = wonLetters;
Sandbox.missingLetters = missingLetters;
Sandbox.isAvailable = isAvailable;
Sandbox.availableLetters = availableLetters;
Sandbox.winLetter = winLetter;
Sandbox.rollLetterChoice = rollLetterChoice;
Sandbox.filterLetters = filterLetters;

window.Wordbound.StolenLetters = {
  isStolen: (letter: string) => !isAvailable(letter),
};
