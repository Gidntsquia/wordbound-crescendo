// READ_SLOWLY_PLAN.md A3: immutable RunState + pure transitions, ported from
// content/round.ts's mutable `createRun` (begin/skip/next/pickLetter/
// leaveShop) and content/shop.ts's mutable `createShop` (buy/sell/reroll/
// openPack/pick). Same RNG call order as the mutable versions -- verified by
// tools/parity-new.ts against tools/parity-old.ts's trace.
//
// stolenLetters.ts and quillDiscovery.ts stay RngStream-based and
// side-effecting on localStorage (READ_SLOWLY_PLAN.md A2's persistence.ts is
// the slice that gives them a versioned, pure-friendly home) -- toStream
// (rng.ts) bridges a pure RngState into a mutable RngStream for the span of
// one call into them, then hands back the RngState so the rest of this
// module stays pure.
import type { Tile } from '../tiles';
import type { RngState } from '../rng';
import * as rng from '../rng';
import { MOVEMENTS, enemyAt, RULES, type Enemy } from '../content/enemies';
import {
  FAVOURS,
  ROUND_DEFAULTS,
  TIERS,
  TIER_DEFS,
  applyKey,
  type Breakdown,
  type Tune,
} from '../content/round';
import { ITEMS, ITEM_DEFS } from '../content/items';
import { CHARACTERS } from '../content/characters';
import { MARGINALIA, MARK_DEFS } from '../content/marginalia';
import { getTileBag } from '../content/tileBags';
import {
  isAvailable,
  rollLetterChoice,
  winLetter,
} from '../meta/stolenLetters';
import {
  isQuillDiscovered,
  rollQuillDiscovery,
  discoverQuill,
} from '../meta/quillDiscovery';
import { createTile } from '../tiles';
import * as R from './round';
import type { RoundState, PlayEffects } from './round';

export interface Card {
  kind: 'item' | 'mark' | 'etude';
  id: string;
  price: number;
  sold: boolean;
}

export interface Pack {
  kind: 'tile' | 'mark' | 'etude';
  price: number;
  opened: boolean;
  free?: boolean;
}

export type PackChoice =
  | { kind: 'tile'; tile: Tile }
  | { kind: 'etude'; id: string }
  | { kind: 'mark'; id: string };

export interface ShopState {
  readonly cards: readonly Card[];
  readonly packs: readonly Pack[];
  readonly rerolls: number;
  readonly coupon: boolean;
  readonly favours: readonly string[];
}

const PACK_KINDS: { kind: 'tile' | 'mark' | 'etude' }[] = [
  { kind: 'tile' },
  { kind: 'mark' },
  { kind: 'etude' },
];

const RARITY_PRICE: Record<string, [number, number]> = {
  common: [3, 5],
  uncommon: [5, 7],
  rare: [8, 8],
};

function priceOf(
  def: { price?: number; rarity?: string },
  s: RngState,
): [number, RngState] {
  if (def.price != null) return [def.price, s];
  const band = RARITY_PRICE[def.rarity || 'common']!;
  return rng.randInt(s, band[0], band[1]);
}

export interface Consumable {
  kind: string;
  id: string;
}

export interface RunState {
  readonly key: string;
  readonly tune: Tune;
  readonly movement: number;
  readonly stage: number;
  readonly enemy: Enemy | null;
  readonly round: RoundState | null;
  readonly deck: readonly Tile[];
  readonly items: readonly string[];
  readonly startItems: readonly string[];
  readonly consumables: readonly Consumable[];
  readonly itemState: Readonly<Record<string, number>>;
  readonly shop: ShopState | null;
  readonly letterChoice: { options: readonly string[]; last: boolean } | null;
  readonly pack: {
    kind: string;
    choices: readonly (PackChoice | null)[];
  } | null;
  readonly tierLevels: Readonly<Record<string, number>>;
  readonly ink: number;
  readonly felled: readonly string[];
  readonly resolved: readonly string[];
  readonly skipped: readonly string[];
  readonly favours: readonly string[];
  readonly bestPlay: {
    word: string;
    breakdown: Breakdown;
    enemy: string;
  } | null;
  readonly wordsPlayed: number;
  readonly lastWin: { reward: number; interest: number } | null;
  readonly state: 'live' | 'won' | 'lost';
  readonly movementIIIQuillDone?: boolean;
  readonly movementIIIQuillFound?: string | null;
  readonly quillFound?: string | null;
  // READ_SLOWLY_PLAN.md D1: the chosen character's permanent tile, playable
  // in every word, that lives in its own slot for the whole run -- never
  // part of the deck/pile/rack. Null for no character (or one with no
  // roster entry).
  readonly characterTile: Tile | null;
}

