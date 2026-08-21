// React/Vite scaffold (GOALS.md STRUCTURAL ticket). Screens are ported one at
// a time; wordbound.html remains the actual playable game until the port has
// full feature parity. Main menu, how-to-play overlay, and character select
// are real ports; the run screen (combat/map/panels) is still a documented
// placeholder (see RunPlaceholder.jsx) until a later STRUCTURAL run.
import { useState } from 'react';
import MainMenu from './components/MainMenu.jsx';
import HowToPlayOverlay from './components/HowToPlayOverlay.jsx';
import CharacterSelect from './components/CharacterSelect.jsx';
import RunPlaceholder from './components/RunPlaceholder.jsx';

export default function App() {
  const [screen, setScreen] = useState('main-menu');
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const [pendingRun, setPendingRun] = useState(null); // { characterName, seed }

  const Characters = typeof window !== 'undefined' ? window.Wordbound?.Characters : null;

  return (
    <div id="wb-root">
      {screen === 'main-menu' && (
        <MainMenu
          onNewRun={() => setScreen('character-select')}
          onHowToPlay={() => setHowToPlayOpen(true)}
        />
      )}
      {screen === 'character-select' && (
        <CharacterSelect
          onBack={() => setScreen('main-menu')}
          onSelect={(characterId, seed) => {
            const def = Characters ? Characters.getCharacter(characterId) : null;
            setPendingRun({ characterName: def ? def.name : characterId, seed: String(seed || '').trim() });
            setScreen('run-placeholder');
          }}
        />
      )}
      {screen === 'run-placeholder' && (
        <RunPlaceholder
          characterName={pendingRun?.characterName}
          seed={pendingRun?.seed}
          onBack={() => setScreen('main-menu')}
        />
      )}
      <HowToPlayOverlay open={howToPlayOpen} onClose={() => setHowToPlayOpen(false)} />
    </div>
  );
}
