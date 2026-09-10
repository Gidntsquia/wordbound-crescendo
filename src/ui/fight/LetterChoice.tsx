// After a boss falls: choose a stolen letter to win back. Extracted from
// RoundSandbox.jsx (READ_SLOWLY_PLAN.md A4).
import { Button } from '@/ui/primitives/button';

export default function LetterChoice({
  options,
  letterValues,
  pickLetter,
}: {
  options: string[];
  letterValues: Record<string, number>;
  pickLetter: (letter: string) => void;
}) {
  return (
    <div className="sb-letter-choice absolute inset-0 flex animate-[fade-up_420ms_ease-out_both] flex-wrap items-center justify-center bg-[rgba(10,11,22,0.84)] text-[clamp(26px,4.4vw,44px)] font-[var(--display)] tracking-[0.01em]">
      <span className="sb-eyebrow text-[10px] font-semibold tracking-[0.22em] whitespace-nowrap text-[var(--leaf-dim)] uppercase">
        The boss falls — choose a letter to win back
      </span>
      <div className="sb-letter-row">
        {options.map((l) => (
          <Button
            key={l}
            type="button"
            variant="paper"
            className="sb-tile sb-letter-pick"
            onClick={() => pickLetter(l)}
          >
            {l}
            <sub>{letterValues[l] || 0}</sub>
          </Button>
        ))}
      </div>
      <p className="sb-hint">
        It joins every future run’s bag, win or lose this one.
      </p>
    </div>
  );
}
