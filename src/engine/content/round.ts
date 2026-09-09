// TS port of src/sandbox/round.js (READ_SLOWLY_PLAN.md A2/A5 step 3): word
// scoring (the Balatro-with-Scrabble model, COMBAT_REDESIGN.md) shared by
// state/round.ts. The mutable `createRound`/`createRun`/`Round`/`RunLike`
// this file used to also host are superseded by state/round.ts + state/
// run.ts's pure engine (facade.ts wires it into the UI); removed
// (READ_SLOWLY_PLAN.md A2/A3, `<pending>`) once confirmed nothing but
// tools/parity-*.ts still called them. window.Wordbound.Lexicon stays a
// global -- that's js/wordbound/wordlist.js's legacy plumbing, out of scope
// for A2's Sandbox-namespace cleanup.
import type { Tile } from '../tiles';
import type { Rule } from './enemies';
import type { ItemNote } from './items';
import { applyItems, describeDelta } from './items';

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

// Shop pack flavour (display-only; state/run.ts keeps its own PACK_KINDS/
// RARITY_PRICE for the pure pick/price rolls -- this is just the copy the UI
// reads, same as the old content/shop.ts's PACK_KINDS/priceOf).
export interface PackKind {
  kind: 'tile' | 'mark' | 'etude';
  name: string;
  hint: string;
}

export const PACK_KINDS: PackKind[] = [
  {
    kind: 'tile',
    name: 'Tile pack',
    hint: 'Three sorts from the foundry — keep one; it joins your tiles for the run',
  },
  {
    kind: 'mark',
    name: 'Marginalia pack',
    hint: 'Three marginalia — keep one',
  },
  {
    kind: 'etude',
    name: 'Étude pack',
    hint: 'Three études — keep one, and level a length',
  },
];

const RARITY_PRICE: Record<string, [number, number]> = {
  common: [3, 5],
  uncommon: [5, 7],
  rare: [8, 8],
};

export function priceOf(def: { price?: number; rarity?: string }): number {
  if (def.price != null) return def.price;
  return RARITY_PRICE[def.rarity || 'common']![0];
}

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
  run: unknown;
  round: unknown;
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
  // Marked tiles (marginalia.ts): gilt and bold on the tiles played, steel
  // on the tiles left waiting in the case.
  b.inkPoints = 0;
  b.inkMult = 0;
  b.holdMult = 1;
  b.inkNotes = [];
  tilesUsed.forEach((t) => {
    if (t.mark === 'gilt') {
      b.inkPoints += Number(tune.MARK_GILT) || 0;
      b.inkNotes.push('gilt ' + t.letter + ' +' + tune.MARK_GILT);
    } else if (t.mark === 'bold') {
      b.inkMult += Number(tune.MARK_BOLD) || 0;
      b.inkNotes.push('bold ' + t.letter + ' +' + tune.MARK_BOLD + ' mult');
    }
  });
  (ctx.heldTiles || []).forEach((t) => {
    if (t.mark === 'steel') {
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
  const round0 = ctx.round as
    | { premium: { pos: number; kind: 'dl' | 'tl' | 'dw' } | null }
    | null
    | undefined;
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
  const round = ctx.round as
    | {
        premium: unknown;
        playsLeft: number;
        plays: unknown[];
        rule: Rule | null;
      }
    | null
    | undefined;
  b.itemNotes = applyItems(
    {
      word,
      tiles: tilesUsed,
      held: ctx.heldTiles || [],
      items: ctx.items || [],
      run: ctx.run as {
        itemState: Record<string, number>;
        extendCrescendo?(sec: number): void;
      } | null,
      round: round as {
        plays: { word: string }[];
        changeoutsLeft: number;
      } | null,
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
  );
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
      describeDelta(ruleNote, p0, m0, acc);
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
    ink: t.mark || null,
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
    if (t.mark === 'steel')
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
