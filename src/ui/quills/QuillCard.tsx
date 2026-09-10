import { useRef } from 'react';
import type { ActFn } from '../actFn';
import { Button } from '@/ui/primitives/button';
import Sprite from '../../art/Sprite';
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

// The held-quill card's floating +N/x2 badges (sandbox.css A6 slice 7 port of
// .sb-float.sb-float-card / .is-mult); `float-up` stays a keyframe in
// sandbox.css.
const FLOAT_CARD_BASE =
  'pointer-events-none absolute top-[-10px] left-1/2 z-6 font-[var(--figure)] text-sm font-bold whitespace-nowrap text-[var(--brass-hot)] not-italic [text-shadow:0_1px_6px_rgba(0,0,0,0.8)] motion-safe:animate-[float-up_720ms_ease-out_forwards] ';
const FLOAT_MULT = 'text-[var(--rubric)]';

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
  // Tracks whether the upcoming focus event came from a pointer press, so
  // onFocus can skip opening the tip -- otherwise focus fires before click
  // on a mouse/touch tap, onFocus already opens the tip, and the click
  // handler's toggle sees it open and immediately closes it again, making
  // clicks look like they do nothing.
  const viaPointerRef = useRef(false);
  return (
    <Card
      data-rarity={rarity}
      className={cn(
        'relative isolate w-[72px] cursor-pointer flex-col items-center gap-0 overflow-visible rounded-sm p-0 px-1 py-1.5 text-center transition-[opacity,box-shadow,border-color] duration-[240ms]',
        rarityCardClass(rarity, inShop),
        lit === id && 'z-[2] motion-safe:animate-[card-jiggle_320ms_ease-out]',
        cresState === 'idle' && 'opacity-45 saturate-[0.4]',
        cresState === 'soon' && 'border-[var(--brass-hot)] opacity-85',
        cresState === 'live' &&
          'border-[var(--brass-hot)] text-[var(--brass-hot)] opacity-100 shadow-[0_0_0_2px_var(--brass-hot),0_0_22px_4px_rgba(242,194,96,0.55)] motion-safe:animate-[cres-throb_500ms_ease-in-out_infinite_alternate]',
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
      onMouseDown={() => {
        viaPointerRef.current = true;
      }}
      onTouchStart={() => {
        viaPointerRef.current = true;
      }}
      onFocus={() => {
        if (viaPointerRef.current) {
          viaPointerRef.current = false;
          return;
        }
        setTip(() => tipId);
      }}
      onBlur={() => setTip((t) => (t === tipId ? null : t))}
    >
      <Sprite
        sheet="bookmark_card_frame"
        pose="idle"
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
      />
      {(floats || [])
        .filter((x) => x.on === id)
        .map((x) => (
          <i
            key={x.key}
            className={FLOAT_CARD_BASE + (x.tone === 'mult' ? FLOAT_MULT : '')}
          >
            {x.text}
          </i>
        ))}
      <span
        className="block text-2xl leading-none max-[620px]:text-[22px]"
        aria-hidden="true"
      >
        {d.glyph || '❖'}
      </span>
      {/* Rarity is also carried by the card border (rarityCardClass); on a
          phone in the fight the badge's row is height the board can't
          spare, so it only shows in the shop there. */}
      <Badge
        className={cn(
          'mt-0.5 px-1.5 text-[9px]',
          !inShop && 'max-[620px]:hidden',
          rarityBadgeClass(rarity, inShop),
        )}
      >
        {rarity}
      </Badge>
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
