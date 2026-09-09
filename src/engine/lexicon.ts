// TS port of js/wordbound/lexicon.js (READ_SLOWLY_PLAN.md A2): turns a rack
// of letter tiles into a scored, dictionary-validated word. Still attaches
// to window.Wordbound.Lexicon (typed in tiles.ts's Window augmentation) for
// the untyped js/wordbound/* and sandbox modules that read it off the
// global (removed once every reader imports directly).
import type { Tile } from './tiles';

const LETTER_VALUES: Record<string, number> = {
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
  '?': 0,
};

const LETTER_POOL: Record<string, number> = {
  A: 9,
  B: 2,
  C: 2,
  D: 4,
  E: 12,
  F: 2,
  G: 3,
  H: 2,
  I: 9,
  J: 1,
  K: 1,
  L: 4,
  M: 2,
  N: 6,
  O: 8,
  P: 2,
  Q: 1,
  R: 6,
  S: 4,
  T: 6,
  U: 4,
  V: 2,
  W: 2,
  X: 1,
  Y: 2,
  Z: 1,
};

export function isValidWord(word: string): boolean {
  if (!word || word.length < 2) return false;
  const upper = word.toUpperCase();
  return window.Wordbound.WORD_SET.has(upper);
}

// Prefers exact-letter matches over blanks: for each letter in the word,
// first try to consume a matching tile from the working rack copy; if none
// left, fall back to a '?' blank tile if available; otherwise the word
// cannot be formed. Does not mutate rack.
export function canFormFromRack(
  word: string,
  rack: Tile[],
): { possible: boolean; tilesUsed: Tile[] | null } {
  const upper = word.toUpperCase();
  const working = rack.slice();
  const tilesUsed: Tile[] = [];

  for (let i = 0; i < upper.length; i++) {
    const letter = upper[i];
    let idx = working.findIndex((t) => t.letter === letter);
    if (idx === -1) idx = working.findIndex((t) => t.letter === '?');
    if (idx === -1) return { possible: false, tilesUsed: null };
    tilesUsed.push(working[idx]!);
    working.splice(idx, 1);
  }

  return { possible: true, tilesUsed };
}

export function removeTiles(rack: Tile[], tilesUsed: Tile[]): void {
  tilesUsed.forEach((tile) => {
    const idx = rack.findIndex((t) => t.id === tile.id);
    if (idx !== -1) rack.splice(idx, 1);
  });
}

// tilesUsed: tiles.ts Tile objects, in the order they spell the word. Rolls
// up each tile's on-play bonus; on-hold bonuses depend on tiles NOT played,
// so the round/combat layer resolves those.
export function scoreWord(
  word: string,
  tilesUsed: Tile[],
  rackCapacity?: number,
) {
  const Tiles = window.Wordbound.Tiles;
  let base = 0;
  let bonusFlat = 0;
  let bonusMult = 1;
  let variantFlat = 0;
  for (const tile of tilesUsed) {
    let letterValue = LETTER_VALUES[tile.letter] || 0;
    if (tile.variant === Tiles.VARIANTS.VOLATILE) letterValue *= 2;
    base += letterValue;
    if (tile.bonus) {
      if (tile.bonus.type === Tiles.BONUS_TYPES.FLAT_ON_PLAY)
        bonusFlat += tile.bonus.amount;
      else if (tile.bonus.type === Tiles.BONUS_TYPES.MULT_ON_PLAY)
        bonusMult *= tile.bonus.amount;
    }
    if (tile.variant === Tiles.VARIANTS.CHARGED) variantFlat += 4;
  }
  const lengthBonus = word.length > 4 ? (word.length - 4) * 2 : 0;
  const capacity = rackCapacity || 7;
  const bingoBonus = tilesUsed.length === capacity ? 15 : 0;
  const total = Math.round(
    (base + lengthBonus + bingoBonus + bonusFlat + variantFlat) * bonusMult,
  );
  return {
    base,
    lengthBonus,
    bingoBonus,
    bonusFlat,
    bonusMult,
    variantFlat,
    total,
  };
}

// sorted-letters -> true, built once and cached, so hasPlayableWord can check
// "does any subset of this rack spell a word" without testing the whole
// wordlist against the rack every time.
let anagramKeySet: Set<string> | null = null;
function getAnagramKeySet(): Set<string> {
  if (anagramKeySet) return anagramKeySet;
  anagramKeySet = new Set();
  const wordlist = window.Wordbound.WORDLIST || [];
  for (const w of wordlist) {
    if (w.length < 2) continue;
    anagramKeySet.add(w.split('').sort().join(''));
  }
  return anagramKeySet;
}

// Shared subset-search core for hasPlayableWord/hasPlayableInvertedWord: is
// there any subset (size >= 2) whose letters, in some order, sort to the
// same key as a real dictionary word?
function anySubsetIsAWord(letters: string[]): boolean {
  const n = letters.length;
  if (n < 2) return false;
  const keys = getAnagramKeySet();
  for (let mask = 1; mask < 1 << n; mask++) {
    const subset: string[] = [];
    for (let bit = 0; bit < n; bit++) {
      if (mask & (1 << bit)) subset.push(letters[bit]!);
    }
    if (subset.length < 2) continue;
    const key = subset.slice().sort().join('');
    if (keys.has(key)) return true;
  }
  return false;
}

// Is there any word this rack can form? Used to detect and avoid a hard
// softlock. Ignores blank ('?') tiles for this fast check (treats a rack
// containing one as always playable).
export function hasPlayableWord(rack: Tile[]): boolean {
  const usable: string[] = [];
  for (const t of rack) {
    if (t.letter === '?') return true;
    usable.push(t.letter);
  }
  return anySubsetIsAWord(usable);
}

// The inverted-score anti-softlock check (ITEMS ticket): a subset's letters
// mapped one-for-one through FLIP_MAP is a bijection, so "does this subset
// have some ordering that flips into a real word" is exactly equivalent to
// "is the mapped subset's sorted-letter key a real word's key" -- the same
// check hasPlayableWord does, against mapped letters.
export function hasPlayableInvertedWord(rack: Tile[]): boolean {
  const Items = window.Wordbound.Items;
  const FLIP_MAP = Items ? Items.FLIP_MAP : null;
  const usable: string[] = [];
  for (const t of rack) {
    const letter = t.letter;
    if (letter === '?') return true;
    const flipped = FLIP_MAP && FLIP_MAP[letter];
    if (flipped) usable.push(flipped);
  }
  return anySubsetIsAWord(usable);
}

window.Wordbound = window.Wordbound || ({} as Window['Wordbound']);
window.Wordbound.Lexicon = {
  LETTER_VALUES,
  LETTER_POOL,
  isValidWord,
  canFormFromRack,
  removeTiles,
  scoreWord,
  hasPlayableWord,
  hasPlayableInvertedWord,
};
