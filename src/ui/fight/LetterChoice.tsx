// After a boss falls: choose a stolen letter to win back. Extracted from
// RoundSandbox.jsx (READ_SLOWLY_PLAN.md A4).
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
      <span className="sb-eyebrow">
        The boss falls — choose a letter to win back
      </span>
      <div className="sb-letter-row">
        {options.map((l) => (
          <button
            key={l}
            type="button"
            className="sb-tile sb-letter-pick"
            onClick={() => pickLetter(l)}
          >
            {l}
            <sub>{letterValues[l] || 0}</sub>
          </button>
        ))}
      </div>
      <p className="sb-hint">
        It joins every future run’s bag, win or lose this one.
      </p>
    </div>
  );
}
