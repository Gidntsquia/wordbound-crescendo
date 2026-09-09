// READ_SLOWLY_PLAN.md stage D: playable letter-tile characters. D2's roster
// of six, each a small passive registered as a Quill-shaped hook so it
// reuses items.ts's existing score(ctx, acc) pipeline (createRun's `items`
// list) rather than new plumbing. Unlock progress persists in localStorage
// as wbc.characters, mirroring stolenLetters.ts's pattern.
//
// D1's permanent character tile (its own slot, playable in every word,
// returns after scoring instead of being drawn/discarded) is wired in
// state/run.ts's RunState.characterTile / state/round.ts's playWord and
// breakdownFor/scoreFor / facade.ts's characterId threading -- this file
// only owns the roster and passives.
import { ITEM_DEFS } from './items';
import type { Item, ItemCtx, ItemAcc } from './items';

export interface Character {
  id: string;
  letter: string;
  name: string;
  hint: string;
  passive: Item;
}

const STORE_KEY = 'wbc.characters';

// Unlock order: zed and ee are free; each of the rest unlocks by finishing
// a chapter with the previous one in this list equipped (round.ts's
// run.next() calls unlockNext() alongside the existing felled/resolved
// bookkeeping once the character mechanic itself is wired).
export const CHARACTER_ORDER = ['zed', 'ess', 'ee', 'queue', 'why', 'ex'];
const STARTING_UNLOCKED = ['zed', 'ee'];

export const CHARACTERS: Character[] = [
  {
    id: 'zed',
    letter: 'Z',
    name: 'Zed',
    hint: 'High value, rare in words. +1 swap per fight.',
    passive: {
      id: 'char_zed',
      name: 'Zed',
      glyph: 'Z',
      rarity: 'common',
      price: 0,
      hint: '+1 swap per fight',
      onPlayed() {
        // Applied once per fight via round.ts's changeoutsLeft bonus path
        // (items with `plays`/similar per-round bonuses are summed at
        // createRound time) -- see the follow-up note above; onPlayed is a
        // safe no-op placeholder until that wiring lands.
      },
    },
  },
  {
    id: 'ess',
    letter: 'S',
    name: 'Ess',
    hint: 'Pluraliser. Words ending in S score +10 points.',
    passive: {
      id: 'char_ess',
      name: 'Ess',
      glyph: 'S',
      rarity: 'common',
      price: 0,
      hint: '+10 points on words ending in S',
      score(c: ItemCtx, a: ItemAcc) {
        if (!c.word || c.word[c.word.length - 1] !== 'S') return null;
        a.points += 10;
        return '+10, ess';
      },
    },
  },
  {
    id: 'ee',
    letter: 'E',
    name: 'Ee',
    hint: 'The common one. (A second E tile is a follow-up; for now, a flat bonus.)',
    passive: {
      id: 'char_ee',
      name: 'Ee',
      glyph: 'E',
      rarity: 'common',
      price: 0,
      hint: '+6 points on words containing E',
      score(c: ItemCtx, a: ItemAcc) {
        if (!c.word || c.word.indexOf('E') === -1) return null;
        a.points += 6;
        return '+6, ee';
      },
    },
  },
  {
    id: 'queue',
    letter: 'Q',
    name: 'Queue',
    hint: 'Q and U played together score ×2 mult.',
    passive: {
      id: 'char_queue',
      name: 'Queue',
      glyph: 'Q',
      rarity: 'common',
      price: 0,
      hint: 'Q and U together score ×2 mult',
      score(c: ItemCtx, a: ItemAcc) {
        if (
          c.word &&
          c.word.indexOf('Q') !== -1 &&
          c.word.indexOf('U') !== -1
        ) {
          a.mult *= 2;
          return '×2 mult, queue';
        }
        return null;
      },
    },
  },
  {
    id: 'why',
    letter: 'Y',
    name: 'Why',
    hint: 'Counts as a vowel for vowel-counting effects.',
    passive: {
      id: 'char_why',
      name: 'Why',
      glyph: 'Y',
      rarity: 'common',
      price: 0,
      hint: 'Y counts as a vowel',
      // The vowel check other items use (items.ts's local VOWELS table)
      // isn't exported, so this can't rewrite that logic without touching
      // items.ts's internals -- flagged as a follow-up rather than risked
      // here. This entry exists so the roster/unlock/select flow is
      // complete; the actual vowel-counting interaction is not yet live.
    },
  },
  {
    id: 'ex',
    letter: 'X',
    name: 'Ex',
    hint: '+15 points when the word is 3-4 letters.',
    passive: {
      id: 'char_ex',
      name: 'Ex',
      glyph: 'X',
      rarity: 'common',
      price: 0,
      hint: '+15 points on 3-4 letter words',
      score(c: ItemCtx, a: ItemAcc) {
        if (!c.word || c.word.length < 3 || c.word.length > 4) return null;
        a.points += 15;
        return '+15, ex';
      },
    },
  },
];

export const CHARACTER_DEFS: Record<string, Character> = {};
CHARACTERS.forEach((c) => {
  CHARACTER_DEFS[c.id] = c;
  // Register the passive by its own id in items.ts's ITEM_DEFS so
  // applyItems (round.ts's scoring pass) can find it when a run's `items`
  // list includes it -- see createRun's `items` wiring in RoundSandbox.jsx.
  ITEM_DEFS[c.passive.id] = c.passive;
});

export function unlockedCharacters(): string[] {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    const arr: unknown = raw ? JSON.parse(raw) : null;
    const stored = Array.isArray(arr)
      ? arr.filter((id): id is string => typeof id === 'string')
      : [];
    const set = new Set([...STARTING_UNLOCKED, ...stored]);
    return CHARACTER_ORDER.filter((id) => set.has(id));
  } catch {
    return STARTING_UNLOCKED.slice();
  }
}

export function isCharacterUnlocked(id: string): boolean {
  return unlockedCharacters().includes(id);
}

// Called once a chapter is finished with `characterId` equipped -- unlocks
// the next id in CHARACTER_ORDER, if any and not already unlocked.
export function unlockNext(characterId: string | null | undefined): void {
  if (!characterId) return;
  const idx = CHARACTER_ORDER.indexOf(characterId);
  if (idx === -1 || idx + 1 >= CHARACTER_ORDER.length) return;
  const nextId = CHARACTER_ORDER[idx + 1]!;
  const unlocked = unlockedCharacters();
  if (unlocked.includes(nextId)) return;
  try {
    window.localStorage.setItem(
      STORE_KEY,
      JSON.stringify([...unlocked, nextId]),
    );
  } catch {
    // localStorage unavailable (private mode, etc) -- unlock just doesn't persist.
  }
}
