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
import { Badge } from '../primitives/badge';
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
    <div className={'sb-end ' + (won ? 'sb-win' : 'sb-lose')}>
      <h2 className="sb-end-title">
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
      <p className="sb-end-sub">
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
        <b>{run.ink}</b> ink
      </p>
      <div className="sb-end-grid">
        <Card className="bg-transparent p-0 ring-0">
          <span className="sb-eyebrow">Felled</span>
          <div className="sb-end-felled">
            <TooltipProvider>
              {felled.map((e) => (
                <Tooltip key={e.id}>
                  <TooltipTrigger
                    render={
                      <span
                        className={'sb-pip sb-pip-' + e.kind + ' is-done'}
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
          <span className="sb-eyebrow">Best word</span>
          {run.bestPlay ? (
            <div className="sb-end-best">
              <span className="sb-plays-word">{run.bestPlay.word}</span>
              <b className="sb-figure">{run.bestPlay.breakdown.total}</b>
              <span className="sb-plays-how">
                {describe(run.bestPlay.breakdown)} · against{' '}
                {run.bestPlay.enemy}
              </span>
            </div>
          ) : (
            <em className="sb-hint">none played</em>
          )}
        </Card>
        <Card className="bg-transparent p-0 ring-0">
          <span className="sb-eyebrow">Items</span>
          <div className="sb-end-items">
            {run.items.map((id) => (
              <span
                key={id}
                className={
                  'sb-card sb-card-item is-' +
                  (SB.ITEM_DEFS[id]!.rarity || 'common')
                }
              >
                <b>{SB.ITEM_DEFS[id]!.name}</b>
                <Badge variant="outline" className="ml-1 align-middle">
                  {SB.ITEM_DEFS[id]!.rarity || 'common'}
                </Badge>
              </span>
            ))}
            {run.items.length === 0 && <em className="sb-hint">none</em>}
          </div>
        </Card>
      </div>
      <div className="sb-end-actions">
        <button type="button" className="sb-go" onClick={onAgain}>
          Play again
        </button>
        <button type="button" className="sb-share" onClick={onShare}>
          Copy result
        </button>
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogTrigger render={<button type="button" className="sb-hint" />}>
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
              <button
                type="button"
                className="sb-go"
                onClick={() => {
                  onShare();
                  setPreviewOpen(false);
                }}
              >
                Copy
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <span className="sb-seed-line">
          seed <code>{seed}</code>
          <button type="button" onClick={onCopy}>
            copy
          </button>
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
