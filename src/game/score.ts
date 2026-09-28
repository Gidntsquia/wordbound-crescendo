import { letterValue } from './content/letters';
import { MARKS } from './content/marks';
import { FIGHT_MODIFIERS } from './content/modifiers';
import { QUILLS } from './content/quills';
import type { FightModifierId, QuillId, Tally, Tile, WordPlay } from './types';

/** Base mult grows with word length: 3 letters ×1 … 7 letters ×5. */
export function baseMult(length: number): number {
  return Math.max(1, length - 2);
}

export interface ScoreRunContext {
  fightIndex: number;
  wordsPlayedThisFight: number;
  swapsLeft: number;
  playsLeftAfter: number;
  gold: number;
  previousPoints: number;
  modifier: FightModifierId | null;
}

const DEFAULT_CONTEXT: ScoreRunContext = {
  fightIndex: 0,
  wordsPlayedThisFight: 0,
  swapsLeft: 0,
  playsLeftAfter: 0,
  gold: 0,
  previousPoints: 0,
  modifier: null,
};

/**
 * Scores a word: tile chips + mark bonuses, then quills left to right, then
 * a fight modifier if present, then chips × mult. Pure — the same tiles,
 * quills and run context always give the same play.
 */
export function scoreWord(
  tiles: readonly Tile[],
  quills: readonly QuillId[],
  runCtx: Partial<ScoreRunContext> = {},
): WordPlay {
  const ctx = { ...DEFAULT_CONTEXT, ...runCtx };
  const word = tiles.map((t) => t.letter).join('');
  const notes: string[] = [];
  const base: Tally = {
    chips: tiles.reduce((sum, t) => sum + letterValue(t.letter), 0),
    mult: baseMult(word.length),
  };
  const steps: { label: string; tally: Tally }[] = [
    { label: 'Base', tally: base },
  ];
  let tally = base;

  const markedTileCount = tiles.filter((t) => t.mark).length;
  const distinctMarkCount = new Set(
    tiles
      .map((t) => t.mark)
      .filter((m): m is NonNullable<typeof m> => m !== null),
  ).size;

  tiles.forEach((tile, position) => {
    if (!tile.mark) return;
    const mark = MARKS[tile.mark];
    const next = mark.apply(tally, {
      letterValue: letterValue(tile.letter),
      wordLength: word.length,
      position,
      markedTileCount,
      distinctMarkCount,
    });
    if (next.chips !== tally.chips || next.mult !== tally.mult) {
      notes.push(`${mark.name} (${tile.letter})`);
      steps.push({ label: `${mark.name} ${tile.letter}`, tally: next });
    }
    tally = next;
  });

  quills.forEach((id, index) => {
    const quill = QUILLS[id];
    const next = quill.apply(tally, {
      word,
      tiles,
      fightIndex: ctx.fightIndex,
      wordsPlayedThisFight: ctx.wordsPlayedThisFight,
      swapsLeft: ctx.swapsLeft,
      playsLeftAfter: ctx.playsLeftAfter,
      quillsOwned: quills,
      gold: ctx.gold,
      previousPoints: ctx.previousPoints,
      markedTileCount,
    });
    if (next.chips !== tally.chips || next.mult !== tally.mult) {
      notes.push(quill.name);
      steps.push({ label: quill.name, tally: next });
    }
    tally = next;
    void index;
  });

  if (ctx.modifier) {
    const modifier = FIGHT_MODIFIERS[ctx.modifier];
    const next = modifier.applyLate(tally, { word, baseMult: base.mult });
    if (next.chips !== tally.chips || next.mult !== tally.mult) {
      notes.push(modifier.name);
      steps.push({ label: modifier.name, tally: next });
    }
    tally = next;
  }

  return {
    word,
    chips: tally.chips,
    mult: tally.mult,
    points: tally.chips * tally.mult,
    notes,
    steps,
  };
}
