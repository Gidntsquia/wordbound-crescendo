// READ_SLOWLY_PLAN.md stage D3: title-screen row of the six letter
// characters. Presentational only (props in, JSX out, no internal state),
// same pattern as SituationPanel.jsx.
import type { Character } from '../../engine/content/characters';

export default function CharacterSelect({
  characters,
  unlocked,
  chosen,
  onChoose,
}: {
  characters: Character[];
  unlocked: string[];
  chosen: string;
  onChoose: (id: string) => void;
}) {
  return (
    <div className="sb-characters" role="group" aria-label="Character">
      {characters.map((c) => {
        const isUnlocked = unlocked.includes(c.id);
        return (
          <button
            key={c.id}
            type="button"
            title={isUnlocked ? c.hint : c.hint + ' — locked'}
            disabled={!isUnlocked}
            className={
              'sb-character' +
              (c.id === chosen ? ' is-on' : '') +
              (!isUnlocked ? ' is-locked' : '')
            }
            onClick={() => isUnlocked && onChoose(c.id)}
          >
            {c.letter}
          </button>
        );
      })}
    </div>
  );
}
