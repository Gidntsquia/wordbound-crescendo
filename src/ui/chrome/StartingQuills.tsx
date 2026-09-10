// The gear-panel "Starting quills · read at start" checkbox list. Extracted
// from RoundSandbox.jsx (READ_SLOWLY_PLAN.md A4). Pure props in; itemIds is
// owned by the parent (read at Start, a mid-round swap would half-apply).
interface ItemDef {
  id: string;
  name: string;
  hint: string;
}

import type { RunFacade } from '../../engine/state/facade';

type RunLike = RunFacade | null | undefined;

export default function StartingQuills({
  SB,
  itemIds,
  setItemIds,
  run,
}: {
  SB: { ITEMS: ItemDef[] };
  itemIds: ReadonlySet<string>;
  setItemIds: (updater: (prev: Set<string>) => Set<string>) => void;
  run: RunLike | null;
}) {
  return (
    <section className="sb-items" role="group" aria-label="Starting quills">
      <span className="sb-eyebrow text-[10px] font-semibold tracking-[0.22em] whitespace-nowrap text-[var(--leaf-dim)] uppercase">
        Starting quills · read at start
      </span>
      {SB.ITEMS.map((d) => {
        const id = d.id;
        return (
          <label
            key={id}
            className={'sb-item' + (itemIds.has(id) ? ' is-on' : '')}
            title={d.hint}
          >
            <input
              type="checkbox"
              checked={itemIds.has(id)}
              onChange={(e) =>
                setItemIds((prev) => {
                  const next = new Set(prev);
                  if (e.target.checked) next.add(id);
                  else next.delete(id);
                  return next;
                })
              }
            />
            {d.name}
            <em>{d.hint}</em>
          </label>
        );
      })}
      {run &&
        [...itemIds].sort().join() !== run.startItems.slice().sort().join() && (
          <em className="sb-bag-note">on restart</em>
        )}
    </section>
  );
}
