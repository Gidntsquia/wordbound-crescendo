import type { ActFn } from '../actFn';
// The row of held consumables (étude/mark cards) -- extracted from
// HeldRow.jsx (READ_SLOWLY_PLAN.md A4, mechanical extraction), ported
// to .tsx.
import { consumableBlurb, consumableName } from './cardCopy';
import type { RunFacade } from '../../engine/state/facade';

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
    MARK_DEFS: Record<string, { targets: number }>;
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
    <div className="sb-held-row" aria-label="Consumables">
      <span className="sb-eyebrow">
        Consumables · {run.consumables.length}/{tune.CONSUMABLE_SLOTS}
      </span>
      {run.consumables.map((c, i) => {
        const tipId = 'cons:' + c.kind + ':' + i;
        return (
          <span key={i} className={'sb-card sb-card-' + c.kind}>
            <button
              type="button"
              className="sb-card-name-btn"
              onClick={() => setTip((t) => (t === tipId ? null : tipId))}
            >
              <b>{consumableName(SB, c)}</b>
            </button>
            {tip === tipId && (
              <span className="sb-card-tip" role="tooltip">
                <em>{consumableBlurb(SB, c, run)}</em>
              </span>
            )}
            {(live || inShop) && c.kind === 'etude' && (
              <button
                type="button"
                className="sb-card-use"
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
              </button>
            )}
            {c.kind === 'mark' &&
              onInk &&
              (live || SB.MARK_DEFS[c.id]!.targets === 0) && (
                <button
                  type="button"
                  className="sb-card-use"
                  onClick={() => onInk(i)}
                >
                  use
                </button>
              )}
            {inShop && (
              <button
                type="button"
                className="sb-card-sell"
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
              </button>
            )}
          </span>
        );
      })}
      {run.consumables.length === 0 && (
        <span className="sb-hint">none held</span>
      )}
    </div>
  );
}