export interface CreateRunStateOpts {
  tune?: Partial<Tune>;
  key?: string;
  deck?: Tile[];
  items?: string[];
  characterId?: string;
}

function kindMult(tune: Tune): Record<string, number> {
  return { small: 1, big: Number(tune.BIG_MULT), boss: Number(tune.BOSS_MULT) };
}
function kindInk(tune: Tune): Record<string, number> {
  return {
    small: Number(tune.INK_SMALL),
    big: Number(tune.INK_BIG),
    boss: Number(tune.INK_BOSS),
  };
}

export function targetFor(
  run: RunState,
  movement: number,
  stage: number,
): number {
  const e = enemyAt(movement, stage);
  const base =
    Number(run.tune['MOVEMENT_BASE_' + (movement + 1)]) ||
    Number(run.tune.MOVEMENT_BASE_1) * Math.pow(2.5, movement);
  return Math.round(
    base *
      (e ? (kindMult(run.tune)[e.kind] ?? 1) : 1) *
      (Number(run.tune.KEY_TARGET_MULT) || 1),
  );
}

export function interestPreview(run: RunState): number {
  return Math.min(
    Number(run.tune.INTEREST_CAP),
    Math.floor(run.ink / Number(run.tune.INTEREST_PER)),
  );
}

// The pure twin of createRun's begin(): rolls the Movement-III quill (once),
// picks the enemy, reshuffles the deck into a fresh pile, creates the round,
// and rolls its favour. Called once at run creation and again whenever the
// walk advances (skip, finishWin).
function begin(run: RunState, rngState: RngState): [RunState, RngState] {
  let s = rngState;
  let movementIIIQuillDone = run.movementIIIQuillDone;
  let movementIIIQuillFound = run.movementIIIQuillFound ?? null;
  if (run.movement >= 2 && !movementIIIQuillDone) {
    movementIIIQuillDone = true;
    const bridge = rng.toStream(s);
    const found = rollQuillDiscovery(bridge.stream);
    s = bridge.get();
    if (found && discoverQuill(found)) movementIIIQuillFound = found;
  }
  const enemy = enemyAt(run.movement, run.stage);
  const [shuffledDeck, s2] = rng.shuffle(s, run.deck);
  s = s2;
  const pile = { drawPile: shuffledDeck, discardPile: [] };
  const [roundState, s3] = R.createRoundState(
    {
      deck: run.deck as Tile[],
      pile,
      tune: run.tune,
      items: run.items as string[],
      tierLevels: run.tierLevels as Record<string, number>,
      noPremium: !!(run.tune.KEY_NO_BOSS_PREMIUM && enemy!.kind === 'boss'),
      target: targetFor(run, run.movement, run.stage),
      reward: kindInk(run.tune)[enemy!.kind],
      rule: enemy!.rule ? (RULES as never)[enemy!.rule] : null,
      situation: enemy!.situation,
    },
    s,
  );
  s = s3;
  let favourId: string | null = null;
  if (enemy!.kind !== 'boss') {
    const [favour, s4] = rng.randInt(s, 0, FAVOURS.length - 1);
    s = s4;
    favourId = FAVOURS[favour]!.id;
  }
  const roundWithFavour: RoundState = {
    ...roundState,
    favour: favourId,
  };
  const next: RunState = {
    ...run,
    movementIIIQuillDone,
    movementIIIQuillFound,
    enemy,
    round: roundWithFavour,
  };
  return [next, s];
}

export function createRunState(
  opts: CreateRunStateOpts,
  rngState: RngState,
): [RunState, RngState] {
  const tune = applyKey(
    Object.assign({}, ROUND_DEFAULTS, opts.tune || {}),
    opts.key,
  );
  const character = opts.characterId
    ? CHARACTERS.find((c) => c.id === opts.characterId)
    : undefined;
  const characterTile: Tile | null = character
    ? { ...createTile(character.letter), origin: 'character' }
    : null;
  const run: RunState = {
    key: opts.key || 'c_major',
    tune,
    movement: 0,
    stage: 0,
    enemy: null,
    round: null,
    deck: opts.deck || [],
    items: (opts.items || []).slice(),
    startItems: (opts.items || []).slice(),
    consumables: [],
    itemState: {},
    shop: null,
    letterChoice: null,
    pack: null,
    tierLevels: {},
    ink: Number(tune.START_INK),
    felled: [],
    resolved: [],
    skipped: [],
    favours: [],
    bestPlay: null,
    wordsPlayed: 0,
    lastWin: null,
    state: 'live',
    characterTile,
  };
  return begin(run, rngState);
}

