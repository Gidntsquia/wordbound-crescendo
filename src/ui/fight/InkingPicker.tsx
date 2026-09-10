// The mid-round inking mode picker (vowel choice + Apply/Cancel) --
// extracted from PlayBoard.jsx (READ_SLOWLY_PLAN.md A4).
import type { Inking as RealInking } from '../fight/FightScreen';
import { Button } from '@/ui/primitives/button';

type Inking = RealInking;

interface Ink {
  name: string;
  hint: string;
  targets: number;
  needsVowel?: boolean;
}

export default function InkingPicker({
  inking,
  setInking,
  applyInk,
  vowels,
}: {
  inking: Inking;
  setInking: React.Dispatch<React.SetStateAction<Inking | null>>;
  applyInk: () => void;
  vowels: string[];
}) {
  const ink = inking.ink as unknown as Ink;
  return (
    <div className="my-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 border border-dashed border-[var(--brass)] bg-[var(--pit-deep)] px-3 py-2">
      <span className="sb-eyebrow text-[10px] font-semibold tracking-[0.22em] whitespace-nowrap text-[var(--leaf-dim)] uppercase">
        {ink.name}
      </span>
      <span className="sb-hint text-[11px] text-[var(--leaf-dim)] italic">
        {ink.targets === 1
          ? 'tap one of your tiles'
          : 'tap up to ' + ink.targets + ' of your tiles'}
        {' · '}
        {ink.hint}
      </span>
      {ink.needsVowel && (
        <span className="inline-flex gap-1">
          {vowels.map((v) => (
            <Button
              key={v}
              type="button"
              variant="paper"
              className={
                'px-2.5 py-1.5 text-[15px] font-[var(--display)] tracking-normal normal-case max-[620px]:min-h-8' +
                (inking.vowel === v
                  ? ' border-[var(--leaf)] bg-[var(--leaf)] text-[var(--ink)]'
                  : '')
              }
              onClick={() => setInking((k) => (k ? { ...k, vowel: v } : k))}
            >
              {v}
            </Button>
          ))}
        </span>
      )}
      <Button
        type="button"
        variant="paperPrimary"
        className="sb-go border-[var(--leaf)] bg-[var(--leaf)] text-[var(--ink)] hover:border-[var(--brass-hot)] hover:bg-[var(--brass-hot)] hover:text-[var(--ink)]"
        onClick={applyInk}
        disabled={!inking.ids.length || (ink.needsVowel && !inking.vowel)}
      >
        Apply{inking.ids.length ? ' to ' + inking.ids.length : ''}
      </Button>
      <Button
        type="button"
        variant="paperGhost"
        onClick={() => setInking(null)}
      >
        Cancel
      </Button>
    </div>
  );
}
