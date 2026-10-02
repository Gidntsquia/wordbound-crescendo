import type { FightModifierId } from '../types';

/** One entry per fight in a run; winning the last one wins the run. */
export interface FightSpec {
  /** The chore this fight is. */
  chore: string;
  /** The quota: points to score before the plays run out. */
  target: number;
  modifier: FightModifierId | null;
  /** Work tiles in the opening hand. */
  clerks: number;
  foremen: number;
}

export const FIGHTS: readonly FightSpec[] = [
  {
    chore: 'Expense Reports',
    target: 60,
    modifier: null,
    clerks: 0,
    foremen: 0,
  },
  { chore: 'Inventory', target: 100, modifier: null, clerks: 0, foremen: 0 },
  {
    chore: 'The Quarterly Filing',
    target: 160,
    modifier: 'shortfuse',
    clerks: 1,
    foremen: 0,
  },
  {
    chore: 'Minutes of the Last Meeting',
    target: 230,
    modifier: null,
    clerks: 1,
    foremen: 1,
  },
  {
    chore: 'The Audit',
    target: 310,
    modifier: 'vowelless',
    clerks: 1,
    foremen: 1,
  },
  { chore: 'Reply-All', target: 410, modifier: null, clerks: 2, foremen: 1 },
  {
    chore: 'Compliance Review',
    target: 540,
    modifier: 'stonelipped',
    clerks: 2,
    foremen: 1,
  },
  {
    chore: 'Year-End Close',
    target: 700,
    modifier: null,
    clerks: 2,
    foremen: 2,
  },
];

/** Kept for callers that only care about the numbers (bot heuristics, tests). */
export const TARGETS = FIGHTS.map((f) => f.target);

export const HAND_SIZE = 8;
export const MIN_WORD_LENGTH = 3;
export const MAX_QUILLS = 6;
export const FIGHT_GOLD = 5;
export const GOLD_PER_SPARE_PLAY = 1;
export const SHOP_REROLL_BASE_COST = 2;
