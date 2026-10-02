import { FIGHTS, HAND_SIZE, MIN_WORD_LENGTH } from './content/fights';
import { COMPOSERS } from './content/composers';
import { FIGHT_MODIFIERS } from './content/modifiers';
import type { Dictionary } from './dictionary';
import { nextFloat, shuffle } from './rng';
import { scoreWord } from './score';
import type { ComposerId, Fight, QuillId, Tile, WordPlay } from './types';

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

const WORK_LETTERS = 'ETAOINSRHLDCUM';

/** Replaces the front of the opening hand with grey work tiles. Displaced tiles go back to the pile. */
function dealWork(
  hand: Tile[],
  drawPile: Tile[],
  clerks: number,
  foremen: number,
  rng: number,
): { hand: Tile[]; drawPile: Tile[]; rng: number } {
  const kinds = [
    ...Array.from({ length: foremen }, () => 'foreman' as const),
    ...Array.from({ length: clerks }, () => 'clerk' as const),
  ];
  let state = rng;
  const work: Tile[] = kinds.map((kind, i) => {
    const [f, next] = nextFloat(state);
    state = next;
    return {
      id: -1 - i,
      letter: WORK_LETTERS[Math.floor(f * WORK_LETTERS.length)] as string,
      mark: null,
      work: kind,
    };
  });
  // Spread them through the hand rather than bunching at one end.
  const kept = hand.slice(work.length);
  const displaced = hand.slice(0, work.length);
  const out = [...kept];
  work.forEach((w, i) => {
    out.splice(Math.min(out.length, 1 + i * 3), 0, w);
  });
  return { hand: out, drawPile: [...drawPile, ...displaced], rng: state };
}

export function startFight(
  deck: readonly Tile[],
  index: number,
  rng: number,
  composer: ComposerId = 'beethoven',
): { fight: Fight; rng: number } {
  const spec = FIGHTS[index] ?? FIGHTS[FIGHTS.length - 1];
  const target = spec?.target ?? 0;
  const modifier = spec?.modifier ?? null;
  const playsDelta = modifier ? FIGHT_MODIFIERS[modifier].playsDelta : 0;
  const [shuffled, next] = shuffle(deck, rng);
  const dealt = draw(shuffled, [], HAND_SIZE, next);
  const withWork = dealWork(
    dealt.drawn,
    dealt.drawPile,
    spec?.clerks ?? 0,
    spec?.foremen ?? 0,
    dealt.rng,
  );
  const plays = Math.max(1, COMPOSERS[composer].playsPerFight + playsDelta);
  return {
    rng: withWork.rng,
    fight: {
      target,
      score: 0,
      playsLeft: plays,
      playsTotal: plays,
      swapsLeft: COMPOSERS[composer].swapsPerFight,
      hand: withWork.hand,
      drawPile: withWork.drawPile,
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
  const wordsPlayedThisFight = fight.playsTotal - fight.playsLeft;
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
    [...fight.discardPile, ...tiles.filter((t) => !t.work)],
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
      discardPile: [...refill.discardPile, ...tiles.filter((t) => !t.work)],
    },
  };
}

/** The hand tiles for these ids, in id order given, or null if any is missing/duplicated. */
function pick(hand: readonly Tile[], ids: readonly number[]): Tile[] | null {
  if (ids.length === 0 || new Set(ids).size !== ids.length) return null;
  const tiles = ids.map((id) => hand.find((t) => t.id === id));
  return tiles.every((t): t is Tile => t !== undefined) ? tiles : null;
}
