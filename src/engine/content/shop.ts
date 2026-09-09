// TS port of src/sandbox/shop.js (READ_SLOWLY_PLAN.md A2/A5 step 3): the
// shop after every won round short of the last boss. Still attaches to
// window.Wordbound.Sandbox for the untyped sandbox modules that read it off
// the global (RoundSandbox.jsx). Reads several Sandbox tables not yet ported
// (ITEMS, TIERS, MARGINALIA, getTileBag, isAvailable, isQuillDiscovered)
// through loose local shapes -- SandboxNamespace stays an open record until
// every module writing into it is ported (see sandboxGlobal.ts).
import '../sandboxGlobal';
import type { RngStream } from '../rng';
import type { Tile } from '../tiles';

interface Priced {
  price?: number;
  rarity?: 'common' | 'uncommon' | 'rare';
}

export interface PackKind {
  kind: 'tile' | 'mark' | 'etude';
  name: string;
  hint: string;
}

export type Card =
  | { kind: 'item'; id: string; price: number; sold: boolean }
  | { kind: 'mark'; id: string; price: number; sold: boolean }
  | { kind: 'etude'; id: string; price: number; sold: boolean };

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

interface RunLike {
  tune: Record<string, number>;
  ink: number;
  items: string[];
  deck: Tile[];
  consumables: { kind: string; id: string }[];
  favours: string[];
  pack: { kind: string; choices: (PackChoice | null)[] } | null;
  levelTier(id: string): boolean;
  addTile?(tile: Tile): void;
  pick?(i: number | null): { ok: boolean; [key: string]: unknown };
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

export const RARITY_PRICE: Record<string, [number, number]> = {
  common: [3, 5],
  uncommon: [5, 7],
  rare: [8, 8],
};

export function priceOf(def: Priced, rng?: RngStream): number {
  if (def.price != null) return def.price;
  const band = RARITY_PRICE[def.rarity || 'common']!;
  return rng ? rng.randInt(band[0], band[1]) : band[0];
}

function pick<T>(rng: RngStream, arr: T[]): T {
  return arr[rng.randInt(0, arr.length - 1)]!;
}

type Result = { ok: boolean; [key: string]: unknown };

interface Shop {
  cards: Card[];
  packs: Pack[];
  rerolls: number;
  coupon: boolean;
  favours: string[];
  rerollPrice(): number;
  buy(i: number): Result;
  sell(i: number): Result;
  reroll(): Result;
  openPack(i: number): Result;
}

export function createShop(run: RunLike, rng: RngStream) {
  const Sandbox = window.Wordbound.Sandbox;
  const tune = run.tune;
  const shop = {
    cards: [] as Card[],
    packs: [] as Pack[],
    rerolls: 0,
    coupon: false,
    favours: [] as string[],
  } as Shop;

  function itemDefs(): Record<
    string,
    { id: string; rarity?: string } & Priced
  > {
    return (
      (Sandbox.ITEM_DEFS as Record<
        string,
        { id: string; rarity?: string } & Priced
      >) || {}
    );
  }
  function itemIds(): string[] {
    return ((Sandbox.ITEMS as { id: string }[]) || []).map((it) => it.id);
  }
  function tiers(): { id: string }[] {
    return (Sandbox.TIERS as { id: string }[]) || [];
  }
  function marginalia(): { id: string }[] {
    return (Sandbox.MARGINALIA as { id: string }[]) || [];
  }

  function itemPool(taken: string[]): string[] {
    return itemIds().filter((id) => {
      const isQuillDiscovered = Sandbox.isQuillDiscovered as
        ((id: string) => boolean) | undefined;
      if (isQuillDiscovered && !isQuillDiscovered(id)) return false;
      return run.items.indexOf(id) < 0 && taken.indexOf(id) < 0;
    });
  }
  function rollEtude(exclude?: string[]): { kind: 'etude'; id: string } {
    let pool = tiers().filter((t) => !exclude || exclude.indexOf(t.id) < 0);
    if (!pool.length) pool = tiers();
    return { kind: 'etude', id: pick(rng, pool).id };
  }
  function rollMark(exclude?: string[]): { kind: 'mark'; id: string } | null {
    let pool = marginalia().filter(
      (mark) => !exclude || exclude.indexOf(mark.id) < 0,
    );
    if (!pool.length) pool = marginalia();
    return pool.length ? { kind: 'mark', id: pick(rng, pool).id } : null;
  }
  // Weighted by rarity: common 70, uncommon 25, rare 5 (Balatro's roll).
  function rollItem(taken: string[]): { kind: 'item'; id: string } | null {
    const pool = itemPool(taken);
    if (!pool.length) return null;
    const weights: Record<string, number> = {
      common: 70,
      uncommon: 25,
      rare: 5,
    };
    const defs = itemDefs();
    let total = 0;
    pool.forEach((id) => {
      total += weights[defs[id]?.rarity || 'common'] ?? 0;
    });
    let roll = rng.next() * total;
    for (const id of pool) {
      roll -= weights[defs[id]?.rarity || 'common'] ?? 0;
      if (roll <= 0) return { kind: 'item', id };
    }
    return { kind: 'item', id: pool[pool.length - 1]! };
  }
  function rollCard(taken: string[]): Card {
    const r =
      rng.next() *
      ((tune.CARD_ITEM ?? 0) + (tune.CARD_MARK ?? 0) + (tune.CARD_ETUDE ?? 0));
    let card: { kind: 'item' | 'mark' | 'etude'; id: string } | null = null;
    if (r < (tune.CARD_ITEM ?? 0)) card = rollItem(taken);
    else if (r < (tune.CARD_ITEM ?? 0) + (tune.CARD_MARK ?? 0))
      card = rollMark() ?? null;
    if (!card) card = rollItem(taken) || rollEtude();
    const price =
      card.kind === 'item'
        ? priceOf(itemDefs()[card.id] || {}, rng)
        : card.kind === 'mark'
          ? (tune.MARK_PRICE ?? 0)
          : (tune.ETUDE_PRICE ?? 0);
    return { ...card, price, sold: false } as Card;
  }
  function rollCards() {
    shop.cards = [];
    const taken: string[] = [];
    for (let i = 0; i < (tune.CARD_SLOTS ?? 0); i++) {
      const c = rollCard(taken);
      if (c.kind === 'item') taken.push(c.id);
      shop.cards.push(c);
    }
  }
  function rollPacks() {
    shop.packs = [];
    const kinds = PACK_KINDS.filter(
      (k) => k.kind !== 'mark' || marginalia().length,
    );
    let left = kinds.slice();
    for (let i = 0; i < (tune.PACK_SLOTS ?? 0); i++) {
      if (!left.length) left = kinds.slice();
      const k = left.splice(rng.randInt(0, left.length - 1), 1)[0]!;
      shop.packs.push({
        kind: k.kind,
        price: tune.PACK_PRICE ?? 0,
        opened: false,
      });
    }
  }

  shop.rerollPrice = () =>
    (tune.REROLL_PRICE ?? 0) + (tune.REROLL_STEP ?? 0) * shop.rerolls;

  function takeConsumable(c: { kind: string; id: string }) {
    // A marginalia card is bought or kept regardless of CONSUMABLE_SLOTS --
    // the UI then offers a choice between using it on the spot or holding
    // it, the latter only when a slot is free.
    const markDefs = (Sandbox.MARK_DEFS as Record<string, unknown>) || {};
    if (c.kind === 'mark' && markDefs[c.id])
      return { ok: true as const, mark: c.id };
    if (run.consumables.length >= (tune.CONSUMABLE_SLOTS ?? 0)) {
      if (c.kind === 'etude') {
        run.levelTier(c.id);
        return { ok: true as const, used: true };
      }
      return {
        ok: false as const,
        reason: 'No room for another consumable — use or sell one first.',
      };
    }
    run.consumables.push({ kind: c.kind, id: c.id });
    return { ok: true as const };
  }

  shop.buy = (i) => {
    const c = shop.cards[i];
    if (!c || c.sold) return { ok: false, reason: 'Nothing there.' };
    if (run.ink < c.price) return { ok: false, reason: 'Not enough ink.' };
    let used: unknown = null;
    let mark: string | null = null;
    if (c.kind === 'item') {
      if (run.items.length >= (tune.ITEM_SLOTS ?? 0))
        return {
          ok: false,
          reason:
            'All ' +
            tune.ITEM_SLOTS +
            ' quill slots are full — sell one first.',
        };
      run.items.push(c.id);
    } else {
      const t = takeConsumable(c);
      if (!t.ok) return t;
      if ('used' in t && t.used) used = (t as { note?: unknown }).note || null;
      if ('mark' in t && t.mark) mark = t.mark as string;
    }
    run.ink -= c.price;
    c.sold = true;
    return { ok: true, card: c, used, mark };
  };

  shop.sell = (itemIndex) => {
    const id = run.items[itemIndex];
    if (!id) return { ok: false, reason: 'No item there.' };
    run.items.splice(itemIndex, 1);
    const paid = Math.floor(priceOf(itemDefs()[id] || {}) / 2);
    run.ink += paid;
    return { ok: true, id, paid };
  };

  shop.reroll = () => {
    const price = shop.rerollPrice();
    if (run.ink < price)
      return {
        ok: false,
        reason: 'Not enough ink to reroll (' + price + ').',
      };
    run.ink -= price;
    shop.rerolls += 1;
    rollCards();
    if (shop.coupon) shop.cards.forEach((c) => (c.price = 0));
    return { ok: true };
  };

  shop.openPack = (i) => {
    const p = shop.packs[i];
    if (!p || p.opened) return { ok: false, reason: 'Nothing there.' };
    if (run.pack) return { ok: false, reason: 'Settle the open pack first.' };
    const price = p.free ? 0 : p.price;
    if (run.ink < price) return { ok: false, reason: 'Not enough ink.' };
    const choices: PackChoice[] = [];
    const n = tune.PACK_CHOICES ?? 0;
    if (p.kind === 'tile') {
      const Tiles = window.Wordbound.Tiles;
      const getTileBag = Sandbox.getTileBag as (id: string) => {
        counts: Record<string, number>;
      };
      const isAvailable = Sandbox.isAvailable as
        ((letter: string) => boolean) | undefined;
      const counts = getTileBag('strong').counts;
      const letters: string[] = [];
      Object.keys(counts).forEach((l) => {
        if (isAvailable && !isAvailable(l)) return;
        for (let k = 0; k < (counts[l] ?? 0); k++) letters.push(l);
      });
      for (let a = 0; a < n; a++)
        choices.push({
          kind: 'tile',
          tile: Tiles.createTile(pick(rng, letters), null),
        });
    } else if (p.kind === 'etude') {
      const taken: string[] = [];
      for (let b = 0; b < n; b++) {
        const c = rollEtude(taken);
        taken.push(c.id);
        choices.push(c);
      }
    } else {
      const taken: string[] = [];
      for (let c = 0; c < n; c++) {
        const markChoice = rollMark(taken);
        if (markChoice) taken.push(markChoice.id);
        if (markChoice) choices.push(markChoice);
      }
    }
    run.ink -= price;
    p.opened = true;
    run.pack = { kind: p.kind, choices };
    return { ok: true, pack: run.pack };
  };

  // Settle the open pack: keep choice i, or nothing.
  run.pick = (i) => {
    const pack = run.pack;
    if (!pack) return { ok: false, reason: 'No pack is open.' };
    if (i == null) {
      run.pack = null;
      return { ok: true };
    }
    const c = pack.choices[i];
    if (!c) return { ok: false, reason: 'Nothing there.' };
    let used: unknown = null;
    let mark: string | null = null;
    if (c.kind === 'tile') {
      if (run.addTile) run.addTile(c.tile);
      else run.deck.push(c.tile);
    } else {
      const t = takeConsumable(c);
      if (!t.ok) return t;
      if ('used' in t && t.used) used = (t as { note?: unknown }).note || null;
      if ('mark' in t && t.mark) mark = t.mark as string;
    }
    run.pack = null;
    return { ok: true, choice: c, used, mark };
  };

  rollCards();
  rollPacks();
  // Favours owed from a skipped enemy (round.ts run.skip), spent here.
  shop.favours = run.favours.splice(0);
  shop.favours.forEach((f) => {
    if (f === 'free_pack' && shop.packs[0]) shop.packs[0].free = true;
    if (f === 'coupon') shop.coupon = true;
  });
  if (shop.coupon) shop.cards.forEach((c) => (c.price = 0));
  return shop;
}

const Sandbox = window.Wordbound.Sandbox;
Sandbox.PACK_KINDS = PACK_KINDS;
Sandbox.RARITY_PRICE = RARITY_PRICE;
Sandbox.priceOf = priceOf;
Sandbox.createShop = createShop;
