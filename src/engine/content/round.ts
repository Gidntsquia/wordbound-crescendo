// TS port of src/sandbox/round.js (READ_SLOWLY_PLAN.md A2/A5 step 3): ONE
// SCORING ROUND (the Balatro-with-Scrabble model, COMBAT_REDESIGN.md) and
// createRun, the walk down the lineup (enemies.ts) that wraps a round per
// fight. Still attaches to window.Wordbound.Sandbox for RoundSandbox.jsx and
// for the untyped items.js's read of Sandbox.scoreWordPoints etc. Reads
// several already-ported tables (Tiles, Lexicon, enemies.ts, items.ts,
// marginalia.ts, shop.ts, stolenLetters.ts, quillDiscovery.ts) off the Sandbox
// global through loose casts, same pattern as shop.ts/items.ts, since
// SandboxNamespace stays an open record until every writer is ported.
import '../sandboxGlobal';
import type { RngStream } from '../rng';
import type { Tile } from '../tiles';
import type { Enemy, Rule } from './enemies';
import type { ItemNote } from './items';

export type Tune = Record<string, number | boolean | undefined>;

export const ROUND_DEFAULTS: Tune = {
  MOVEMENT_BASE_1: 300, // small-enemy target, first movement (Phase 0)
  MOVEMENT_BASE_2: 750, // second movement, ~2.5x like Balatro's antes
  MOVEMENT_BASE_3: 1200, // third movement, x1.6 -- untuned, see NIGHT_REPORT
  BIG_MULT: 1.5, // big enemy target = base x this
  BOSS_MULT: 2, // boss target = base x this
  PLAYS: 4, // words the player may play
  CHANGEOUTS: 3, // tile swaps
  RACK_SIZE: 7,
  // Length tiers: base points and base mult per band (Sandbox.TIERS).
  PTS_2: 0,
  MULT_2: 1, // one or two letters
  PTS_3: 5,
  MULT_3: 2,
  PTS_4: 10,
  MULT_4: 3,
  PTS_5: 20,
  MULT_5: 4,
  PTS_6: 35,
  MULT_6: 5,
  PTS_7: 60,
  MULT_7: 7, // seven or more
  INK_SMALL: 3, // purse for felling a small enemy
  INK_BIG: 4, // a big one
  INK_BOSS: 5, // the boss
  INK_PER_WORD_LEFT: 1, // bonus per unplayed word at the win
  START_INK: 4,
  INTEREST_PER: 5, // +1 ink per this much held at a round's end
  INTEREST_CAP: 5,
  // The shop (shop.ts).
  ITEM_SLOTS: 5,
  CONSUMABLE_SLOTS: 2,
  CARD_SLOTS: 2,
  CARD_ITEM: 70,
  CARD_MARK: 15,
  CARD_ETUDE: 15, // card slot roll, by weight
  PACK_SLOTS: 2,
  PACK_PRICE: 4,
  PACK_CHOICES: 3, // keep one of this many
  MARK_PRICE: 3,
  ETUDE_PRICE: 3,
  REROLL_PRICE: 5,
  REROLL_STEP: 1,
  // Marginalia (marginalia.ts).
  MARK_GILT: 20, // points per gilt tile played
  MARK_BOLD: 2, // mult per bold tile played
  MARK_STEEL: 1.2, // x mult per steel tile left in the case
  MARK_COIN_CAP: 10,
  // Skipping a small or big enemy (run.skip) pays a favour (Sandbox.FAVOURS).
  BOUNTY_INK: 8,
  // Premium slots (DIVERGENCE_PLAN.md): one stick position may carry a
  // bonus for the round, rolled at creation.
  PREMIUM_CHANCE: 0.55, // odds a round has a premium slot at all
  PREMIUM_DL: 2, // x letter points on the tile in the slot
  PREMIUM_TL: 3,
  PREMIUM_DW: 2, // x mult, whole word
};

export interface PremiumKind {
  id: 'dl' | 'tl' | 'dw';
  name: string;
  weight: number;
}

// The three premium kinds a stick slot can roll (weighted; DW is scarcer
// since it multiplies the whole word rather than one tile).
export const PREMIUM_KINDS: PremiumKind[] = [
  { id: 'dl', name: 'Double Letter', weight: 3 },
  { id: 'tl', name: 'Triple Letter', weight: 2 },
  { id: 'dw', name: 'Double Word', weight: 1 },
];

export interface Key {
  id: string;
  name: string;
  hint: string;
  index: number;
}

// KEYS (NEXT_LEVEL_PLAN.md stage 3): Balatro's stakes, named for musical
// keys. Each is the one before it plus one rule, so applyKey below just
// layers effects up to the chosen key's index. C major is the base game.
export const KEYS: Key[] = [
  { id: 'c_major', name: 'C major', hint: 'the base game', index: 0 },
  { id: 'g_major', name: 'G major', hint: 'targets ×1.15', index: 1 },
  {
    id: 'd_major',
    name: 'D major',
    hint: 'one fewer swap per round',
    index: 2,
  },
  {
    id: 'a_minor',
    name: 'A minor',
    hint: 'the premium slot never appears on boss rounds',
    index: 3,
  },
  { id: 'e_minor', name: 'E minor', hint: 'shop reroll starts at 7', index: 4 },
  { id: 'b_minor', name: 'B minor', hint: 'no skip favours', index: 5 },
];
export const KEY_DEFS: Record<string, Key> = {};
KEYS.forEach((k) => {
  KEY_DEFS[k.id] = k;
});

// Layers every key's rule up to and including `keyId` onto a copy of tune.
// KEY_TARGET_MULT/KEY_NO_BOSS_PREMIUM/KEY_NO_SKIP are read by targetFor,
// rollPremium (via createRun's opts.noPremium) and run.skip respectively.
export function applyKey(tune: Tune, keyId: string | undefined): Tune {
  const key = (keyId && KEY_DEFS[keyId]) || KEYS[0]!;
  const out: Tune = Object.assign({}, tune);
  if (key.index >= 1) out.KEY_TARGET_MULT = 1.15; // G major
  if (key.index >= 2)
    out.CHANGEOUTS = Math.max(0, (Number(out.CHANGEOUTS) || 0) - 1); // D major
  if (key.index >= 3) out.KEY_NO_BOSS_PREMIUM = true; // A minor
  if (key.index >= 4) out.REROLL_PRICE = 7; // E minor
  if (key.index >= 5) out.KEY_NO_SKIP = true; // B minor
  return out;
}

