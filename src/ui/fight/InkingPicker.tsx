// The mid-round inking mode picker (vowel choice + Apply/Cancel) --
// extracted from PlayBoard.jsx (READ_SLOWLY_PLAN.md A4).
interface Ink {
  name: string;
  hint: string;
  targets: number;
  needsVowel?: boolean;
}

interface Inking {
  ink: Ink;
  ids: string[];
  vowel: string | null;
}

export default function InkingPicker({
  inking,
  setInking,
  applyInk,
  vowels,
}: {
  inking: Inking;
  setInking: (value: Inking | null | ((k: Inking) => Inking)) => void;
  applyInk: () => void;
  vowels: string[];
}) {
  return (
    <div className="sb-inking">
      <span className="sb-eyebrow">{inking.ink.name}</span>
      <span className="sb-hint">
        {inking.ink.targets === 1
          ? 'tap one of your tiles'
          : 'tap up to ' + inking.ink.targets + ' of your tiles'}
        {' · '}
        {inking.ink.hint}
      </span>
      {inking.ink.needsVowel && (
        <span className="sb-vowels">
          {vowels.map((v) => (
            <button
              key={v}
              type="button"
              className={'sb-vowel' + (inking.vowel === v ? ' is-on' : '')}
              onClick={() => setInking((k) => ({ ...k, vowel: v }))}
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
        disabled={
          !inking.ids.length || (inking.ink.needsVowel && !inking.vowel)
        }
      >
        Apply{inking.ids.length ? ' to ' + inking.ids.length : ''}
      </button>
      <button type="button" onClick={() => setInking(null)}>
        Cancel
      </button>
    </div>
  );
}
