// React port of wordbound.html's #screen-main-menu (GOALS.md STRUCTURAL ticket,
// step 1 of 5, screen-by-screen port). Reads achievement progress from the
// existing js/wordbound/achievements.js module (imported for its side effect
// in src/main.jsx, still attached at window.Wordbound.Achievements per the
// engine's global-namespace pattern) instead of reimplementing that logic —
// "game logic stays framework-agnostic plain JS, import it from React."
// STOLEN LETTERS META-PROGRESSION ticket (GOALS.md): every letter A-Z,
// styled per window.Wordbound.StolenLetters's own state (chained if still
// stolen, highlighted if recovered, plain otherwise) -- direct React port
// of game.js's renderAlphabetDisplay, same "read the real engine module,
// don't reimplement its logic" convention as the achievements block above.
function AlphabetDisplay() {
  const StolenLetters = typeof window !== 'undefined' ? window.Wordbound?.StolenLetters : null;
  if (!StolenLetters) return null;
  const letters = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
  return (
    <div id="alphabet-display" className="alphabet-display">
      <div className="alphabet-caption">The Alphabet</div>
      <div className="alphabet-grid">
        {letters.map((letter) => {
          const stolen = StolenLetters.isStolen(letter);
          const everStolen = StolenLetters.STARTING_STOLEN.indexOf(letter) !== -1;
          const cls = 'alphabet-letter' + (stolen ? ' alphabet-letter-stolen' : everStolen ? ' alphabet-letter-recovered' : '');
          const title = stolen ? `${letter} -- stolen by the Fermata` : everStolen ? `${letter} -- recovered!` : letter;
          return <span key={letter} className={cls} title={title}>{letter}</span>;
        })}
      </div>
    </div>
  );
}

export default function MainMenu({ onNewRun, onHowToPlay }) {
  const Achievements = typeof window !== 'undefined' ? window.Wordbound?.Achievements : null;
  let achievementsBlock = null;
  if (Achievements) {
    const unlockedIds = Achievements.getUnlockedAchievements();
    const totalCount = Object.keys(Achievements.ACHIEVEMENTS).length;
    const names = unlockedIds
      .map((id) => Achievements.ACHIEVEMENTS[id]?.name || id)
      .join(', ');
    achievementsBlock = (
      <div
        id="achievements-display"
        style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #b8ac8a', textAlign: 'center', color: '#b8ac8a', fontSize: '0.9rem' }}
      >
        Achievements unlocked: {unlockedIds.length} / {totalCount}
        {unlockedIds.length > 0 && (
          <>
            <br />
            <span style={{ fontSize: '0.85rem' }}>✓ {names}</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div id="screen-main-menu" className="screen">
      <div className="panel main-menu-panel">
        <h1 className="game-title">WORDBOUND: CRESCENDO</h1>
        <p className="version-info">v0.15</p>
        <p className="tagline">
          Spell your way through the Stacks. Every Loose Word has a weakness — find the word that hits it.
        </p>
        <p className="menu-goal">
          Fight through 4 floors. Defeat each floor&apos;s boss to descend. Beat the Maestro on the Podium to win the run.
        </p>
        <button className="btn btn-primary" onClick={onNewRun}>New Run</button>
        <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={onHowToPlay}>How to Play</button>
        {achievementsBlock}
        <AlphabetDisplay />
      </div>
    </div>
  );
}
