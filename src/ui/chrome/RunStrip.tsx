// READ_SLOWLY_PLAN.md A4 -- pure code-move from RoundSandbox.jsx. The chapter
// pip strip plus the ink purse readout. Read-only over `run`/`phase`; no
// fight.current/round mutation, no refresh/dispatch of its own. Ported to
// .tsx (READ_SLOWLY_PLAN.md A1 remainder).
import type { RunFacade } from '../../engine/state/facade';
import { RULES } from '../../engine/content/enemies';
import Sprite from '../../art/Sprite';
import { useState } from 'react';

type RunLike = RunFacade | null | undefined;

export default function RunStrip({
  run,
  phase,
}: {
  run: RunLike | null;
  phase: string;
}) {
  const [selectedBoss, setSelectedBoss] = useState<string | null>(null);
  if (!run) return null;
  const bossLocation = run.movements
    .flatMap((movement, mi) =>
      movement.enemies.map((enemy, si) => ({ enemy, mi, si })),
    )
    .find(({ enemy }) => enemy.id === selectedBoss);
  return (
    <nav
      className="m-0 mb-3.5 flex flex-wrap items-center gap-x-[18px] gap-y-2 border border-[var(--rule)] bg-[var(--pit-deep)] py-2 pr-14 pl-3 text-xs tracking-[0.06em] text-[var(--leaf-dim)] max-[620px]:gap-x-3 max-[620px]:gap-y-1 max-[620px]:py-1.5 max-[620px]:pr-[52px] max-[620px]:pl-2.5"
      aria-label="The run"
    >
      {run.movements.map((m, mi) => (
        <span
          key={m.numeral}
          className={
            'inline-flex items-center gap-[5px]' +
            (mi === run.movement
              ? ' opacity-100'
              : mi < run.movement
                ? ' opacity-80'
                : ' opacity-55')
          }
        >
          <b
            className={
              'mr-1 text-xl leading-none font-[var(--display)] italic' +
              (mi === run.movement
                ? ' text-[var(--brass-hot)]'
                : ' text-[var(--leaf)]')
            }
          >
            {m.numeral}
          </b>
          {m.enemies.map((e, si) => {
            const done = run.felled.includes(e.id);
            const now = mi === run.movement && si === run.stage;
            const className =
              'inline-flex items-center justify-center rounded-full border text-[15px] leading-none font-[var(--figure)]' +
              (e.kind === 'boss'
                ? ' h-[36px] w-[36px] border-[var(--brass)] text-[var(--brass)]'
                : e.kind === 'big'
                  ? ' h-[26px] w-[26px] border-[var(--rule)] text-[var(--leaf-dim)]'
                  : ' h-[22px] w-[22px] border-[var(--rule)] text-[var(--leaf-dim)]') +
              (now
                ? ' border-[var(--brass-hot)] bg-[var(--brass-hot)] text-[var(--ink)] shadow-[0_0_0_3px_rgba(242,194,96,0.25)]'
                : done
                  ? ' border-[var(--leaf)] bg-[var(--leaf)] text-[var(--ink)]'
                  : '');
            const face = now || done ? e.glyph : e.kind === 'boss' ? '♩' : '·';
            return e.kind === 'boss' ? (
              <button
                key={e.id}
                type="button"
                className={
                  className +
                  ' cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brass-hot)]'
                }
                aria-label={`Inspect ${e.name} rule`}
                aria-expanded={selectedBoss === e.id}
                onClick={() =>
                  setSelectedBoss(selectedBoss === e.id ? null : e.id)
                }
              >
                {face}
              </button>
            ) : (
              <span
                key={e.id}
                title={e.name + ' · target ' + run.targetFor(mi, si)}
                className={className}
              >
                {face}
              </span>
            );
          })}
        </span>
      ))}
      {phase === 'shop' && run.enemy && (
        <span className="text-[11px] font-semibold tracking-[0.1em] text-[var(--brass)] uppercase">
          next · {run.enemy.glyph} {run.enemy.name}
        </span>
      )}
      {bossLocation && (
        <span className="order-last basis-full text-[12px] leading-snug text-[var(--leaf)]">
          <b>{bossLocation.enemy.name}</b> ·{' '}
          {RULES[bossLocation.enemy.rule!]?.plain ?? 'Finale'} · target{' '}
          {run.targetFor(bossLocation.mi, bossLocation.si)}
        </span>
      )}
      <span
        className="ml-auto inline-flex items-baseline gap-1.5"
        title={
          'Interest: 1 ink per ' +
          run.tune.INTEREST_PER +
          ' held, up to ' +
          run.tune.INTEREST_CAP
        }
      >
        <Sprite sheet="coin" pose="idle" className="h-[14px] w-[14px]" />
        <b className="text-lg font-[var(--figure)] text-[var(--brass-hot)]">
          {run.ink}
        </b>{' '}
        ink
        {run.interestPreview() > 0 && (
          <em className="text-[11px] font-normal text-[var(--leaf-dim)] not-italic">
            +{run.interestPreview()} interest
          </em>
        )}
      </span>
    </nav>
  );
}
