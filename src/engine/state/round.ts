// READ_SLOWLY_PLAN.md A3: immutable RoundState + pure transitions, ported
// from content/round.ts's mutable `Round` (createRound/playWord/changeout/
// destroyTile/moveTile). Same RNG call order as the mutable version (rollPremium
// then draw the rack), so a replay from the same RngState produces the same
// premium slot, rack and scores -- verified against tools/parity-old.ts's
// trace by tools/parity-new.ts.
//
// scoreWordPoints (content/round.ts) is reused unchanged: it only *reads*
// ctx.round (.rule, .premium, .playsLeft, .plays.length), so RoundState can
// be passed in directly. Anything an item's onPlayed hook would have done to
// the run (content/items.ts, e.g. refrain's counter, sustain's
// extendCrescendo) is not run here -- it comes back as `effects` on the
// PlayResult for the caller (the store, once A3 lands there) to apply to
// RunState after dispatch, instead of mutating during scoring.
import type { Tile } from '../tiles';
import type { RngState } from '../rng';
import * as rng from '../rng';
import type { Enemy, Rule } from '../content/enemies';
import type { Breakdown, PremiumKind, Tune } from '../content/round';
import {
  PREMIUM_KINDS,
  ROUND_DEFAULTS,
  scoreWordPoints,
} from '../content/round';
import { ITEM_DEFS } from '../content/items';

export interface Premium {
  pos: number;
  kind: 'dl' | 'tl' | 'dw';
}

export interface Play {
  word: string;
  breakdown: Breakdown;
  tiles: Tile[];
}

export interface Pile {
  readonly drawPile: readonly Tile[];
  readonly discardPile: readonly Tile[];
}

export interface RoundState {
  readonly tune: Tune;
  readonly target: number;
  readonly situation: string | null;
  readonly rule: Rule | null;
  readonly usedLetters: Readonly<Record<string, boolean>>;
  readonly reward: number;
  readonly playsLeft: number;
  readonly changeoutsLeft: number;
  readonly rackSize: number;
  readonly items: readonly string[];
  readonly tierLevels: Readonly<Record<string, number>>;
  readonly score: number;
  readonly ink: number;
  readonly state: 'live' | 'won' | 'lost';
  readonly plays: readonly Play[];
  readonly pile: Pile;
  readonly rack: readonly Tile[];
  readonly premium: Premium | null;
  readonly favour?: string | null;
}

export interface CreateRoundStateOpts {
  deck?: Tile[];
  tune?: Partial<Tune>;
  items?: string[];
  tierLevels?: Record<string, number>;
  rule?: Rule | null;
  target?: number;
  reward?: number;
  situation?: string | null;
  pile?: Pile;
  noPremium?: boolean;
}

// Same shape as content/tiles.ts's draw(), pure: returns the drawn tiles AND
// the pile as it stands afterward (reshuffling the discard into the draw
// pile via the RNG when the draw pile runs dry, same as the mutable version).
export function pureDraw(
  pile: Pile,
  count: number,
  rngState: RngState,
): [Tile[], Pile, RngState] {
  let drawPile = pile.drawPile.slice();
  let discardPile = pile.discardPile.slice();
  let s = rngState;
  const drawn: Tile[] = [];
  while (drawn.length < count) {
    if (drawPile.length === 0) {
      if (discardPile.length === 0) break;
      const [shuffled, s2] = rng.shuffle(s, discardPile);
      drawPile = shuffled;
      discardPile = [];
      s = s2;
    }
    drawn.push(drawPile.pop()!);
  }
  return [drawn, { drawPile, discardPile }, s];
}