export interface Favour {
  id: string;
  name: string;
  hint: string;
}

// The favours a skipped enemy pays. One is drawn per skippable round and
// shown on the round screen as the price of not fighting.
export const FAVOURS: Favour[] = [
  {
    id: 'free_pack',
    name: 'Free Pack',
    hint: 'The next shop’s first pack is free',
  },
  {
    id: 'coupon',
    name: 'Coupon',
    hint: 'The next shop’s cards are free (packs still cost)',
  },
  { id: 'bounty', name: 'Bounty', hint: '+8 ink, now' },
];
export const FAVOUR_DEFS: Record<string, Favour> = {};
FAVOURS.forEach((f) => {
  FAVOUR_DEFS[f.id] = f;
});

export interface Tier {
  id: string;
  name: string;
  minLen: number;
  lvlPts: number;
  lvlMult: number;
}

// Balatro's hand types: a word scores as the tier of its length. An étude
// raises a tier's level; each level adds lvlPts to its points and lvlMult
// to its mult for the rest of the run.
export const TIERS: Tier[] = [
  { id: 't2', name: 'SHORT', minLen: 1, lvlPts: 5, lvlMult: 1 },
  { id: 't3', name: 'THREE', minLen: 3, lvlPts: 10, lvlMult: 1 },
  { id: 't4', name: 'FOUR', minLen: 4, lvlPts: 10, lvlMult: 1 },
  { id: 't5', name: 'FIVE', minLen: 5, lvlPts: 15, lvlMult: 2 },
  { id: 't6', name: 'SIX', minLen: 6, lvlPts: 20, lvlMult: 2 },
  { id: 't7', name: 'SEVEN', minLen: 7, lvlPts: 30, lvlMult: 3 },
];
export const TIER_DEFS: Record<string, Tier> = {};
TIERS.forEach((t) => {
  TIER_DEFS[t.id] = t;
});

export function tierFor(word: string): Tier {
  const len = String(word || '').length;
  let out = TIERS[0]!;
  TIERS.forEach((t) => {
    if (len >= t.minLen) out = t;
  });
  return out;
}

// The tier's base points / mult at a level, read live from the tune so the
// tuning panel can move them.
export function tierStats(
  tier: Tier,
  tune: Tune,
  level: number | undefined,
): { pts: number; mult: number; level: number } {
  const n = tier.id.slice(1);
  const lvl = Math.max(1, level || 1);
  return {
    pts: (Number(tune['PTS_' + n]) || 0) + tier.lvlPts * (lvl - 1),
    mult: (Number(tune['MULT_' + n]) || 0) + tier.lvlMult * (lvl - 1),
    level: lvl,
  };
}

// A word's plain base points at tier level 1 -- no ink, no items, no run
// scaling. Used only by Harmony (items.ts) to price the chord it finds in
// the leftover case tiles; deliberately simpler than scoreWordPoints.
export function chordPoints(word: string, tune: Tune): number {
  const Lexicon = window.Wordbound.Lexicon;
  const tier = tierFor(word);
  const base = Number(tune['PTS_' + tier.id.slice(1)]) || 0;
  let letters = 0;
  word.split('').forEach((ch) => {
    letters += Lexicon.LETTER_VALUES[ch] || 0;
  });
  return base + letters;
}

export interface Step {
  kind:
    'tier' | 'letter' | 'hold' | 'slot' | 'item' | 'rule' | 'chord' | 'tilex';
  name?: string;
  level?: number;
  tile?: Tile;
  letter?: string;
  ink?: string | null;
  bonusPts?: number;
  slotKind?: string;
  id?: string;
  note?: string;
  tone?: string;
  pts?: number;
  mult?: number;
  ratio?: number;
  label: string;
  runPts?: number;
  runMult?: number;
}

export interface Breakdown {
  base: number;
  lengthBonus: number;
  bingoBonus: number;
  bonusFlat: number;
  bonusMult: number;
  variantFlat: number;
  tier: Tier;
  tierName: string;
  tierLevel: number;
  tierPts: number;
  tierMult: number;
  inkPoints: number;
  inkMult: number;
  holdMult: number;
  inkNotes: string[];
  slotPoints: number;
  slotMultRatio: number;
  slotKind: string | null;
  slotTile: Tile | null;
  itemNotes: ItemNote[];
  chordWord: string | null;
  crescendo: boolean;
  itemPoints: number;
  itemMult: number;
  points: number;
  mult: number;
  lengthMult: number;
  total: number;
  steps: Step[];
  [key: string]: unknown;
}

interface ScoreCtx {
  tune: Tune;
  items: string[];
  tierLevels: Record<string, number>;
  heldTiles: Tile[];
  run: RunLike | null | undefined;
  round: Round | null;
  preview?: boolean;
  crescendo?: { phase: string; mag?: number } | null;
}

