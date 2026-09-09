// The idle/title screen -- extracted unchanged from RoundSandbox.jsx
// (READ_SLOWLY_PLAN.md A4, mechanical extraction). Pure UI: key choice,
// character choice, and Play all go through the same setters/callbacks the
// parent already owned; nothing here touches fight.current/run/round.
import CharacterSelect from '../../sandbox/CharacterSelect.jsx';

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
}) {
  return (
    <section className="sb-title">
      <p className="sb-title-line">
        Spell words. Beat the target before your words run out.
      </p>
      {keyUnlocked > 0 && (
        <div className="sb-keys" role="group" aria-label="Key">
          {SB.KEYS.map((k) => (
            <button
              key={k.id}
              type="button"
              title={k.hint}
              disabled={k.index > keyUnlocked}
              className={
                'sb-key' +
                (k.id === keyId ? ' is-on' : '') +
                (k.index > keyUnlocked ? ' is-locked' : '')
              }
              onClick={() => {
                setKey(k.id);
                writeKeyChoice(k.id);
              }}
            >
              {k.name}
            </button>
          ))}
        </div>
      )}
      {!seen.has('character') && (
        <div className="sb-callout">
          Your letter. Play it once a round; it scores extra.
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
      <button
        type="button"
        className="sb-go sb-title-play"
        onClick={() => start(randomSeed())}
      >
        Play
      </button>
      <p className="sb-hint sb-title-best">
        {best.word ? (
          <>
            Best: {best.word.word} for {best.word.total} · {best.wins || 0} win
            {best.wins === 1 ? '' : 's'} in {best.runs || 0} run
            {best.runs === 1 ? '' : 's'}
            {best.winsByKey && best.winsByKey[keyId] ? (
              <>
                {' '}
                ({best.winsByKey[keyId]} in {SB.KEY_DEFS[keyId].name})
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
