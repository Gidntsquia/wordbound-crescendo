// ROUND SANDBOX entry (see src/ui/fight/FightScreen.tsx).
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
import './styles/globals.css';
import './styles/game.css';

// window.Wordbound.Lexicon/Tiles/WORD_SET/WORDLIST are still legacy globals
// (js/wordbound/wordlist.js's plumbing, out of scope for A2's no-globals
// item) -- nothing ES-imports lexicon.ts/tiles.ts for their side effects, so
// they still need loading here explicitly. Every *other* content module
// (enemies, situations, items, characters, round, marginalia, wordFinder,
// tileBags, stolenLetters, quillDiscovery, audioPiece, sfx, recordings) is
// now reached transitively via FightScreen.tsx's real ES imports, so this
// file is otherwise mount only (READ_SLOWLY_PLAN.md A2 remainder).
import './engine/rng';
import '../js/wordbound/wordlist.js';
import './engine/lexicon';
import './engine/tiles';

import { migrate } from './app/persistence';
import FightScreen from './ui/fight/FightScreen';

migrate();
createRoot(document.getElementById('sandbox-root')!).render(<FightScreen />);

// Offline audio cache (public/sw.js, stage 5): registers after load so it
// never competes with the first paint or the first piece's own fetch.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
