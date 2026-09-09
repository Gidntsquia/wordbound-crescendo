// READ_SLOWLY_PLAN.md A4 -- pure code-move from RoundSandbox.jsx. The chapter
// pip strip plus the ink purse readout. Read-only over `run`/`phase`; no
// fight.current/round mutation, no refresh/dispatch of its own. Ported to
// .tsx (READ_SLOWLY_PLAN.md A1 remainder).
interface RunLike {
  movements: { numeral: string; enemies: Enemy[] }[];
  movement: number;
  stage: number;
  felled: string[];
  targetFor: (movement: number, stage: number) => number;
  enemy: { glyph: string; name: string };
  tune: { INTEREST_PER: number; INTEREST_CAP: number };
  ink: number;
  interestPreview: () => number;
}

interface Enemy {
  id: string;
  kind: string;
  glyph: string;
  name: string;
}

export default function RunStrip({
  run,
  phase,
}: {
  run: RunLike | null;
  phase: string;
}) {
  if (!run) return null;
  return (
    <nav className="sb-strip" aria-label="The run">
      {run.movements.map((m, mi) => (
        <span
          key={m.numeral}
          className={
            'sb-strip-mv' +
            (mi === run.movement
              ? ' is-now'
              : mi < run.movement
                ? ' is-done'
                : '')
          }
        >
          <b className="sb-strip-numeral">{m.numeral}</b>
          {m.enemies.map((e, si) => {
            const done = run.felled.includes(e.id);
            const now = mi === run.movement && si === run.stage;
            return (
              <span
                key={e.id}
                title={e.name + ' · target ' + run.targetFor(mi, si)}
                className={
                  'sb-pip sb-pip-' +
                  e.kind +
                  (now ? ' is-now' : '') +
                  (done ? ' is-done' : '')
                }
              >
                {now || done ? e.glyph : e.kind === 'boss' ? '♩' : '·'}
              </span>
            );
          })}
        </span>
      ))}
      {phase === 'shop' && (
        <span className="sb-strip-enemy">
          next · {run.enemy.glyph} {run.enemy.name}
        </span>
      )}
      <span
        className="sb-purse"
        title={
          'Interest: 1 gold per ' +
          run.tune.INTEREST_PER +
          ' held, up to ' +
          run.tune.INTEREST_CAP
        }
      >
        <b>{run.ink}</b> ink
        {run.interestPreview() > 0 && (
          <em>+{run.interestPreview()} interest</em>
        )}
      </span>
    </nav>
  );
}
