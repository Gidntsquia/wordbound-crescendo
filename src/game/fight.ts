import {
  HAND_SIZE,
  MIN_WORD_LENGTH,
  PLAYS_PER_FIGHT,
  SWAPS_PER_FIGHT,
  TARGETS,
} from './content/fights';
import type { Dictionary } from './dictionary';
import { shuffle } from './rng';
import { scoreWord } from './score';
import type { Fight, QuillId, Tile, WordPlay } from './types';

/** Draws up to `count` tiles, reshuffling the discard pile in if the draw pile runs out. */
function draw(
  drawPile: readonly Tile[],
  discardPile: readonly Tile[],
  count: number,
  rng: number,
): { drawn: Tile[]; drawPile: Tile[]; discardPile: Tile[]; rng: number } {
  let pile = [...drawPile];
  let discard = [...discardPile];
  let state = rng;
  if (pile.length < count && discard.length > 0) {
    const [shuffled, next] = shuffle(discard, state);
    pile = [...pile, ...shuffled];
    discard = [];
    state = next;
  }
  return {
    drawn: pile.slice(0, count),
    drawPile: pile.slice(count),
    discardPile: discard,
    rng: state,
  };
}

export function startFight(
  deck: readonly Tile[],
  index: number,
  rng: number,
): { fight: Fight; rng: number } {
  const [shuffled, next] = shuffle(deck, rng);
  const dealt = draw(shuffled, [], HAND_SIZE, next);
  return {
    rng: dealt.rng,
    fight: {
      target: TARGETS[index] ?? TARGETS[TARGETS.length - 1] ?? 0,
      score: 0,
      playsLeft: PLAYS_PER_FIGHT,
      swapsLeft: SWAPS_PER_FIGHT,
      hand: dealt.drawn,
      drawPile: dealt.drawPile,
      discardPile: dealt.discardPile,
    },
  };
}

export type PlayOutcome =
  | { ok: true; fight: Fight; play: WordPlay; rng: number }
  | { ok: false; reason: string };

/** Plays the tiles (in order) as a word; rejects short or unknown words. */
export function playWord(
  fight: Fight,
  tileIds: readonly number[],
  quills: readonly QuillId[],
  dictionary: Dictionary,
  rng: number,
): PlayOutcome {
  const tiles = pick(fight.hand, tileIds);
  if (!tiles || fight.playsLeft <= 0) return { ok: false, reason: 'No play.' };
  const play = scoreWord(tiles, quills);
  if (play.word.length < MIN_WORD_LENGTH) {
    return { ok: false, reason: `Words need ${MIN_WORD_LENGTH}+ letters.` };
  }
  if (!dictionary.has(play.word)) {
    return { ok: false, reason: `${play.word} is not a word.` };
  }
  const kept = fight.hand.filter((t) => !tileIds.includes(t.id));
  const refill = draw(
    fight.drawPile,
    [...fight.discardPile, ...tiles],
    HAND_SIZE - kept.length,
    rng,
  );
  return {
    ok: true,
    play,
    rng: refill.rng,
    fight: {
      ...fight,
      score: fight.score + play.points,
      playsLeft: fight.playsLeft - 1,
      hand: [...kept, ...refill.drawn],
      drawPile: refill.drawPile,
      discardPile: refill.discardPile,
    },
  };
}

/** Throws the tiles back and draws replacements. */
export function swapTiles(
  fight: Fight,
  tileIds: readonly number[],
  rng: number,
): { fight: Fight; rng: number } | null {
  const tiles = pick(fight.hand, tileIds);
  if (!tiles || fight.swapsLeft <= 0) return null;
  const kept = fight.hand.filter((t) => !tileIds.includes(t.id));
  // Draw first so the swapped tiles can't come straight back.
  const refill = draw(fight.drawPile, fight.discardPile, tiles.length, rng);
  return {
    rng: refill.rng,
    fight: {
      ...fight,
      swapsLeft: fight.swapsLeft - 1,
      hand: [...kept, ...refill.drawn],
      drawPile: refill.drawPile,
      discardPile: [...refill.discardPile, ...tiles],
    },
  };
}

/** The hand tiles for these ids, in id order given, or null if any is missing/duplicated. */
function pick(hand: readonly Tile[], ids: readonly number[]): Tile[] | null {
  if (ids.length === 0 || new Set(ids).size !== ids.length) return null;
  const tiles = ids.map((id) => hand.find((t) => t.id === id));
  return tiles.every((t): t is Tile => t !== undefined) ? tiles : null;
}
