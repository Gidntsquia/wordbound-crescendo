import {
  FIGHTS,
  HAND_SIZE,
  MIN_WORD_LENGTH,
  PLAYS_PER_FIGHT,
  SWAPS_PER_FIGHT,
} from './content/fights';
import { FIGHT_MODIFIERS } from './content/modifiers';
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
  const spec = FIGHTS[index] ?? FIGHTS[FIGHTS.length - 1];
  const target = spec?.target ?? 0;
  const modifier = spec?.modifier ?? null;
  const playsDelta = modifier ? FIGHT_MODIFIERS[modifier].playsDelta : 0;
  const [shuffled, next] = shuffle(deck, rng);
  const dealt = draw(shuffled, [], HAND_SIZE, next);
  return {
    rng: dealt.rng,
    fight: {
      target,
      score: 0,
      playsLeft: Math.max(1, PLAYS_PER_FIGHT + playsDelta),
      swapsLeft: SWAPS_PER_FIGHT,
      hand: dealt.drawn,
      drawPile: dealt.drawPile,
      discardPile: dealt.discardPile,
      modifier,
    },
  };
}

export type PlayOutcome =
  | { ok: true; fight: Fight; play: WordPlay; rng: number }
  | { ok: false; reason: string };

export interface PlayRunContext {
  fightIndex: number;
  gold: number;
  previousPoints: number;
}

/** Plays the tiles (in order) as a word; rejects short or unknown words. */
export function playWord(
  fight: Fight,
  tileIds: readonly number[],
  quills: readonly QuillId[],
  dictionary: Dictionary,
  rng: number,
  runCtx: PlayRunContext,
): PlayOutcome {
  const tiles = pick(fight.hand, tileIds);
  if (!tiles || fight.playsLeft <= 0) return { ok: false, reason: 'No play.' };
  const word = tiles.map((t) => t.letter).join('');
  if (word.length < MIN_WORD_LENGTH) {
    return { ok: false, reason: `Words need ${MIN_WORD_LENGTH}+ letters.` };
  }
  if (!dictionary.has(word)) {
    return { ok: false, reason: `${word} is not a word.` };
  }
  const playsDelta = fight.modifier
    ? FIGHT_MODIFIERS[fight.modifier].playsDelta
    : 0;
  const startingPlays = Math.max(1, PLAYS_PER_FIGHT + playsDelta);
  const wordsPlayedThisFight = startingPlays - fight.playsLeft;
  const play = scoreWord(tiles, quills, {
    fightIndex: runCtx.fightIndex,
    wordsPlayedThisFight,
    swapsLeft: fight.swapsLeft,
    playsLeftAfter: fight.playsLeft - 1,
    gold: runCtx.gold,
    previousPoints: runCtx.previousPoints,
    modifier: fight.modifier,
  });
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
