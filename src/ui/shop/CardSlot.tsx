// A single shop card slot (item / ink / étude) -- extracted from Shop.jsx
// (READ_SLOWLY_PLAN.md A4, mechanical extraction), ported to .tsx.
import { cardBlurb, cardName } from '../fight/cardCopy';

interface ShopCard {
  kind: string;
  id: string;
  price: number;
  sold?: boolean;
}

interface ItemDef {
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
  run: {
    ink: number;
    items: readonly string[];
    tune: Record<string, number | boolean | undefined>;
  };
  SB: { ITEM_DEFS: Record<string, ItemDef> };
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
    return (
      <span
        className={
          'sb-card sb-card-buy sb-card-item sb-card-glyphed is-' +
          (d.rarity || 'common')
        }
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
        {tip === tipId && (
          <span className="sb-card-tip" role="tooltip">
            <b>{cardName(SB, c)}</b>
            <em>{cardBlurb(SB, c, run)}</em>
          </span>
        )}
        <span className="sb-price">{c.price}</span>
        <button
          type="button"
          className="sb-card-buy-btn"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            buyCard(i);
          }}
        >
          Buy
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
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
    </button>
  );
}