// The bag is the whole deck reshuffled at the start of every fight; within a
// fight, played and swapped tiles wait in the discard until the bag runs
// dry. Leaving a round (skip, or a win on the way to a shop/the next fight)
// discards whatever is still in the rack -- content/round.ts's discardRack.
function discardRack(round: RoundState): RoundState {
  return {
    ...round,
    rack: [],
    pile: {
      drawPile: round.pile.drawPile,
      discardPile: (round.pile.discardPile as Tile[]).concat(
        round.rack as Tile[],
      ),
    },
  };
}

function advanceStage(run: RunState): { movement: number; stage: number } {
  let stage = run.stage + 1;
  let movement = run.movement;
  if (stage >= MOVEMENTS[movement]!.enemies.length) {
    stage = 0;
    movement += 1;
  }
  return { movement, stage };
}

export interface SkipResult {
  ok: boolean;
  reason?: string;
  favour?: string;
}

export function skip(
  run: RunState,
  rngState: RngState,
): [RunState, SkipResult, RngState] {
  const r = run.round;
  if (run.state !== 'live' || !r || r.state !== 'live' || run.shop)
    return [run, { ok: false, reason: 'Nothing to skip.' }, rngState];
  if (run.tune.KEY_NO_SKIP)
    return [run, { ok: false, reason: 'No skipping in B minor.' }, rngState];
  if (!r.favour)
    return [
      run,
      { ok: false, reason: 'The boss cannot be skipped.' },
      rngState,
    ];
  if (r.plays.length)
    return [
      run,
      { ok: false, reason: 'Too late — a word has been played.' },
      rngState,
    ];
  const favour = r.favour;
  let ink = run.ink;
  let favours = run.favours as string[];
  if (favour === 'bounty') ink += Number(run.tune.BOUNTY_INK);
  else favours = favours.concat([favour]);
  const { movement, stage } = advanceStage(run);
  const afterSkip: RunState = {
    ...run,
    ink,
    favours,
    skipped: (run.skipped as string[]).concat([run.enemy!.id]),
    movement,
    stage,
    round: discardRack(r),
  };
  const [next, s] = begin(afterSkip, rngState);
  return [next, { ok: true, favour }, s];
}

function finishWin(
  run: RunState,
  last: boolean,
  rngState: RngState,
): [RunState, RngState] {
  if (last) return [{ ...run, state: 'won' }, rngState];
  const { movement, stage } = advanceStage(run);
  const enemy = enemyAt(movement, stage);
  const afterAdvance: RunState = {
    ...run,
    movement,
    stage,
    enemy,
    round: run.round ? discardRack(run.round) : run.round,
  };
  let s = rngState;
  const shop: ShopState = rollShop(afterAdvance);
  // Favours owed from a skipped enemy are spent entering the shop.
  let coupon = false;
  const packs = shop.packs.slice();
  shop.favours.forEach((f) => {
    if (f === 'free_pack' && packs[0]) packs[0] = { ...packs[0], free: true };
    if (f === 'coupon') coupon = true;
  });
  const cards = coupon
    ? shop.cards.map((c) => ({ ...c, price: 0 }))
    : shop.cards;
  const withFavour: ShopState = { ...shop, cards, packs, coupon, favours: [] };
  return [{ ...afterAdvance, shop: withFavour, favours: [] }, s];

  // Pure reroll of the shop's cards/packs, threading rngState through the
  // outer closure's `s` (rollShop is only ever called once here, right
  // after advancing, so this local mutation of `s` stays confined to this
  // function call).
  function rollShop(runForShop: RunState): ShopState {
    const [rolled, s2] = rollCardsAndPacks(runForShop, s);
    s = s2;
    return rolled;
  }
}

function itemIds(): string[] {
  return ITEMS.map((it) => it.id);
}
function itemDefs(): Record<
  string,
  { id: string; rarity?: string; price?: number }
> {
  return ITEM_DEFS;
}
function tiers(): { id: string }[] {
  return TIERS;
}
function marginalia(): { id: string }[] {
  return MARGINALIA;
}
function pick<T>(s: RngState, arr: T[]): [T, RngState] {
  const [i, s2] = rng.randInt(s, 0, arr.length - 1);
  return [arr[i]!, s2];
}

