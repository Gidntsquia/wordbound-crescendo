// The "won this fight" outcome banner: ink earned, interest preview, the
// To-the-shop/Finish-the-run button. Extracted from RoundSandbox.jsx
// (READ_SLOWLY_PLAN.md A4).
interface RoundLike {
  ink: number;
  reward: number;
  tune: { INK_PER_WORD_LEFT: number };
  playsLeft: number;
}

interface RunLike {
  movement: number;
  movements: unknown[];
  enemy: { kind: string };
  interestPreview: () => number;
}

export default function WonBanner({
  round,
  run,
  nextStage,
}: {
  round: RoundLike;
  run: RunLike;
  nextStage: () => void;
}) {
  return (
    <div className="sb-outcome sb-win">
      Won — {round.ink} ink ({round.reward} + {round.tune.INK_PER_WORD_LEFT} ×{' '}
      {round.playsLeft} word{round.playsLeft === 1 ? '' : 's'} left)
      {run.interestPreview() > 0 && (
        <> + {run.interestPreview()} interest</>
      )}.{' '}
      <button type="button" className="sb-go" onClick={nextStage}>
        {run.movement >= run.movements.length - 1 && run.enemy.kind === 'boss'
          ? 'Finish the run'
          : 'To the shop'}
      </button>
    </div>
  );
}
