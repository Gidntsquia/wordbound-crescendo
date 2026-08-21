// React/Vite scaffold (GOALS.md STRUCTURAL ticket). Screens are ported one at
// a time; wordbound.html remains the actual playable game until the port has
// full feature parity. Main menu + how-to-play overlay are the first real
// screens ported; character select is a documented placeholder (see
// CharacterSelectPlaceholder.jsx) until the next STRUCTURAL run.
import { useState } from 'react';
import MainMenu from './components/MainMenu.jsx';
import HowToPlayOverlay from './components/HowToPlayOverlay.jsx';
import CharacterSelectPlaceholder from './components/CharacterSelectPlaceholder.jsx';

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
        <CharacterSelectPlaceholder onBack={() => setScreen('main-menu')} />
      )}
      <HowToPlayOverlay open={howToPlayOpen} onClose={() => setHowToPlayOpen(false)} />
    </div>
  );
}
