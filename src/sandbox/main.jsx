// ROUND SANDBOX entry (see src/sandbox/RoundSandbox.jsx).
//
// Bare-bones second Vite entry: ONE round, no run structure, no menus, no
// meta-progression. It loads only the engine modules a round actually needs --
// deliberately NOT game.js, floor.js, combat.js, duel.js, duelCombat.js,
// items.js, intents.js, monsters.js, traits.js, achievements.js, events.js,
// shops, characters or stolen letters. Add a module back here only when the
// mechanic it owns is being tuned.
//
// The round itself is sandbox-owned (round.js), not js/wordbound/duel.js: it is
// a different mechanic from the shipped duel gauge, and keeping it here means
// tuning it can never break the main app. The music is a soundtrack only.
import { createRoot } from 'react-dom/client';
import './sandbox.css';

import '../../js/core/namespace.js';
import '../../js/core/rng.js';
import '../../js/wordbound/wordlist.js';
import '../../js/wordbound/lexicon.js';
import '../../js/wordbound/tiles.js';
// Items: loaded so a round can try a sample build (round.js runs the hooks).
import '../../js/wordbound/items.js';
import '../../js/wordbound/music.js';
import '../../js/wordbound/pieces/fur-elise.js';
import '../../js/wordbound/pieces/gymnopedie-1.js';
import '../../js/wordbound/pieces/air-g-string.js';
import '../../js/wordbound/pieces/morning-mood.js';
import '../../js/wordbound/pieces/gnossienne-1.js';
import '../../js/wordbound/pieces/invention-4.js';
import '../../js/wordbound/pieces/czerny-299.js';
import '../../js/wordbound/pieces/mountain-king.js';

import './round.js';
import './wordFinder.js';
// Which letters a fight draws from -- three bags, weak/normal/strong.
import './tileBags.js';
// The recorded Für Elise (public/audio/fur-elise.mp3) and the player that
// fronts it -- the one logged exception to the synthesized-only rule, kept
// because the sequenced Für Elise sounds off. Soundtrack only here.
import './audioPiece.js';
import './recordedFurElise.js';

import RoundSandbox from './RoundSandbox.jsx';

createRoot(document.getElementById('sandbox-root')).render(<RoundSandbox />);
