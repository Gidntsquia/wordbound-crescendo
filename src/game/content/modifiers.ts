import { letterValue } from './letters';
import type { FightModifierId, Tally } from '../types';

export interface FightModifierDef {
  id: FightModifierId;
  name: string;
  description: string;
  /** Extra plays subtracted from the normal allowance for this fight. */
  playsDelta: number;
  /** Applied after marks and quills, before chips × mult. */
  applyLate(tally: Tally, ctx: { word: string; baseMult: number }): Tally;
}

export const FIGHT_MODIFIERS: Record<FightModifierId, FightModifierDef> = {
  vowelless: {
    id: 'vowelless',
    name: 'Vowelless',
    description: 'Vowels are worth 0 chips this fight.',
    playsDelta: 0,
    applyLate: (t, c) => {
      const vowelChips = [...c.word]
        .filter((l) => 'AEIOU'.includes(l))
        .reduce((sum, l) => sum + letterValue(l), 0);
      return { ...t, chips: Math.max(0, t.chips - vowelChips) };
    },
  },
  shortfuse: {
    id: 'shortfuse',
    name: 'Short Fuse',
    description: 'One fewer play this fight.',
    playsDelta: -1,
    applyLate: (t) => t,
  },
  stonelipped: {
    id: 'stonelipped',
    name: 'Stone-Lipped',
    description: 'Mult can never rise more than 3 above a word’s base mult.',
    playsDelta: 0,
    applyLate: (t, c) => ({ ...t, mult: Math.min(t.mult, c.baseMult + 3) }),
  },
};
