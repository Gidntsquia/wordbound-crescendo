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

import './enemies.js';
import './items.js';
import './round.js';
import './shop.js';
import './inks.js';
import './wordFinder.js';
// Which letters a fight draws from -- three bags, weak/normal/strong.
import './tileBags.js';
// The player that fronts a RECORDING (the logged exception to the
// synthesized-only rule) and the nine recordings themselves -- recordings.js
// is generated from tools/audio-manifest.json by `npm run fetch:audio`.
// Soundtrack only here.
import './audioPiece.js';
import './recordings.js';

import RoundSandbox from './RoundSandbox.jsx';

createRoot(document.getElementById('sandbox-root')).render(<RoundSandbox />);
