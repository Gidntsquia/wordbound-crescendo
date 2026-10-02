import { MAX_QUILLS, SHOP_REROLL_BASE_COST } from './content/fights';
import { MARKS, MARK_IDS } from './content/marks';
import { QUILLS, SHOP_QUILL_IDS } from './content/quills';
import { nextFloat } from './rng';
import type { ComposerId, MarkId, QuillId, Rarity, Run, Shop } from './types';

const RARITY_WEIGHT: Record<Rarity, number> = {
  common: 6,
  uncommon: 3,
  rare: 1,
};

/** Weighted sample without replacement, using rarity as the weight. */
function weightedSample<Id extends string>(
  items: readonly { id: Id; rarity: Rarity; price: number }[],
  count: number,
  rng: number,
): [{ id: Id; price: number }[], number] {
  const pool = [...items];
  const picked: { id: Id; price: number }[] = [];
  let state = rng;
  while (picked.length < count && pool.length > 0) {
    const total = pool.reduce((sum, i) => sum + RARITY_WEIGHT[i.rarity], 0);
    const [f, next] = nextFloat(state);
    state = next;
    let roll = f * total;
    let index = 0;
    for (; index < pool.length; index++) {
      roll -= RARITY_WEIGHT[pool[index]!.rarity];
      if (roll <= 0) break;
    }
    const chosen = pool.splice(Math.min(index, pool.length - 1), 1)[0];
    if (chosen) picked.push({ id: chosen.id, price: chosen.price });
  }
  return [picked, state];
}

/** Three quills you don't own and two marks, weighted by rarity, all unsold. */
export function rollShop(
  owned: readonly QuillId[],
  rng: number,
  rerolls = 0,
  composer: ComposerId = 'beethoven',
): { shop: Shop; rng: number } {
  const availableQuills = SHOP_QUILL_IDS.filter(
    (id) => !owned.includes(id),
  ).map((id) => ({ id, rarity: QUILLS[id].rarity, price: QUILLS[id].price }));
  const allMarks = MARK_IDS.map((id) => ({
    id,
    rarity: MARKS[id].rarity,
    price: MARKS[id].price,
  }));
  const [quills, r1] = weightedSample(availableQuills, 3, rng);
  const [marks, r2] = weightedSample(allMarks, 2, r1);
  return {
    rng: r2,
    shop: {
      quills: quills.map((o) => ({ id: o.id, price: o.price, sold: false })),
      marks: marks.map((o) => ({ id: o.id, price: o.price, sold: false })),
      // Mozart's first reroll in each shop is free.
      rerollCost:
        composer === 'mozart' && rerolls === 0
          ? 0
          : SHOP_REROLL_BASE_COST + rerolls,
      rerolls,
    },
  };
}

export function rerollShop(run: Run): Run {
  if (!run.shop || run.phase !== 'shop') return run;
  const cost = run.shop.rerollCost;
  if (run.gold < cost) return { ...run, notice: 'Not enough gold to reroll.' };
  const rolled = rollShop(
    run.quills,
    run.rng,
    run.shop.rerolls + 1,
    run.composer,
  );
  return {
    ...run,
    gold: run.gold - cost,
    shop: rolled.shop,
    rng: rolled.rng,
    notice: 'Rerolled the shop.',
  };
}

export function buyQuill(run: Run, id: QuillId): Run {
  const offer = run.shop?.quills.find((o) => o.id === id);
  if (!run.shop || !offer || offer.sold) return run;
  if (run.quills.length >= MAX_QUILLS) {
    return { ...run, notice: `You can hold ${MAX_QUILLS} quills.` };
  }
  if (run.gold < offer.price) return { ...run, notice: 'Not enough gold.' };
  return {
    ...run,
    gold: run.gold - offer.price,
    quills: [...run.quills, id],
    shop: {
      ...run.shop,
      quills: run.shop.quills.map((o) =>
        o.id === id ? { ...o, sold: true } : o,
      ),
    },
    notice: `Bought ${QUILLS[id].name}.`,
  };
}

/** Buys a mark and stamps it onto one deck tile that has no mark yet. */
export function buyMark(run: Run, id: MarkId, tileId: number): Run {
  const offer = run.shop?.marks.find((o) => o.id === id);
  const tile = run.deck.find((t) => t.id === tileId);
  if (!run.shop || !offer || offer.sold || !tile || tile.mark) return run;
  if (run.gold < offer.price) return { ...run, notice: 'Not enough gold.' };
  return {
    ...run,
    gold: run.gold - offer.price,
    deck: run.deck.map((t) => (t.id === tileId ? { ...t, mark: id } : t)),
    shop: {
      ...run.shop,
      marks: run.shop.marks.map((o) =>
        o.id === id ? { ...o, sold: true } : o,
      ),
    },
    notice: `Marked ${tile.letter} ${MARKS[id].name}.`,
  };
}

/** Sells an owned quill back for half its price (min 1 gold). */
export function sellQuill(run: Run, id: QuillId): Run {
  if (!run.quills.includes(id) || QUILLS[id].signature) return run;
  const refund = Math.max(1, Math.floor(QUILLS[id].price / 2));
  return {
    ...run,
    gold: run.gold + refund,
    quills: run.quills.filter((q) => q !== id),
    notice: `Sold ${QUILLS[id].name} for ${refund} gold.`,
  };
}

/** Moves a quill to a new index in the owned order; order affects apply order. */
export function reorderQuill(run: Run, id: QuillId, toIndex: number): Run {
  const from = run.quills.indexOf(id);
  if (from === -1) return run;
  const rest = run.quills.filter((q) => q !== id);
  const clamped = Math.max(0, Math.min(toIndex, rest.length));
  const quills = [...rest.slice(0, clamped), id, ...rest.slice(clamped)];
  return { ...run, quills };
}
