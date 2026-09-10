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
    <div className="sb-inking">
      <span className="sb-eyebrow text-[10px] font-semibold tracking-[0.22em] whitespace-nowrap text-[var(--leaf-dim)] uppercase">
        {ink.name}
      </span>
      <span className="sb-hint">
        {ink.targets === 1
          ? 'tap one of your tiles'
          : 'tap up to ' + ink.targets + ' of your tiles'}
        {' · '}
        {ink.hint}
      </span>
      {ink.needsVowel && (
        <span className="sb-vowels">
          {vowels.map((v) => (
            <Button
              key={v}
              type="button"
              variant="paper"
              className={'sb-vowel' + (inking.vowel === v ? ' is-on' : '')}
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