// POINTS x MULT for a word made of these tiles. `breakdown` keeps
// Lexicon.scoreWord's fields so the UI can itemise, plus the tier, ink and
// item parts, points / mult / total.
export function scoreWordPoints(
  word: string,
  tilesUsed: Tile[],
  rackCapacity: number,
  ctx: ScoreCtx,
): Breakdown {
  const Lexicon = window.Wordbound.Lexicon;
  const Sandbox = window.Wordbound.Sandbox;
  const tune = ctx.tune;
  const b = Lexicon.scoreWord(
    word,
    tilesUsed,
    rackCapacity,
  ) as unknown as Breakdown;
  b.lengthBonus = 0;
  b.bingoBonus = 0; // length is the tier now; no separate bingo
  const tier = tierFor(word);
  const ts = tierStats(
    tier,
    tune,
    ctx.tierLevels ? ctx.tierLevels[tier.id] : 1,
  );
  b.tier = tier;
  b.tierName = tier.name;
  b.tierLevel = ts.level;
  b.tierPts = ts.pts;
  b.tierMult = ts.mult;
  // Inked tiles (inks.ts): gilt and bold on the tiles played, steel on the
  // tiles left waiting in the case.
  b.inkPoints = 0;
  b.inkMult = 0;
  b.holdMult = 1;
  b.inkNotes = [];
  tilesUsed.forEach((t) => {
    if (t.ink === 'gilt') {
      b.inkPoints += Number(tune.MARK_GILT) || 0;
      b.inkNotes.push('gilt ' + t.letter + ' +' + tune.MARK_GILT);
    } else if (t.ink === 'bold') {
      b.inkMult += Number(tune.MARK_BOLD) || 0;
      b.inkNotes.push('bold ' + t.letter + ' +' + tune.MARK_BOLD + ' mult');
    }
  });
  (ctx.heldTiles || []).forEach((t) => {
    if (t.ink === 'steel') {
      b.holdMult *= Number(tune.MARK_STEEL) || 1;
      b.inkNotes.push('steel ' + t.letter + ' held ×' + tune.MARK_STEEL);
    }
  });
  b.holdMult = Math.round(b.holdMult * 1000) / 1000;
  // The round's premium slot (Sandbox.PREMIUM_KINDS): a fixed stick
  // position that bonuses whichever tile lands there. Only fires if the
  // played word actually reaches that position.
  b.slotPoints = 0;
  b.slotMultRatio = 1;
  b.slotKind = null;
  b.slotTile = null;
  const round0 = ctx.round;
  if (round0 && round0.premium && tilesUsed[round0.premium.pos]) {
    const slotTile = tilesUsed[round0.premium.pos]!;
    const slotLetterVal = Lexicon.LETTER_VALUES[slotTile.letter] || 0;
    const kind = round0.premium.kind;
    if (kind === 'dl')
      b.slotPoints = slotLetterVal * (Number(tune.PREMIUM_DL) - 1);
    else if (kind === 'tl')
      b.slotPoints = slotLetterVal * (Number(tune.PREMIUM_TL) - 1);
    else if (kind === 'dw') b.slotMultRatio = Number(tune.PREMIUM_DW);
    b.slotKind = kind;
    b.slotTile = slotTile;
  }
  // Items fire left to right on the running points and mult.
  const acc: {
    points: number;
    mult: number;
    chord?: { word: string; points: number };
  } = {
    points:
      b.tierPts +
      b.base +
      b.bonusFlat +
      b.variantFlat +
      b.inkPoints +
      b.slotPoints,
    mult: (b.tierMult + b.inkMult) * b.slotMultRatio,
  };
  const before = { points: acc.points, mult: acc.mult };
  const round = ctx.round;
  const applyItems = Sandbox.applyItems as
    | ((
        c: Record<string, unknown>,
        a: {
          points: number;
          mult: number;
          chord?: { word: string; points: number };
        },
      ) => ItemNote[])
    | undefined;
  b.itemNotes = applyItems
    ? applyItems(
        {
          word,
          tiles: tilesUsed,
          held: ctx.heldTiles || [],
          items: ctx.items || [],
          run: ctx.run,
          round,
          tune,
          preview: !!ctx.preview,
          crescendo: !!(ctx.crescendo && ctx.crescendo.phase === 'live'),
          crescendoSoon: !!(ctx.crescendo && ctx.crescendo.phase === 'soon'),
          crescendoMag:
            ctx.crescendo && ctx.crescendo.mag != null ? ctx.crescendo.mag : 1,
          isLastPlay: !!round && round.playsLeft === 1,
          playIndex: round ? round.plays.length : 0,
        },
        acc,
      )
    : [];
  // Harmony's chord (items.ts sets acc.chord instead of touching acc.points
  // directly, so it lands as its own cascade step after the items).
  b.chordWord = null;
  if (acc.chord) {
    acc.points += acc.chord.points;
    b.chordWord = acc.chord.word;
    b.itemNotes.push({
      id: 'harmony',
      name: 'Chord',
      note: '+' + acc.chord.points + ', ' + acc.chord.word,
      dPts: acc.chord.points,
      dMult: 0,
      ratio: 1,
      kind: 'pts',
    } as ItemNote & { chord: true });
    (
      b.itemNotes[b.itemNotes.length - 1] as unknown as { chord: boolean }
    ).chord = true;
  }
  let ruleNote: (ItemNote & { rule: true }) | null = null;
  if (round && round.rule && round.rule.score) {
    const p0 = acc.points,
      m0 = acc.mult;
    const rn = round.rule.score({ word, tiles: tilesUsed, round }, acc);
    if (rn) {
      ruleNote = {
        id: round.rule.id,
        name: round.rule.name,
        note: rn,
        rule: true,
      } as ItemNote & { rule: true };
      const describeDelta = Sandbox.describeDelta as
        | ((
            n: unknown,
            p0: number,
            m0: number,
            acc: { points: number; mult: number },
          ) => void)
        | undefined;
      if (describeDelta) describeDelta(ruleNote, p0, m0, acc);
      b.itemNotes.push(ruleNote);
    }
  }
  // Whether this play landed on a live crescendo window -- read by
  // onPlayed hooks after the play resolves (Sustain, items.ts), not just
  // by score() during it.
  b.crescendo = !!(ctx.crescendo && ctx.crescendo.phase === 'live');
  b.itemPoints = acc.points - before.points;
  b.itemMult = acc.mult - before.mult; // net, for the one-line summary
  b.points = acc.points;
  b.mult = Math.round(acc.mult * b.bonusMult * b.holdMult * 100) / 100;
  b.lengthMult = b.tierMult; // kept for older readers of the breakdown
  b.total = Math.round(b.points * b.mult);
  b.steps = scoreSteps(b, tilesUsed, ctx.heldTiles || [], tune);
  return b;
}

