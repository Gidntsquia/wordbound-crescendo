// READ_SLOWLY_PLAN.md stage D3: title-screen row of the six letter
// characters. Presentational only (props in, JSX out, no internal state),
// same pattern as SituationPanel.jsx.
import type { Character } from '../../engine/content/characters';
import { Button } from '@/ui/primitives/button';

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
    <div
      className="mb-[18px] flex flex-wrap justify-center gap-1.5"
      role="group"
      aria-label="Character"
    >
      {characters.map((c) => {
        const isUnlocked = unlocked.includes(c.id);
        return (
          <Button
            key={c.id}
            type="button"
            variant="paper"
            title={isUnlocked ? c.hint : c.hint + ' — locked'}
            disabled={!isUnlocked}
            className={
              'h-[34px] w-[34px] rounded-[2px] text-[15px] font-bold' +
              (c.id === chosen
                ? ' border-[var(--leaf)] bg-[var(--leaf)] text-[var(--ink)]'
                : '') +
              (!isUnlocked ? ' disabled:opacity-[0.35]' : '')
            }
            onClick={() => isUnlocked && onChoose(c.id)}
          >
            {c.letter}
          </Button>
        );
      })}
    </div>
  );
}
