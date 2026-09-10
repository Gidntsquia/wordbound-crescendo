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
import { TapTooltip, useTapTooltip } from '../items/useTapTooltip';

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
  const { open, handlers } = useTapTooltip(tipId, tip, setTip);
  if (c.kind === 'item' && !c.sold) {
    const d = SB.ITEM_DEFS[c.id]!;
    const rarity = d.rarity || 'common';
    return (
      <Card
        data-rarity={rarity}
        className={cn(
          // Wide enough for a two-word name under the glyph plus the price
          // in the corner; at the old 60px the name, price and rarity badge
          // all overlapped each other on phones. overflow-visible so the
          // tap-to-show-stats tooltip below isn't clipped by Card's default
          // overflow-hidden (the shop-specific version of 6f33151's fix).
          'relative w-[96px] cursor-pointer flex-col items-center gap-0 overflow-visible rounded-sm p-0 px-1 pt-5 pb-1.5 text-center',
          rarityCardClass(rarity),
        )}
        aria-label={cardName(SB, c) + ' — ' + cardBlurb(SB, c, run)}
        {...handlers}
      >
        <span
          className="block text-2xl leading-none max-[620px]:text-[22px]"
          aria-hidden="true"
        >
          {d.glyph || '❖'}
        </span>
        <span className="mt-1 text-[10px] [line-height:1.15] font-semibold tracking-normal whitespace-normal text-[var(--ink)] normal-case">
          {cardName(SB, c)}
        </span>
        <Badge
          className={cn('mt-1 px-1.5 text-[9px]', rarityBadgeClass(rarity))}
        >
          {rarity}
        </Badge>
        {open && (
          <TapTooltip>
            <b className="text-[13px] font-[var(--display)]">
              {cardName(SB, c)}
            </b>
            <em className="[line-height:1.3] font-normal text-[var(--leaf-dim)] not-italic">
              {cardBlurb(SB, c, run)}
            </em>
          </TapTooltip>
        )}
        <span className="absolute top-1.5 right-2 text-[13px] font-[var(--figure)] text-[var(--brass-hot)] before:mr-1 before:text-[8px] before:content-['\25C6']">
          {c.price}
        </span>
        <Button
          type="button"
          variant="paperPrimary"
          className="mt-0.5 self-stretch px-2.5 py-1 text-[10px] disabled:opacity-40"
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
        'relative inline-flex h-auto max-w-[200px] min-w-32 cursor-pointer flex-col items-start gap-[3px] rounded-sm border border-[var(--rule)] bg-[var(--pit-raise)] px-3 py-[9px] text-left text-[11px] font-[var(--ui)] tracking-[0.04em] whitespace-normal text-[var(--leaf)] normal-case hover:border-[var(--brass-hot)] hover:bg-[var(--pit)] hover:text-[var(--leaf)] disabled:opacity-40 max-[620px]:max-w-full max-[620px]:min-w-[120px]' +
        (c.kind === 'etude' ? ' border-dashed' : '')
      }
      title={c.sold ? 'sold' : cardName(SB, c) + ' — ' + cardBlurb(SB, c, run)}
      onClick={() => buyCard(i)}
    >
      <span className="text-[9px] tracking-[0.2em] text-[var(--leaf-dim)] uppercase">
        {c.kind}
      </span>
      <em className="[line-height:1.35] font-normal text-[var(--leaf-dim)] not-italic">
        {c.sold ? '' : cardBlurb(SB, c, run)}
      </em>
      <b className="pr-[26px] text-base leading-[1.15] font-[var(--display)] font-semibold tracking-normal">
        {c.sold ? 'sold' : cardName(SB, c)}
      </b>
      {!c.sold && (
        <span className="absolute top-1.5 right-2 text-[13px] font-[var(--figure)] text-[var(--brass-hot)] before:mr-1 before:text-[8px] before:content-['\25C6']">
          {c.price}
        </span>
      )}
    </Button>
  );
}