export function createRoundState(
  opts: CreateRoundStateOpts,
  rngState: RngState,
): [RoundState, RngState] {
  const tune: Tune = Object.assign({}, ROUND_DEFAULTS, opts.tune || {});
  const items = (opts.items || []).slice();
  const tierLevels = opts.tierLevels || {};
  const rule = opts.rule || null;

  let s = rngState;
  let pile: Pile;
  if (opts.pile) {
    pile = opts.pile;
  } else {
    const [shuffled, s0] = rng.shuffle(s, opts.deck || []);
    pile = { drawPile: shuffled, discardPile: [] };
    s = s0;
  }

  let premium: Premium | null = null;
  if (!(rule && rule.noPremium) && !opts.noPremium) {
    const [hit, s2] = rng.chance(s, Number(tune.PREMIUM_CHANCE));
    s = s2;
    if (hit) {
      const [kind, s3] = rng.weightedChoice(
        s,
        PREMIUM_KINDS,
        (k: PremiumKind) => k.weight,
      );
      s = s3;
      if (kind) {
        let pos: number;
        if (rule && rule.premiumPos != null) {
          pos = rule.premiumPos;
        } else {
          const [p, s4] = rng.weightedChoice(
            s,
            [0, 1, 2, 3, 4],
            (p: number) => [1, 2, 3, 2, 1][p]!,
          );
          s = s4;
          pos = p!;
        }
        premium = { pos, kind: kind.id };
      }
    }
  }

  const rackSize = Number(tune.RACK_SIZE);
  const [rack, pileAfterDraw, s5] = pureDraw(pile, rackSize, s);
  s = s5;

  const round: RoundState = {
    tune,
    target: Math.round(
      (opts.target != null ? opts.target : Number(tune.MOVEMENT_BASE_1)) *
        (rule && rule.targetMult ? rule.targetMult : 1),
    ),
    situation: opts.situation ?? null,
    rule,
    usedLetters: {},
    reward: opts.reward != null ? opts.reward : Number(tune.INK_SMALL),
    playsLeft: Math.max(
      1,
      Number(tune.PLAYS) +
        (rule && rule.plays ? rule.plays : 0) +
        items.reduce((n, id) => {
          const it = (ITEM_DEFS as Record<string, { plays?: number }>)[id];
          return n + (it && it.plays ? it.plays : 0);
        }, 0),
    ),
    changeoutsLeft: Number(tune.CHANGEOUTS),
    rackSize,
    items,
    tierLevels,
    score: 0,
    ink: 0,
    state: 'live',
    plays: [],
    pile: pileAfterDraw,
    rack,
    premium,
  };
  return [round, s];
}

function held(round: RoundState, tilesUsed: Tile[]): Tile[] {
  return round.rack.filter((t) => tilesUsed.indexOf(t) < 0);
}

export function isBarred(round: RoundState, tile: Tile): boolean {
  return !!(
    round.rule &&
    round.rule.barsLetter &&
    round.rule.barsLetter(round as never, tile.letter)
  );
}

export function barredIn(round: RoundState, tiles: Tile[]): string[] {
  return tiles.filter((t) => isBarred(round, t)).map((t) => t.letter);
}

export function isPlayable(word: string): boolean {
  const upper = String(word || '').toUpperCase();
  return upper.length === 1
    ? /^[A-Z]$/.test(upper)
    : window.Wordbound.Lexicon.isValidWord(upper);
}

// The pure twin of Round.breakdownFor: a read-only scoring preview (word
// helper suggestions, the composing stick's live total) that never mutates
// the rack -- if the word can't actually be formed from it, it scores the
// letters typed as if each were its own bare tile (same fallback as the
// mutable version), so the UI can show a total for a word not yet playable.
export function breakdownFor(
  round: RoundState,
  word: string,
  run?: unknown,
  characterTile?: Tile | null,
): Breakdown {
  const upper = String(word).toUpperCase();
  const Lexicon = window.Wordbound.Lexicon;
  const searchPool = characterTile
    ? (round.rack as Tile[]).concat([characterTile])
    : (round.rack as Tile[]);
  const form = Lexicon.canFormFromRack(upper, searchPool);
  const tiles: Tile[] = form.possible
    ? form.tilesUsed!
    : upper.split('').map(
        (l) =>
          ({
            id: '',
            letter: l,
            bonus: null,
            variant: null,
            crackedThisFight: false,
          }) as unknown as Tile,
      );
  return scoreWordPoints(upper, tiles, round.rackSize, {
    tune: round.tune,
    items: round.items as string[],
    tierLevels: round.tierLevels as Record<string, number>,
    heldTiles: held(round, tiles),
    run: (run as never) || null,
    round: round as never,
    preview: true,
    crescendo: null,
    characterTile,
  });
}

export function scoreFor(
  round: RoundState,
  word: string,
  run?: unknown,
  characterTile?: Tile | null,
): number {
  return breakdownFor(round, word, run, characterTile).total;
}

