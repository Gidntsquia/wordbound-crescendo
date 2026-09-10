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
      <div className="my-2.5 flex gap-2.5">
        {options.map((l) => (
          <Button
            key={l}
            type="button"
            variant="paper"
            className={
              // Tailwind port of the base .sb-tile look (sandbox.css A6
              // slice 5) -- see Rack.tsx for the full comment.
              'sb-tile relative h-[52px] min-w-[46px] touch-none rounded-[2px] border border-dashed border-[var(--leaf)] bg-[var(--leaf)] p-0 text-[22px] font-[var(--display)] font-semibold tracking-normal text-[var(--ink)] normal-case shadow-[0_2px_0_rgba(0,0,0,0.45)] select-none not-disabled:hover:border-[var(--brass-hot)] not-disabled:hover:bg-[var(--brass-hot)] not-disabled:hover:text-[var(--ink)] not-disabled:hover:shadow-[0_4px_0_rgba(0,0,0,0.45),0_0_0_1px_var(--brass-hot)] max-[620px]:h-[46px] max-[620px]:min-w-[40px] max-[620px]:text-[19px]'
            }
            onClick={() => pickLetter(l)}
          >
            {l}
            <sub className="absolute right-1 bottom-[3px] text-[9px] font-[var(--figure)] text-[rgba(26,23,16,0.55)]">
              {letterValues[l] || 0}
            </sub>
          </Button>
        ))}
      </div>
      <p className="sb-hint">
        It joins every future run’s bag, win or lose this one.
      </p>
    </div>
  );
}
