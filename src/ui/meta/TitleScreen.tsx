// The idle/title screen -- extracted unchanged from RoundSandbox.jsx
// (READ_SLOWLY_PLAN.md A4, mechanical extraction). Pure UI: key choice,
// character choice, and Play all go through the same setters/callbacks the
// parent already owned; nothing here touches fight.current/run/round.
// Ported to .tsx (READ_SLOWLY_PLAN.md A1 remainder) with real prop types;
// still the pre-A6 bespoke classNames -- the shadcn/Tailwind chrome pass
// is a separate, larger visual change tracked under A6.
import CharacterSelect from '../meta/CharacterSelect';
import type { Key } from '../../engine/content/round';
import type { Character } from '../../engine/content/characters';
import { Button } from '@/ui/primitives/button';

interface BestState {
  word?: { word: string; total: number };
  wins?: number;
  runs?: number;
  winsByKey?: Record<string, number>;
}

export default function TitleScreen({
  SB,
  keyId,
  markSeen,
  characterId,
  setCharacterId,
  start,
  resumeRun,
  hasSavedRun,
  randomSeed,
  best,
}: {
  SB: {
    KEYS: Key[];
    KEY_DEFS: Record<string, Key>;
    CHARACTERS: Character[];
    unlockedCharacters: () => string[];
  };
  keyUnlocked: number;
  keyId: string;
  setKey: (id: string) => void;
  writeKeyChoice: (id: string) => void;
  seen: ReadonlySet<string>;
  markSeen: (id: string) => void;
  characterId: string;
  setCharacterId: (id: string) => void;
  start: (seed: string) => void;
  resumeRun: () => void;
  hasSavedRun: boolean;
  randomSeed: () => string;
  best: BestState;
}) {
  const unlocked = SB.unlockedCharacters();
  const selectedIndex = SB.CHARACTERS.findIndex(
    (character) => character.id === characterId,
  );
  const nextCharacter = SB.CHARACTERS[selectedIndex + 1];
  const nextCharacterLocked =
    nextCharacter && !unlocked.includes(nextCharacter.id);

  return (
    <section className="px-3 pt-10 pb-7 text-center max-[620px]:flex-none">
      <p className="m-0 mb-[22px] text-[clamp(19px,3vw,26px)] font-[var(--display)] text-[var(--leaf)]">
        Choose your character
      </p>
      <CharacterSelect
        characters={SB.CHARACTERS}
        unlocked={unlocked}
        chosen={characterId}
        onChoose={(id) => {
          setCharacterId(id);
          markSeen('character');
        }}
      />
      <p className="mx-auto max-w-[520px] text-sm leading-relaxed text-[var(--leaf)]">
        Reach each target within the available words. Your character letter
        scores extra and returns after every word. E is a good first choice.
      </p>
      <p className="mx-auto max-w-[520px] text-xs leading-relaxed text-[var(--leaf-dim)]">
        Character progress: {unlocked.length}/{SB.CHARACTERS.length} unlocked.
        {nextCharacterLocked
          ? ` Finish a chapter with ${SB.CHARACTERS[selectedIndex]!.name} to unlock ${nextCharacter.name} (${nextCharacter.letter}).`
          : nextCharacter
            ? ` ${nextCharacter.name} (${nextCharacter.letter}) is already unlocked.`
            : ' This character has completed its unlock path.'}
      </p>
      <Button
        type="button"
        variant="paperPrimary"
        className="sb-go mx-auto mt-[18px] border-[var(--leaf)] bg-[var(--leaf)] px-16 py-[18px] text-[20px] tracking-[0.3em] text-[var(--ink)] hover:border-[var(--brass-hot)] hover:bg-[var(--brass-hot)] hover:text-[var(--ink)]"
        onClick={() => start(randomSeed())}
      >
        Play
      </Button>
      {hasSavedRun && (
        <Button
          type="button"
          variant="paper"
          className="mx-auto mt-2 block h-auto px-4 py-2 text-[13px]"
          onClick={resumeRun}
        >
          Resume saved run
        </Button>
      )}
      <Button
        type="button"
        variant="paper"
        className="mx-auto mt-2 block h-auto px-4 py-2 text-[13px]"
        onClick={() => start('review-20260918')}
      >
        Guided practice · same opening and first shop
      </Button>
      <p className="sb-hint mx-auto mt-[18px] max-w-[520px] text-[11px] text-[var(--leaf-dim)] italic">
        {best.word ? (
          <>
            Best: {best.word.word} for {best.word.total} · {best.wins || 0} win
            {best.wins === 1 ? '' : 's'} in {best.runs || 0} run
            {best.runs === 1 ? '' : 's'}
            {best.winsByKey && best.winsByKey[keyId] ? (
              <>
                {' '}
                ({best.winsByKey[keyId]} in {SB.KEY_DEFS[keyId]!.name})
              </>
            ) : (
              ''
            )}
          </>
        ) : (
          'Nine musical encounters. Earn ink between fights to buy bookmarks and tile or length upgrades.'
        )}
      </p>
    </section>
  );
}