// What an item's onPlayed hook (content/items.ts, e.g. refrain's counter,
// sustain's extendCrescendo) would have done to the run -- collected here
// instead of mutated during scoring, since RoundState can't touch RunState.
// The caller (state/run.ts, or the facade wrapping it) applies this to
// RunState after the play.
export interface PlayEffects {
  itemState?: Record<string, number>;
  extendCrescendo?: number;
}

export interface PlayResult {
  ok: boolean;
  reason?: string;
  word?: string;
  breakdown?: Breakdown;
  messages?: string[];
  effects?: PlayEffects;
}

export interface PlayOutcome {
  state: RoundState;
  result: PlayResult;
}

// The pure twin of Round.playWord: draws no new RNG itself (the rack turns
// over from the discard-and-refill, same as the mutable version, so it needs
// the RngState for the refill draw only).
export function playWord(
  round: RoundState,
  raw: string,
  rngState: RngState,
  ctx: {
    run?: unknown;
    crescendo?: { phase: string; mag?: number } | null;
    characterTile?: Tile | null;
  } = {},
): [PlayOutcome, RngState] {
  if (round.state !== 'live')
    return [
      { state: round, result: { ok: false, reason: 'The round is over.' } },
      rngState,
    ];
  const upper = String(raw || '')
    .trim()
    .toUpperCase();
  if (!upper)
    return [
      { state: round, result: { ok: false, reason: 'Nothing to play.' } },
      rngState,
    ];
  if (!isPlayable(upper))
    return [
      {
        state: round,
        result: { ok: false, reason: upper + ' isn’t in the dictionary.' },
      },
      rngState,
    ];
  const Lexicon = window.Wordbound.Lexicon;
  const characterTile = ctx.characterTile ?? null;
  const searchPool = characterTile
    ? (round.rack as Tile[]).concat([characterTile])
    : (round.rack as Tile[]);
  const form = Lexicon.canFormFromRack(upper, searchPool);
  if (!form.possible)
    return [
      {
        state: round,
        result: { ok: false, reason: upper + ' needs letters you don’t have.' },
      },
      rngState,
    ];
  const tilesUsed = form.tilesUsed!;
  const barred = barredIn(round, tilesUsed);
  if (barred.length)
    return [
      {
        state: round,
        result: {
          ok: false,
          reason:
            barred.join(', ') +
            ' has been played this round — ' +
            round.rule!.name +
            '.',
        },
      },
      rngState,
    ];

  const breakdown = scoreWordPoints(upper, tilesUsed, round.rackSize, {
    tune: round.tune,
    items: round.items as string[],
    tierLevels: round.tierLevels as Record<string, number>,
    heldTiles: held(round, tilesUsed),
    run: (ctx.run as never) || null,
    round: round as never,
    crescendo: ctx.crescendo,
    characterTile,
  });

  // The character tile (READ_SLOWLY_PLAN.md D1) is never part of round.rack
  // and must never be drawn/discarded -- it returns to its own slot after
  // every play, so it's excluded here even though it's in tilesUsed.
  const rackAfterRemove = round.rack.filter((t) => tilesUsed.indexOf(t) < 0);
  const tilesToDiscard = characterTile
    ? tilesUsed.filter((t) => t.id !== characterTile.id)
    : tilesUsed;
  const discardPile = round.pile.discardPile.concat(
    tilesToDiscard,
    rackAfterRemove,
  );
  const need = round.rackSize;
  const [newRack, pileAfterDraw, s2] = pureDraw(
    { drawPile: round.pile.drawPile, discardPile },
    need,
    rngState,
  );

  const usedLetters: Record<string, boolean> = Object.assign(
    {},
    round.usedLetters,
  );
  tilesUsed.forEach((t) => {
    usedLetters[t.letter] = true;
  });

  const score = round.score + breakdown.total;
  const playsLeft = round.playsLeft - 1;
  const plays = round.plays.concat([
    { word: upper, breakdown, tiles: tilesUsed },
  ]);

  let state: 'live' | 'won' | 'lost' = round.state;
  let ink = round.ink;
  if (score >= round.target) {
    state = 'won';
    ink = round.reward + Number(round.tune.INK_PER_WORD_LEFT) * playsLeft;
    const itemDefs = ITEM_DEFS as Record<
      string,
      { inkAtWin?: (round: { changeoutsLeft: number }) => number }
    >;
    round.items.forEach((id) => {
      const it = itemDefs[id];
      if (it && it.inkAtWin)
        ink += it.inkAtWin({ changeoutsLeft: round.changeoutsLeft });
    });
  } else if (playsLeft <= 0) {
    state = 'lost';
  }

  const next: RoundState = {
    ...round,
    usedLetters,
    score,
    playsLeft,
    plays,
    pile: pileAfterDraw,
    rack: newRack,
    state,
    ink,
  };

  let effects: PlayEffects | undefined;
  if (ctx.run) {
    const shimRun = {
      itemState: {
        ...(ctx.run as { itemState?: Record<string, number> }).itemState,
      },
      extendCrescendo: (extraSec: number) => {
        effects = effects || {};
        effects.extendCrescendo = (effects.extendCrescendo || 0) + extraSec;
      },
    };
    const itemDefs = ITEM_DEFS as Record<
      string,
      { onPlayed?: (run: typeof shimRun, breakdown: Breakdown) => void }
    >;
    round.items.forEach((id) => {
      const it = itemDefs[id];
      if (it && it.onPlayed) it.onPlayed(shimRun, breakdown);
    });
    if (
      Object.keys(shimRun.itemState).some(
        (k) =>
          shimRun.itemState[k] !==
          (ctx.run as { itemState?: Record<string, number> }).itemState?.[k],
      )
    ) {
      effects = effects || {};
      effects.itemState = shimRun.itemState;
    }
  }

  return [
    {
      state: next,
      result: { ok: true, word: upper, breakdown, messages: [], effects },
    },
    s2,
  ];
}