// The ORDERED STEP LIST the scoring cascade narrates: the same maths as the
// breakdown, one entry per thing that changed points or mult, in the order
// they fired.
export function scoreSteps(
  b: Breakdown,
  tilesUsed: Tile[],
  heldTiles: Tile[],
  tune: Tune,
): Step[] {
  const Lexicon = window.Wordbound.Lexicon;
  const steps: Step[] = [];
  let pts = 0,
    mult = 0;
  function push(step: Step) {
    pts += step.pts || 0;
    mult += step.mult || 0;
    if (step.ratio && step.ratio !== 1) mult *= step.ratio;
    step.runPts = pts;
    step.runMult = Math.round(mult * 1000) / 1000;
    steps.push(step);
  }
  push({
    kind: 'tier',
    name: b.tierName,
    level: b.tierLevel,
    pts: b.tierPts,
    mult: b.tierMult,
    label: b.tierName,
  });
  // Letter values, tile bonuses and the played tiles' inks. Lexicon.scoreWord
  // already summed these; here they are attributed tile by tile so the sum
  // of the letter steps equals base + bonusFlat + variantFlat + inkPoints.
  const perTile = tilesUsed.map((t) => ({
    tile: t,
    pts: Lexicon.LETTER_VALUES[t.letter] || 0,
    mult: 0,
    ink: t.ink || null,
    bonusPts: 0,
  }));
  const letterSum = perTile.reduce((n, x) => n + x.pts, 0);
  // Anything scoreWord added beyond plain letter values (bonus squares,
  // charged variants) lands on the first tile, so the running total stays
  // honest even when a bonus cannot be attributed.
  const extra = b.base - letterSum + (b.bonusFlat || 0) + (b.variantFlat || 0);
  if (perTile.length && extra) perTile[0]!.bonusPts = extra;
  perTile.forEach((x) => {
    const step: Step = {
      kind: 'letter',
      tile: x.tile,
      letter: x.tile.letter,
      ink: x.ink,
      pts: x.pts + (x.bonusPts || 0),
      mult: 0,
      label: x.tile.letter,
    };
    if (x.ink === 'gilt')
      step.pts = (step.pts || 0) + (Number(tune.MARK_GILT) || 0);
    if (x.ink === 'bold')
      step.mult = (step.mult || 0) + (Number(tune.MARK_BOLD) || 0);
    push(step);
  });
  if (b.slotKind) {
    const slotLabel =
      b.slotKind === 'dw'
        ? 'DOUBLE WORD'
        : b.slotKind === 'tl'
          ? 'TRIPLE LETTER'
          : 'DOUBLE LETTER';
    push({
      kind: 'slot',
      slotKind: b.slotKind,
      tile: b.slotTile!,
      letter: b.slotTile!.letter,
      pts: b.slotPoints,
      mult: 0,
      ratio: b.slotMultRatio,
      label: slotLabel,
      tone: b.slotKind === 'dw' ? 'mult' : 'pts',
    });
  }
  (b.itemNotes || []).forEach((n) => {
    const nn = n as ItemNote & { rule?: boolean; chord?: boolean };
    push({
      kind: nn.rule ? 'rule' : nn.chord ? 'chord' : 'item',
      id: nn.id,
      name: nn.name,
      note: nn.note,
      label: nn.name,
      pts: nn.dPts || 0,
      mult: nn.dMult || 0,
      ratio: nn.ratio || 1,
      tone: nn.kind || 'pts',
    });
  });
  if (b.bonusMult && b.bonusMult !== 1)
    push({
      kind: 'tilex',
      ratio: b.bonusMult,
      label: 'tile ×' + b.bonusMult,
      tone: 'mult',
    });
  heldTiles.forEach((t) => {
    if (t.ink === 'steel')
      push({
        kind: 'hold',
        tile: t,
        letter: t.letter,
        ratio: Number(tune.MARK_STEEL),
        label: 'steel ' + t.letter + ' held',
        tone: 'mult',
      });
  });
  return steps;
}

export interface PlayResult {
  ok: boolean;
  reason?: string;
  word?: string;
  breakdown?: Breakdown;
  messages?: string[];
}

export interface ChangeoutResult {
  ok: boolean;
  reason?: string;
  drawn?: Tile[];
  returned?: Tile[];
}

export interface Round {
  tune: Tune;
  target: number;
  rule: Rule | null;
  usedLetters: Record<string, boolean>;
  reward: number;
  playsLeft: number;
  changeoutsLeft: number;
  rackSize: number;
  items: string[];
  tierLevels: Record<string, number>;
  score: number;
  ink: number;
  state: 'live' | 'won' | 'lost';
  plays: {
    word: string;
    breakdown: Breakdown;
    messages: string[];
    tiles: Tile[];
  }[];
  pile: { drawPile: Tile[]; discardPile: Tile[] };
  rack: Tile[];
  premium: { pos: number; kind: 'dl' | 'tl' | 'dw' } | null;
  favour?: string | null;
  breakdownFor(word: string): Breakdown;
  scoreFor(word: string): number;
  isBarred(tile: Tile): boolean;
  barredIn(tiles: Tile[]): string[];
  isPlayable(word: string): boolean;
  playWord(raw: string): PlayResult;
  changeout(tileIds: string[]): ChangeoutResult;
  destroyTile(tileId: string): boolean;
  moveTile(from: number, to: number): boolean;
}

export interface CreateRoundOpts {
  rng: RngStream;
  deck: Tile[];
  tune?: Partial<Tune>;
  items?: string[];
  tierLevels?: Record<string, number>;
  rule?: string;
  target?: number;
  reward?: number;
  pile?: { drawPile: Tile[]; discardPile: Tile[] };
  run?: RunLike;
  crescendo?: () => { phase: string; mag?: number } | null;
  noPremium?: boolean;
  onPlay?: (res: PlayResult) => void;
}

