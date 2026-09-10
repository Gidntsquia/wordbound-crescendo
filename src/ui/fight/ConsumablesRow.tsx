import type { ActFn } from '../actFn';
// The row of held consumables (étude/mark cards) -- extracted from
// HeldRow.jsx (READ_SLOWLY_PLAN.md A4, mechanical extraction), ported
// to .tsx.
import { consumableBlurb, consumableName } from '../quills/cardCopy';
import type { RunFacade } from '../../engine/state/facade';
import { Button } from '@/ui/primitives/button';

type RunLike = RunFacade;

export default function ConsumablesRow({
  run,
  SB,
  act,
  live,
  inShop,
  onInk,
  tip,
  setTip,
}: {
  run: RunLike;
  SB: {
    TIER_DEFS: Record<string, { name: string }>;
    MARK_DEFS: Record<
      string,
      { targets: number; name?: string; hint?: string }
    >;
  };
  act: ActFn;
  live: boolean;
  inShop: boolean;
  onInk?: (i: number) => void;
  tip: string | null;
  setTip: (updater: (t: string | null) => string | null) => void;
}) {
  const tune = run.tune;
  return (
    <div
      className="flex flex-wrap items-center gap-2 max-[620px]:gap-1.5"
      aria-label="Consumables"
    >
      <span className="sb-eyebrow min-w-24 text-[10px] font-semibold tracking-[0.22em] whitespace-nowrap text-[var(--leaf-dim)] uppercase max-[620px]:w-full max-[620px]:min-w-0">
        Consumables · {run.consumables.length}/{tune.CONSUMABLE_SLOTS}
      </span>
      {run.consumables.map((c, i) => {
        const tipId = 'cons:' + c.kind + ':' + i;
        return (
          <span
            key={i}
            className={
              'relative inline-flex max-w-[200px] min-w-32 flex-col items-start gap-[3px] rounded-sm border border-[var(--rule)] bg-[var(--pit-raise)] px-3 py-[9px] text-[11px] font-[var(--ui)] tracking-[0.04em] text-[var(--leaf)] max-[620px]:min-w-[76px] max-[620px]:gap-0.5 max-[620px]:px-2 max-[620px]:py-1.5' +
              (c.kind === 'etude' ? ' border-dashed' : '')
            }
          >
            <Button
              type="button"
              variant="paperGhost"
              className="h-auto min-h-0 justify-start border-0 bg-none p-0 text-left"
              onClick={() => setTip((t) => (t === tipId ? null : tipId))}
            >
              <b className="block pr-[26px] text-base leading-[1.15] font-[var(--display)] font-semibold tracking-normal">
                {consumableName(SB, c)}
              </b>
            </Button>
            {tip === tipId && (
              <span
                className="absolute bottom-[calc(100%+6px)] left-1/2 z-5 flex w-max max-w-[180px] -translate-x-1/2 flex-col gap-0.5 rounded-[3px] border border-[var(--brass)] bg-[var(--pit-deep)] px-[9px] py-[7px] text-left text-[11px] whitespace-normal shadow-[0_4px_14px_rgba(0,0,0,0.5)]"
                role="tooltip"
              >
                <em className="[line-height:1.3] font-normal text-[var(--leaf-dim)] not-italic">
                  {consumableBlurb(SB, c, run)}
                </em>
              </span>
            )}
            {(live || inShop) && c.kind === 'etude' && (
              <Button
                type="button"
                variant="paper"
                className="mt-1 h-auto border-[var(--brass-hot)] bg-[var(--brass-hot)] px-2 py-[3px] text-[9px] tracking-[0.12em] text-[var(--ink)] max-[620px]:min-h-8"
                onClick={() =>
                  act(
                    'Played the ' +
                      consumableName(SB, c) +
                      ' — ' +
                      SB.TIER_DEFS[c.id]!.name +
                      ' is level ' +
                      ((run.tierLevels[c.id] || 1) + 1) +
                      '.',
                    run.useConsumable(i),
                  )
                }
              >
                use
              </Button>
            )}
            {c.kind === 'mark' &&
              onInk &&
              (live || SB.MARK_DEFS[c.id]!.targets === 0) && (
                <Button
                  type="button"
                  variant="paper"
                  className="mt-1 h-auto border-[var(--brass-hot)] bg-[var(--brass-hot)] px-2 py-[3px] text-[9px] tracking-[0.12em] text-[var(--ink)] max-[620px]:min-h-8"
                  onClick={() => onInk(i)}
                >
                  use
                </Button>
              )}
            {inShop && (
              <Button
                type="button"
                variant="paper"
                className="mt-1 h-auto px-2 py-[3px] text-[9px] tracking-[0.12em] max-[620px]:min-h-8"
                title="Sell"
                onClick={() =>
                  act(
                    'Sold the ' + consumableName(SB, c) + '.',
                    run.sellConsumable(i),
                    'coin',
                  )
                }
              >
                sell{' '}
                {Math.floor(
                  Number(
                    c.kind === 'mark' ? tune.MARK_PRICE : tune.ETUDE_PRICE,
                  ) / 2,
                )}
              </Button>
            )}
          </span>
        );
      })}
      {run.consumables.length === 0 && (
        <span className="sb-hint m-0 text-[11px] text-[var(--leaf-dim)] italic">
          none held
        </span>
      )}
    </div>
  );
}
