// The "won this fight" outcome banner: the situation's resolution[] beat,
// ink earned, interest preview, the To-the-shop/Finish-the-run button.
// Extracted from RoundSandbox.jsx (READ_SLOWLY_PLAN.md A4). The resolution
// beat and its skip are owned by the parent (READ_SLOWLY_PLAN.md C3): this
// component just renders resolution[] while `resolved` is false and hides
// the continue button until then, or immediately on `skip`.
import type { Situation } from '../../engine/content/situations';
import type { RunFacade, RoundFacade } from '../../engine/state/facade';

type RoundLike = RoundFacade;
type RunLike = RunFacade;

export default function WonBanner({
  round,
  run,
  nextStage,
  situation,
  resolved,
  skip,
}: {
  round: RoundLike;
  run: RunLike;
  nextStage: () => void;
  situation?: Situation | null;
  resolved: boolean;
  skip: () => void;
}) {
  const showResolution = !resolved && !!situation?.resolution?.length;
  return (
    <div
      className="sb-outcome sb-win"
      onClick={showResolution ? skip : undefined}
    >
      {showResolution && (
        <p className="sb-outcome-resolution">
          {situation!.resolution.join(' ')}
        </p>
      )}
      Won — {round.ink} ink ({round.reward} + {round.tune.INK_PER_WORD_LEFT} ×{' '}
      {round.playsLeft} word{round.playsLeft === 1 ? '' : 's'} left)
      {run.interestPreview() > 0 && (
        <> + {run.interestPreview()} interest</>
      )}.{' '}
      {!showResolution && (
        <button type="button" className="sb-go" onClick={nextStage}>
          {run.movement >= run.movements.length - 1 &&
          run.enemy?.kind === 'boss'
            ? 'Finish the run'
            : 'To the shop'}
        </button>
      )}
    </div>
  );
}
