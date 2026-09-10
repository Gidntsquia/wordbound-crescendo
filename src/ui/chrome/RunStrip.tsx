// READ_SLOWLY_PLAN.md A4 -- pure code-move from RoundSandbox.jsx. The chapter
// pip strip plus the ink purse readout. Read-only over `run`/`phase`; no
// fight.current/round mutation, no refresh/dispatch of its own. Ported to
// .tsx (READ_SLOWLY_PLAN.md A1 remainder).
import type { RunFacade } from '../../engine/state/facade';
import Sprite from '../../art/Sprite';

type RunLike = RunFacade | null | undefined;

export default function RunStrip({
  run,
  phase,
}: {
  run: RunLike | null;
  phase: string;
}) {
  if (!run) return null;
  return (
    <nav
      className="m-0 mb-3.5 flex flex-wrap items-center gap-x-[18px] gap-y-2 border border-[var(--rule)] bg-[var(--pit-deep)] py-2 pr-14 pl-3 text-xs tracking-[0.06em] text-[var(--leaf-dim)] max-[620px]:gap-x-3 max-[620px]:gap-y-1.5 max-[620px]:py-2 max-[620px]:pr-[52px] max-[620px]:pl-2.5"
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
            return (
              <span
                key={e.id}
                title={e.name + ' · target ' + run.targetFor(mi, si)}
                className={
                  'inline-flex items-center justify-center rounded-full border text-[15px] leading-none font-[var(--figure)]' +
                  (e.kind === 'boss'
                    ? ' h-[30px] w-[30px] border-[var(--brass)] text-[var(--brass)]'
                    : e.kind === 'big'
                      ? ' h-[26px] w-[26px] border-[var(--rule)] text-[var(--leaf-dim)]'
                      : ' h-[22px] w-[22px] border-[var(--rule)] text-[var(--leaf-dim)]') +
                  (now
                    ? ' border-[var(--brass-hot)] bg-[var(--brass-hot)] text-[var(--ink)] shadow-[0_0_0_3px_rgba(242,194,96,0.25)]'
                    : done
                      ? ' border-[var(--leaf)] bg-[var(--leaf)] text-[var(--ink)]'
                      : '')
                }
              >
                {now || done ? e.glyph : e.kind === 'boss' ? '♩' : '·'}
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
      <span
        className="ml-auto inline-flex items-baseline gap-1.5"
        title={
          'Interest: 1 gold per ' +
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
