// TS port of src/sandbox/wordFinder.js (READ_SLOWLY_PLAN.md A2/A5 step 3):
// the WORD MAKER anagram solver (findWords -- every letter given or nothing)
// and the separate bestFromRack subset search ("what could I play at all?").
// The map is built once, lazily, on the first search and cached for the rest
// of the session. Still attaches to window.Wordbound.Sandbox for the untyped
// sandbox modules (items.ts's Harmony/round.js/RoundSandbox) that read it off
// the global.
import '../sandboxGlobal';

export interface WordScore {
  word: string;
  score: number;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let anagramMap: Map<string, string[]> | null = null;

// Built in slices so the page keeps painting while the helper warms up
// (warmWordMaker); a search that lands before the slices are done finishes
// the job synchronously (buildMap), so nothing ever has to wait on it.
let builtUpTo = 0;
const SLICE = 40000;

function buildSlice(map: Map<string, string[]>, list: string[], upTo: number) {
  for (let i = builtUpTo; i < upTo; i++) {
    const w = list[i]!;
    if (w.length < 2) continue;
    const key = w.split('').sort().join('');
    const bucket = map.get(key);
    if (bucket) bucket.push(w);
    else map.set(key, [w]);
  }
  builtUpTo = upTo;
}

function buildMap(): Map<string, string[]> {
  const list = window.Wordbound.WORDLIST || [];
  if (!anagramMap) anagramMap = new Map();
  if (builtUpTo < list.length) buildSlice(anagramMap, list, list.length);
  return anagramMap;
}

export function isWordMakerReady(): boolean {
  return !!anagramMap && builtUpTo >= (window.Wordbound.WORDLIST || []).length;
}

export function warmWordMaker(onDone?: () => void): void {
  const list = window.Wordbound.WORDLIST || [];
  if (!anagramMap) anagramMap = new Map();
  const step = () => {
    if (builtUpTo >= list.length) {
      if (onDone) onDone();
      return;
    }
    buildSlice(anagramMap!, list, Math.min(list.length, builtUpTo + SLICE));
    setTimeout(step, 0);
  };
  step();
}

function splitLetters(letters: string): { fixed: string[]; blanks: number } {
  let chars = String(letters || '')
    .toUpperCase()
    .replace(/[^A-Z?]/g, '')
    .split('');
  if (chars.length > 12) chars = chars.slice(0, 12);
  const fixed: string[] = [];
  let blanks = 0;
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === '?') blanks++;
    else fixed.push(chars[i]!);
  }
  if (blanks > 2) blanks = 2; // 26^3 substitutions is not worth it
  return { fixed, blanks };
}

// letters: a string like "DISTGE" ('?' = blank wildcard).
// score: optional (word) -> number ranking function; defaults to length.
// Returns [{ word, score }] best-first, at most `limit` entries.
//
// EVERY letter must be used. A blank stands in for one letter of the answer,
// so it is still consumed -- "?IGEST" spells DIGEST, but "DIGESTZ" spells
// nothing at all.
export function findWords(
  letters: string,
  score?: (word: string) => number,
  limit?: number,
): WordScore[] {
  const map = buildMap();
  const scoreOf = score || ((w: string) => w.length);
  const max = limit || 8;
  const split = splitLetters(letters);
  const fixed = split.fixed;
  if (fixed.length + split.blanks < 2) return [];

  const found = new Map<string, number>();
  function consider(set: string[]) {
    const bucket = map.get(set.slice().sort().join(''));
    if (!bucket) return;
    for (const w of bucket) {
      if (!found.has(w)) found.set(w, scoreOf(w));
    }
  }

  if (split.blanks === 0) {
    consider(fixed);
  } else if (split.blanks === 1) {
    for (let a = 0; a < 26; a++) consider(fixed.concat([ALPHABET[a]!]));
  } else {
    for (let b1 = 0; b1 < 26; b1++) {
      for (let b2 = b1; b2 < 26; b2++)
        consider(fixed.concat([ALPHABET[b1]!, ALPHABET[b2]!]));
    }
  }

  const out: WordScore[] = [];
  found.forEach((value, key) => {
    out.push({ word: key, score: value });
  });
  out.sort((x, y) => y.score - x.score || x.word.localeCompare(y.word));
  return out.slice(0, max);
}

// The other question: "given this whole rack, what is the best thing I can
// play?" That one IS a subset search -- a rack is a hand to choose from, not
// a set of letters to consume. The UI uses it to FILL the field with the
// winning word's own letters, so what the player then sees selected still
// spells that word exactly and findWords above still agrees.
export function bestFromRack(
  letters: string,
  score?: (word: string) => number,
  limit?: number,
): WordScore[] {
  const map = buildMap();
  const scoreOf = score || ((w: string) => w.length);
  const max = limit || 8;
  const split = splitLetters(letters);
  let fixed = split.fixed;
  if (fixed.length > 10) fixed = fixed.slice(0, 10); // 2^10 subsets is the ceiling

  const found = new Map<string, number>();
  function consider(set: string[]) {
    if (set.length < 2) return;
    const bucket = map.get(set.slice().sort().join(''));
    if (!bucket) return;
    for (const w of bucket) {
      if (!found.has(w)) found.set(w, scoreOf(w));
    }
  }

  const n = fixed.length;
  for (let mask = 0; mask < 1 << n; mask++) {
    const subset: string[] = [];
    for (let bit = 0; bit < n; bit++)
      if (mask & (1 << bit)) subset.push(fixed[bit]!);
    consider(subset);
    if (split.blanks >= 1) {
      for (let a = 0; a < 26; a++) {
        const one = subset.concat([ALPHABET[a]!]);
        consider(one);
        if (split.blanks >= 2) {
          for (let c = a; c < 26; c++) consider(one.concat([ALPHABET[c]!]));
        }
      }
    }
  }

  const out: WordScore[] = [];
  found.forEach((value, key) => {
    out.push({ word: key, score: value });
  });
  out.sort((x, y) => y.score - x.score || x.word.localeCompare(y.word));
  return out.slice(0, max);
}

const Sandbox = window.Wordbound.Sandbox;
Sandbox.isWordMakerReady = isWordMakerReady;
Sandbox.warmWordMaker = warmWordMaker;
Sandbox.findWords = findWords;
Sandbox.bestFromRack = bestFromRack;
