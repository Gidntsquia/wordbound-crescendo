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
    <div className="sb-outcome sb-letter-choice">
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