export function createRound(opts: CreateRoundOpts): Round {
  const W = window.Wordbound;
  const Sandbox = W.Sandbox;
  const Tiles = W.Tiles;
  const Lexicon = W.Lexicon;
  const rng = opts.rng;
  const tune: Tune = Object.assign({}, ROUND_DEFAULTS, opts.tune || {});
  const items = (opts.items || []).slice();
  const tierLevels = opts.tierLevels || {};
  const RULES = Sandbox.RULES as Record<string, Rule> | undefined;
  const rule = (opts.rule && RULES && RULES[opts.rule]) || null;
  // The soundtrack's crescendo state right now ({ phase, mag?, ... }) or
  // null. Supplied by the UI (it owns the audio); absent in a headless
  // round, so always null there -- crescendo/soon items never fire.
  function onCrescendo() {
    return (opts.crescendo && opts.crescendo()) || null;
  }

  const round: Round = {
    tune,
    target: Math.round(
      (opts.target != null ? opts.target : Number(tune.MOVEMENT_BASE_1)) *
        (rule && rule.targetMult ? rule.targetMult : 1),
    ),
    rule,
    usedLetters: {}, // letters played this round (the no_repeats rule)
    reward: opts.reward != null ? opts.reward : Number(tune.INK_SMALL), // flat ink at the win
    playsLeft: Math.max(
      1,
      Number(tune.PLAYS) +
        (rule && rule.plays ? rule.plays : 0) +
        items.reduce((n, id) => {
          const itemDefs = Sandbox.ITEM_DEFS as
            Record<string, { plays?: number }> | undefined;
          const it = itemDefs?.[id];
          return n + (it && it.plays ? it.plays : 0);
        }, 0),
    ),
    changeoutsLeft: Number(tune.CHANGEOUTS),
    rackSize: Number(tune.RACK_SIZE),
    items,
    tierLevels,
    score: 0,
    ink: 0,
    state: 'live',
    plays: [],
    // The bag: the run's pile when there is a run (played and swapped tiles
    // go to the discard, which only comes back once the bag runs dry), a
    // fresh shuffle for a lone round.
    pile: opts.pile || {
      drawPile: Tiles.shuffleIntoDrawPile(opts.deck, rng),
      discardPile: [],
    },
    rack: [],
    // The premium slot (DIVERGENCE_PLAN.md): one stick position, rolled
    // now so it can be drawn empty before any tile lands there. A boss's
    // tempo marking may fix the position (rule.premiumPos).
    premium: null,
  } as unknown as Round;

  (function rollPremium() {
    if (rule && rule.noPremium) return;
    if (opts.noPremium) return; // A minor: never on a boss round
    if (!rng.chance(Number(tune.PREMIUM_CHANCE))) return;
    const kind = rng.weightedChoice(PREMIUM_KINDS, (k) => k.weight);
    if (!kind) return;
    const pos =
      rule && rule.premiumPos != null
        ? rule.premiumPos
        : rng.weightedChoice([0, 1, 2, 3, 4], (p) => [1, 2, 3, 2, 1][p]!);
    round.premium = { pos: pos!, kind: kind.id };
  })();

  function draw(count: number): Tile[] {
    return Tiles.draw(round.pile, count, rng);
  }
  round.rack = draw(round.rackSize);

  function refill() {
    const need = round.rackSize - round.rack.length;
    if (need > 0) round.rack.push(...draw(need));
  }

  function settle() {
    if (round.score >= round.target) {
      round.state = 'won';
      round.ink =
        round.reward + Number(tune.INK_PER_WORD_LEFT) * round.playsLeft;
      items.forEach((id) => {
        const itemDefs = Sandbox.ITEM_DEFS as
          Record<string, { inkAtWin?: (round: Round) => number }> | undefined;
        const it = itemDefs?.[id];
        if (it && it.inkAtWin) round.ink += it.inkAtWin(round);
      });
    } else if (round.playsLeft <= 0) {
      round.state = 'lost';
    }
  }

  // The tiles that would stay in the case if these were played.
  function held(tilesUsed: Tile[]): Tile[] {
    return round.rack.filter((t) => tilesUsed.indexOf(t) < 0);
  }

  // Rank helper: what would this word score off the CURRENT rack's tiles?
  // Falls back to plain letter values when the rack cannot form it, so the
  // word list can still order words it has no tiles for.
  round.breakdownFor = function (word: string): Breakdown {
    const upper = String(word).toUpperCase();
    const form = Lexicon.canFormFromRack(upper, round.rack);
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
            }) as Tile,
        );
    return scoreWordPoints(upper, tiles, round.rackSize, {
      tune,
      items,
      tierLevels,
      heldTiles: held(tiles),
      run: opts.run,
      round,
      preview: true,
      crescendo: onCrescendo(),
    });
  };
  round.scoreFor = function (word: string): number {
    return round.breakdownFor(word).total;
  };

  // The rule's word on a tile: may it be played now?
  round.isBarred = function (tile: Tile): boolean {
    return !!(
      round.rule &&
      round.rule.barsLetter &&
      round.rule.barsLetter(round, tile.letter)
    );
  };
  round.barredIn = function (tiles: Tile[]): string[] {
    return tiles.filter(round.isBarred).map((t) => t.letter);
  };

  // One tile is always a legal play; anything longer must be in the dictionary.
  round.isPlayable = function (word: string): boolean {
    const upper = String(word || '').toUpperCase();
    return upper.length === 1
      ? /^[A-Z]$/.test(upper)
      : Lexicon.isValidWord(upper);
  };

  round.playWord = function (raw: string): PlayResult {
    if (round.state !== 'live')
      return { ok: false, reason: 'The round is over.' };
    const upper = String(raw || '')
      .trim()
      .toUpperCase();
    if (!upper) return { ok: false, reason: 'Nothing to play.' };
    if (!round.isPlayable(upper))
      return { ok: false, reason: upper + ' isn’t in the dictionary.' };
    const form = Lexicon.canFormFromRack(upper, round.rack);
    if (!form.possible)
      return { ok: false, reason: upper + ' needs letters you don’t have.' };
    const barred = round.barredIn(form.tilesUsed!);
    if (barred.length)
      return {
        ok: false,
        reason:
          barred.join(', ') +
          ' has been played this round — ' +
          round.rule!.name +
          '.',
      };

    const breakdown = scoreWordPoints(upper, form.tilesUsed!, round.rackSize, {
      tune,
      items,
      tierLevels,
      heldTiles: held(form.tilesUsed!),
      run: opts.run,
      round,
      crescendo: onCrescendo(),
    });
    if (opts.run) {
      items.forEach((id) => {
        const itemDefs = Sandbox.ITEM_DEFS as
          | Record<
              string,
              { onPlayed?: (run: RunLike, breakdown: Breakdown) => void }
            >
          | undefined;
        const it = itemDefs?.[id];
        if (it && it.onPlayed) it.onPlayed(opts.run!, breakdown);
      });
    }
    const messages: string[] = [];
    Lexicon.removeTiles(round.rack, form.tilesUsed!);
    // The whole rack turns over on a play: the tiles just used AND whatever
    // was left waiting both go to the discard, so the next turn is a fresh draw.
    round.pile.discardPile.push(...form.tilesUsed!);
    round.pile.discardPile.push(...round.rack);
    round.rack = [];
    refill();
    form.tilesUsed!.forEach((t) => {
      round.usedLetters[t.letter] = true;
    });
    round.score += breakdown.total;
    round.playsLeft -= 1;
    round.plays.push({
      word: upper,
      breakdown,
      messages,
      tiles: form.tilesUsed!,
    });
    settle();
    const res: PlayResult = { ok: true, word: upper, breakdown, messages };
    if (opts.onPlay) opts.onPlay(res);
    return res;
  };

  // Throw back any number of CHOSEN tiles and draw that many. Costs one
  // changeout regardless of how many tiles go back; zero tiles costs nothing.
  round.changeout = function (tileIds: string[]): ChangeoutResult {
    if (round.state !== 'live')
      return { ok: false, reason: 'The round is over.' };
    if (round.changeoutsLeft <= 0)
      return { ok: false, reason: 'No changeouts left.' };
    const ids = new Set(tileIds || []);
    if (!ids.size)
      return { ok: false, reason: 'Pick the tiles to change out first.' };
    const back = round.rack.filter((t) => ids.has(t.id));
    if (!back.length)
      return { ok: false, reason: 'Those tiles aren’t in the rack.' };
    round.rack = round.rack.filter((t) => !ids.has(t.id));
    // Discard AFTER drawing, so a small bag cannot hand the same tiles back.
    const drawn = draw(back.length);
    round.rack.push(...drawn);
    round.pile.discardPile.push(...back);
    round.changeoutsLeft -= 1;
    return { ok: true, drawn, returned: back };
  };

  // An Erase ink: the tile leaves the case for good and the case refills.
  round.destroyTile = function (tileId: string): boolean {
    const i = round.rack.findIndex((t) => t.id === tileId);
    if (i < 0) return false;
    round.rack.splice(i, 1);
    refill();
    return true;
  };

  // Rearrange the rack by hand: the player's own ordering, nothing scored.
  round.moveTile = function (from: number, to: number): boolean {
    if (
      from === to ||
      from < 0 ||
      to < 0 ||
      from >= round.rack.length ||
      to >= round.rack.length
    )
      return false;
    const t = round.rack.splice(from, 1)[0]!;
    round.rack.splice(to, 0, t);
    return true;
  };

  return round;
}

