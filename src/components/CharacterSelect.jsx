// React port of wordbound.html's #screen-character-select (GOALS.md STRUCTURAL
// ticket, screen-by-screen port). Character data comes from the existing
// js/wordbound/characters.js module (imported for its side effect in
// src/main.jsx, still attached at window.Wordbound.Characters per the engine's
// global-namespace pattern) instead of reimplementing the roster here — same
// "game logic stays framework-agnostic plain JS" pattern as MainMenu's
// achievements read.
//
// Picking a character doesn't start a real run yet: Game.startRun (js/wordbound/
// game.js) drives the run/combat screen, which isn't ported to React yet (that's
// the next, much bigger STRUCTURAL sub-step). So onSelect just hands the chosen
// character id + trimmed seed up to App, which routes to an honest placeholder
// naming the pick rather than silently doing nothing or faking a run.
import { useState } from 'react';

export default function CharacterSelect({ onSelect, onBack }) {
  const [seed, setSeed] = useState('');
  const Characters = typeof window !== 'undefined' ? window.Wordbound?.Characters : null;
  const characterIds = Characters ? Characters.getCharacterIds() : [];

  return (
    <div id="screen-character-select" className="screen">
      <div className="panel character-select-panel">
        <h1 className="game-title">Choose Your Path</h1>
        <p style={{ textAlign: 'center', color: '#b8ac8a', marginBottom: 20 }}>
          Each character plays differently. Pick one and face the Archive.
        </p>
        <div className="seed-input-row">
          <label htmlFor="run-seed-input">Seed (optional)</label>
          <input
            id="run-seed-input"
            type="text"
            placeholder="random"
            maxLength={40}
            autoComplete="off"
            spellCheck="false"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
          />
        </div>
        <div id="character-choices" className="character-choices">
          {characterIds.map((id) => {
            const def = Characters.getCharacter(id);
            return (
              <div
                key={id}
                className="character-option"
                role="button"
                tabIndex={0}
                onClick={() => onSelect(id, seed)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onSelect(id, seed);
                }}
              >
                <p className="character-name">{def.name}</p>
                <p className="character-description">{def.description}</p>
              </div>
            );
          })}
        </div>
        <button className="btn btn-secondary" style={{ width: '100%', marginTop: 20 }} onClick={onBack}>
          Back to Menu
        </button>
      </div>
    </div>
  );
}
