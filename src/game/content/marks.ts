import type { MarkId, Tally } from '../types';

export interface MarkDef {
  id: MarkId;
  name: string;
  description: string;
  price: number;
  /** Applied once for each marked tile in the played word. */
  apply(tally: Tally, ctx: { letterValue: number; wordLength: number }): Tally;
}

export const MARKS: Record<MarkId, MarkDef> = {
  gilt: {
    id: 'gilt',
    name: 'Gilt',
    description: '+6 chips when played',
    price: 3,
    apply: (t) => ({ ...t, chips: t.chips + 6 }),
  },
  bold: {
    id: 'bold',
    name: 'Bold',
    description: '+1 mult when played',
    price: 3,
    apply: (t) => ({ ...t, mult: t.mult + 1 }),
  },
  double: {
    id: 'double',
    name: 'Double',
    description: 'Letter counts twice',
    price: 3,
    apply: (t, c) => ({ ...t, chips: t.chips + c.letterValue }),
  },
  keen: {
    id: 'keen',
    name: 'Keen',
    description: '+2 mult in words of 5+ letters',
    price: 3,
    apply: (t, c) => (c.wordLength >= 5 ? { ...t, mult: t.mult + 2 } : t),
  },
};

export const MARK_IDS = Object.keys(MARKS) as MarkId[];
