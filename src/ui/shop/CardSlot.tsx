// A single shop card slot (item / ink / étude) -- extracted from Shop.jsx
// (READ_SLOWLY_PLAN.md A4, mechanical extraction), ported to .tsx.
import {
  cardBlurb,
  cardName,
  rarityBadgeClass,
  rarityCardClass,
} from '../quills/cardCopy';
import type { CardCopyTables, CardCopyRun } from '../quills/cardCopy';
import { Button } from '@/ui/primitives/button';
import { Card } from '@/ui/primitives/card';
import { Badge } from '@/ui/primitives/badge';
import { cn } from 'cn';

interface ShopCard {
  kind: 'item' | 'mark' | 'etude';
  id: string;
  price: number;
  sold?: boolean;
}

interface ItemDef {
  name: string;
  hint: string;
  rarity?: string;
  glyph?: string;
}

export default function CardSlot({
  c,
  i,
  run,
  SB,
  tip,
  setTip,
  buyCard,
}: {
  c: ShopCard;
  i: number;
  run: CardCopyRun & {
    ink: number;
    items: readonly string[];
    tune: Record<string, number | boolean | undefined>;
  };
  SB: CardCopyTables & { ITEM_DEFS: Record<string, ItemDef> };
  tip: string | null;
  setTip: (updater: (t: string | null) => string | null) => void;
  buyCard: (i: number) => void;
}) {
  const disabled =
    c.sold ||
    run.ink < c.price ||
    (c.kind === 'item' && run.items.length >= Number(run.tune.ITEM_SLOTS));
  const tipId = 'shop:' + i;
  if (c.kind === 'item' && !c.sold) {
    const d = SB.ITEM_DEFS[c.id]!;
    const rarity = d.rarity || 'common';
    return (
      <Card
        data-rarity={rarity}
        className={cn(
          'sb-card-glyphed relative gap-0 rounded-sm p-0 px-1 py-1.5',
          rarityCardClass(rarity),
        )}
        role="button"
        tabIndex={0}
        aria-label={cardName(SB, c) + ' — ' + cardBlurb(SB, c, run)}
        onClick={() => setTip((t) => (t === tipId ? null : tipId))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setTip((t) => (t === tipId ? null : tipId));
          }
        }}
      >
        <span className="sb-card-kind">{cardName(SB, c)}</span>
        <span className="sb-card-icon" aria-hidden="true">
          {d.glyph || '❖'}
        </span>
        <Badge className={cn('mt-0.5', rarityBadgeClass(rarity))}>
          {rarity}
        </Badge>
        {tip === tipId && (
          <span className="sb-card-tip" role="tooltip">
            <b>{cardName(SB, c)}</b>
            <em>{cardBlurb(SB, c, run)}</em>
          </span>
        )}
        <span className="sb-price">{c.price}</span>
        <Button
          type="button"
          variant="paperPrimary"
          className="sb-card-buy-btn"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            buyCard(i);
          }}
        >
          Buy
        </Button>
      </Card>
    );
  }
  return (
    <Button
      type="button"
      variant="paper"
      disabled={disabled}
      className={
        'sb-card sb-card-buy sb-card-' + c.kind + (c.sold ? ' is-sold' : '')
      }
      title={c.sold ? 'sold' : cardName(SB, c) + ' — ' + cardBlurb(SB, c, run)}
      onClick={() => buyCard(i)}
    >
      <span className="sb-card-kind">{c.kind}</span>
      <em>{c.sold ? '' : cardBlurb(SB, c, run)}</em>
      <b>{c.sold ? 'sold' : cardName(SB, c)}</b>
      {!c.sold && <span className="sb-price">{c.price}</span>}
    </Button>
  );
}
