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
    <section
      className="mb-[22px] flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-[var(--rule)] pb-[18px]"
      role="group"
      aria-label="Starting quills"
    >
      <span className="sb-eyebrow mr-1.5 text-[10px] font-semibold tracking-[0.22em] whitespace-nowrap text-[var(--leaf-dim)] uppercase">
        Starting quills · read at start
      </span>
      {SB.ITEMS.map((d) => {
        const id = d.id;
        const on = itemIds.has(id);
        return (
          <label
            key={id}
            className={
              'inline-flex cursor-pointer items-center gap-[7px] rounded-sm border px-3 py-1.5 text-[11px] font-bold tracking-[0.1em] uppercase transition-colors duration-150 ' +
              (on
                ? 'border-[var(--leaf)] bg-[var(--leaf)] text-[var(--ink)]'
                : 'border-[var(--rule)] text-[var(--leaf-dim)] hover:border-[var(--brass)] hover:text-[var(--brass-hot)]')
            }
            title={d.hint}
          >
            <input
              type="checkbox"
              className="m-0 accent-[var(--brass)]"
              checked={on}
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
            <em className="max-w-[180px] font-normal tracking-normal whitespace-normal lowercase opacity-75">
              {d.hint}
            </em>
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
