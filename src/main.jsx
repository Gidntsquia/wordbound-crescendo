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
// MUSIC ENGINE ticket (GOALS.md, 2026-08-21): music.js is standalone, no
// dependency on game.js. Loaded here, BEFORE monsters.js, because
// DUEL-GAUGE COMBAT's boss-def cutover (GOALS.md ORCHESTRATOR DECISION
// 2026-08-22) references the real mountainKing piece data directly inside
// monsters.js's own boss_vowelmaw def object literal -- the piece module
// must already have set window.Wordbound.Pieces.mountainKing by the time
// monsters.js evaluates, so this pair moved ahead of monsters.js as a unit
// (mirrors wordbound.html's own script order exactly).
import '../js/wordbound/music.js';
import '../js/wordbound/pieces/mountain-king.js';
import '../js/wordbound/pieces/valkyrie-marshal.js';
// beethoven-5th.js (DUEL-GAUGE COMBAT ticket, update-13): the final boss's
// piece. Unlike the other two, nothing in monsters.js references it yet
// (per this run's own scoped-to-composition-only decision -- see the piece
// file's own header) -- grouped here anyway, alongside the other pieces,
// for the same "every piece module loads consistently" reason.
import '../js/wordbound/pieces/beethoven-5th.js';
// REGULAR ENEMIES ticket (GOALS.md): the first 3 of 9 planned regulars
// (early tier) -- monsters.js's own new weak-tier defs reference these by
// window.Wordbound.Pieces.* at eval time, same ordering requirement as the
// boss pieces above.
import '../js/wordbound/pieces/gymnopedie-1.js';
import '../js/wordbound/pieces/air-g-string.js';
import '../js/wordbound/pieces/morning-mood.js';
// gnossienne-1.js / invention-4.js (REGULAR ENEMIES ticket): the first 2 of
// the mid tier's 3 named regulars -- both now real, reachable 'normal'-tier
// duel-mode monsters (`gnossienne`/`invention` in monsters.js). The
// Metronome (Czerny) is the mid tier's still-unstarted third piece.
import '../js/wordbound/pieces/gnossienne-1.js';
import '../js/wordbound/pieces/invention-4.js';
import '../js/wordbound/monsters.js';
import '../js/wordbound/bossEntrances.js';
import '../js/wordbound/shakespeareGuide.js';
import '../js/wordbound/intents.js';
import '../js/wordbound/combat.js';
import '../js/wordbound/items.js';
import '../js/wordbound/achievements.js';
import '../js/wordbound/stolenLetters.js';
import '../js/wordbound/consumables.js';
import '../js/wordbound/shopkeepers.js';
import '../js/wordbound/events.js';
import '../js/wordbound/characters.js';
import '../js/wordbound/floor.js';
import '../js/wordbound/duel.js';
import '../js/wordbound/duelCombat.js';
import '../js/wordbound/game.js';
import App from './App.jsx';

// Wires Game's internal module references (Lexicon, Floor, RNG, ...) without
// running the rest of Game.init(), which binds 20+ listeners to legacy
// wordbound.html element ids that don't exist in this tree. See the comment
// on Game._initDependencies (js/wordbound/game.js) for why the split exists.
window.Wordbound.Game._initDependencies();

// MOBILE INPUT 1/3, STRUCTURAL remaining-scope (c) step 1 (GOALS.md): detect
// coarse-pointer (touch) devices and keep state.touchMode live, mirroring
// the same two calls wordbound.html's full Game.init() makes (that function
// itself is NOT called here -- see the comment above -- so this was the one
// piece of it React genuinely needed re-wired). applyTouchModeFromMedia is
// already null-guarded against every legacy element id it touches
// (#howto-blank-tip, #howto-audio-tip) and toggling document.body's class is
// harmless with no #word-input in this tree, so this is safe to call as-is;
// no game.js change needed. Without this, state.touchMode was always false
// in the React app regardless of device, which CombatScreen.jsx's own
// `if (!state.touchMode) inputRef.current?.focus()` calls silently depended
// on being wrong (always desktop-focusing, even on a touch device where
// stealing focus pops the soft keyboard unwantedly). Feature-checked so
// environments without matchMedia (jsdom) stay a no-op, same as vanilla.
window.Wordbound.Game.applyTouchModeFromMedia();
if (window.matchMedia) {
  const coarseMql = window.matchMedia('(pointer: coarse)');
  const onPointerChange = () => window.Wordbound.Game.applyTouchModeFromMedia();
  if (coarseMql.addEventListener) coarseMql.addEventListener('change', onPointerChange);
  else if (coarseMql.addListener) coarseMql.addListener(onPointerChange); // older Safari
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