function rollEtude(
  s: RngState,
  exclude: string[],
): [{ kind: 'etude'; id: string }, RngState] {
  let pool = tiers().filter((t) => exclude.indexOf(t.id) < 0);
  if (!pool.length) pool = tiers();
  const [t, s2] = pick(s, pool);
  return [{ kind: 'etude', id: t.id }, s2];
}
function rollMark(
  s: RngState,
  exclude: string[],
): [{ kind: 'mark'; id: string } | null, RngState] {
  let pool = marginalia().filter((m) => exclude.indexOf(m.id) < 0);
  if (!pool.length) pool = marginalia();
  if (!pool.length) return [null, s];
  const [m, s2] = pick(s, pool);
  return [{ kind: 'mark', id: m.id }, s2];
}
function rollItem(
  run: RunState,
  s: RngState,
  taken: string[],
): [{ kind: 'item'; id: string } | null, RngState] {
  const pool = itemIds().filter((id) => {
    if (!isQuillDiscovered(id)) return false;
    return (run.items as string[]).indexOf(id) < 0 && taken.indexOf(id) < 0;
  });
  if (!pool.length) return [null, s];
  const weights: Record<string, number> = { common: 70, uncommon: 25, rare: 5 };
  const defs = itemDefs();
  let total = 0;
  pool.forEach((id) => {
    total += weights[defs[id]?.rarity || 'common'] ?? 0;
  });
  const [v, s2] = rng.next(s);
  let roll = v * total;
  for (const id of pool) {
    roll -= weights[defs[id]?.rarity || 'common'] ?? 0;
    if (roll <= 0) return [{ kind: 'item', id }, s2];
  }
  return [{ kind: 'item', id: pool[pool.length - 1]! }, s2];
}
function rollCard(
  run: RunState,
  s: RngState,
  taken: string[],
): [Card, RngState] {
  const tune = run.tune;
  const [v, s2] = rng.next(s);
  let s3 = s2;
  const r =
    v *
    ((Number(tune.CARD_ITEM) || 0) +
      (Number(tune.CARD_MARK) || 0) +
      (Number(tune.CARD_ETUDE) || 0));
  let card: { kind: 'item' | 'mark' | 'etude'; id: string } | null = null;
  if (r < (Number(tune.CARD_ITEM) || 0)) {
    const [c, s4] = rollItem(run, s3, taken);
    card = c;
    s3 = s4;
  } else if (
    r <
    (Number(tune.CARD_ITEM) || 0) + (Number(tune.CARD_MARK) || 0)
  ) {
    const [c, s4] = rollMark(s3, []);
    card = c;
    s3 = s4;
  }
  if (!card) {
    const [c, s4] = rollItem(run, s3, taken);
    s3 = s4;
    if (c) card = c;
    else {
      const [e, s5] = rollEtude(s3, []);
      card = e;
      s3 = s5;
    }
  }
  let price: number;
  if (card.kind === 'item') {
    const [p, s5] = priceOf(itemDefs()[card.id] || {}, s3);
    price = p;
    s3 = s5;
  } else {
    price =
      card.kind === 'mark'
        ? Number(run.tune.MARK_PRICE) || 0
        : Number(run.tune.ETUDE_PRICE) || 0;
  }
  return [{ ...card, price, sold: false }, s3];
}

function rollCardsAndPacks(
  run: RunState,
  rngState: RngState,
): [ShopState, RngState] {
  let s = rngState;
  const cards: Card[] = [];
  const taken: string[] = [];
  for (let i = 0; i < (Number(run.tune.CARD_SLOTS) || 0); i++) {
    const [c, s2] = rollCard(run, s, taken);
    s = s2;
    if (c.kind === 'item') taken.push(c.id);
    cards.push(c);
  }
  const packs: Pack[] = [];
  const kinds = PACK_KINDS.filter(
    (k) => k.kind !== 'mark' || marginalia().length,
  );
  let left = kinds.slice();
  for (let i = 0; i < (Number(run.tune.PACK_SLOTS) || 0); i++) {
    if (!left.length) left = kinds.slice();
    const [idx, s2] = rng.randInt(s, 0, left.length - 1);
    s = s2;
    const k = left.splice(idx, 1)[0]!;
    packs.push({
      kind: k.kind,
      price: Number(run.tune.PACK_PRICE) || 0,
      opened: false,
    });
  }
  return [
    {
      cards,
      packs,
      rerolls: 0,
      coupon: false,
      favours: run.favours as string[],
    },
    s,
  ];
}

export interface NextResult {
  state: 'live' | 'won' | 'lost';
}

