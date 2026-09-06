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
import './round.js';
import './shop.js';
import './inks.js';
import './wordFinder.js';
// Which letters a fight draws from -- three bags, weak/normal/strong.
import './tileBags.js';
// The recorded Für Elise (public/audio/fur-elise.mp3) and the player that
// fronts it -- the one logged exception to the synthesized-only rule, kept
// because the sequenced Für Elise sounds off. Soundtrack only here.
import './audioPiece.js';
import './recordedFurElise.js';
// Battle 2 and the boss: the Moonlight (Pixabay track, same footing as Für
// Elise) and Symphony No. 5 (Skidmore College Orchestra, public domain).
import './recordedMoonlight.js';
import './recordedSymphony5.js';

import RoundSandbox from './RoundSandbox.jsx';

createRoot(document.getElementById('sandbox-root')).render(<RoundSandbox />);
