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
import '../../js/wordbound/monsters.js';
import '../../js/wordbound/intents.js';
import '../../js/wordbound/combat.js';
import '../../js/wordbound/items.js';
import '../../js/wordbound/achievements.js';
import '../../js/wordbound/consumables.js';
import '../../js/wordbound/events.js';
import '../../js/wordbound/characters.js';
import '../../js/wordbound/floor.js';
import '../../js/wordbound/game.js';

// Mirrors main.jsx: wires Game's internal module references without running
// the rest of Game.init(), which binds listeners to legacy wordbound.html
// element ids that don't exist in a React (or test) tree.
window.Wordbound.Game._initDependencies();
