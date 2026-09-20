// A single shop card slot (item / ink / étude) -- extracted from Shop.jsx
// (READ_SLOWLY_PLAN.md A4, mechanical extraction), ported to .tsx.
import {
  cardBlurb,
  cardName,
  rarityBadgeClass,
  rarityCardClass,
} from '../quills/cardCopy';
import type { CardCopyTables } from '../quills/cardCopy';
import type { RunFacade } from '../../engine/state/facade';
import { upgradeImpact } from './upgradeImpact';
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
  upcomingBoss,
}: {
  c: ShopCard;
  i: number;
  run: RunFacade;
  SB: CardCopyTables & { ITEM_DEFS: Record<string, ItemDef> };
  tip: string | null;
  setTip: (updater: (t: string | null) => string | null) => void;
  buyCard: (i: number) => void;
  upcomingBoss: string | null;
}) {
  const disabled =
    c.sold ||
    run.ink < c.price ||
    (c.kind === 'item' && run.items.length >= Number(run.tune.ITEM_SLOTS));
  const tipId = 'shop:' + i;
  const { open, handlers } = useTapTooltip(tipId, tip, setTip);
  const impact = !c.sold
    ? upgradeImpact(run.lastPlay, c, {
        items: run.items,
        tierLevels: run.tierLevels,
        tune: run.tune,
      })
    : null;
  const impactText = impact
    ? impact.after === impact.before
      ? `${impact.word}: no change under its recorded conditions. See the offer's trigger above.`
      : `${impact.word}: ${impact.before} → ${impact.after} (+${impact.after - impact.before}) with this offer.`
    : null;
  const exampleLimit = impactText
    ? `Example uses the last word's tiles and conditions; it does not include ${upcomingBoss ? 'the upcoming ' + upcomingBoss + ' boss rule' : "the next fight's conditions"}.`
    : null;
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
          'relative min-h-[165px] w-[158px] cursor-pointer flex-col items-start gap-1 overflow-visible rounded-sm p-3 pt-7 text-left',
          rarityCardClass(rarity),
        )}
        aria-label={
          cardName(SB, c) +
          ' — ' +
          cardBlurb(SB, c, run) +
          (impactText ? ' — ' + impactText + ' ' + exampleLimit : '')
        }
        {...handlers}
      >
        <span
          className="block text-2xl leading-none max-[620px]:text-[22px]"
          aria-hidden="true"
        >
          {d.glyph || '❖'}
        </span>
        <span className="mt-1 text-[15px] [line-height:1.2] font-semibold tracking-normal whitespace-normal text-[var(--leaf)] normal-case">
          {cardName(SB, c)}
        </span>
        <span className="text-[12px] leading-snug text-[var(--leaf)]">
          {cardBlurb(SB, c, run)}
        </span>
        <span className="text-[11px] text-[var(--leaf-dim)]">
          Held for this run
        </span>
        {impactText && (
          <span className="text-[12px] leading-snug text-[var(--leaf)]">
            {impactText}
          </span>
        )}
        {exampleLimit && (
          <span className="text-[10px] leading-snug text-[var(--leaf-dim)]">
            {exampleLimit}
          </span>
        )}
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
        <span className="absolute top-1.5 right-2 text-[13px] font-[var(--figure)] text-[var(--brass-hot)]">
          {c.price} ink
        </span>
        <Button
          type="button"
          variant="paperPrimary"
          className="mt-auto self-stretch px-2.5 py-1 text-[12px] disabled:opacity-40"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            buyCard(i);
          }}
        >
          {c.sold ? 'Owned' : run.ink < c.price ? 'Need more ink' : 'Buy'}
        </Button>
      </Card>
    );
  }
  return (
    <div
      className={
        'relative flex max-w-[200px] min-w-40 flex-col items-start gap-1 rounded-sm border border-[var(--rule)] bg-[var(--pit-raise)] p-3 pt-6 text-left text-[var(--leaf)]' +
        (c.kind === 'etude' ? ' border-dashed' : '')
      }
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
        <span className="absolute top-1.5 right-2 text-[13px] font-[var(--figure)] text-[var(--brass-hot)]">
          {c.price} ink
        </span>
      )}
      <span className="text-xs text-[var(--leaf-dim)]">
        {c.kind === 'etude'
          ? 'Length upgrade for this run'
          : c.kind === 'item'
            ? 'Held for this run'
            : 'Keep until used'}
      </span>
      {impactText && (
        <span className="text-[12px] leading-snug text-[var(--leaf)]">
          {impactText}
        </span>
      )}
      {exampleLimit && (
        <span className="text-[10px] leading-snug text-[var(--leaf-dim)]">
          {exampleLimit}
        </span>
      )}
      <Button
        type="button"
        variant="paperPrimary"
        disabled={disabled}
        className="mt-auto self-stretch"
        onClick={() => buyCard(i)}
      >
        {c.sold ? 'Owned' : run.ink < c.price ? 'Need more ink' : 'Buy'}
      </Button>
    </div>
  );
}
