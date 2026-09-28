import type { FightModifierId } from '../types';

/** One entry per fight in a run; winning the last one wins the run. */
export interface FightSpec {
  target: number;
  modifier: FightModifierId | null;
}

export const FIGHTS: readonly FightSpec[] = [
  { target: 60, modifier: null },
  { target: 100, modifier: null },
  { target: 160, modifier: 'shortfuse' },
  { target: 230, modifier: null },
  { target: 310, modifier: 'vowelless' },
  { target: 410, modifier: null },
  { target: 540, modifier: 'stonelipped' },
  { target: 700, modifier: null },
];

/** Kept for callers that only care about the numbers (bot heuristics, tests). */
export const TARGETS = FIGHTS.map((f) => f.target);

export const HAND_SIZE = 8;
export const PLAYS_PER_FIGHT = 4;
export const SWAPS_PER_FIGHT = 3;
export const MIN_WORD_LENGTH = 3;
export const MAX_QUILLS = 6;
export const FIGHT_GOLD = 5;
export const GOLD_PER_SPARE_PLAY = 1;
export const SHOP_REROLL_BASE_COST = 2;