export function next(run: RunState, rngState: RngState): [RunState, RngState] {
  const r = run.round;
  if (
    run.state !== 'live' ||
    !r ||
    r.state === 'live' ||
    run.shop ||
    run.letterChoice
  )
    return [run, rngState];
  if (r.state === 'lost') return [{ ...run, state: 'lost' }, rngState];

  let s = rngState;
  const inkAfterReward = run.ink + r.ink;
  const interest = interestPreview({ ...run, ink: inkAfterReward });
  const ink = inkAfterReward + interest;
  const lastWin = { reward: r.ink, interest };
  const felled = (run.felled as string[]).concat([run.enemy!.id]);
  const resolved =
    run.enemy!.situation &&
    (run.resolved as string[]).indexOf(run.enemy!.situation) < 0
      ? (run.resolved as string[]).concat([run.enemy!.situation])
      : run.resolved;
  const wasBoss = run.enemy!.kind === 'boss';
  const last =
    run.movement >= MOVEMENTS.length - 1 &&
    run.stage >= MOVEMENTS[run.movement]!.enemies.length - 1;

  let quillFound: string | null = null;
  if (wasBoss) {
    const bridge = rng.toStream(s);
    const found = rollQuillDiscovery(bridge.stream);
    s = bridge.get();
    if (found && discoverQuill(found)) quillFound = found;
  }

  const afterSettle: RunState = {
    ...run,
    ink,
    lastWin,
    felled,
    resolved,
    quillFound,
  };

  if (wasBoss) {
    const bridge = rng.toStream(s);
    const choices = rollLetterChoice(bridge.stream, 3);
    s = bridge.get();
    if (choices && choices.length) {
      return [{ ...afterSettle, letterChoice: { options: choices, last } }, s];
    }
  }
  return finishWin(afterSettle, last, s);
}

export function pickLetter(
  run: RunState,
  letter: string,
  rngState: RngState,
): [RunState, boolean, RngState] {
  if (!run.letterChoice) return [run, false, rngState];
  if (run.letterChoice.options.indexOf(letter) < 0)
    return [run, false, rngState];
  winLetter(letter);
  const last = run.letterChoice.last;
  const [next, s] = finishWin({ ...run, letterChoice: null }, last, rngState);
  return [next, true, s];
}

export function leaveShop(
  run: RunState,
  rngState: RngState,
): [RunState, boolean, RngState] {
  if (!run.shop || run.pack) return [run, false, rngState];
  const [next, s] = begin({ ...run, shop: null }, rngState);
  return [next, true, s];
}

export interface ShopResult {
  ok: boolean;
  reason?: string;
  [key: string]: unknown;
}

export function buyCard(run: RunState, i: number): [RunState, ShopResult] {
  const shop = run.shop;
  const c = shop?.cards[i];
  if (!shop || !c || c.sold)
    return [run, { ok: false, reason: 'Nothing there.' }];
  if (run.ink < c.price) return [run, { ok: false, reason: 'Not enough ink.' }];
  let items = run.items as string[];
  let consumables = run.consumables as Consumable[];
  let mark: string | null = null;
  if (c.kind === 'item') {
    if (items.length >= (Number(run.tune.ITEM_SLOTS) || 0))
      return [
        run,
        {
          ok: false,
          reason:
            'All ' +
            run.tune.ITEM_SLOTS +
            ' quill slots are full — sell one first.',
        },
      ];
    items = items.concat([c.id]);
  } else {
    const markDefs = MARK_DEFS as Record<string, unknown>;
    if (c.kind === 'mark' && markDefs[c.id]) {
      mark = c.id;
    } else if (consumables.length >= (Number(run.tune.CONSUMABLE_SLOTS) || 0)) {
      if (c.kind === 'etude') {
        const tierLevels = { ...run.tierLevels } as Record<string, number>;
        if (TIER_DEFS[c.id]) tierLevels[c.id] = (tierLevels[c.id] || 1) + 1;
        const soldCard = { ...c, sold: true };
        const cards = shop.cards.map((x, idx) => (idx === i ? soldCard : x));
        return [
          {
            ...run,
            tierLevels,
            ink: run.ink - c.price,
            shop: { ...shop, cards },
          },
          { ok: true, card: soldCard, used: true },
        ];
      }
      return [
        run,
        {
          ok: false,
          reason: 'No room for another consumable — use or sell one first.',
        },
      ];
    } else {
      consumables = consumables.concat([{ kind: c.kind, id: c.id }]);
    }
  }
  const soldCard = { ...c, sold: true };
  const cards = shop.cards.map((x, idx) => (idx === i ? soldCard : x));
  return [
    {
      ...run,
      items,
      consumables,
      ink: run.ink - c.price,
      shop: { ...shop, cards },
    },
    { ok: true, card: soldCard, mark },
  ];
}

function priceNoRoll(def: { price?: number; rarity?: string }): number {
  if (def.price != null) return def.price;
  return RARITY_PRICE[def.rarity || 'common']![0];
}

export function sellItem(
  run: RunState,
  itemIndex: number,
): [RunState, ShopResult] {
  const id = (run.items as string[])[itemIndex];
  if (!id) return [run, { ok: false, reason: 'No item there.' }];
  const items = (run.items as string[]).filter((_, i) => i !== itemIndex);
  const paid = Math.floor(priceNoRoll(itemDefs()[id] || {}) / 2);
  return [
    { ...run, items, ink: run.ink + paid },
    { ok: true, id, paid },
  ];
}

