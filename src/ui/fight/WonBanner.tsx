// The "won this fight" outcome banner: ink earned, interest preview, the
// To-the-shop/Finish-the-run button. Extracted from RoundSandbox.jsx
// (READ_SLOWLY_PLAN.md A4).
import type { RunFacade, RoundFacade } from '../../engine/state/facade';
import { Button } from '@/ui/primitives/button';

type RoundLike = RoundFacade;
type RunLike = RunFacade;

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
    <div className="absolute inset-0 flex animate-[fade-up_420ms_ease-out_both] flex-wrap items-center justify-center bg-[rgba(10,11,22,0.94)] px-4 text-[clamp(26px,4.4vw,44px)] font-[var(--display)] tracking-[0.01em] text-[var(--leaf)]">
      Won — {round.ink} ink ({round.reward} + {round.tune.INK_PER_WORD_LEFT} ×{' '}
      {round.playsLeft} word{round.playsLeft === 1 ? '' : 's'} left)
      {run.interestPreview() > 0 && (
        <> + {run.interestPreview()} interest</>
      )}.{' '}
      <Button
        type="button"
        variant="paperPrimary"
        className="sb-go border-[var(--leaf)] bg-[var(--leaf)] text-[var(--ink)] hover:border-[var(--brass-hot)] hover:bg-[var(--brass-hot)] hover:text-[var(--ink)]"
        onClick={nextStage}
      >
        {run.movement >= run.movements.length - 1 && run.enemy?.kind === 'boss'
          ? 'Finish the run'
          : 'To the shop'}
      </Button>
    </div>
  );
}
