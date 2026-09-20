import { MAX_QUILLS } from './content/fights';
import { MARKS, MARK_IDS } from './content/marks';
import { QUILLS, QUILL_IDS } from './content/quills';
import { sample } from './rng';
import type { MarkId, QuillId, Run, Shop } from './types';

/** Three quills you don't own and two marks, all unsold. */
export function rollShop(
  owned: readonly QuillId[],
  rng: number,
): { shop: Shop; rng: number } {
  const available = QUILL_IDS.filter((id) => !owned.includes(id));
  const [quills, r1] = sample(available, 3, rng);
  const [marks, r2] = sample(MARK_IDS, 2, r1);
  return {
    rng: r2,
    shop: {
      quills: quills.map((id) => ({ id, sold: false })),
      marks: marks.map((id) => ({ id, sold: false })),
    },
  };
}

export function buyQuill(run: Run, id: QuillId): Run {
  const offer = run.shop?.quills.find((o) => o.id === id);
  const price = QUILLS[id].price;
  if (!run.shop || !offer || offer.sold) return run;
  if (run.quills.length >= MAX_QUILLS) {
    return { ...run, notice: `You can hold ${MAX_QUILLS} quills.` };
  }
  if (run.gold < price) return { ...run, notice: 'Not enough gold.' };
  return {
    ...run,
    gold: run.gold - price,
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
  const price = MARKS[id].price;
  const tile = run.deck.find((t) => t.id === tileId);
  if (!run.shop || !offer || offer.sold || !tile || tile.mark) return run;
  if (run.gold < price) return { ...run, notice: 'Not enough gold.' };
  return {
    ...run,
    gold: run.gold - price,
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