export function reroll(
  run: RunState,
  rngState: RngState,
): [RunState, ShopResult, RngState] {
  const shop = run.shop;
  if (!shop)
    return [run, { ok: false, reason: 'The shop is closed.' }, rngState];
  const price =
    (Number(run.tune.REROLL_PRICE) || 0) +
    (Number(run.tune.REROLL_STEP) || 0) * shop.rerolls;
  if (run.ink < price)
    return [
      run,
      { ok: false, reason: 'Not enough ink to reroll (' + price + ').' },
      rngState,
    ];
  const [rolled, s] = rollCardsAndPacks(run, rngState);
  const cards = shop.coupon
    ? rolled.cards.map((c) => ({ ...c, price: 0 }))
    : rolled.cards;
  const next: ShopState = {
    ...shop,
    cards,
    packs: shop.packs,
    rerolls: shop.rerolls + 1,
  };
  return [{ ...run, ink: run.ink - price, shop: next }, { ok: true }, s];
}

export function openPack(
  run: RunState,
  i: number,
  rngState: RngState,
): [RunState, ShopResult, RngState] {
  const shop = run.shop;
  const p = shop?.packs[i];
  if (!shop || !p || p.opened)
    return [run, { ok: false, reason: 'Nothing there.' }, rngState];
  if (run.pack)
    return [
      run,
      { ok: false, reason: 'Settle the open pack first.' },
      rngState,
    ];
  const price = p.free ? 0 : p.price;
  if (run.ink < price)
    return [run, { ok: false, reason: 'Not enough ink.' }, rngState];
  let s = rngState;
  const choices: PackChoice[] = [];
  const n = Number(run.tune.PACK_CHOICES) || 0;
  if (p.kind === 'tile') {
    const counts = getTileBag('strong').counts;
    const letters: string[] = [];
    Object.keys(counts).forEach((l) => {
      if (!isAvailable(l)) return;
      for (let k = 0; k < (counts[l] ?? 0); k++) letters.push(l);
    });
    for (let a = 0; a < n; a++) {
      const [letter, s2] = pick(s, letters);
      s = s2;
      choices.push({ kind: 'tile', tile: createTile(letter, null) });
    }
  } else if (p.kind === 'etude') {
    const taken: string[] = [];
    for (let b = 0; b < n; b++) {
      const [c, s2] = rollEtude(s, taken);
      s = s2;
      taken.push(c.id);
      choices.push(c);
    }
  } else {
    const taken: string[] = [];
    for (let c = 0; c < n; c++) {
      const [mc, s2] = rollMark(s, taken);
      s = s2;
      if (mc) {
        taken.push(mc.id);
        choices.push(mc);
      }
    }
  }
  const packs = shop.packs.map((x, idx) =>
    idx === i ? { ...x, opened: true } : x,
  );
  const pack = { kind: p.kind, choices };
  return [
    { ...run, ink: run.ink - price, shop: { ...shop, packs }, pack },
    { ok: true, pack },
    s,
  ];
}

export function pick_(run: RunState, i: number | null): [RunState, ShopResult] {
  const pack = run.pack;
  if (!pack) return [run, { ok: false, reason: 'No pack is open.' }];
  if (i == null) return [{ ...run, pack: null }, { ok: true }];
  const c = pack.choices[i];
  if (!c) return [run, { ok: false, reason: 'Nothing there.' }];
  let mark: string | null = null;
  let deck = run.deck as Tile[];
  let consumables = run.consumables as Consumable[];
  const used: unknown = null;
  if (c.kind === 'tile') {
    deck = deck.concat([c.tile]);
  } else {
    const markDefs = MARK_DEFS as Record<string, unknown>;
    if (c.kind === 'mark' && markDefs[c.id]) {
      mark = c.id;
    } else if (consumables.length >= (Number(run.tune.CONSUMABLE_SLOTS) || 0)) {
      if (c.kind === 'etude') {
        const tierLevels = { ...run.tierLevels } as Record<string, number>;
        if (TIER_DEFS[c.id]) tierLevels[c.id] = (tierLevels[c.id] || 1) + 1;
        return [
          { ...run, tierLevels, pack: null },
          { ok: true, choice: c, used: true, mark },
        ];
      }
      return [
        run,
        {
          ok: false,
          reason: 'No room for another consumable — use or sell one first.',
        },
      ];
    } else {
      consumables = consumables.concat([{ kind: c.kind, id: c.id }]);
    }
  }
  return [
    { ...run, deck, consumables, pack: null },
    { ok: true, choice: c, used, mark },
  ];
}

// The pure twin of createRun's run.moveItem: reorder the held items (they
// fire left to right).
export function moveItem(
  run: RunState,
  from: number,
  to: number,
): [RunState, boolean] {
  const items = run.items as string[];
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length
  )
    return [run, false];
  const next = items.slice();
  const [id] = next.splice(from, 1);
  next.splice(to, 0, id!);
  return [{ ...run, items: next }, true];
}

