// Vitest setup file (GOALS.md STRUCTURAL sub-step 3), loaded once per test
// file via vite.config.mjs's test.setupFiles. Two jobs:
//
// 1. jest-dom matchers (toBeInTheDocument, toHaveClass, ...) for expect().
// 2. Import the vanilla engine modules for their window.Wordbound.* side
//    effects, in the EXACT SAME ORDER src/main.jsx uses (each module reads
//    window.Wordbound.X of the ones before it) -- this is what makes real
//    game logic (Game.startRun, Combat.previewWord, Floor.generateBranchingFloor,
//    ...) available to every component test without a mock, so tests exercise
//    the actual engine rather than a stand-in of it.
import '@testing-library/jest-dom/vitest';

import '../../js/core/namespace.js';
import '../../js/core/rng.js';
import '../../js/wordbound/wordlist.js';
import '../../js/wordbound/lexicon.js';
import '../../js/wordbound/tiles.js';
import '../../js/wordbound/traits.js';
// music.js + the mountainKing piece move ahead of monsters.js, mirroring
// main.jsx's own reordering -- see that file's comment for why (monsters.js's
// boss_vowelmaw def now references window.Wordbound.Pieces.mountainKing
// directly at module-eval time, per GOALS.md's DUEL-GAUGE COMBAT boss-def
// cutover).
import '../../js/wordbound/music.js';
import '../../js/wordbound/pieces/mountain-king.js';
import '../../js/wordbound/pieces/valkyrie-marshal.js';
import '../../js/wordbound/pieces/beethoven-5th.js';
import '../../js/wordbound/pieces/gymnopedie-1.js';
import '../../js/wordbound/pieces/air-g-string.js';
import '../../js/wordbound/pieces/morning-mood.js';
import '../../js/wordbound/pieces/gnossienne-1.js';
import '../../js/wordbound/pieces/invention-4.js';
import '../../js/wordbound/monsters.js';
import '../../js/wordbound/bossEntrances.js';
import '../../js/wordbound/shakespeareGuide.js';
import '../../js/wordbound/intents.js';
import '../../js/wordbound/combat.js';
import '../../js/wordbound/items.js';
import '../../js/wordbound/achievements.js';
import '../../js/wordbound/stolenLetters.js';
import '../../js/wordbound/consumables.js';
import '../../js/wordbound/shopkeepers.js';
import '../../js/wordbound/events.js';
import '../../js/wordbound/characters.js';
import '../../js/wordbound/floor.js';
import '../../js/wordbound/duel.js';
import '../../js/wordbound/duelCombat.js';
import '../../js/wordbound/game.js';

// Mirrors main.jsx: wires Game's internal module references without running
// the rest of Game.init(), which binds listeners to legacy wordbound.html
// element ids that don't exist in a React (or test) tree.
window.Wordbound.Game._initDependencies();

// Mirrors main.jsx's touch-mode wiring (STRUCTURAL remaining-scope (c) step
// 1). jsdom has no window.matchMedia (confirmed by test/dom-check.js's own
// comment on the same gap), so this is a guaranteed no-op here and
// state.touchMode stays false for every component test, same as before --
// included for parity with main.jsx's actual startup sequence, and so a
// future test that mocks window.matchMedia before importing a component
// gets the real wiring instead of silently doing nothing.
window.Wordbound.Game.applyTouchModeFromMedia();
