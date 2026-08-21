// React/Vite scaffold (GOALS.md STRUCTURAL ticket). Screens are ported one at
// a time; wordbound.html remains the actual playable game until the port has
// full feature parity. Main menu, how-to-play overlay, character select, and
// the run screen's node map are real ports; what a node resolves INTO
// (combat panel first, then treasure/shop/event/rest) is the next
// STRUCTURAL sub-step -- see RunScreen.jsx's header comment for why.
import { useState } from 'react';
import MainMenu from './components/MainMenu.jsx';
import HowToPlayOverlay from './components/HowToPlayOverlay.jsx';
import CharacterSelect from './components/CharacterSelect.jsx';
import RunScreen from './components/RunScreen.jsx';

export default function App() {
  const [screen, setScreen] = useState('main-menu');
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);

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
            window.Wordbound.Game.startRun(characterId, seed);
            setScreen('run');
          }}
        />
      )}
      {screen === 'run' && (
        <RunScreen onBackToMenu={() => setScreen('main-menu')} />
      )}
      <HowToPlayOverlay open={howToPlayOpen} onClose={() => setHowToPlayOpen(false)} />
    </div>
  );
}
