import type { MarkId, Rarity, Tally } from '../types';

export interface MarkContext {
  letterValue: number;
  wordLength: number;
  /** 0-based position of this tile within the played word. */
  position: number;
  /** How many tiles in this play carry a mark (including this one). */
  markedTileCount: number;
  /** How many distinct mark kinds appear in this play (including this one). */
  distinctMarkCount: number;
}

export interface MarkDef {
  id: MarkId;
  name: string;
  description: string;
  price: number;
  rarity: Rarity;
  /** Applied once for each marked tile in the played word, tile order. */
  apply(tally: Tally, ctx: MarkContext): Tally;
}

export const MARKS: Record<MarkId, MarkDef> = {
  gilt: {
    id: 'gilt',
    name: 'Gilt',
    description: '+6 chips when played',
    price: 3,
    rarity: 'common',
    apply: (t) => ({ ...t, chips: t.chips + 6 }),
  },
  bold: {
    id: 'bold',
    name: 'Bold',
    description: '+1 mult when played',
    price: 4,
    rarity: 'common',
    apply: (t) => ({ ...t, mult: t.mult + 1 }),
  },
  double: {
    id: 'double',
    name: 'Double',
    description: 'Letter counts twice',
    price: 3,
    rarity: 'common',
    apply: (t, c) => ({ ...t, chips: t.chips + c.letterValue }),
  },
  keen: {
    id: 'keen',
    name: 'Keen',
    description: '+2 mult in words of 5+ letters',
    price: 4,
    rarity: 'uncommon',
    apply: (t, c) => (c.wordLength >= 5 ? { ...t, mult: t.mult + 2 } : t),
  },
  edge: {
    id: 'edge',
    name: 'Edge',
    description: '+8 chips when played as the first or last letter',
    price: 4,
    rarity: 'uncommon',
    apply: (t, c) =>
      c.position === 0 || c.position === c.wordLength - 1
        ? { ...t, chips: t.chips + 8 }
        : t,
  },
  echo: {
    id: 'echo',
    name: 'Echo',
    description: '+3 chips for every other marked tile in the same word',
    price: 5,
    rarity: 'uncommon',
    apply: (t, c) => ({
      ...t,
      chips: t.chips + 3 * Math.max(0, c.markedTileCount - 1),
    }),
  },
  anchor: {
    id: 'anchor',
    name: 'Anchor',
    description: '+3 mult in 3-letter words',
    price: 4,
    rarity: 'uncommon',
    apply: (t, c) => (c.wordLength === 3 ? { ...t, mult: t.mult + 3 } : t),
  },
  prism: {
    id: 'prism',
    name: 'Prism',
    description: '+4 chips per distinct mark kind in the word',
    price: 6,
    rarity: 'rare',
    apply: (t, c) => ({ ...t, chips: t.chips + 4 * c.distinctMarkCount }),
  },
};

export const MARK_IDS = Object.keys(MARKS) as MarkId[];
