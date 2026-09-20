import { letterValue } from './content/letters';
import { MARKS } from './content/marks';
import { QUILLS } from './content/quills';
import type { QuillId, Tally, Tile, WordPlay } from './types';

/** Base mult grows with word length: 3 letters ×1 … 7 letters ×5. */
export function baseMult(length: number): number {
  return Math.max(1, length - 2);
}

/**
 * Scores a word: tile chips + mark bonuses, then quills left to right,
 * then chips × mult. Pure — the same tiles and quills always give the same play.
 */
export function scoreWord(
  tiles: readonly Tile[],
  quills: readonly QuillId[],
): WordPlay {
  const word = tiles.map((t) => t.letter).join('');
  const notes: string[] = [];
  let tally: Tally = {
    chips: tiles.reduce((sum, t) => sum + letterValue(t.letter), 0),
    mult: baseMult(word.length),
  };

  for (const tile of tiles) {
    if (!tile.mark) continue;
    const mark = MARKS[tile.mark];
    const next = mark.apply(tally, {
      letterValue: letterValue(tile.letter),
      wordLength: word.length,
    });
    if (next !== tally) notes.push(`${mark.name} ${tile.letter}`);
    tally = next;
  }

  for (const id of quills) {
    const quill = QUILLS[id];
    const next = quill.apply(tally, { word, tiles });
    if (next.chips !== tally.chips || next.mult !== tally.mult) {
      notes.push(quill.name);
    }
    tally = next;
  }

  return {
    word,
    chips: tally.chips,
    mult: tally.mult,
    points: tally.chips * tally.mult,
    notes,
  };
}
