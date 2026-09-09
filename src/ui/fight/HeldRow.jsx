// Held bookmarks (quills) + consumables row -- extracted unchanged from
// RoundSandbox.jsx (READ_SLOWLY_PLAN.md A4, mechanical extraction).
import {
  consumableBlurb,
  consumableName,
  cresBadge,
  itemBlurb,
} from './cardCopy';

export default function HeldRow({
  run,
  SB,
  act,
  live,
  inShop,
  onInk,
  lit,
  floats,
  cres,
  tip,
  setTip,
}) {
  const tune = run.tune;
  return (
    <div className="sb-held">
      <div className="sb-held-row" aria-label="Quills">
        <span className="sb-eyebrow">
          Bookmarks · {run.items.length}/{tune.ITEM_SLOTS}
        </span>
        {run.items.map((id, i) => {
          const d = SB.ITEM_DEFS[id];
          const cresState = d.crescendo
            ? live && cres
              ? cres.phase
              : 'idle'
            : null;
          const tipId = 'item:' + id;
          return (
            <span
              key={id}
              className={
                'sb-card sb-card-item sb-card-glyphed is-' +
                (d.rarity || 'common') +
                (lit === id ? ' is-jiggle' : '') +
                (cresState ? ' sb-card-cres is-cres-' + cresState : '')
              }
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
                  <i
                    key={x.key}
                    className={'sb-float sb-float-card is-' + x.tone}
                  >
                    {x.text}
                  </i>
                ))}
              <span className="sb-card-icon" aria-hidden="true">
                {d.glyph || '❖'}
              </span>
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
                      style={{
                        '--t': Math.max(
                          0,
                          Math.min(1, cres.secs / SB.CRESCENDO.countdown),
                        ),
                      }}
                    />
                  )}
                  {cresBadge(live ? cres : null)}
                </span>
              )}
              {run.items.length > 1 && (
                <span
                  className="sb-card-order"
                  title="Bookmarks fire left to right"
                >
                  <button
                    type="button"
                    disabled={i === 0}
                    aria-label="Move left"
                    onClick={(e) => {
                      e.stopPropagation();
                      act(null, { ok: run.moveItem(i, i - 1) });
                    }}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    disabled={i === run.items.length - 1}
                    aria-label="Move right"
                    onClick={(e) => {
                      e.stopPropagation();
                      act(null, { ok: run.moveItem(i, i + 1) });
                    }}
                  >
                    ›
                  </button>
                </span>
              )}
              {inShop && (
                <button
                  type="button"
                  className="sb-card-sell"
                  title="Sell"
                  onClick={(e) => {
                    e.stopPropagation();
                    act('Sold ' + d.name + '.', run.shop.sell(i), 'coin');
                  }}
                >
                  sell {Math.floor(SB.priceOf(d) / 2)}
                </button>
              )}
            </span>
          );
        })}
        {run.items.length === 0 && <span className="sb-hint">nothing yet</span>}
      </div>
      {(run.consumables.length > 0 || inShop) && (
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
                          SB.TIER_DEFS[c.id].name +
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
                  (live || SB.MARK_DEFS[c.id].targets === 0) && (
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
                      (c.kind === 'mark' ? tune.MARK_PRICE : tune.ETUDE_PRICE) /
                        2,
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
      )}
    </div>
  );
}
