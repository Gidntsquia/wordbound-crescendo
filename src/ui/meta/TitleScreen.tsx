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
import { useCallout } from '../chrome/Callout';
import { Button } from '@/ui/primitives/button';

interface BestState {
  word?: { word: string; total: number };
  wins?: number;
  runs?: number;
  winsByKey?: Record<string, number>;
}

export default function TitleScreen({
  SB,
  keyUnlocked,
  keyId,
  setKey,
  writeKeyChoice,
  seen,
  markSeen,
  characterId,
  setCharacterId,
  start,
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
  randomSeed: () => string;
  best: BestState;
}) {
  useCallout(
    !seen.has('character'),
    'Your letter. Play it once a round; it scores extra.',
  );
  return (
    <section className="sb-title">
      <p className="sb-title-line">
        Spell words. Beat the target before your words run out.
      </p>
      {keyUnlocked > 0 && (
        <div
          className="mb-[18px] flex flex-wrap justify-center gap-1.5"
          role="group"
          aria-label="Key"
        >
          {SB.KEYS.map((k) => (
            <Button
              key={k.id}
              type="button"
              variant="paper"
              title={k.hint}
              disabled={k.index > keyUnlocked}
              className={
                'rounded-[2px] px-[12px] py-[6px] text-[11px] font-semibold tracking-[0.08em] uppercase' +
                (k.id === keyId
                  ? ' border-[var(--leaf)] bg-[var(--leaf)] text-[var(--ink)]'
                  : '') +
                (k.index > keyUnlocked ? ' disabled:opacity-[0.35]' : '')
              }
              onClick={() => {
                setKey(k.id);
                writeKeyChoice(k.id);
              }}
            >
              {k.name}
            </Button>
          ))}
        </div>
      )}
      <CharacterSelect
        characters={SB.CHARACTERS}
        unlocked={SB.unlockedCharacters()}
        chosen={characterId}
        onChoose={(id) => {
          setCharacterId(id);
          markSeen('character');
        }}
      />
      <Button
        type="button"
        variant="paperPrimary"
        className="sb-go sb-title-play border-[var(--leaf)] bg-[var(--leaf)] text-[var(--ink)] hover:border-[var(--brass-hot)] hover:bg-[var(--brass-hot)] hover:text-[var(--ink)]"
        onClick={() => start(randomSeed())}
      >
        Play
      </Button>
      <p className="sb-hint sb-title-best">
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
          'Nine enemies, each with its own piece of music. Gold between fights buys quills that score every word.'
        )}
      </p>
    </section>
  );
}
