// ROUND SANDBOX entry (see src/sandbox/RoundSandbox.jsx).
//
// Bare-bones second Vite entry: ONE round wrapped in a small RUN, no map, no
// menus beyond the title screen. It loads only the engine modules a round
// actually needs -- deliberately NOT game.js, floor.js, combat.js, duel.js,
// duelCombat.js, intents.js, monsters.js, traits.js, achievements.js,
// events.js, or characters. Add a module back here only when the mechanic it
// owns is being tuned. stolenLetters.js (its own meta, DIVERGENCE_PLAN.md) IS
// loaded -- it only touches localStorage and which letters a bag may draw.
//
// The round itself is sandbox-owned (round.js), not js/wordbound/duel.js: it is
// a different mechanic from the shipped duel gauge, and keeping it here means
// tuning it can never break the main app. The music is a soundtrack only.
import { createRoot } from 'react-dom/client';
import '../styles/globals.css';
import './sandbox.css';

import '../engine/rng';
import '../../js/wordbound/wordlist.js';
import '../engine/lexicon';
import '../engine/tiles';

import '../engine/content/enemies';
import '../engine/content/items';
import '../engine/content/round';
import '../engine/content/shop';
import '../engine/content/marginalia';
import '../engine/content/wordFinder';
// Which letters a fight draws from -- three bags, weak/normal/strong.
import '../engine/content/tileBags';
// The stolen-letters meta: which letters are locked out of every bag/pack
// until a boss is felled and one is won back (localStorage wbc.letters).
import '../engine/content/stolenLetters';
// The quill-discovery meta: which quills are hidden from the shop/packs
// until a boss is felled or Movement III is reached (localStorage wbc.quills).
import '../engine/content/quillDiscovery';
// The player that fronts a RECORDING (the logged exception to the
// synthesized-only rule) and the nine recordings themselves -- recordings.js
// is generated from tools/audio-manifest.json by `npm run fetch:audio`.
// Soundtrack only here.
import '../engine/content/audioPiece';
// Synthesized input sounds and the scoring cascade's hits (sfx.js).
import '../engine/content/sfx';
import '../engine/content/recordings';

import RoundSandbox from './RoundSandbox.jsx';

createRoot(document.getElementById('sandbox-root')!).render(<RoundSandbox />);

// Offline audio cache (public/sw.js, stage 5): registers after load so it
// never competes with the first paint or the first piece's own fetch.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
