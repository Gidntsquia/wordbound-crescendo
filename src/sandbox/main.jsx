// TUG SANDBOX entry (see src/sandbox/TugSandbox.jsx).
//
// Bare-bones second Vite entry: ONE fight, no run structure, no menus, no
// meta-progression. It loads only the engine modules a fight actually needs --
// deliberately NOT game.js, floor.js, combat.js, duel.js, duelCombat.js,
// items.js, intents.js, monsters.js, traits.js, achievements.js, events.js,
// shops, characters or stolen letters. Add a module back here only when the
// mechanic it owns is being tuned.
//
// Combat itself is sandbox-owned (tugOfWar.js), not js/wordbound/duel.js: the
// tug-of-war is a different mechanic from the shipped duel gauge, and keeping
// it here means tuning it can never break the main app.
import { createRoot } from 'react-dom/client';
import './sandbox.css';

import '../../js/core/namespace.js';
import '../../js/core/rng.js';
import '../../js/wordbound/wordlist.js';
import '../../js/wordbound/lexicon.js';
import '../../js/wordbound/tiles.js';
import '../../js/wordbound/music.js';
import '../../js/wordbound/pieces/fur-elise.js';
import '../../js/wordbound/pieces/gymnopedie-1.js';
import '../../js/wordbound/pieces/air-g-string.js';
import '../../js/wordbound/pieces/morning-mood.js';
import '../../js/wordbound/pieces/gnossienne-1.js';
import '../../js/wordbound/pieces/invention-4.js';
import '../../js/wordbound/pieces/czerny-299.js';
import '../../js/wordbound/pieces/mountain-king.js';

import './tugOfWar.js';
import './wordFinder.js';
// A recorded piece and the player that fronts it behind the sequencer's own
// surface. Sandbox-only: js/wordbound/music.js stays synthesized-only.
import './audioPiece.js';
import './recordedFurElise.js';

import TugSandbox from './TugSandbox.jsx';

createRoot(document.getElementById('sandbox-root')).render(<TugSandbox />);
