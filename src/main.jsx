import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../css/wordbound.css';
// Side-effect imports: the vanilla engine's IIFE global-namespace modules
// (window.Wordbound.*, window.Game.RNG), unmodified. GOALS.md STRUCTURAL
// step 2: "game logic stays framework-agnostic plain JS, import it from
// React" -- these are pulled in as-is rather than ported/rewritten. Order
// matters (each module reads window.Wordbound.X of the ones before it) and
// mirrors wordbound.html's own <script> order exactly.
import '../js/core/namespace.js';
import '../js/core/rng.js';
import '../js/wordbound/wordlist.js';
import '../js/wordbound/lexicon.js';
import '../js/wordbound/tiles.js';
import '../js/wordbound/traits.js';
import '../js/wordbound/monsters.js';
import '../js/wordbound/intents.js';
import '../js/wordbound/combat.js';
import '../js/wordbound/items.js';
import '../js/wordbound/achievements.js';
import '../js/wordbound/consumables.js';
import '../js/wordbound/events.js';
import '../js/wordbound/characters.js';
import '../js/wordbound/floor.js';
import '../js/wordbound/game.js';
import App from './App.jsx';

// Wires Game's internal module references (Lexicon, Floor, RNG, ...) without
// running the rest of Game.init(), which binds 20+ listeners to legacy
// wordbound.html element ids that don't exist in this tree. See the comment
// on Game._initDependencies (js/wordbound/game.js) for why the split exists.
window.Wordbound.Game._initDependencies();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