export interface RunLike {
  key: string;
  tune: Tune;
  movements: unknown[];
  movement: number;
  stage: number;
  enemy: Enemy | null;
  round: Round | null;
  deck: Tile[];
  pile: { drawPile: Tile[]; discardPile: Tile[] } | null;
  items: string[];
  startItems: string[];
  consumables: { kind: string; id: string }[];
  itemState: Record<string, number>;
  shop: unknown;
  letterChoice: { options: string[]; last: boolean } | null;
  pack: unknown;
  tierLevels: Record<string, number>;
  ink: number;
  felled: string[];
  skipped: string[];
  favours: string[];
  bestPlay: { word: string; breakdown: Breakdown; enemy: string } | null;
  wordsPlayed: number;
  lastWin: { reward: number; interest: number } | null;
  state: 'live' | 'won' | 'lost';
  movementIIIQuillDone?: boolean;
  movementIIIQuillFound?: string | null;
  quillFound?: string | null;
  targetFor(movement: number, stage: number): number;
  interestPreview(): number;
  addTile(tile: Tile): void;
  extendCrescendo(extraSec: number): void;
  skip(): { ok: boolean; reason?: string; favour?: string };
  moveItem(from: number, to: number): boolean;
  levelTier(tierId: string): boolean;
  next(): 'live' | 'won' | 'lost';
  pickLetter(letter: string): boolean;
  leaveShop(): boolean;
  useConsumable(
    i: number,
    tileIds?: string[],
    extra?: { vowel?: string },
  ): { ok: boolean; reason?: string; used?: unknown; result?: unknown };
  useAdhocMark(
    id: string,
    tileIds?: string[],
    extra?: { vowel?: string },
  ): { ok: boolean; reason?: string };
  drawMarkHand(): Tile[];
  saveMark(id: string): { ok: boolean; reason?: string };
  sellConsumable(i: number): { ok: boolean; reason?: string; paid?: number };
}

export interface CreateRunOpts {
  tune?: Partial<Tune>;
  key?: string;
  deck?: Tile[];
  makeDeck?: () => Tile[];
  items?: string[];
  rng: RngStream;
  crescendo?: () => { phase: string; mag?: number } | null;
  extendCrescendo?: (extraSec: number) => void;
}

