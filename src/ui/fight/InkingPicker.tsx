// The mid-round inking mode picker (vowel choice + Apply/Cancel) --
// extracted from PlayBoard.jsx (READ_SLOWLY_PLAN.md A4).
import type { Inking as RealInking } from '../../sandbox/RoundSandbox';

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
      <span className="sb-eyebrow">{ink.name}</span>
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
            <button
              key={v}
              type="button"
              className={'sb-vowel' + (inking.vowel === v ? ' is-on' : '')}
              onClick={() => setInking((k) => (k ? { ...k, vowel: v } : k))}
            >
              {v}
            </button>
          ))}
        </span>
      )}
      <button
        type="button"
        className="sb-go"
        onClick={applyInk}
        disabled={!inking.ids.length || (ink.needsVowel && !inking.vowel)}
      >
        Apply{inking.ids.length ? ' to ' + inking.ids.length : ''}
      </button>
      <button type="button" onClick={() => setInking(null)}>
        Cancel
      </button>
    </div>
  );
}
