// Honest stand-in for wordbound.html's #screen-character-select. Not ported
// yet (next STRUCTURAL sub-step) — this exists so "New Run" leads somewhere
// real instead of a dead click, per GOALS.md's "port screen by screen, keep
// commits working."
export default function CharacterSelectPlaceholder({ onBack }) {
  return (
    <div className="screen">
      <div className="panel character-select-panel">
        <h1 className="game-title">Choose Your Path</h1>
        <p style={{ textAlign: 'center', color: '#b8ac8a', margin: '20px 0' }}>
          Character select isn&apos;t ported to React yet — it&apos;s the next STRUCTURAL step.
          Play a real run at <code>wordbound.html</code> for now.
        </p>
        <button className="btn btn-secondary" style={{ width: '100%', marginTop: 20 }} onClick={onBack}>
          Back to Menu
        </button>
      </div>
    </div>
  );
}
