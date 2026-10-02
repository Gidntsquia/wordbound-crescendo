import type { FightModifierId, Tally } from '../types';

export interface FightModifierDef {
  id: FightModifierId;
  name: string;
  description: string;
  /** Extra plays subtracted from the normal allowance for this fight. */
  playsDelta: number;
  /** Applied after marks and quills, before chips × mult. */
  applyLate(
    tally: Tally,
    ctx: { word: string; baseMult: number; chipValues: readonly number[] },
  ): Tally;
}

export const FIGHT_MODIFIERS: Record<FightModifierId, FightModifierDef> = {
  vowelless: {
    id: 'vowelless',
    name: 'Audit rules',
    description: 'Vowels count for nothing.',
    playsDelta: 0,
    applyLate: (t, c) => {
      const vowelChips = [...c.word].reduce(
        (sum, l, i) =>
          'AEIOU'.includes(l) ? sum + (c.chipValues[i] ?? 0) : sum,
        0,
      );
      return { ...t, chips: Math.max(0, t.chips - vowelChips) };
    },
  },
  shortfuse: {
    id: 'shortfuse',
    name: 'Due by five',
    description: 'One fewer play.',
    playsDelta: -1,
    applyLate: (t) => t,
  },
  stonelipped: {
    id: 'stonelipped',
    name: 'By the book',
    description: 'Mult may not rise more than 3 above the word’s base.',
    playsDelta: 0,
    applyLate: (t, c) => ({ ...t, mult: Math.min(t.mult, c.baseMult + 3) }),
  },
};
