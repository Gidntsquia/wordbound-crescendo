// READ_SLOWLY_PLAN.md stage E2/E3: the player's own desk panel -- the
// chosen character's letter in a badge, reusing CharacterSelect.tsx's own
// visual language for a chosen letter (rounded-[2px] square, --leaf fill,
// --ink text) rather than inventing a new one. Presentational only, no
// state of its own. The `wordsmith` sprite placeholder was removed at
// Jaxon's request (2026-09-12) -- the letter badge is the icon now.
import type { Character } from '../../engine/content/characters';

export default function WordsmithPanel({
  characterId,
  characters,
}: {
  characterId: string;
  characters: Character[];
}) {
  const character = characters.find((c) => c.id === characterId);
  return (
    <div
      className="mb-2 flex items-center gap-2 max-[620px]:mb-1"
      aria-label="Your wordsmith"
    >
      {character && (
        <span
          aria-hidden="true"
          title={character.name}
          className="flex h-[28px] w-[28px] flex-none items-center justify-center rounded-[2px] border border-[var(--leaf)] bg-[var(--leaf)] text-[13px] font-bold text-[var(--ink)]"
        >
          {character.letter}
        </span>
      )}
      <span className="text-[11px] font-semibold tracking-[0.08em] text-[var(--leaf-dim)] uppercase">
        {character ? character.name : 'Wordsmith'}
      </span>
    </div>
  );
}
