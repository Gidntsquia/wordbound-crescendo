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
        'relative max-w-[60px] min-w-11 cursor-pointer flex-col items-center gap-0 rounded-sm p-0 px-1 py-1.5 text-center transition-[opacity,box-shadow,border-color] duration-[240ms]',
        rarityCardClass(rarity),
        lit === id && 'is-jiggle',
        cresState === 'idle' && 'opacity-45 saturate-[0.4]',
        cresState === 'soon' && 'border-[var(--brass-hot)] opacity-85',
        cresState === 'live' &&
          'animate-[cres-throb_500ms_ease-in-out_infinite_alternate] border-[var(--brass-hot)] text-[var(--brass-hot)] opacity-100 shadow-[0_0_0_2px_var(--brass-hot),0_0_22px_4px_rgba(242,194,96,0.55)]',
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
      <span
        className="block text-2xl leading-none max-[620px]:text-[22px]"
        aria-hidden="true"
      >
        {d.glyph || '❖'}
      </span>
      <Badge className={cn('mt-0.5', rarityBadgeClass(rarity))}>{rarity}</Badge>
      <b className="absolute h-px w-px overflow-hidden [clip:rect(0_0_0_0)]">
        {d.name}
      </b>
      {tip === tipId && (
        <span
          className="absolute bottom-[calc(100%+6px)] left-1/2 z-5 flex w-max max-w-[180px] -translate-x-1/2 flex-col gap-0.5 rounded-[3px] border border-[var(--brass)] bg-[var(--pit-deep)] px-[9px] py-[7px] text-left text-[11px] whitespace-normal shadow-[0_4px_14px_rgba(0,0,0,0.5)]"
          role="tooltip"
        >
          <b className="text-[13px] font-[var(--display)]">{d.name}</b>
          <em className="[line-height:1.3] font-normal text-[var(--leaf-dim)] not-italic">
            {itemBlurb(d)}
          </em>
        </span>
      )}
      {cresState && (
        <span
          className={cn(
            'mt-[3px] inline-flex items-center gap-1.5 text-[10px] tracking-[0.14em] text-[var(--leaf-dim)] uppercase',
            cresState === 'soon' && 'font-semibold text-[var(--brass-hot)]',
            cresState === 'live' &&
              'rounded-sm bg-[var(--brass-hot)] px-1.5 py-0.5 font-bold text-[var(--ink)]',
          )}
          aria-live="polite"
        >
          {cresState === 'soon' && (
            <i
              className="h-3.5 w-3.5 flex-none rounded-full"
              style={
                {
                  background:
                    'conic-gradient(var(--brass-hot) calc(var(--t) * 360deg), var(--rule) 0)',
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
        <span
          className="mt-1 mr-1.5 inline-flex gap-[3px]"
          title="Bookmarks fire left to right"
        >
          <Button
            type="button"
            variant="paperGhost"
            className="h-auto min-w-0 px-[7px] py-0.5 text-xs leading-none max-[620px]:min-h-8"
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
            className="h-auto min-w-0 px-[7px] py-0.5 text-xs leading-none max-[620px]:min-h-8"
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
          className="mt-1 h-auto px-2 py-[3px] text-[9px] tracking-[0.12em] max-[620px]:min-h-8"
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