// The pure twin of createRun's run.levelTier: raise one length tier a level
// for the rest of the run.
export function levelTier(run: RunState, tierId: string): [RunState, boolean] {
  if (!TIER_DEFS[tierId]) return [run, false];
  const tierLevels = { ...run.tierLevels } as Record<string, number>;
  tierLevels[tierId] = (tierLevels[tierId] || 1) + 1;
  return [{ ...run, tierLevels }, true];
}

// The pure twin of createRun's run.saveMark: hold a marginalia card in
// run.consumables instead of using it now.
export function saveMark(run: RunState, id: string): [RunState, ShopResult] {
  const consumables = run.consumables as Consumable[];
  if (consumables.length >= Number(run.tune.CONSUMABLE_SLOTS))
    return [
      run,
      {
        ok: false,
        reason: 'No room for another marginalia card — use or sell one first.',
      },
    ];
  return [
    { ...run, consumables: consumables.concat([{ kind: 'mark', id }]) },
    { ok: true },
  ];
}

// The pure twin of createRun's run.sellConsumable.
export function sellConsumable(
  run: RunState,
  i: number,
): [RunState, ShopResult] {
  const consumables = run.consumables as Consumable[];
  const c = consumables[i];
  if (!c) return [run, { ok: false, reason: 'Nothing there.' }];
  const paid = Math.floor(
    Number(c.kind === 'mark' ? run.tune.MARK_PRICE : run.tune.ETUDE_PRICE) / 2,
  );
  return [
    {
      ...run,
      consumables: consumables.filter((_, idx) => idx !== i),
      ink: run.ink + paid,
    },
    { ok: true, paid },
  ];
}

// The pure twin of createRun's run.drawMarkHand: a fresh hand drawn to use a
// marginalia card on the spot, right after buying or keeping it. Doesn't
// touch run.deck/round -- it's just a preview shuffle, same as the mutable
// version (which also throws the shuffled draw pile away afterward).
export function drawMarkHand(
  run: RunState,
  rngState: RngState,
): [Tile[], RngState] {
  const [shuffled, s] = rng.shuffle(rngState, run.deck as Tile[]);
  return [
    shuffled.slice(0, Math.min(Number(run.tune.RACK_SIZE), run.deck.length)),
    s,
  ];
}

interface MarkResult extends ShopResult {
  note?: string;
}

// The pure twin of marginalia.ts's applyMark: marks/turns/blanks/erases
// tiles in run.deck (the erase path also removes the tile from the live
// round's rack via state/round.ts's pure destroyTile, which may need to
// draw a refill -- hence the threaded RngState) or pays out the coin mark.
export function applyMark(
  run: RunState,
  markId: string,
  tileIds: string[],
  extra: { vowel?: string } | undefined,
  rngState: RngState,
): [RunState, MarkResult, RngState] {
  const markDefs = MARK_DEFS as Record<
    string,
    { id: string; targets: number; needsVowel?: boolean; name: string }
  >;
  const mark = markDefs[markId];
  if (!mark)
    return [run, { ok: false, reason: 'No such marginalia.' }, rngState];
  if (mark.id === 'coin') {
    const gain = Math.min(Number(run.tune.MARK_COIN_CAP) || 0, run.ink);
    return [
      { ...run, ink: run.ink + gain },
      { ok: true, note: 'Coin: +' + gain + ' ink.' },
      rngState,
    ];
  }
  const ids = (tileIds || []).slice(0, mark.targets);
  if (!ids.length)
    return [run, { ok: false, reason: 'Pick a tile first.' }, rngState];
  const deck = run.deck as Tile[];
  const tiles = ids
    .map((id) => deck.find((t) => t.id === id))
    .filter((t): t is Tile => Boolean(t));
  if (tiles.length !== ids.length)
    return [
      run,
      { ok: false, reason: 'Those tiles aren’t in your deck.' },
      rngState,
    ];
  const letters = tiles.map((t) => t.letter).join(', ');
  const tileIdSet = new Set(tiles.map((t) => t.id));

  if (mark.id === 'erase') {
    const nextDeck = deck.filter((t) => !tileIdSet.has(t.id));
    let round = run.round;
    let s = rngState;
    if (round && round.state === 'live') {
      tiles.forEach((t) => {
        const [nextRound, , s2] = R.destroyTile(round!, t.id, s);
        round = nextRound;
        s = s2;
      });
    }
    return [
      { ...run, deck: nextDeck, round },
      { ok: true, note: 'Erased ' + letters + '.' },
      s,
    ];
  }
  if (mark.id === 'vowel') {
    const v = String(extra?.vowel || '').toUpperCase();
    const VOWELS = ['A', 'E', 'I', 'O', 'U'];
    if (VOWELS.indexOf(v) < 0)
      return [run, { ok: false, reason: 'Choose a vowel.' }, rngState];
    const nextDeck = deck.map((t) =>
      tileIdSet.has(t.id)
        ? {
            ...t,
            letter: v as Tile['letter'],
            mark: t.mark === 'blank' ? null : t.mark,
          }
        : t,
    );
    return [
      { ...run, deck: nextDeck },
      { ok: true, note: letters + ' → ' + v + '.' },
      rngState,
    ];
  }
  if (mark.id === 'blank') {
    const nextDeck = deck.map((t) =>
      tileIdSet.has(t.id)
        ? { ...t, letter: '?' as Tile['letter'], mark: 'blank' }
        : t,
    );
    return [
      { ...run, deck: nextDeck },
      { ok: true, note: letters + ' is now a blank.' },
      rngState,
    ];
  }
  const nextDeck = deck.map((t) =>
    tileIdSet.has(t.id) ? { ...t, mark: mark.id } : t,
  );
  return [
    { ...run, deck: nextDeck },
    { ok: true, note: mark.name + ' on ' + letters + '.' },
    rngState,
  ];
}

