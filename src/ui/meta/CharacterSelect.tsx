// READ_SLOWLY_PLAN.md stage D3: title-screen row of the six letter
// characters. Presentational only (props in, JSX out, no internal state).
import type { Character } from '../../engine/content/characters';
import { Button } from '@/ui/primitives/button';
import { CHARACTER_ORDER } from '../../engine/content/characters';

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
        const previous = characters.find(
          (p) => p.id === CHARACTER_ORDER[CHARACTER_ORDER.indexOf(c.id) - 1],
        );
        return (
          <div
            key={c.id}
            className="flex w-[145px] flex-col items-center gap-1 rounded-sm border border-[var(--rule)] p-2 text-[var(--leaf)]"
          >
            <Button
              type="button"
              variant="paper"
              title={isUnlocked ? c.hint : c.hint + ' — locked'}
              aria-pressed={isUnlocked && c.id === chosen}
              disabled={!isUnlocked}
              className={
                'h-11 w-11 rounded-[2px] text-[17px] font-bold' +
                (c.id === chosen
                  ? ' border-[var(--brass-hot)] bg-[var(--brass-hot)] text-[var(--ink)] ring-2 ring-[var(--brass-hot)] ring-offset-2 ring-offset-[var(--pit)]'
                  : '') +
                (!isUnlocked ? ' disabled:opacity-[0.35]' : '')
              }
              onClick={() => isUnlocked && onChoose(c.id)}
            >
              {c.letter}
            </Button>
            <b className="text-sm">
              {c.name}
              {c.id === 'ee' ? ' · recommended' : ''}
            </b>
            <span className="text-xs leading-snug">
              {isUnlocked
                ? c.hint
                : `Unlock by finishing a chapter with ${previous?.name ?? 'the previous character'}.`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
