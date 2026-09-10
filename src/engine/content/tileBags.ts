// TS port of src/sandbox/tileBags.js (READ_SLOWLY_PLAN.md A2/A5 step 3): the
// three bags (weak/normal/strong, 26 tiles each) a fight's deck starts from
// -- NOT Tiles.createStarterDeck(). See the original file's header comment
// (still in git history) for the measured strength table behind the counts.
import type { Tile } from '../tiles';
import { createTile } from '../tiles';
import { isAvailable } from '../meta/stolenLetters';

export interface TileBag {
  id: string;
  label: string;
  blurb: string;
  counts: Record<string, number>;
}

export const TILE_BAGS: TileBag[] = [
  {
    id: 'weak',
    label: 'Pied case',
    blurb:
      'Somebody kicked the case over — three U’s, one lonely E, no S at ' +
      'all, and every awkward sort in the drawer. Sets short, sets often.',
    counts: {
      A: 2,
      B: 1,
      C: 1,
      D: 1,
      E: 1,
      F: 1,
      G: 1,
      H: 1,
      I: 3,
      J: 1,
      K: 1,
      M: 1,
      O: 3,
      P: 1,
      U: 3,
      V: 1,
      W: 1,
      Y: 1,
      Z: 1,
    },
  },
  {
    id: 'normal',
    label: 'House case',
    blurb:
      'The case as the shop keeps it — one of nearly everything, the ' +
      'good sorts and the bad in the same drawer.',
    counts: {
      A: 3,
      B: 1,
      C: 1,
      D: 1,
      E: 2,
      F: 1,
      G: 1,
      H: 1,
      I: 2,
      K: 1,
      L: 1,
      M: 1,
      N: 1,
      O: 2,
      P: 1,
      R: 1,
      S: 1,
      T: 1,
      U: 1,
      Y: 1,
    },
  },
  {
    id: 'strong',
    label: 'Foundry font',
    blurb:
      'Cast fresh and weighted for speed — four E’s and the whole bingo ' +
      'stem. Almost every rack sets a long line.',
    counts: {
      A: 3,
      C: 1,
      D: 1,
      E: 4,
      G: 1,
      I: 2,
      L: 1,
      N: 2,
      O: 2,
      R: 3,
      S: 3,
      T: 2,
      U: 1,
    },
  },
];

export function getTileBag(id: string | null | undefined): TileBag {
  return TILE_BAGS.find((bag) => bag.id === id) ?? TILE_BAGS[1]!;
}

// A letter still stolen (stolenLetters.ts) is dropped from the bag entirely
// rather than reduced in count. `won` is the caller's won-letters list
// (READ_SLOWLY_PLAN.md A2 remainder -- a plain parameter, not a window
// global); an empty list means every letter is available. Built in
// sorted-letter order so a bag written with its letters in a different
// order cannot shuffle differently under the same seed.
export function createBagDeck(
  bagId: string | null | undefined,
  won: readonly string[] = [],
): Tile[] {
  const counts = getTileBag(bagId).counts;
  const deck: Tile[] = [];
  Object.keys(counts)
    .sort()
    .forEach((letter) => {
      if (!isAvailable(letter, won)) return;
      for (let i = 0; i < counts[letter]!; i++)
        deck.push(createTile(letter, null));
    });
  return deck;
}
