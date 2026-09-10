import type { ActFn } from '../actFn';
import { Button } from '@/ui/primitives/button';
// A single held quill (item) card -- extracted from HeldRow.jsx
// (READ_SLOWLY_PLAN.md A4, mechanical extraction), ported to .tsx.
import {
  cresBadge,
  itemBlurb,
  rarityBadgeClass,
  rarityCardClass,
} from './cardCopy';
import type { RunFacade } from '../../engine/state/facade';
import type { CrescendoWindow } from '../../audio/recordingPlayer';
import { Card } from '@/ui/primitives/card';
import { Badge } from '@/ui/primitives/badge';
import { cn } from 'cn';

interface Float {
  key: string | number;
  on: string | number | undefined;
  tone: string | undefined;
  text: string | undefined;
}

interface ItemDef {
  name: string;
  hint: string;
  rarity?: string;
  glyph?: string;
  crescendo?: boolean;
}

type RunLike = RunFacade;
type Cres = CrescendoWindow;

export default function QuillCard({
  id,
  d,
  i,
  itemsLength,
  lit,
  cresState,
  cresArg,
  tip,
  setTip,
  act,
  run,
  inShop,
  floats,
  SB,
}: {
  id: string;
  d: ItemDef;
  i: number;
  itemsLength: number;
  lit: string | null;
  cresState: string | null;
  cresArg: Cres | null;
  tip: string | null;
  setTip: (updater: (t: string | null) => string | null) => void;
  act: ActFn;
  run: RunLike;
  inShop: boolean;
  floats: Float[];
  SB: { CRESCENDO: { countdown: number }; priceOf: (d: ItemDef) => number };
}) {
  const tipId = 'item:' + id;
  const rarity = d.rarity || 'common';
  return (
    <Card
      data-rarity={rarity}
      className={cn(
        'sb-card-glyphed relative gap-0 rounded-sm p-0 px-1 py-1.5',
        rarityCardClass(rarity),
        lit === id && 'is-jiggle',
        cresState && 'sb-card-cres is-cres-' + cresState,
      )}
      role="button"
      tabIndex={0}
      aria-label={d.name + ' — ' + itemBlurb(d)}
      onClick={() => setTip((t) => (t === tipId ? null : tipId))}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setTip((t) => (t === tipId ? null : tipId));
        }
      }}
    >
      {(floats || [])
        .filter((x) => x.on === id)
        .map((x) => (
          <i key={x.key} className={'sb-float sb-float-card is-' + x.tone}>
            {x.text}
          </i>
        ))}
      <span className="sb-card-icon" aria-hidden="true">
        {d.glyph || '❖'}
      </span>
      <Badge className={cn('mt-0.5', rarityBadgeClass(rarity))}>{rarity}</Badge>
      <b className="sb-card-name-sr">{d.name}</b>
      {tip === tipId && (
        <span className="sb-card-tip" role="tooltip">
          <b>{d.name}</b>
          <em>{itemBlurb(d)}</em>
        </span>
      )}
      {cresState && (
        <span className="sb-cres-badge" aria-live="polite">
          {cresState === 'soon' && (
            <i
              className="sb-cres-ring"
              style={
                {
                  '--t': Math.max(
                    0,
                    Math.min(
                      1,
                      (cresArg ? (cresArg.secs ?? 0) : 0) /
                        SB.CRESCENDO.countdown,
                    ),
                  ),
                } as React.CSSProperties
              }
            />
          )}
          {cresBadge(cresArg)}
        </span>
      )}
      {itemsLength > 1 && (
        <span className="sb-card-order" title="Bookmarks fire left to right">
          <Button
            type="button"
            variant="paperGhost"
            disabled={i === 0}
            aria-label="Move left"
            onClick={(e) => {
              e.stopPropagation();
              act(null, run.moveItem(i, i - 1));
            }}
          >
            ‹
          </Button>
          <Button
            type="button"
            variant="paperGhost"
            disabled={i === itemsLength - 1}
            aria-label="Move right"
            onClick={(e) => {
              e.stopPropagation();
              act(null, run.moveItem(i, i + 1));
            }}
          >
            ›
          </Button>
        </span>
      )}
      {inShop && (
        <Button
          type="button"
          variant="paper"
          className="sb-card-sell"
          title="Sell"
          onClick={(e) => {
            e.stopPropagation();
            act('Sold ' + d.name + '.', run.shop?.sell(i), 'coin');
          }}
        >
          sell {Math.floor(SB.priceOf(d) / 2)}
        </Button>
      )}
    </Card>
  );
}
