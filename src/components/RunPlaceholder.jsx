// Honest stand-in for wordbound.html's #screen-run. Not ported yet — the run
// screen is game.js's ~3400-line combat/map/panels state machine, the next
// (much bigger) STRUCTURAL sub-step. This exists so picking a character in the
// now-real CharacterSelect leads somewhere real instead of a dead click, per
// GOALS.md's "port screen by screen, keep commits working," and echoes the
// pick back so it's clear the selection was actually read.
export default function RunPlaceholder({ characterName, seed, onBack }) {
  return (
    <div className="screen">
      <div className="panel character-select-panel">
        <h1 className="game-title">{characterName}</h1>
        <p style={{ textAlign: 'center', color: '#b8ac8a', margin: '20px 0' }}>
          Run screen isn&apos;t ported to React yet — it&apos;s the next STRUCTURAL step.
          {seed ? (
            <>
              {' '}Your seed <code>{seed}</code> is ready to play at <code>wordbound.html</code>.
            </>
          ) : (
            <> Play a real run at <code>wordbound.html</code> for now.</>
          )}
        </p>
        <button className="btn btn-secondary" style={{ width: '100%', marginTop: 20 }} onClick={onBack}>
          Back to Menu
        </button>
      </div>
    </div>
  );
}