export interface ChangeoutResult {
  ok: boolean;
  reason?: string;
  drawn?: Tile[];
  returned?: Tile[];
}

export function changeout(
  round: RoundState,
  tileIds: string[],
  rngState: RngState,
): [{ state: RoundState; result: ChangeoutResult }, RngState] {
  if (round.state !== 'live')
    return [
      { state: round, result: { ok: false, reason: 'The round is over.' } },
      rngState,
    ];
  if (round.changeoutsLeft <= 0)
    return [
      { state: round, result: { ok: false, reason: 'No changeouts left.' } },
      rngState,
    ];
  const ids = new Set(tileIds || []);
  if (!ids.size)
    return [
      {
        state: round,
        result: { ok: false, reason: 'Pick the tiles to change out first.' },
      },
      rngState,
    ];
  const back = round.rack.filter((t) => ids.has(t.id));
  if (!back.length)
    return [
      {
        state: round,
        result: { ok: false, reason: 'Those tiles aren’t in the rack.' },
      },
      rngState,
    ];
  const rackAfterRemove = round.rack.filter((t) => !ids.has(t.id));
  const [drawn, pileAfterDraw1, s2] = pureDraw(
    round.pile,
    back.length,
    rngState,
  );
  const pile: Pile = {
    drawPile: pileAfterDraw1.drawPile,
    discardPile: pileAfterDraw1.discardPile.concat(back),
  };
  const next: RoundState = {
    ...round,
    rack: rackAfterRemove.concat(drawn),
    pile,
    changeoutsLeft: round.changeoutsLeft - 1,
  };
  return [{ state: next, result: { ok: true, drawn, returned: back } }, s2];
}

export function destroyTile(
  round: RoundState,
  tileId: string,
  rngState: RngState,
): [RoundState, boolean, RngState] {
  const i = round.rack.findIndex((t) => t.id === tileId);
  if (i < 0) return [round, false, rngState];
  const rackAfterRemove = round.rack.filter((_, idx) => idx !== i);
  const need = round.rackSize - rackAfterRemove.length;
  if (need <= 0) return [{ ...round, rack: rackAfterRemove }, true, rngState];
  const [drawn, pileAfterDraw, s2] = pureDraw(round.pile, need, rngState);
  return [
    { ...round, rack: rackAfterRemove.concat(drawn), pile: pileAfterDraw },
    true,
    s2,
  ];
}

export function moveTile(
  round: RoundState,
  from: number,
  to: number,
): RoundState {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= round.rack.length ||
    to >= round.rack.length
  )
    return round;
  const rack = round.rack.slice();
  const [t] = rack.splice(from, 1);
  rack.splice(to, 0, t!);
  return { ...round, rack };
}

export type { Enemy };
