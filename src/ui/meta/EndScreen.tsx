// The run's end screen -- extracted unchanged from RoundSandbox.jsx
// (READ_SLOWLY_PLAN.md A4, mechanical extraction). Ported to .tsx
// (READ_SLOWLY_PLAN.md A1 remainder) with real prop types; still the
// pre-A6 bespoke classNames -- the shadcn/Tailwind chrome pass is a
// separate, larger visual change tracked under A6.
import { useState } from 'react';
import * as copy from '../copy';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '../primitives/tooltip';
import { Card } from '../primitives/card';
import { Button } from '@/ui/primitives/button';
import { Badge } from '../primitives/badge';
import { rarityBadgeClass, rarityCardClass } from '../quills/cardCopy';
import { cn } from 'cn';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../primitives/dialog';
import type { RunFacade } from '../../engine/state/facade';
import type { Breakdown } from '../../engine/content/round';
import type { SituationId } from '../../engine/content/situations';
import type { Enemy } from '../../engine/content/enemies';

type EndRun = RunFacade;

interface BestState {
  word?: { word: string; total: number };
  deepest?: { name: string };
  wins?: number;
  runs?: number;
}

export default function EndScreen({
  run,
  won,
  SB,
  seed,
  onAgain,
  onCopy,
  onShare,
  shareText,
  best,
  describe,
}: {
  run: EndRun;
  won: boolean;
  SB: {
    situationFor?: (
      situation: SituationId | null | undefined,
    ) => { failure: string } | null;
    ITEM_DEFS: Record<string, { name: string; rarity?: string }>;
  };
  seed: string;
  onAgain: () => void;
  onCopy: () => void;
  onShare: () => void;
  shareText: string;
  best: BestState;
  describe: (breakdown: Breakdown) => string;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const felled = run.felled
    .map((id) => {
      for (const m of run.movements)
        for (const e of m.enemies) if (e.id === id) return e;
      return null;
    })
    .filter((e): e is Enemy => Boolean(e));
  return (
    <div
      className={
        'mt-4 border bg-[var(--pit-deep)] p-[18px_20px_20px] max-[620px]:p-3.5 ' +
        (won
          ? 'border-[var(--brass)] text-[var(--leaf)]'
          : 'border-[var(--rubric-dim)] text-[var(--brass-hot)]')
      }
    >
      <h2
        className={
          'm-0 text-[clamp(26px,4vw,38px)] leading-[1.1] font-[var(--display)] font-medium ' +
          (won ? 'text-[var(--brass-hot)]' : 'text-[var(--leaf-dim)]')
        }
      >
        {won
          ? copy.LAST_PAGE_TURNS
          : copy.lostTheRoom(run.enemy?.name ?? 'unknown')}
      </h2>
      {!won &&
        run.round &&
        SB.situationFor &&
        SB.situationFor(run.round.situation) && (
          <p className="sb-end-failure">
            {SB.situationFor(run.round.situation)!.failure}
          </p>
        )}
      <p className="my-1 mb-3.5 text-[var(--leaf-dim)]">
        {won
          ? 'All ' +
            run.movements.length +
            ' movements, ' +
            run.felled.length +
            ' enemies felled'
          : run.round!.target - run.round!.score + ' short of the target'}
        {' · '}
        {copy.resolvedSummary(run.resolved ? run.resolved.length : 0)}
        {' · '}
        {run.wordsPlayed} word{run.wordsPlayed === 1 ? '' : 's'} played ·{' '}
        <b className="font-[var(--figure)] text-[var(--brass-hot)]">
          {run.ink}
        </b>{' '}
        ink
      </p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-6 gap-y-3.5">
        <Card className="bg-transparent p-0 ring-0">
          <span className="sb-eyebrow mb-1.5 block text-[10px] font-semibold tracking-[0.22em] whitespace-nowrap text-[var(--leaf-dim)] uppercase">
            Felled
          </span>
          <div className="flex flex-wrap items-center gap-[5px]">
            <TooltipProvider>
              {felled.map((e) => (
                <Tooltip key={e.id}>
                  <TooltipTrigger
                    render={
                      <span
                        className={
                          'inline-flex items-center justify-center rounded-full border border-[var(--leaf)] bg-[var(--leaf)] text-[15px] leading-none font-[var(--figure)] text-[var(--ink)]' +
                          (e.kind === 'boss'
                            ? ' h-[30px] w-[30px] border-[var(--brass)]'
                            : e.kind === 'big'
                              ? ' h-[26px] w-[26px]'
                              : ' h-[22px] w-[22px]')
                        }
                      />
                    }
                  >
                    {e.kind === 'boss' ? '♩' : '·'}
                  </TooltipTrigger>
                  <TooltipContent>{e.name}</TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>

            {run.skipped.length > 0 && (
              <em className="sb-hint">{run.skipped.length} skipped</em>
            )}
            {felled.length === 0 && <em className="sb-hint">none</em>}
          </div>
        </Card>
        <Card className="bg-transparent p-0 ring-0">
          <span className="sb-eyebrow mb-1.5 block text-[10px] font-semibold tracking-[0.22em] whitespace-nowrap text-[var(--leaf-dim)] uppercase">
            Best word
          </span>
          {run.bestPlay ? (
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="text-xl font-[var(--display)] tracking-[0.04em]">
                {run.bestPlay.word}
              </span>
              <b className="font-[var(--figure)] tabular-nums">
                {run.bestPlay.breakdown.total}
              </b>
              <span className="basis-full text-[11px] font-[var(--figure)] text-[var(--leaf-dim)]">
                {describe(run.bestPlay.breakdown)} · against{' '}
                {run.bestPlay.enemy}
              </span>
            </div>
          ) : (
            <em className="sb-hint">none played</em>
          )}
        </Card>
        <Card className="bg-transparent p-0 ring-0">
          <span className="sb-eyebrow mb-1.5 block text-[10px] font-semibold tracking-[0.22em] whitespace-nowrap text-[var(--leaf-dim)] uppercase">
            Items
          </span>
          <div className="flex flex-wrap gap-1.5">
            {run.items.map((id) => {
              const rarity = SB.ITEM_DEFS[id]!.rarity || 'common';
              return (
                <Card
                  key={id}
                  data-rarity={rarity}
                  className={cn(
                    'flex-row items-center gap-1.5 rounded-sm px-2 py-1',
                    rarityCardClass(rarity),
                  )}
                >
                  <b>{SB.ITEM_DEFS[id]!.name}</b>
                  <Badge className={rarityBadgeClass(rarity)}>{rarity}</Badge>
                </Card>
              );
            })}
            {run.items.length === 0 && <em className="sb-hint">none</em>}
          </div>
        </Card>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-[18px] gap-y-2.5">
        <Button
          type="button"
          className="sb-go h-auto border-[var(--leaf)] bg-[var(--leaf)] px-[18px] py-3 text-[var(--ink)] hover:border-[var(--brass-hot)] hover:bg-[var(--brass-hot)] hover:text-[var(--ink)]"
          variant="paperPrimary"
          onClick={onAgain}
        >
          Play again
        </Button>
        <Button
          type="button"
          className="sb-share"
          variant="paper"
          onClick={onShare}
        >
          Copy result
        </Button>
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogTrigger
            render={
              <Button type="button" className="sb-hint" variant="paperGhost" />
            }
          >
            preview
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Result to share</DialogTitle>
            </DialogHeader>
            <pre className="sb-hint" style={{ whiteSpace: 'pre-wrap' }}>
              {shareText}
            </pre>
            <DialogFooter>
              <Button
                type="button"
                className="sb-go border-[var(--leaf)] bg-[var(--leaf)] text-[var(--ink)] hover:border-[var(--brass-hot)] hover:bg-[var(--brass-hot)] hover:text-[var(--ink)]"
                variant="paperPrimary"
                onClick={() => {
                  onShare();
                  setPreviewOpen(false);
                }}
              >
                Copy
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <span className="inline-flex items-center gap-1.5 text-xs text-[var(--leaf-dim)]">
          seed{' '}
          <code className="font-[var(--figure)] text-[var(--leaf)]">
            {seed}
          </code>
          <Button
            type="button"
            variant="paperGhost"
            className="h-auto px-2 py-[3px] text-[9px]"
            onClick={onCopy}
          >
            copy
          </Button>
        </span>
        {best && best.word && (
          <span className="sb-hint">
            best ever: {best.word.word} for {best.word.total} · deepest:{' '}
            {best.deepest ? best.deepest.name : '—'} · {best.wins || 0} win
            {best.wins === 1 ? '' : 's'} in {best.runs || 0} run
            {best.runs === 1 ? '' : 's'}
          </span>
        )}
      </div>
    </div>
  );
}