// A RUN down the lineup in enemies.ts: movements of small / big / boss, each
// a round with a higher target. Every round draws a fresh rack from
// run.deck -- one bag for the whole run, which the shop's tile packs and
// marginalia grow and mark. Ink pools across the run and earns INTEREST at
// every win, and every win short of the last opens the SHOP. Lose a round and the
// run is lost; fell the last boss and the run is won.
export function createRun(opts: CreateRunOpts): RunLike {
  const Sandbox = window.Wordbound.Sandbox;
  const tune = applyKey(
    Object.assign({}, ROUND_DEFAULTS, opts.tune || {}),
    opts.key,
  );
  const MOVEMENTS =
    (Sandbox.MOVEMENTS as { enemies: Enemy[] }[] | undefined) || [];
  const enemyAt = Sandbox.enemyAt as
    ((movement: number, stage: number) => Enemy | null) | undefined;

  const run: RunLike = {
    key: opts.key || KEYS[0]!.id,
    tune,
    movements: MOVEMENTS,
    movement: 0,
    stage: 0,
    enemy: null,
    round: null,
    deck: opts.deck || (opts.makeDeck ? opts.makeDeck() : []),
    pile: null, // { drawPile, discardPile } shared by every round; set below
    items: (opts.items || []).slice(), // carried into every round from here on
    startItems: (opts.items || []).slice(), // what the run set out with
    consumables: [], // inks and études held, CONSUMABLE_SLOTS deep
    itemState: {}, // scaling items' counters (items.ts), e.g. refrain
    shop: null, // open between fights (shop.ts)
    letterChoice: null, // { options, last } offered after a boss (stolenLetters.ts)
    pack: null, // an opened pack awaiting run.pick
    tierLevels: {}, // études: { tierId: level }, level 1 when absent
    ink: Number(tune.START_INK),
    felled: [], // enemy ids beaten so far
    skipped: [], // enemy ids skipped for a favour
    favours: [], // favour ids owed to the next shop (free_pack, coupon)
    bestPlay: null, // { word, breakdown, enemy } the run's best word
    wordsPlayed: 0,
    lastWin: null, // { reward, interest } of the latest win, for the UI
    state: 'live',
  } as unknown as RunLike;

  const KIND_MULT: Record<string, number> = {
    small: 1,
    big: Number(tune.BIG_MULT),
    boss: Number(tune.BOSS_MULT),
  };
  const KIND_INK: Record<string, number> = {
    small: Number(tune.INK_SMALL),
    big: Number(tune.INK_BIG),
    boss: Number(tune.INK_BOSS),
  };
  run.targetFor = function (movement: number, stage: number): number {
    const e = enemyAt ? enemyAt(movement, stage) : null;
    const base =
      Number(tune['MOVEMENT_BASE_' + (movement + 1)]) ||
      Number(tune.MOVEMENT_BASE_1) * Math.pow(2.5, movement);
    return Math.round(
      base *
        (e ? KIND_MULT[e.kind] || 1 : 1) *
        (Number(tune.KEY_TARGET_MULT) || 1),
    );
  };
  run.interestPreview = function (): number {
    return Math.min(
      Number(tune.INTEREST_CAP),
      Math.floor(run.ink / Number(tune.INTEREST_PER)),
    );
  };
  // The bag is the whole deck reshuffled at the start of every fight.
  // Within a fight, played and swapped tiles wait in the discard pile and
  // only come back once the bag runs dry.
  function discardRack() {
    const r = run.round;
    if (!r) return;
    r.pile.discardPile.push(...r.rack);
    r.rack = [];
  }
  run.addTile = function (tile: Tile) {
    run.deck.push(tile);
  };
  // Sustain (items.ts): hold the soundtrack's crescendo window open extraSec
  // longer. Supplied by the UI (it owns the audio); a no-op headless.
  run.extendCrescendo = opts.extendCrescendo || (() => {});

  function begin() {
    // Quill discovery: reaching Movement III (index 2) reveals one more,
    // once per run, on top of whatever a boss has already found.
    const rollQuillDiscovery = Sandbox.rollQuillDiscovery as
      ((rng: RngStream) => string | null) | undefined;
    const discoverQuill = Sandbox.discoverQuill as
      ((id: string) => boolean) | undefined;
    if (run.movement >= 2 && !run.movementIIIQuillDone && rollQuillDiscovery) {
      run.movementIIIQuillDone = true;
      const found3 = rollQuillDiscovery(opts.rng);
      if (found3 && discoverQuill && discoverQuill(found3))
        run.movementIIIQuillFound = found3;
    }
    run.enemy = enemyAt ? enemyAt(run.movement, run.stage) : null;
    run.pile = {
      drawPile: window.Wordbound.Tiles.shuffleIntoDrawPile(run.deck, opts.rng),
      discardPile: [],
    };
    run.round = createRound({
      rng: opts.rng,
      deck: run.deck,
      pile: run.pile,
      tune,
      items: run.items,
      run,
      crescendo: opts.crescendo,
      noPremium: !!(tune.KEY_NO_BOSS_PREMIUM && run.enemy!.kind === 'boss'),
      target: run.targetFor(run.movement, run.stage),
      reward: KIND_INK[run.enemy!.kind],
      rule: run.enemy!.rule,
      tierLevels: run.tierLevels,
      onPlay: (res) => {
        run.wordsPlayed += 1;
        if (
          !run.bestPlay ||
          res.breakdown!.total > run.bestPlay.breakdown.total
        ) {
          run.bestPlay = {
            word: res.word!,
            breakdown: res.breakdown!,
            enemy: run.enemy!.name,
          };
        }
      },
    });
    // The favour on offer for walking past this one; bosses cannot be skipped.
    run.round.favour =
      run.enemy!.kind === 'boss'
        ? null
        : FAVOURS[opts.rng.randInt(0, FAVOURS.length - 1)]!.id;
  }

  // Skip the current enemy for its favour: only before a word is played,
  // never a boss. Bounty pays now; the others are owed to the next shop.
  // No shop opens after a skip.
  run.skip = function () {
    const r = run.round;
    if (run.state !== 'live' || !r || r.state !== 'live' || run.shop)
      return { ok: false, reason: 'Nothing to skip.' };
    if (tune.KEY_NO_SKIP)
      return { ok: false, reason: 'No skipping in B minor.' };
    if (!r.favour) return { ok: false, reason: 'The boss cannot be skipped.' };
    if (r.plays.length)
      return { ok: false, reason: 'Too late — a word has been played.' };
    const favour = r.favour;
    if (favour === 'bounty') run.ink += Number(tune.BOUNTY_INK);
    else run.favours.push(favour);
    run.skipped.push(run.enemy!.id);
    discardRack();
    run.stage += 1;
    if (
      run.stage >=
      (MOVEMENTS[run.movement] as { enemies: Enemy[] }).enemies.length
    ) {
      run.stage = 0;
      run.movement += 1;
    }
    begin();
    return { ok: true, favour };
  };

  // Reorder the held items: they fire left to right.
  run.moveItem = function (from: number, to: number): boolean {
    if (
      from === to ||
      from < 0 ||
      to < 0 ||
      from >= run.items.length ||
      to >= run.items.length
    )
      return false;
    const id = run.items.splice(from, 1)[0]!;
    run.items.splice(to, 0, id);
    return true;
  };

  // An étude: raise one length tier a level for the rest of the run.
  run.levelTier = function (tierId: string): boolean {
    if (!TIER_DEFS[tierId]) return false;
    run.tierLevels[tierId] = (run.tierLevels[tierId] || 1) + 1;
    return true;
  };

  // Finish settling a win once any letter choice is resolved (or there was
  // none to offer): open the shop or, for the last boss, end the run.
  function finishWin(last: boolean): 'live' | 'won' | 'lost' {
    if (last) {
      run.state = 'won';
      return run.state;
    }
    discardRack();
    run.stage += 1;
    if (
      run.stage >=
      (MOVEMENTS[run.movement] as { enemies: Enemy[] }).enemies.length
    ) {
      run.stage = 0;
      run.movement += 1;
    }
    run.enemy = enemyAt ? enemyAt(run.movement, run.stage) : null; // the one ahead, for the shop's door
    const createShop = Sandbox.createShop as
      ((run: RunLike, rng: RngStream) => unknown) | undefined;
    run.shop = createShop ? createShop(run, opts.rng) : null;
    if (!run.shop) begin();
    return run.state;
  }

  // Settle the current round into the run: bank the reward, then the
  // interest on what is held. Felling a boss may pause here with
  // run.letterChoice open (stolenLetters.ts) -- run.pickLetter resumes. A
  // win on the way to the last boss opens the shop (run.shop; leave it with
  // run.leaveShop).
  run.next = function (): 'live' | 'won' | 'lost' {
    const r = run.round;
    if (
      run.state !== 'live' ||
      !r ||
      r.state === 'live' ||
      run.shop ||
      run.letterChoice
    )
      return run.state;
    if (r.state === 'lost') {
      run.state = 'lost';
      return run.state;
    }
    run.ink += r.ink;
    const interest = run.interestPreview();
    run.ink += interest;
    run.lastWin = { reward: r.ink, interest };
    run.felled.push(run.enemy!.id);
    const wasBoss = run.enemy!.kind === 'boss';
    const last =
      run.movement >= MOVEMENTS.length - 1 &&
      run.stage >=
        (MOVEMENTS[run.movement] as { enemies: Enemy[] }).enemies.length - 1;
    // Quill discovery (NEXT_LEVEL_PLAN.md stage 4): felling a boss reveals
    // one hidden quill alongside the letter choice.
    run.quillFound = null;
    const rollQuillDiscovery = Sandbox.rollQuillDiscovery as
      ((rng: RngStream) => string | null) | undefined;
    const discoverQuill = Sandbox.discoverQuill as
      ((id: string) => boolean) | undefined;
    if (wasBoss && rollQuillDiscovery) {
      const found = rollQuillDiscovery(opts.rng);
      if (found && discoverQuill && discoverQuill(found))
        run.quillFound = found;
    }
    const rollLetterChoice = Sandbox.rollLetterChoice as
      ((rng: RngStream, count?: number) => string[] | null) | undefined;
    if (wasBoss && rollLetterChoice) {
      const choices = rollLetterChoice(opts.rng, 3);
      if (choices && choices.length) {
        run.letterChoice = { options: choices, last };
        return run.state;
      }
    }
    return finishWin(last);
  };

  // Take one of the letters offered by run.letterChoice, persist it
  // (stolenLetters.ts), and resume the win it interrupted.
  run.pickLetter = function (letter: string): boolean {
    if (!run.letterChoice) return false;
    if (run.letterChoice.options.indexOf(letter) < 0) return false;
    const winLetter = Sandbox.winLetter as
      ((letter: string) => boolean) | undefined;
    if (winLetter) winLetter(letter);
    const last = run.letterChoice.last;
    run.letterChoice = null;
    finishWin(last);
    return true;
  };

  // Close the shop and begin the next round.
  run.leaveShop = function (): boolean {
    if (!run.shop || run.pack) return false;
    run.shop = null;
    begin();
    return true;
  };

  // Use a held consumable. An étude needs nothing else; a marginalia card
  // takes the ids of the tiles it is applied to (marginalia.ts, Phase 4).
  run.useConsumable = function (
    i: number,
    tileIds?: string[],
    extra?: { vowel?: string },
  ) {
    const c = run.consumables[i];
    if (!c) return { ok: false, reason: 'Nothing there.' };
    if (c.kind === 'etude') {
      run.levelTier(c.id);
      run.consumables.splice(i, 1);
      return { ok: true, used: c };
    }
    const applyMark = Sandbox.applyMark as
      | ((
          run: RunLike,
          id: string,
          tileIds: string[],
          extra?: { vowel?: string },
        ) => { ok: boolean; reason?: string; note?: string })
      | undefined;
    if (c.kind === 'mark' && applyMark) {
      const res = applyMark(run, c.id, tileIds || [], extra);
      if (!res.ok) return res;
      run.consumables.splice(i, 1);
      return { ok: true, used: c, result: res };
    }
    return { ok: false, reason: 'That cannot be used yet.' };
  };

  // Play a marginalia card bought straight out of the shop while every
  // consumable slot was full (shop.ts takeConsumable) -- it was never
  // stored, so there is nothing to splice out of run.consumables afterward.
  run.useAdhocMark = function (
    id: string,
    tileIds?: string[],
    extra?: { vowel?: string },
  ) {
    const applyMark = Sandbox.applyMark as
      | ((
          run: RunLike,
          id: string,
          tileIds: string[],
          extra?: { vowel?: string },
        ) => { ok: boolean; reason?: string; note?: string })
      | undefined;
    if (!applyMark) return { ok: false, reason: 'That cannot be used yet.' };
    return applyMark(run, id, tileIds || [], extra);
  };

  // A fresh hand drawn to use a marginalia card on the spot, right after
  // buying or keeping it -- before either of run.useAdhocMark or
  // run.saveMark decides
  // what happens to it.
  run.drawMarkHand = function (): Tile[] {
    const Tiles = window.Wordbound.Tiles;
    return Tiles.shuffleIntoDrawPile(run.deck, opts.rng).slice(
      0,
      Math.min(Number(tune.RACK_SIZE), run.deck.length),
    );
  };

  // Hold an ink just bought or kept in run.consumables instead of using it
  // now -- the other half of the choice offered alongside run.useAdhocMark.
  run.saveMark = function (id: string) {
    if (run.consumables.length >= Number(tune.CONSUMABLE_SLOTS))
      return {
        ok: false,
        reason: 'No room for another marginalia card — use or sell one first.',
      };
    run.consumables.push({ kind: 'mark', id });
    return { ok: true };
  };

  run.sellConsumable = function (i: number) {
    const c = run.consumables[i];
    if (!c) return { ok: false, reason: 'Nothing there.' };
    run.consumables.splice(i, 1);
    const paid = Math.floor(
      Number(c.kind === 'mark' ? tune.MARK_PRICE : tune.ETUDE_PRICE) / 2,
    );
    run.ink += paid;
    return { ok: true, paid };
  };

  begin();
  return run;
}

const SandboxOut = window.Wordbound.Sandbox;
SandboxOut.ROUND_DEFAULTS = ROUND_DEFAULTS;
SandboxOut.PREMIUM_KINDS = PREMIUM_KINDS;
SandboxOut.KEYS = KEYS;
SandboxOut.KEY_DEFS = KEY_DEFS;
SandboxOut.applyKey = applyKey;
SandboxOut.FAVOURS = FAVOURS;
SandboxOut.FAVOUR_DEFS = FAVOUR_DEFS;
SandboxOut.TIERS = TIERS;
SandboxOut.TIER_DEFS = TIER_DEFS;
SandboxOut.tierFor = tierFor;
SandboxOut.tierStats = tierStats;
SandboxOut.chordPoints = chordPoints;
SandboxOut.scoreWordPoints = scoreWordPoints;
SandboxOut.scoreSteps = scoreSteps;
SandboxOut.createRound = createRound;
SandboxOut.createRun = createRun;
