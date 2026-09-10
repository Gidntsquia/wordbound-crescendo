// READ_SLOWLY_PLAN.md stage E2/E3: the player's own desk panel -- the
// `wordsmith` sprite (src/art/svg/people.tsx, wired E1) plus the chosen
// character's letter in a badge, reusing CharacterSelect.tsx's own visual
// language for a chosen letter (rounded-[2px] square, --leaf fill,
// --ink text) rather than inventing a new one. Presentational only, no
// state of its own, same pattern as SituationPanel.tsx; `pose` is driven by
// useFight.ts's wordsmithPose (E3): `write` while a word is being scored,
// `flourish` on a round win, `idle` otherwise.
import Sprite from '../../art/Sprite';
import type { Character } from '../../engine/content/characters';

export default function WordsmithPanel({
  characterId,
  characters,
  pose = 'idle',
}: {
  characterId: string;
  characters: Character[];
  pose?: string;
}) {
  const character = characters.find((c) => c.id === characterId);
  return (
    <div
      className="mb-2 flex items-center gap-2 max-[620px]:mb-1.5"
      aria-label="Your wordsmith"
    >
      <span className="relative inline-flex flex-none">
        <Sprite
          sheet="wordsmith"
          pose={pose}
          className="h-11 w-11 rounded-lg"
        />
        {character && (
          <span
            aria-hidden="true"
            title={character.name}
            className="absolute -right-1.5 -bottom-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-[2px] border border-[var(--leaf)] bg-[var(--leaf)] text-[10px] font-bold text-[var(--ink)]"
          >
            {character.letter}
          </span>
        )}
      </span>
      <span className="text-[11px] font-semibold tracking-[0.08em] text-[var(--leaf-dim)] uppercase">
        {character ? character.name : 'Wordsmith'}
      </span>
    </div>
  );
}
