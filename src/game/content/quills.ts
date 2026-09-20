import type { QuillId, Tally, Tile } from '../types';
import { letterValue } from './letters';

export interface QuillDef {
  id: QuillId;
  name: string;
  description: string;
  price: number;
  /** Passive scoring hook; quills fire in the order they were bought. */
  apply(tally: Tally, ctx: { word: string; tiles: readonly Tile[] }): Tally;
}

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

export const QUILLS: Record<QuillId, QuillDef> = {
  inkpot: {
    id: 'inkpot',
    name: 'Ink Pot',
    description: '+8 chips on every word',
    price: 4,
    apply: (t) => ({ ...t, chips: t.chips + 8 }),
  },
  metronome: {
    id: 'metronome',
    name: 'Metronome',
    description: '+1 mult on every word',
    price: 5,
    apply: (t) => ({ ...t, mult: t.mult + 1 }),
  },
  chorus: {
    id: 'chorus',
    name: 'Vowel Chorus',
    description: '+3 chips for each vowel',
    price: 5,
    apply: (t, c) => ({
      ...t,
      chips: t.chips + 3 * [...c.word].filter((l) => VOWELS.has(l)).length,
    }),
  },
  longhand: {
    id: 'longhand',
    name: 'Longhand',
    description: '+2 mult on words of 5+ letters',
    price: 6,
    apply: (t, c) => (c.word.length >= 5 ? { ...t, mult: t.mult + 2 } : t),
  },
  rarekey: {
    id: 'rarekey',
    name: 'Rare Key',
    description: '+10 chips if a letter is worth 4+',
    price: 4,
    apply: (t, c) =>
      [...c.word].some((l) => letterValue(l) >= 4)
        ? { ...t, chips: t.chips + 10 }
        : t,
  },
  shortnotes: {
    id: 'shortnotes',
    name: 'Short Notes',
    description: '+20 chips on 3-letter words',
    price: 4,
    apply: (t, c) => (c.word.length === 3 ? { ...t, chips: t.chips + 20 } : t),
  },
};

export const QUILL_IDS = Object.keys(QUILLS) as QuillId[];