// The pure twin of createRun's run.useConsumable: an étude needs nothing
// else; a marginalia card takes the ids of the tiles it is applied to.
export function useConsumable(
  run: RunState,
  i: number,
  tileIds: string[] | undefined,
  extra: { vowel?: string } | undefined,
  rngState: RngState,
): [RunState, MarkResult & { used?: Consumable }, RngState] {
  const consumables = run.consumables as Consumable[];
  const c = consumables[i];
  if (!c) return [run, { ok: false, reason: 'Nothing there.' }, rngState];
  if (c.kind === 'etude') {
    const [next] = levelTier(run, c.id);
    return [
      { ...next, consumables: consumables.filter((_, idx) => idx !== i) },
      { ok: true, used: c },
      rngState,
    ];
  }
  if (c.kind === 'mark') {
    const [next, res, s] = applyMark(run, c.id, tileIds || [], extra, rngState);
    if (!res.ok) return [run, res, s];
    return [
      {
        ...next,
        consumables: (next.consumables as Consumable[]).filter(
          (_, idx) => idx !== i,
        ),
      },
      { ...res, ok: true, used: c },
      s,
    ];
  }
  return [run, { ok: false, reason: 'That cannot be used yet.' }, rngState];
}

// The pure twin of createRun's run.useAdhocMark: play a marginalia card
// bought straight out of the shop while every consumable slot was full --
// it was never stored, so there is nothing to remove from run.consumables
// afterward.
export function useAdhocMark(
  run: RunState,
  id: string,
  tileIds: string[] | undefined,
  extra: { vowel?: string } | undefined,
  rngState: RngState,
): [RunState, MarkResult, RngState] {
  return applyMark(run, id, tileIds || [], extra, rngState);
}

// Folds R.playWord's PlayEffects (an item's onPlayed hook, e.g. refrain's
// counter) into RunState. extendCrescendo is a UI-timing side effect, not
// state -- the caller applies it via its own extendCrescendo callback and
// does not need it threaded back through RunState.
export function applyPlayEffects(
  run: RunState,
  effects: PlayEffects | undefined,
): RunState {
  if (!effects?.itemState) return run;
  return { ...run, itemState: effects.itemState };
}

// The pure twin of createRun's begin()'s onPlay callback: wraps R.playWord
// with the run-level bookkeeping createRun did inline (wordsPlayed,
// bestPlay) plus applyPlayEffects, so a single call updates both RoundState
// and RunState from one play.
export function playWord(
  run: RunState,
  word: string,
  rngState: RngState,
  crescendo: { phase: string; mag?: number } | null,
): [RunState, R.PlayResult, RngState] {
  if (!run.round) return [run, { ok: false, reason: 'No round.' }, rngState];
  const [outcome, s] = R.playWord(run.round, word, rngState, {
    run,
    crescendo,
    characterTile: run.characterTile,
  });
  let next = applyPlayEffects(
    { ...run, round: outcome.state },
    outcome.result.effects,
  );
  if (outcome.result.ok) {
    const wordsPlayed = next.wordsPlayed + 1;
    const breakdown = outcome.result.breakdown!;
    const bestPlay =
      !next.bestPlay || breakdown.total > next.bestPlay.breakdown.total
        ? { word: outcome.result.word!, breakdown, enemy: next.enemy!.name }
        : next.bestPlay;
    next = { ...next, wordsPlayed, bestPlay };
  }
  return [next, outcome.result, s];
}

export function addTile(run: RunState, tile: Tile): RunState {
  return { ...run, deck: (run.deck as Tile[]).concat([tile]) };
}
